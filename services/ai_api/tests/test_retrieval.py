from __future__ import annotations

from app.evaluation import EvaluationCase, evaluate_retrieval
from app.services.retrieval import Document, HashDenseEmbedder, HybridRetriever


def retriever() -> HybridRetriever:
    documents = [
        Document("deadline", "마감 점검", "제출 마감일과 질의 마감 시간을 확인한다.", "test://deadline"),
        Document("rate", "낙찰하한율", "낙찰하한율은 입찰 금액 산정의 기준이다.", "test://rate"),
        Document("eligibility", "참가 자격", "공동수급 조건과 참가 자격을 확인한다.", "test://eligibility"),
    ]
    return HybridRetriever(documents, HashDenseEmbedder(), rrf_k=60)


def test_rrf_returns_keyword_relevant_document_first() -> None:
    sources = retriever().retrieve("낙찰하한율 기준", top_k=2)
    assert sources[0].document_id == "rate"
    assert sources[0].rank == 1


def test_retrieval_evaluation_reports_mrr_and_recall() -> None:
    metrics = evaluate_retrieval(
        retriever(),
        [
            EvaluationCase("낙찰하한율", {"rate"}),
            EvaluationCase("제출 마감", {"deadline"}),
        ],
        top_k=2,
    )
    assert metrics["mrr_at_k"] == 1.0
    assert metrics["recall_at_k"] == 1.0
