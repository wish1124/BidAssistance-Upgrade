import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Sparkles, ArrowRight, Check, CheckCircle2 } from "lucide-react";

import { fetchBids, fetchRecommendedBids, type Bid } from "../../api/bids";
import { Button } from "../ui/button";
import { fetchWishlist, toggleWishlist } from "../../api/wishlist";

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

export function RecommendedBidsSection() {
	const navigate = useNavigate();

	const [bids, setBids] = useState<Bid[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [notice, setNotice] = useState<string | null>(null);
	const [togglingId, setTogglingId] = useState<number | null>(null);
    const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
    const [wishlistSynced, setWishlistSynced] = useState(false);


    useEffect(() => {
        const syncAddedFromServer = async () => {
            setWishlistSynced(false);

            const userIdStr = localStorage.getItem("userId");
            const userId = Number(userIdStr);

            if (!userIdStr || !Number.isFinite(userId)) {
                setAddedIds(new Set());
                setWishlistSynced(true);
                return;
            }

            try {
                const items = await fetchWishlist(userId);
                setAddedIds(new Set(items.map((it) => it.bidId)));
            } catch {
                setAddedIds(new Set());
            } finally {
                setWishlistSynced(true);
            }
        };

        void syncAddedFromServer();
    }, []);

	useEffect(() => {
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
                    // 로그인 유저는 추천 공고
                    list = await fetchRecommendedBids(userId);
                } else {
                    // 비로그인은 기본 공고 (혹은 빈 목록 처리 가능)
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
	}, []);

	const recommended = useMemo(() => {
		const now = Date.now();
        // 마감되지 않은 것만 필터링 후 5개만 노출
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
			.slice(0, 5); // 최대 5개 노출
	}, [bids]);

	const on_detail = (bid: Bid) => {
		const id = pick_bid_id(bid);
		if (!id) return;
		navigate(`/bids/${id}`);
	};

    const on_toggle_wishlist = async (bid: Bid) => {
        const raw = localStorage.getItem("userId");
        const userId = raw ? Number(raw) : NaN;

        if (!Number.isFinite(userId)) {
            setNotice("로그인이 필요합니다.");
            setTimeout(() => setNotice(null), 3000);
            return;
        }

        const bidId = pick_bid_id(bid);
        if (!bidId) return;

        // 이미 담긴 경우
        if (addedIds.has(bidId)) {
            setNotice("이미 담긴 공고입니다.");
            setTimeout(() => setNotice(null), 3000);
            return;
        }

        try {
            setNotice(null);
            setTogglingId(bidId);

            const res = await toggleWishlist(userId, bidId);

            if (res.status === "success") {
                setAddedIds(prev => new Set(prev).add(bidId)); // 담김 처리
                const items = await fetchWishlist(userId);
                setAddedIds(new Set(items.map((it) => it.bidId)));
                setNotice("장바구니에 반영했습니다.");
            } else {
                setNotice(res.message || "장바구니 처리에 실패했습니다.");
            }

            setTimeout(() => setNotice(null), 3000);
        } catch (e) {
            setNotice("장바구니 처리 중 오류가 발생했습니다.");
            setTimeout(() => setNotice(null), 3000);
        } finally {
            setTogglingId(null);
        }
    };


    if (loading) {
        return (
            <div className="border rounded-2xl p-6 bg-white space-y-4">
                <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="border rounded-2xl p-5 bg-slate-50">
                            <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
                            <div className="mt-2 h-3 w-40 bg-slate-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) return null; // 에러 시 조용히 숨김
    if (recommended.length === 0) return null; // 추천 없으면 숨김

	return (
		<div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="px-6 py-5 border-b flex items-center justify-between bg-[radial-gradient(1200px_400px_at_20%_-20%,rgba(59,130,246,0.1),transparent)]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">맞춤 추천 공고</h3>
                        <p className="text-sm text-slate-500">
                            최근 조회하신 이력을 바탕으로 엄선했습니다
                        </p>
                    </div>
                </div>
                {notice && (
                    <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {notice}
                    </div>
                )}
            </div>

            {/* Content List */}
            <div className="p-6 bg-slate-50/50">
                <div className="space-y-3">
                    {recommended.map((b) => {
                        const bidId = pick_bid_id(b);
                        const dleft = days_left(String((b as any).endDate ?? ""));
                        const dText = dleft === null ? "-" : dleft <= 0 ? "마감" : `D-${dleft}`;
                        const alreadyAdded = addedIds.has(bidId);

                        const badgeCls =
                            dleft !== null && dleft > 0
                                ? dleft <= 3
                                    ? "bg-orange-100 text-orange-700 border-orange-200"
                                    : "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-600 border-slate-200";

                        return (
                            <div
                                key={String(bidId || (b as any).realId || (b as any).RealId || b.name)}
                                className="group border border-slate-200 rounded-2xl p-5 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${badgeCls}`}>
                                                {dText}
                                            </span>
                                            <span className="text-xs text-slate-500 px-2 py-0.5 rounded-md border bg-slate-50">
                                                {(b as any).region || "전국"}
                                            </span>
                                        </div>
                                        <div className="font-bold text-slate-900 truncate text-lg group-hover:text-blue-700 transition-colors cursor-pointer" onClick={() => on_detail(b)}>
                                            {b.name}
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1 truncate">
                                            {(b as any).organization ?? "-"}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-medium text-slate-900 bg-slate-100 px-3 py-1 rounded-lg inline-block mb-3">
                                            {format_krw_eok((b as any).estimatePrice)}
                                        </div>
                                        <div className="flex items-center gap-2 justify-end">
                                            <Button
                                                variant={alreadyAdded ? "secondary" : "outline"}
                                                size="sm"
                                                className="h-9 px-3"
                                                disabled={togglingId === bidId || !wishlistSynced}
                                                onClick={() => {
                                                    if (!wishlistSynced) {
                                                        setNotice("장바구니 상태를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
                                                        setTimeout(() => setNotice(null), 3000);
                                                        return;
                                                    }

                                                    if (alreadyAdded) {
                                                        setNotice("이미 담긴 공고입니다.");
                                                        setTimeout(() => setNotice(null), 3000);
                                                        return;
                                                    }

                                                    void on_toggle_wishlist(b);
                                                }}
                                            >
                                                {togglingId === bidId ? "처리중" : alreadyAdded ? "담김" : "담기"}
                                            </Button>


                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm hover:shadow"
                                                onClick={() => on_detail(b)}
                                            >
                                                상세보기 <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-dashed pt-3">
                                   <div>
                                     마감일: {format_date_ymd(String((b as any).endDate ?? ""))}
                                   </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
		</div>
	);
}
