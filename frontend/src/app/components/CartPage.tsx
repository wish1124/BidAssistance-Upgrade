import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { fetchWishlist, toggleWishlist, updateWishlist } from "../api/wishlist";
import type { WishlistItem } from "../types/wishlist";
import type { BidStage } from "../types/bid";
import { BID_STAGE_OPTIONS } from "../types/bid";

type SortKey = "DEADLINE_ASC" | "DEADLINE_DESC" | "TITLE_ASC";
type PastSortKey = "DEADLINE_NEAR" | "DEADLINE_OLD" | "TITLE_ASC";

type PastResult = "NONE" | "WON" | "LOST";

const ACTIVE_STAGES: BidStage[] = [
	"INTEREST",
	"REVIEW",
	"DECIDED",
	"DOC_PREP",
	"SUBMITTED",
];

const ACTIVE_STAGE_OPTIONS = BID_STAGE_OPTIONS.filter((o) =>
	(ACTIVE_STAGES as readonly string[]).includes(o.value),
);

const PAST_RESULT_OPTIONS: Array<{ value: PastResult; label: string }> = [
	{ value: "NONE", label: "미투찰" },
	{ value: "WON", label: "낙찰" },
	{ value: "LOST", label: "탈락" },
];

function parse_time(v: string): number {
	if (!v) return 0;
	const t = Date.parse(v);
	if (Number.isFinite(t)) return t;
	return 0;
}

function is_past_bid(bidEnd: string, nowMs: number): boolean {
    const end = new Date(bidEnd);
    if (!Number.isFinite(end.getTime())) return false;

    // 마감은 시간 기준
    return end.getTime() <= nowMs;
}



function formatAmount(value: unknown): string {
	if (value == null || value === "") return "-";
	const n =
		typeof value === "number"
			? value
			: Number(String(value).replace(/[^\d.-]/g, ""));
	if (!Number.isFinite(n)) return "-";
	return n.toLocaleString("ko-KR");
}

function format_date_ymd_hm(dateStr: string): string {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return "-";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function stage_label(stage: BidStage): string {
	const found = BID_STAGE_OPTIONS.find((o) => o.value === stage);
	return found ? found.label : stage;
}

function get_user_id(): number | null {
	const raw = localStorage.getItem("userId");
	if (!raw) return null;
	const n = Number(raw);
	if (!Number.isFinite(n)) return null;
	return n;
}

function days_until(dateStr: string, nowMs: number): number | null {
    if (!dateStr) return null;

    const end = new Date(dateStr);
    if (!Number.isFinite(end.getTime())) return null;

    // 오늘 00:00
    const today = new Date(nowMs);
    today.setHours(0, 0, 0, 0);

    // 마감일 00:00 (시간 제거)
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((endDate.getTime() - today.getTime()) / 86400000);

    // 이미 지난 날짜면 -1
    if (!Number.isFinite(diffDays)) return null;
    if (diffDays < 0) return -1;

    return diffDays;
}


function dday_label(daysLeft: number): string | null {
	if (!Number.isFinite(daysLeft)) return null;
	if (daysLeft < 0) return null;
	if (daysLeft === 0) return "D-DAY";
	return `D-${daysLeft}`;
}

function past_result_from_stage(stage: BidStage): PastResult {
	if (stage === "WON") return "WON";
	if (stage === "LOST") return "LOST";
	return "NONE";
}

function PastBadge({ result }: { result: PastResult }) {
	const cls =
		result === "WON"
			? "bg-emerald-100 text-emerald-700"
			: result === "LOST"
				? "bg-rose-100 text-rose-700"
				: "bg-slate-100 text-slate-700";

	const label = result === "WON" ? "낙찰" : result === "LOST" ? "탈락" : "미투찰";

	return (
		<span
			className={[
				"shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
				cls,
			].join(" ")}
		>
			{label}
		</span>
	);
}

export function CartPage({
	setGlobalLoading,
	showToast,
}: {
	setGlobalLoading: (v: boolean) => void;
	showToast: (msg: string, type: "success" | "error") => void;
}) {
	const navigate = useNavigate();

	const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
	const [activeStage, setActiveStage] = useState<BidStage | "ALL">("ALL");
	const [sortKey, setSortKey] = useState<SortKey>("DEADLINE_ASC");
	const [pastSortKey, setPastSortKey] = useState<PastSortKey>("DEADLINE_NEAR");
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		const t = window.setInterval(() => setNowMs(Date.now()), 30000);
		return () => window.clearInterval(t);
	}, []);

	const loadWishlist = async () => {
		const userId = get_user_id();
		if (userId === null) {
			showToast("userId가 없습니다. 다시 로그인 해주세요.", "error");
			return;
		}
		const items = await fetchWishlist(userId);
		setWishlist(items);
	};

	useEffect(() => {
		void loadWishlist();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const activeWishlist = useMemo(
		() => wishlist.filter((it) => !is_past_bid(String(it.bidEnd), nowMs)),
		[wishlist, nowMs],
	);

	const pastWishlist = useMemo(
		() => wishlist.filter((it) => is_past_bid(String(it.bidEnd), nowMs)),
		[wishlist, nowMs],
	);

	const stageCounts = useMemo(() => {
		const counts: Record<BidStage, number> = {
			INTEREST: 0,
			REVIEW: 0,
			DECIDED: 0,
			DOC_PREP: 0,
			SUBMITTED: 0,
			WON: 0,
			LOST: 0,
		};
		for (const it of activeWishlist) {
			if ((ACTIVE_STAGES as readonly string[]).includes(it.stage))
				counts[it.stage] = (counts[it.stage] ?? 0) + 1;
		}
		return counts;
	}, [activeWishlist]);

	const visibleItems = useMemo(() => {
		let items = activeWishlist.slice();

		if (activeStage !== "ALL") items = items.filter((it) => it.stage === activeStage);

		items.sort((a, b) => {
			if (sortKey === "TITLE_ASC")
				return String(a.title).localeCompare(String(b.title));
			const ta = parse_time(String(a.bidEnd));
			const tb = parse_time(String(b.bidEnd));
			if (sortKey === "DEADLINE_DESC") return tb - ta;
			return ta - tb;
		});

		return items;
	}, [activeWishlist, activeStage, sortKey]);

	const visiblePastItems = useMemo(() => {
		const items = pastWishlist.slice();

		items.sort((a, b) => {
			if (pastSortKey === "TITLE_ASC")
				return String(a.title).localeCompare(String(b.title));

			const ta = parse_time(String(a.bidEnd));
			const tb = parse_time(String(b.bidEnd));

			if (pastSortKey === "DEADLINE_NEAR") return tb - ta;
			return ta - tb;
		});

		return items;
	}, [pastWishlist, pastSortKey]);

	const onDelete = async (bidId: number) => {
		try {
			const userId = get_user_id();
			if (userId === null) {
				showToast("userId가 없습니다. 다시 로그인 해주세요.", "error");
				return;
			}
			setGlobalLoading(true);
			const res = await toggleWishlist(userId, bidId);
			await loadWishlist();
			showToast(res.message || "삭제되었습니다.", "success");
		} catch (e: any) {
			showToast(e?.message || "삭제 실패", "error");
		} finally {
			setGlobalLoading(false);
		}
	};

	const onChangeStage = async (item: WishlistItem, stage: BidStage) => {
		try {
			const userId = get_user_id();
			if (userId === null) {
				showToast("userId가 없습니다. 다시 로그인 해주세요.", "error");
				return;
			}
			setGlobalLoading(true);

			const res = await updateWishlist({
				userId,
				bidId: item.bidId,
				wishlistId: item.id,
				stage,
			});

			setWishlist((prev) =>
				prev.map((it) => (it.bidId === item.bidId ? { ...it, stage } : it)),
			);

			showToast(res.message || "단계가 변경되었습니다.", "success");
		} catch (e: any) {
			showToast(e?.message || "단계 변경 실패", "error");
		} finally {
			setGlobalLoading(false);
		}
	};

	const onChangePastResult = async (item: WishlistItem, result: PastResult) => {
		const current = past_result_from_stage(item.stage);
		if (current === result) return;

		let nextStage: BidStage = item.stage;

		if (result === "WON") nextStage = "WON";
		else if (result === "LOST") nextStage = "LOST";
		else nextStage = "SUBMITTED";

		try {
			const userId = get_user_id();
			if (userId === null) {
				showToast("userId가 없습니다. 다시 로그인 해주세요.", "error");
				return;
			}
			setGlobalLoading(true);

			const res = await updateWishlist({
				userId,
				bidId: item.bidId,
				wishlistId: item.id,
				stage: nextStage,
			});

			setWishlist((prev) =>
				prev.map((it) =>
					it.bidId === item.bidId ? { ...it, stage: nextStage } : it,
				),
			);

			showToast(res.message || "지난 공고 상태가 변경되었습니다.", "success");
		} catch (e: any) {
			showToast(e?.message || "상태 변경 실패", "error");
		} finally {
			setGlobalLoading(false);
		}
	};

	return (
		<div className="w-full">
			<div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-5">
				<div>
					<h2 className="text-2xl font-bold dark:text-slate-100">장바구니</h2>
					<div className="text-sm text-slate-500 dark:text-slate-400">
						장바구니에 담은 공고를 관리하세요
					</div>
				</div>

				<div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-4 sm:p-5">
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
						{ACTIVE_STAGES.map((st) => {
							const label = stage_label(st);
							const count = stageCounts[st] ?? 0;
							const active = activeStage === st;
							return (
								<button
									key={st}
									type="button"
									onClick={() => setActiveStage(active ? "ALL" : st)}
									className={[
										"rounded-xl px-3 py-2 border text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
										active
											? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-700"
											: "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800",
									].join(" ")}
								>
									<div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
									<div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
										{count}건
									</div>
								</button>
							);
						})}
					</div>

					{activeStage !== "ALL" && (
						<div className="mt-3 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
							<span>
								필터 적용됨:{" "}
								<span className="font-semibold">{stage_label(activeStage)}</span>
							</span>
							<button
								type="button"
								onClick={() => setActiveStage("ALL")}
								className="text-blue-600 hover:underline"
							>
								해제
							</button>
						</div>
					)}
				</div>

				<div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl overflow-hidden">
					<div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b dark:border-slate-700">
						<div className="font-semibold text-slate-900 dark:text-slate-100">장바구니 공고 목록</div>

						<div className="flex items-center gap-2">
							<span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">정렬</span>
							<select
								className="h-9 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm shadow-sm dark:text-slate-100"
								value={sortKey}
								onChange={(e) => setSortKey(e.target.value as SortKey)}
							>
								<option value="DEADLINE_ASC">마감 빠른순</option>
								<option value="DEADLINE_DESC">마감 늦은순</option>
								<option value="TITLE_ASC">제목순</option>
							</select>
						</div>
					</div>

					{wishlist.length === 0 ? (
						<div className="p-5 text-slate-500">찜한 공고가 없습니다.</div>
					) : visibleItems.length === 0 ? (
						<div className="p-5 text-slate-500">
							{activeWishlist.length === 0
								? "현재 진행 중인 공고가 없습니다."
								: "해당 단계에 공고가 없습니다."}
						</div>
					) : (
						<div className="divide-y dark:divide-slate-700">
							{visibleItems.map((w) => {
								const amountText = w.baseAmount
									? `${formatAmount(w.baseAmount)}원`
									: "";
								const endText = w.bidEnd
                                    ? `마감 ${format_date_ymd_hm(String(w.bidEnd))}`
									: "";

								const daysLeft = w.bidEnd
									? days_until(String(w.bidEnd), nowMs)
									: null;
								const label = daysLeft == null ? null : dday_label(daysLeft);
								const showBadge = label != null && daysLeft != null && daysLeft <= 7;

								const currentInActive =
									(ACTIVE_STAGES as readonly string[]).includes(w.stage);

								return (
									<div
										key={`${w.id}:${w.bidId}`}
										className="px-4 sm:px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
									>
										<div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 sm:gap-4 items-start">
											<button
												type="button"
												className="text-left min-w-0"
												onClick={() => navigate(`/bids/${w.bidId}`)}
											>
												<div className="flex items-center gap-2 min-w-0">
													<div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
														{w.title}
													</div>
													{showBadge ? (
														<span
															className={[
																"shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
																daysLeft === 0
																	? "bg-rose-100 text-rose-700"
																	: daysLeft <= 3
																		? "bg-amber-100 text-amber-800"
																		: "bg-slate-100 text-slate-700",
															].join(" ")}
														>
															{label}
														</span>
													) : null}
												</div>

												<div className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2 gap-y-1">
													<span>{w.agency}</span>
													{w.baseAmount ? (
														<>
															<span className="text-slate-300">·</span>
															<span>{amountText}</span>
														</>
													) : null}
													{w.bidEnd ? (
														<>
															<span className="text-slate-300">·</span>
															<span>{endText}</span>
														</>
													) : null}
												</div>
											</button>

											<div className="flex items-center justify-end">
												<div className="inline-flex items-center gap-2 rounded-full border dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-2 py-1 shadow-sm">
													<div className="w-[128px] sm:w-[140px]">
														<select
															className="h-9 w-full rounded-full border dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm dark:text-slate-100"
															value={currentInActive ? w.stage : "SUBMITTED"}
															onClick={(e) => e.stopPropagation()}
															onChange={(e) => {
																e.stopPropagation();
																void onChangeStage(w, e.target.value as BidStage);
															}}
														>
															{currentInActive ? null : (
																<option value="SUBMITTED">
																	{`(현재값: ${stage_label(w.stage)})`}
																</option>
															)}
															{ACTIVE_STAGE_OPTIONS.map((opt) => (
																<option key={opt.value} value={opt.value}>
																	{opt.label}
																</option>
															))}
														</select>
													</div>

													<button
														type="button"
														className="h-9 w-9 inline-flex items-center justify-center rounded-full border dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 transition-colors"
														onClick={(e) => {
															e.stopPropagation();
															void onDelete(w.bidId);
														}}
														aria-label="삭제"
														title="삭제"
													>
														<Trash2 className="h-4 w-4 text-red-500" />
													</button>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{pastWishlist.length > 0 ? (
					<div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl overflow-hidden">
						<div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b dark:border-slate-700">
							<div className="font-semibold text-slate-900 dark:text-slate-100">지난 공고 목록</div>

							<div className="flex items-center gap-2">
								<div className="text-sm text-slate-500 dark:text-slate-400">{pastWishlist.length}건</div>
								<span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">정렬</span>
								<select
									className="h-9 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-sm shadow-sm dark:text-slate-100"
									value={pastSortKey}
									onChange={(e) => setPastSortKey(e.target.value as PastSortKey)}
								>
									<option value="DEADLINE_NEAR">마감 가까운순</option>
									<option value="DEADLINE_OLD">마감 지난순</option>
									<option value="TITLE_ASC">제목순</option>
								</select>
							</div>
						</div>

						{visiblePastItems.length === 0 ? (
							<div className="p-5 text-slate-500 dark:text-slate-400">지난 공고가 없습니다.</div>
						) : (
							<div className="divide-y dark:divide-slate-700">
								{visiblePastItems.map((w) => {
									const amountText = w.baseAmount
										? `${formatAmount(w.baseAmount)}원`
										: "";
									const endText = w.bidEnd
                                        ? `마감 ${format_date_ymd_hm(String(w.bidEnd))}`
										: "";

									const result = past_result_from_stage(w.stage);

									return (
										<div
											key={`past:${w.id}:${w.bidId}`}
											className="px-4 sm:px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
										>
											<div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3 sm:gap-4 items-start">
												<button
													type="button"
													className="text-left min-w-0"
													onClick={() => navigate(`/bids/${w.bidId}`)}
												>
													<div className="flex items-center gap-2 min-w-0">
														<div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
															{w.title}
														</div>
														<PastBadge result={result} />
													</div>

													<div className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2 gap-y-1">
														<span>{w.agency}</span>
														{w.baseAmount ? (
															<>
																<span className="text-slate-300">·</span>
																<span>{amountText}</span>
															</>
														) : null}
														{w.bidEnd ? (
															<>
																<span className="text-slate-300">·</span>
																<span>{endText}</span>
															</>
														) : null}
													</div>
												</button>

												<div className="flex items-center justify-end">
													<div className="inline-flex items-center gap-2 rounded-full border dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-2 py-1 shadow-sm">
														<div className="w-[128px] sm:w-[140px]">
															<select
																className="h-9 w-full rounded-full border dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm dark:text-slate-100"
																value={result}
																onClick={(e) => e.stopPropagation()}
																onChange={(e) => {
																	e.stopPropagation();
																	void onChangePastResult(w, e.target.value as PastResult);
																}}
															>
																{PAST_RESULT_OPTIONS.map((opt) => (
																	<option key={opt.value} value={opt.value}>
																		{opt.label}
																	</option>
																))}
															</select>
														</div>

														<button
															type="button"
															className="h-9 w-9 inline-flex items-center justify-center rounded-full border dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 transition-colors"
															onClick={(e) => {
																e.stopPropagation();
																void onDelete(w.bidId);
															}}
															aria-label="삭제"
															title="삭제"
														>
															<Trash2 className="h-4 w-4 text-red-500" />
														</button>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				) : null}
			</div>
		</div>
	);
}
