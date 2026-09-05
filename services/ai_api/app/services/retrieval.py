from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, Sequence

from app.core.config import Settings
from app.schemas import RetrievalSource


TOKEN_PATTERN = re.compile(r"[0-9A-Za-z가-힣]+")


def tokenize(text: str) -> list[str]:
    """Stable baseline tokenizer for Korean and alphanumeric tender terms."""
    return TOKEN_PATTERN.findall(text.lower())


@dataclass(frozen=True)
class Document:
    document_id: str
    title: str
    content: str
    source: str


class DenseEmbedder(Protocol):
    def embed(self, texts: Sequence[str]) -> list[list[float]]: ...


class HashDenseEmbedder:
    """Deterministic local embedding for tests and development, not production."""

    def __init__(self, dimensions: int = 256) -> None:
        self.dimensions = dimensions

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            vector = [0.0] * self.dimensions
            for token in tokenize(text):
                digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
                bucket = int.from_bytes(digest[:4], "big") % self.dimensions
                direction = 1.0 if digest[4] % 2 else -1.0
                vector[bucket] += direction
            norm = math.sqrt(sum(value * value for value in vector)) or 1.0
            vectors.append([value / norm for value in vector])
        return vectors


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as error:  # pragma: no cover - deployment dependency guard
            raise RuntimeError("Install requirements-ml.txt to use sentence_transformer embeddings") from error
        self.model = SentenceTransformer(model_name)

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        vectors = self.model.encode(list(texts), normalize_embeddings=True)
        return [list(map(float, vector)) for vector in vectors]


class BM25:
    def __init__(self, documents: Sequence[Document], k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.tokens = [tokenize(document.title + " " + document.content) for document in documents]
        self.lengths = [len(tokens) for tokens in self.tokens]
        self.average_length = sum(self.lengths) / max(len(self.lengths), 1)
        self.term_frequencies = [Counter(tokens) for tokens in self.tokens]
        document_frequency: Counter[str] = Counter()
        for terms in self.term_frequencies:
            document_frequency.update(terms.keys())
        total_documents = len(documents)
        self.idf = {
            term: math.log(1 + (total_documents - frequency + 0.5) / (frequency + 0.5))
            for term, frequency in document_frequency.items()
        }

    def score(self, query: str) -> list[float]:
        scores: list[float] = []
        for frequency, length in zip(self.term_frequencies, self.lengths):
            score = 0.0
            for term in tokenize(query):
                count = frequency.get(term, 0)
                if not count:
                    continue
                denominator = count + self.k1 * (1 - self.b + self.b * length / max(self.average_length, 1))
                score += self.idf.get(term, 0.0) * (count * (self.k1 + 1)) / denominator
            scores.append(score)
        return scores


def _cosine(left: Sequence[float], right: Sequence[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def _rank(scores: Sequence[float]) -> dict[int, int]:
    ordered = sorted(range(len(scores)), key=lambda index: (-scores[index], index))
    return {index: rank for rank, index in enumerate(ordered, start=1)}


class HybridRetriever:
    """Combines keyword and semantic rankings with Reciprocal Rank Fusion."""

    def __init__(self, documents: Sequence[Document], embedder: DenseEmbedder, rrf_k: int = 60) -> None:
        if not documents:
            raise ValueError("HybridRetriever requires at least one document")
        self.documents = list(documents)
        self.embedder = embedder
        self.rrf_k = rrf_k
        self.bm25 = BM25(self.documents)
        self.document_embeddings = self.embedder.embed(
            [document.title + "\n" + document.content for document in self.documents]
        )

    @classmethod
    def from_settings(cls, settings: Settings) -> "HybridRetriever":
        documents = load_corpus(settings.rag_corpus_path)
        embedder: DenseEmbedder
        if settings.embedding_backend == "sentence_transformer":
            embedder = SentenceTransformerEmbedder(settings.embedding_model_name)
        else:
            embedder = HashDenseEmbedder()
        return cls(documents=documents, embedder=embedder, rrf_k=settings.rrf_k)

    def retrieve(self, query: str, top_k: int) -> list[RetrievalSource]:
        query = query.strip()
        if not query:
            raise ValueError("query must not be blank")

        bm25_scores = self.bm25.score(query)
        query_embedding = self.embedder.embed([query])[0]
        dense_scores = [_cosine(query_embedding, vector) for vector in self.document_embeddings]
        bm25_ranks = _rank(bm25_scores)
        dense_ranks = _rank(dense_scores)

        rrf_scores = {
            index: 1 / (self.rrf_k + bm25_ranks[index]) + 1 / (self.rrf_k + dense_ranks[index])
            for index in range(len(self.documents))
        }
        ordered = sorted(rrf_scores, key=lambda index: (-rrf_scores[index], index))[:top_k]
        return [
            RetrievalSource(
                document_id=self.documents[index].document_id,
                title=self.documents[index].title,
                source=self.documents[index].source,
                excerpt=self.documents[index].content[:500],
                rank=rank,
                score=round(rrf_scores[index], 8),
            )
            for rank, index in enumerate(ordered, start=1)
        ]


def load_corpus(path: Path) -> list[Document]:
    if not path.exists():
        raise FileNotFoundError(f"RAG corpus does not exist: {path}")
    documents: list[Document] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
            document = Document(
                document_id=str(record["document_id"]),
                title=str(record["title"]),
                content=str(record["content"]),
                source=str(record["source"]),
            )
        except (KeyError, TypeError, json.JSONDecodeError) as error:
            raise ValueError(f"Invalid corpus record at line {line_number}") from error
        if not document.content.strip():
            raise ValueError(f"Corpus record at line {line_number} has no content")
        documents.append(document)
    if not documents:
        raise ValueError("RAG corpus has no usable records")
    return documents
