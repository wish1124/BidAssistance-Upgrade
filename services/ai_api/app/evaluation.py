from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from app.services.retrieval import HybridRetriever, load_corpus


@dataclass(frozen=True)
class EvaluationCase:
    query: str
    relevant_document_ids: set[str]


def load_evaluation_cases(path: Path) -> list[EvaluationCase]:
    cases: list[EvaluationCase] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
            cases.append(
                EvaluationCase(
                    query=str(record["query"]),
                    relevant_document_ids=set(map(str, record["relevant_document_ids"])),
                )
            )
        except (KeyError, TypeError, json.JSONDecodeError) as error:
            raise ValueError(f"Invalid evaluation case at line {line_number}") from error
    if not cases:
        raise ValueError("Evaluation set has no usable cases")
    return cases


def evaluate_retrieval(retriever: HybridRetriever, cases: Sequence[EvaluationCase], top_k: int = 5) -> dict[str, float]:
    reciprocal_ranks: list[float] = []
    recalls: list[float] = []
    for case in cases:
        retrieved_ids = [source.document_id for source in retriever.retrieve(case.query, top_k)]
        first_relevant_rank = next(
            (rank for rank, document_id in enumerate(retrieved_ids, start=1) if document_id in case.relevant_document_ids),
            None,
        )
        reciprocal_ranks.append(1 / first_relevant_rank if first_relevant_rank else 0.0)
        recalls.append(float(bool(set(retrieved_ids) & case.relevant_document_ids)))
    return {
        "mrr_at_k": round(sum(reciprocal_ranks) / len(cases), 6),
        "recall_at_k": round(sum(recalls) / len(cases), 6),
        "case_count": float(len(cases)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate Hybrid RAG retrieval against a labelled JSONL set.")
    parser.add_argument("--corpus", type=Path, required=True)
    parser.add_argument("--evaluation", type=Path, required=True)
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()

    # This CLI deliberately uses the local deterministic embedder. CI can
    # compare ranks without downloading an embedding model.
    from app.services.retrieval import HashDenseEmbedder

    retriever = HybridRetriever(load_corpus(args.corpus), HashDenseEmbedder())
    metrics = evaluate_retrieval(retriever, load_evaluation_cases(args.evaluation), args.top_k)
    print(json.dumps(metrics, ensure_ascii=False))


if __name__ == "__main__":
    main()
