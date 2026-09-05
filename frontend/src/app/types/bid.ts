export const BID_STAGES = [
	"INTEREST",
	"REVIEW",
	"DECIDED",
	"DOC_PREP",
	"SUBMITTED",
	"WON",
	"LOST",
] as const;

export type BidStage = (typeof BID_STAGES)[number];

export function isBidStage(v: string): v is BidStage {
	return (BID_STAGES as readonly string[]).includes(v);
}

export const BID_STAGE_OPTIONS: Array<{ value: BidStage; label: string }> = [
	{ value: "INTEREST", label: "관심" },
	{ value: "REVIEW", label: "검토중" },
	{ value: "DECIDED", label: "참여결정" },
	{ value: "DOC_PREP", label: "서류준비" },
	{ value: "SUBMITTED", label: "제출완료" },
	{ value: "WON", label: "낙찰" },
	{ value: "LOST", label: "탈락" },
];

export const BID_STAGE_CODE: Record<BidStage, number> = {
	INTEREST: 0,
	REVIEW: 1,
	DECIDED: 2,
	DOC_PREP: 3,
	SUBMITTED: 4,
	WON: 5,
	LOST: 6,
};

export function bid_stage_to_code(stage: BidStage): number {
	return BID_STAGE_CODE[stage] ?? 0;
}

export function bid_stage_from_code(v: unknown): BidStage {
	if (typeof v === "string" && isBidStage(v)) return v;
	const n = typeof v === "number" ? v : Number(v);
	if (!Number.isFinite(n)) return "INTEREST";
	const idx = Math.trunc(n);
	if (idx < 0 || idx >= BID_STAGES.length) return "INTEREST";
	return BID_STAGES[idx];
}
