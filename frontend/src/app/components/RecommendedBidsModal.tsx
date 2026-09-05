import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, X, Sparkles, ArrowRight } from "lucide-react";

import { fetchBids, fetchRecommendedBids, type Bid } from "../api/bids";
import { toggleWishlist } from "../api/wishlist";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const SUPPRESS_KEY = "reco_popup_suppress_date";
const TRIGGER_KEY = "reco_popup_after_login_session";

function today_ymd(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function parse_deadline_date(raw: string): Date | null {
	const s = String(raw || "").trim();
	if (!s) return null;

	const ymd = /^\d{4}-\d{2}-\d{2}$/;
	if (ymd.test(s)) {
		const d = new Date(`${s}T23:59:59.999`);
		if (!Number.isFinite(d.getTime())) return null;
		return d;
	}

	const d = new Date(s);
	if (!Number.isFinite(d.getTime())) return null;
	return d;
}

function days_left(endDate: string): number | null {
	const d = parse_deadline_date(endDate);
	if (!d) return null;

	const now = new Date();
	const diff = d.getTime() - now.getTime();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function format_krw_eok(raw: unknown): string {
	let n = 0;

	if (typeof raw === "number" && Number.isFinite(raw)) n = raw;
	else if (typeof raw === "bigint") n = Number(raw);
	else if (typeof raw === "string") {
		const digits = raw.replace(/[^0-9]/g, "");
		if (digits) n = Number(digits);
	}

	if (!Number.isFinite(n) || n <= 0) return "-";

	const eok = n / 100_000_000;
	const rounded = Math.round(eok * 10) / 10;
	const s = String(rounded);
	const cleaned = s.endsWith(".0") ? s.slice(0, -2) : s;
	return `${cleaned}억 원`;
}

function pick_bid_id(b: Bid): number {
	if (typeof b.id === "number" && Number.isFinite(b.id)) return b.id;
	if (typeof (b as any).bidId === "number" && Number.isFinite((b as any).bidId)) return (b as any).bidId;
	return 0;
}

function format_date_ymd(s: string): string {
	const d = parse_deadline_date(s);
	if (!d) return "-";
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function suppress_reco_popup_today() {
	localStorage.setItem(SUPPRESS_KEY, today_ymd());
}

export function is_reco_popup_suppressed_today(): boolean {
	return localStorage.getItem(SUPPRESS_KEY) === today_ymd();
}

export function mark_reco_popup_trigger() {
	try {
		sessionStorage.setItem(TRIGGER_KEY, "1");
	} catch {
	}
}

export function consume_reco_popup_trigger(): boolean {
	try {
		if (sessionStorage.getItem(TRIGGER_KEY) === "1") {
			sessionStorage.removeItem(TRIGGER_KEY);
			return true;
		}
	} catch {
	}
	return false;
}

export function RecommendedBidsModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const navigate = useNavigate();

	const [bids, setBids] = useState<Bid[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [dontShowToday, setDontShowToday] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [togglingId, setTogglingId] = useState<number | null>(null);

	useEffect(() => {
		if (!open) return;

		let ignore = false;
		setNotice(null);
		setError(null);

		const load = async () => {
			setLoading(true);
			try {
                const userIdRaw = localStorage.getItem("userId");
                const userId = userIdRaw ? Number(userIdRaw) : NaN;

                let list: Bid[];
                if (Number.isFinite(userId)) {
                    list = await fetchRecommendedBids(userId);
                } else {
                    list = await fetchBids();
                }

				if (ignore) return;
				setBids(Array.isArray(list) ? list : []);
			} catch (e) {
				if (ignore) return;
				setBids([]);
				setError(e instanceof Error ? e.message : "추천 공고를 불러오지 못했습니다.");
			} finally {
				if (!ignore) setLoading(false);
			}
		};

		void load();
		return () => {
			ignore = true;
		};
	}, [open]);

	const recommended = useMemo(() => {
		const now = Date.now();
		return [...bids]
			.filter((b) => {
				const end = parse_deadline_date(String((b as any).endDate ?? ""));
				if (!end) return true;
				return end.getTime() > now;
			})
			.sort((a, b) => {
				const ad = parse_deadline_date(String((a as any).endDate ?? ""))?.getTime() ?? Number.MAX_SAFE_INTEGER;
				const bd = parse_deadline_date(String((b as any).endDate ?? ""))?.getTime() ?? Number.MAX_SAFE_INTEGER;
				return ad - bd;
			})
			.slice(0, 10);
	}, [bids]);

	const on_close = () => {
		if (dontShowToday) suppress_reco_popup_today();
		onOpenChange(false);
	};

	const on_detail = (bid: Bid) => {
		const id = pick_bid_id(bid);
		if (!id) return;
		onOpenChange(false);
		navigate(`/bids/${id}`);
	};

	const on_toggle_wishlist = async (bid: Bid) => {
		const raw = localStorage.getItem("userId");
		const userId = raw ? Number(raw) : NaN;
		if (!Number.isFinite(userId)) {
			setNotice("로그인이 필요합니다.");
			return;
		}

		const bidId = pick_bid_id(bid);
		if (!bidId) return;

		try {
			setNotice(null);
			setTogglingId(bidId);
			const res = await toggleWishlist(userId, bidId);
			if (res.status === "success") setNotice("장바구니에 반영했습니다.");
			else setNotice(res.message || "장바구니 처리에 실패했습니다.");
		} catch (e) {
			setNotice(e instanceof Error ? e.message : "장바구니 처리 중 오류가 발생했습니다.");
		} finally {
			setTogglingId(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : on_close())}>
			<DialogContent
				hideClose
				overlayClassName="bg-black/40 backdrop-blur-sm"
				className="p-0 sm:max-w-3xl rounded-3xl border-0 shadow-2xl ring-1 ring-black/5 overflow-visible bg-transparent"
			>
				<DialogTitle className="sr-only">추천 공고</DialogTitle>
				<DialogDescription className="sr-only">
					사용자의 관심사를 기반으로 추천된 입찰 공고 목록입니다.
				</DialogDescription>
				<div className="rounded-3xl overflow-hidden bg-white">
					<div className="relative px-7 pt-7 pb-5 border-b border-white/40 bg-[radial-gradient(1200px_400px_at_20%_-20%,rgba(59,130,246,0.18),transparent),radial-gradient(900px_380px_at_90%_0%,rgba(99,102,241,0.16),transparent)]">
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<div className="w-9 h-9 rounded-2xl bg-white/70 border flex items-center justify-center">
										<Star className="w-5 h-5 text-slate-900" />
									</div>
									<div className="text-lg font-semibold text-slate-900">추천 공고</div>
								</div>
								<div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
									<Sparkles className="w-4 h-4" />
									관심 조건/활동 흐름 기반으로 공고를 추천합니다.
								</div>
							</div>

							<button
								type="button"
								onClick={on_close}
								className="w-10 h-10 rounded-2xl bg-white/70 backdrop-blur border-white/40 shadow-sm hover:bg-white/90 transition flex items-center justify-center shrink-0"
								aria-label="닫기"
							>
								<X className="w-5 h-5 text-slate-700" />
							</button>
						</div>

						{notice ? (
							<div className="mt-4 text-sm text-slate-700 bg-white/70 border rounded-2xl px-4 py-3">
								{notice}
							</div>
						) : null}
					</div>

					<div className="px-7 py-6 bg-slate-50">
						<div className="max-h-[440px] overflow-y-auto pr-1">
							{loading ? (
								<div className="space-y-3">
									{Array.from({ length: 5 }).map((_, idx) => (
										<div key={idx} className="border rounded-2xl p-5 bg-white">
											<div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
											<div className="mt-2 h-3 w-40 bg-slate-100 rounded animate-pulse" />
											<div className="mt-4 h-10 w-56 bg-slate-100 rounded-xl animate-pulse" />
										</div>
									))}
								</div>
							) : error ? (
								<div className="border rounded-2xl p-4 bg-red-50 text-red-700 text-sm">{error}</div>
							) : recommended.length === 0 ? (
								<div className="border rounded-2xl p-6 bg-white text-sm text-slate-500">
									표시할 추천 공고가 없습니다.
								</div>
							) : (
								<div className="space-y-3">
									{recommended.map((b) => {
										const bidId = pick_bid_id(b);
										const dleft = days_left(String((b as any).endDate ?? ""));
										const dText = dleft === null ? "-" : dleft <= 0 ? "마감" : `D-${dleft}`;

										const badgeCls =
											dleft !== null && dleft > 0
												? dleft <= 3
													? "bg-orange-600 text-white"
													: "bg-blue-600 text-white"
												: "bg-slate-100 text-slate-600";

										return (
											<div
												key={String(bidId || (b as any).realId || (b as any).RealId || b.name)}
												className="group border border-slate-200/80 rounded-2xl p-5 bg-white hover:border-slate-300 hover:shadow-sm transition"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<div className="font-semibold text-slate-900 truncate">{b.name}</div>
														<div className="text-sm text-slate-500 truncate">
															{(b as any).organization ?? "-"}
														</div>
													</div>

													<div className="flex items-center gap-2 shrink-0">
														<span className="px-2.5 py-1 rounded-full text-xs border border-slate-200 bg-white/80">
															{(b as any).region || "-"}
														</span>
														<span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeCls}`}>
															{dText}
														</span>
													</div>
												</div>

												<div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-700">
													<span className="px-2.5 py-1 rounded-full bg-slate-50 border">
														{format_krw_eok((b as any).estimatePrice)}
													</span>
													<span className="px-2.5 py-1 rounded-full bg-slate-50 border">
														마감: {format_date_ymd(String((b as any).endDate ?? ""))}
													</span>
												</div>

												<div className="mt-4 flex items-center gap-2">
													<button
														type="button"
														onClick={() => on_detail(b)}
														className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm inline-flex items-center gap-2"
													>
														상세 보기
														<ArrowRight className="w-4 h-4" />
													</button>

													<button
														type="button"
														onClick={() => void on_toggle_wishlist(b)}
														disabled={togglingId === bidId && bidId !== 0}
														className="h-10 px-4 rounded-xl border hover:bg-slate-50 text-sm disabled:opacity-60"
													>
														장바구니 담기
													</button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						<div className="mt-5 flex items-center justify-between border-t pt-4">
							<label className="flex items-center gap-2 text-sm text-slate-600 select-none">
								<input
									type="checkbox"
									checked={dontShowToday}
									onChange={(e) => setDontShowToday(e.target.checked)}
									className="accent-slate-900"
								/>
								오늘 다시 보지 않기
							</label>

							<button
								type="button"
								onClick={on_close}
								className="h-10 px-4 rounded-xl border bg-white hover:bg-slate-50 text-sm shadow-sm"
							>
								닫기
							</button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
