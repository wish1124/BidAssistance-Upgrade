import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { fetchBids, type Bid } from "../api/bids";
import { fetchWishlist } from "../api/wishlist";
import type { WishlistItem } from "../types/wishlist";

import { SummaryCards } from "./dashboard/SummaryCard";
import {
	MonthlyTrendChart,
	type MonthlyWeeklyTrend,
	type WeeklyTrendPoint,
} from "./dashboard/MonthlyTrendChart";
import { RegionPieChart, type RegionDistPoint } from "./dashboard/RegionPieChart";
import { RecommendedBidsSection } from "./dashboard/RecommendedBidsSection";

type Kpi = {
	newBidsThisMonth: number;
	wishlistCount: number;
	closingSoon3Days: number;
	totalExpectedAmountEok: string;
};

type FilterMode = null | "new" | "closingSoon";
function format_date_ymd(s: string): string {
    if (!s) return "-";
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return s;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}

function format_date_ymd_hm(s: string): string {
    if (!s) return "-";
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return s;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function Dashboard() {
	const navigate = useNavigate();
	const location = useLocation();

	const [pendingScroll, setPendingScroll] = useState(false);

	const [bids, setBids] = useState<Bid[]>([]);
	const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const [filterMode, setFilterMode] = useState<FilterMode>(null);

	const [page, setPage] = useState(1);
	const pageSize = 5;

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError(null);

			try {
				const res = await fetchBids();
                console.log("sample bid", bids[0]);

                const items = pick_list(res);
				setBids(items as Bid[]);
			} catch (e) {
				setBids([]);
				setError(e instanceof Error ? e.message : "공고 데이터를 불러오지 못했습니다.");
			} finally {
				setLoading(false);
			}

			const userIdStr = localStorage.getItem("userId");
			const userId = Number(userIdStr);
			if (!userIdStr || !Number.isFinite(userId)) {
				setWishlist([]);
				return;
			}

			try {
				const w = await fetchWishlist(userId);
				setWishlist(w);
			} catch {
				setWishlist([]);
			}
		};

		void load();
	}, []);

	useEffect(() => {
		const focus = new URLSearchParams(location.search).get("focus");
		if (focus === "new") {
			setFilterMode("new");
			setPage(1);
			setPendingScroll(true);
			return;
		}
		if (focus === "closingSoon") {
			setFilterMode("closingSoon");
			setPage(1);
			setPendingScroll(true);
			return;
		}
	}, [location.search]);

	useEffect(() => {
		if (!pendingScroll) return;
		if (!filterMode) return;

		window.setTimeout(() => {
			const el = document.getElementById("dashboard-focus");
			if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 0);

		setPendingScroll(false);
	}, [pendingScroll, filterMode]);

	const monthlyTrend = useMemo<MonthlyWeeklyTrend[]>(
		() => build_weekly_trend_forward(bids, 3),
		[bids],
	);

	const regionDist = useMemo<RegionDistPoint[]>(() => build_region_dist(bids), [bids]);
	const kpi = useMemo<Kpi>(() => build_kpi(bids, wishlist), [bids, wishlist]);

	const filteredBids = useMemo(() => {
		if (filterMode === "new") return bids.filter(is_new_today);
		if (filterMode === "closingSoon") return bids.filter(is_closing_soon_3days);
		return [];
	}, [bids, filterMode]);

	const totalPages = Math.max(1, Math.ceil(filteredBids.length / pageSize));
	const safePage = Math.min(page, totalPages);

	const pagedBids = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return filteredBids.slice(start, start + pageSize);
	}, [filteredBids, safePage]);

    const pageWindowSize = 5;

    const windowStart = Math.floor((safePage - 1) / pageWindowSize) * pageWindowSize + 1;
    const windowEnd = Math.min(totalPages, windowStart + pageWindowSize - 1);

    const pageNumbers = useMemo(() => {
        const arr: number[] = [];
        for (let n = windowStart; n <= windowEnd; n++) arr.push(n);
        return arr;
    }, [windowStart, windowEnd]);

    const canPrevWindow = windowStart > 1;
    const canNextWindow = windowEnd < totalPages;

    const goPrevWindow = () => setPage(Math.max(1, windowStart - pageWindowSize));
    const goNextWindow = () => setPage(Math.min(totalPages, windowStart + pageWindowSize));

    return (
		<div className="space-y-8">
			{error ? (
				<div className="border rounded-2xl p-4 bg-red-50 text-red-700 text-sm">{error}</div>
			) : null}

			<SummaryCards
				loading={loading}
				kpi={kpi}
				onSelectNew={() => {
					setFilterMode("new");
					setPage(1);
				}}
				onSelectClosingSoon={() => {
					setFilterMode("closingSoon");
					setPage(1);
				}}
				onGoWishlist={() => navigate("/cart")}
			/>

			{filterMode ? (
				<div id="dashboard-focus" className="border dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-slate-800">
				<div className="flex items-center justify-between">
						<div className="font-semibold text-gray-900 dark:text-gray-100">
							{filterMode === "new" ? "오늘 시작한 신규 공고" : "3일 이내 마감 임박 공고"}
						</div>

						<button
							type="button"
							className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
							onClick={() => setFilterMode(null)}
						>
							닫기
						</button>
					</div>

					{pagedBids.length === 0 ? (
						<div className="mt-4 text-sm text-gray-500 dark:text-gray-400">해당 공고가 없습니다.</div>
					) : (
						<ul className="mt-4 divide-y dark:divide-slate-700">
							{pagedBids.map((b: any) => (
								<li key={String(b.bidId ?? b.id ?? b.realId ?? `${Math.random()}`)} className="py-3">
									<div className="font-medium text-gray-900 dark:text-gray-100">
										{String(b.title ?? b.name ?? "제목 없음")}
									</div>
									<div className="text-sm text-gray-500 dark:text-gray-400">
										{String(b.agency ?? b.organization ?? "")}
										{(b.bidStart || b.startDate)
                                            ? ` · 시작: ${format_date_ymd(String(b.bidStart ?? b.startDate))}`
											: ""}

										{(b.bidEnd || b.endDate)
                                            ? ` · 마감: ${format_date_ymd_hm(String(b.bidEnd ?? b.endDate))}`
											: ""}
									</div>
								</li>
							))}
                            {totalPages > 1 && (
                                <div className="mt-4 flex justify-center items-center gap-2 flex-wrap">
                                    {/* 페이지 묶음 이전 */}
                                    <button
                                        type="button"
                                        className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                                        disabled={!canPrevWindow}
                                        onClick={goPrevWindow}
                                    >
                                        이전
                                    </button>

                                    {/* 앞쪽 생략 표시 */}
                                    {windowStart > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setPage(1)}
                                                className={`px-3 py-1 border dark:border-slate-600 rounded-lg text-sm ${
                                                    safePage === 1 ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white dark:bg-slate-800 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                                }`}
                                            >
                                                1
                                            </button>
                                            <span className="px-1 text-gray-400">…</span>
                                        </>
                                    )}

                                    {/* 현재 윈도우(예: 1~5, 6~10...) */}
                                    {pageNumbers.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setPage(n)}
                                            className={`px-3 py-1 border dark:border-slate-600 rounded-lg text-sm ${
                                                n === safePage ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white dark:bg-slate-800 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}

                                    {/* 뒤쪽 생략 표시 */}
                                    {windowEnd < totalPages && (
                                        <>
                                            <span className="px-1 text-gray-400">…</span>
                                            <button
                                                type="button"
                                                onClick={() => setPage(totalPages)}
                                                className={`px-3 py-1 border dark:border-slate-600 rounded-lg text-sm ${
                                                    safePage === totalPages ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white dark:bg-slate-800 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                                }`}
                                            >
                                                {totalPages}
                                            </button>
                                        </>
                                    )}

                                    {/* 페이지 묶음 다음 */}
                                    <button
                                        type="button"
                                        className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                                        disabled={!canNextWindow}
                                        onClick={goNextWindow}
                                    >
                                        다음
                                    </button>
                                </div>
                            )}

                        </ul>
					)}
				</div>
			) : null}

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
				<MonthlyTrendChart loading={loading} data={monthlyTrend} />
				<RegionPieChart loading={loading} data={regionDist} />
			</div>

            {/* 맞춤 추천 공고 섹션 */}
            <RecommendedBidsSection />
		</div>
	);
}

function pick_list(res: unknown): unknown[] {
	if (Array.isArray(res)) return res;
	const anyRes = res as any;
	if (Array.isArray(anyRes?.data)) return anyRes.data;
	if (Array.isArray(anyRes?.data?.items)) return anyRes.data.items;
	if (Array.isArray(anyRes?.data?.content)) return anyRes.data.content;
	return [];
}

function to_date(s: string): Date | null {
	if (!s) return null;
	const d = new Date(s);
	if (!Number.isFinite(d.getTime())) return null;
	return d;
}

function month_key(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	return `${y}-${m}`;
}

function is_new_today(b: any): boolean {
	const s = String(b.bidStart ?? b.startDate ?? "");
	const d = to_date(s);
	if (!d) return false;
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
}

function is_closing_soon_3days(b: any): boolean {
	const s = String(b.bidEnd ?? b.endDate ?? "");
	const d = to_date(s);
	if (!d) return false;

	const now = new Date();
	const diffMs = d.getTime() - now.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays >= 0 && diffDays <= 3;
}

function build_kpi(bids: Bid[], wishlist: WishlistItem[]): Kpi {
    const now = new Date();
    const curMonth = month_key(now);

    const newBidsThisMonth = bids.filter((b: any) => {
        const s = String((b as any).bidStart ?? (b as any).startDate ?? "");
        const d = to_date(s);
        if (!d) return false;
        return month_key(d) === curMonth;
    }).length;

    const closingSoon3Days = bids.filter(is_closing_soon_3days).length;

    //  관심공고 bidId set
    const wishSet = new Set<number>(
        wishlist
            .map((w: any) => Number(w.bidId ?? w.id))
            .filter((x: number) => Number.isFinite(x)),
    );

    // 관심공고만 합산 (estimatePrice 우선)
    const totalExpectedAmount = bids.reduce((acc: number, b: any) => {
        const bidKey = Number(b.id ?? b.bidId);
        if (!Number.isFinite(bidKey) || !wishSet.has(bidKey)) return acc;

        const raw = b.estimatePrice ?? b.budget ?? b.baseAmount ?? b.amount ?? 0;
        const v = Number(raw);
        return Number.isFinite(v) ? acc + v : acc;
    }, 0);

    const totalExpectedAmountEok = `${Math.round(totalExpectedAmount / 100000000)}`;

    return {
        newBidsThisMonth,
        wishlistCount: wishlist.length,
        closingSoon3Days,
        totalExpectedAmountEok,
    };
}

function build_region_dist(bids: Bid[]): RegionDistPoint[] {
	const map = new Map<string, number>();

	bids.forEach((b: any) => {
		const r = String(b.region ?? b.area ?? b.location ?? "기타").trim() || "기타";
		map.set(r, (map.get(r) || 0) + 1);
	});

	return Array.from(map.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);
}

function build_weekly_trend_forward(bids: Bid[], monthsForward: number): MonthlyWeeklyTrend[] {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + monthsForward + 1, 1);

	const monthBuckets = new Map<string, WeeklyTrendPoint[]>();

	const cursor = new Date(start);
	while (cursor < end) {
		const mk = month_key(cursor);
		if (!monthBuckets.has(mk)) monthBuckets.set(mk, []);
		cursor.setDate(cursor.getDate() + 7);
	}

	bids.forEach((b: any) => {
		const s = String(b.bidStart ?? b.startDate ?? "");
		const d = to_date(s);
		if (!d) return;

		if (d < start || d >= end) return;

		const mk = month_key(d);
		const bucket = monthBuckets.get(mk);
		if (!bucket) return;

		const week = Math.ceil(d.getDate() / 7);
		const label = `${week}주`;

		const found = bucket.find((x) => x.week === label);
		if (found) found.value += 1;
        else bucket.push({ week: label, value: 1, range: "" });
	});

	const result = Array.from(monthBuckets.entries())
		.map(([month, points]) => ({
			month,
			points: normalize_weeks(points),
		}))
		.sort((a, b) => (a.month > b.month ? 1 : -1));

	return result;
}

function normalize_weeks(points: WeeklyTrendPoint[]): WeeklyTrendPoint[] {
    const map = new Map<string, number>();
    points.forEach((p) => map.set(p.week, p.value));

    const weeks = ["1주", "2주", "3주", "4주", "5주"];
    return weeks.map((w) => ({ week: w, value: map.get(w) || 0, range: "" }));
}
