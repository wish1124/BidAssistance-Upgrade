import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, FilterX, Plus, RefreshCw, Search } from "lucide-react";
import { fetchWishlist, toggleWishlist } from "../api/wishlist";
import { fetchBids, deleteBid } from "../api/bids";
import { getUserProfile } from "../api/users";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "./ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";
import { cn } from "./ui/utils";
import {is_reco_popup_suppressed_today, RecommendedBidsModal} from "./RecommendedBidsModal";

type SortKey = "deadline_asc" | "deadline_desc" | "title_asc";

type UiBid = {
	bidId: number;
	realId: string;
	title: string;
	agency: string;
	budget: string;
	deadline: string;
    start: string;
};

function parseDate(value: string) {
    if (!value) return null;

    const v = value.trim();

    // YYYY.MM.DD or YYYY-MM-DD (시간 없음)
    let m = v.match(/^(\d{4})[.-](\d{2})[.-](\d{2})$/);
    if (m) {
        const [, y, mo, d] = m;
        return new Date(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999);
    }

    // YYYY.MM.DD HH:mm or YYYY-MM-DD HH:mm
    m = v.match(/^(\d{4})[.-](\d{2})[.-](\d{2})\s+(\d{2}):(\d{2})$/);
    if (m) {
        const [, y, mo, d, h, mi] = m;
        return new Date(
            Number(y),
            Number(mo) - 1,
            Number(d),
            Number(h),
            Number(mi),
            0,
            0
        );
    }

    const parsed = new Date(v);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function getDateOnlyMs(ms: number) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function getDeadlineDateMs(deadline: string) {
    const d = parseDate(deadline);
    if (!d) return null;
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function getDDay(deadline: string, nowMs: number) {
    const endMs = getDeadlineDateMs(deadline);
    if (endMs == null) return null;

    const todayMs = getDateOnlyMs(nowMs);
    const diffDays = Math.round((endMs - todayMs) / 86400000);

    if (diffDays === 0) return "D-DAY";
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
}


function diffDays(nowMs: number, to: Date) {
	const ms = to.getTime() - nowMs;
	if (!Number.isFinite(ms)) return 0;
	if (ms >= 0) return Math.floor(ms / 86400000);
	return -Math.ceil((-ms) / 86400000);
}

function formatDday(deadline: string, nowMs: number) {
	const d = parseDate(deadline);
	if (!d) return null;
	const days = diffDays(nowMs, d);
	if (days === 0 && d.getTime() >= nowMs) return "D-DAY";
	if (days > 0) return `D-${days}`;
	return `D+${Math.abs(days)}`;
}

function isEnded(deadline: string, nowMs: number) {
    const endMs = getDeadlineDateMs(deadline);
    if (endMs == null) return false;
    return endMs < getDateOnlyMs(nowMs);
}

export function BidDiscovery({
	setGlobalLoading,
	showToast,
}: {
	setGlobalLoading: (v: boolean) => void;
	showToast: (msg: string, type: "success" | "error") => void;
}) {
	const location = useLocation();
	const urlQuery = useMemo(() => {
		const q = new URLSearchParams(location.search).get("q");
		return (q || "").trim();
	}, [location.search]);
    const urlMode = useMemo(() => {
        const m = new URLSearchParams(location.search).get("mode");
        return (m || "").trim(); // "new" | "closing" | ""
    }, [location.search]);
	const [wishlistSynced, setWishlistSynced] = useState(false);

	const [bids, setBids] = useState<UiBid[]>([]);
	const [keyword, setKeyword] = useState<string>(urlQuery);
	const [agency, setAgency] = useState<string>("all");
	const [sortKey, setSortKey] = useState<SortKey>("deadline_asc");
	const [page, setPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(10);

	const [addingId, setAddingId] = useState<number | null>(null);
	const [addedIds, setAddedIds] = useState<Set<number>>(() => new Set());
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const userIdStr = localStorage.getItem("userId");
        console.log("[BidDiscovery] userId from localStorage:", userIdStr);
        if (userIdStr) {
            getUserProfile(userIdStr).then(res => {
                console.log("[BidDiscovery] User role fetched:", res.data.role);
                if (res.data.role === 2) setIsAdmin(true);
            }).catch((err) => {
                console.error("[BidDiscovery] Failed to fetch user profile:", err);
            });
        }
    }, []);

	const [nowMs, setNowMs] = useState(() => Date.now());

	const navigate = useNavigate();
    type Mode = "" | "new" | "closing";
    const [mode, setMode] = useState<Mode>((urlMode as Mode) || "");
    useEffect(() => {
        setMode((urlMode as Mode) || "");
        setPage(1);
    }, [urlMode]);

	useEffect(() => {
		const t = window.setInterval(() => setNowMs(Date.now()), 30000);
		return () => window.clearInterval(t);
	}, []);

	useEffect(() => {
		setKeyword(urlQuery);
		setPage(1);
	}, [urlQuery]);

	const load = async () => {
		try {
			setGlobalLoading(true);
			const res = await fetchBids();
			const items = Array.isArray(res)
				? res
				: Array.isArray((res as any)?.data)
					? (res as any).data
					: Array.isArray((res as any)?.data?.items)
						? (res as any).data.items
						: [];

			const mapped: UiBid[] = items
				.map((it: any) => {
					const bidId = Number(it.bidId ?? it.id);
					const realId = String(it.realId ?? it.bidNo ?? "");
					if (!Number.isFinite(bidId)) return null;

					return {
						bidId,
						realId,
						title: String(it.title ?? it.name ?? ""),
						agency: String(it.agency ?? it.organization ?? ""),
						budget:
							it.baseAmount != null
								? String(it.baseAmount)
								: it.estimatePrice != null
									? String(it.estimatePrice)
									: "",
						deadline: String(it.bidEnd ?? it.endDate ?? ""),
                        start: String(it.bidStart ?? it.startDate ?? ""),

                    } as UiBid;
				})
				.filter(Boolean) as UiBid[];

			setBids(mapped);
		} catch {
			showToast("공고 목록을 불러오지 못했습니다.", "error");
			setBids([]);
		} finally {
			setGlobalLoading(false);
		}
	};

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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

	const agencies = useMemo(() => {
		const set = new Set<string>();
		bids.forEach((b) => {
			const a = (b.agency || "").trim();
			if (a) set.add(a);
		});
		return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
	}, [bids]);

	const filtered = useMemo(() => {
		const q = keyword.trim().toLowerCase();
        let list = bids.slice();

        list = list.filter((b) => !isEnded(b.deadline, nowMs));

        if (mode === "new") {
            list = list.filter((b) => isTodayStart(b.start, nowMs));
        }

        if (mode === "closing") {
            list = list.filter((b) => isClosingSoon(b.deadline, nowMs));
        }


        if (agency !== "all") {
			list = list.filter((b) => (b.agency || "").trim() === agency);
		}

		if (q) {
			list = list.filter((b) => {
				const hay = `${b.title} ${b.agency} ${b.budget} ${b.deadline} ${b.realId}`.toLowerCase();
				return hay.includes(q);
			});
		}

		list.sort((a, b) => {
			if (sortKey === "title_asc") return a.title.localeCompare(b.title);

			const ad = parseDate(a.deadline)?.getTime() ?? Number.POSITIVE_INFINITY;
			const bd = parseDate(b.deadline)?.getTime() ?? Number.POSITIVE_INFINITY;
			return sortKey === "deadline_desc" ? bd - ad : ad - bd;
		});

		return list;
	}, [bids, agency, keyword, sortKey, nowMs]);

	const total = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const safePage = Math.min(Math.max(1, page), totalPages);

	const paged = useMemo(() => {
		const start = (safePage - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [filtered, safePage, pageSize]);

	useEffect(() => {
		setPage(safePage);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [totalPages]);

	const resetFilters = () => {
		setKeyword("");
		setAgency("all");
		setSortKey("deadline_asc");
		setPage(1);
        navigate("/bids");
    };

	const addToCart = async (bidId: number) => {
		try {
			const userIdStr = localStorage.getItem("userId");
			const userId = Number(userIdStr);

			if (!userIdStr || !Number.isFinite(userId)) {
				showToast("로그인이 필요합니다. 다시 로그인 해주세요.", "error");
				return;
			}

			setAddingId(bidId);
			setGlobalLoading(true);

			const res = await toggleWishlist(userId, bidId);

			if (res.status !== "success") {
				showToast(res.message || "추가 실패", "error");
				return;
			}

			setAddedIds((prev) => {
				const next = new Set(prev);
				next.add(bidId);
				return next;
			});

			const items = await fetchWishlist(userId);
			setAddedIds(new Set(items.map((it) => it.bidId)));

			showToast("장바구니에 추가됨", "success");
		} catch (e: any) {
			showToast(e?.message || "추가 실패", "error");
		} finally {
			setGlobalLoading(false);
			setAddingId(null);
		}
	};

	const paginationNumbers = useMemo(() => {
		const numbers: number[] = [];
		const windowSize = 5;
		const half = Math.floor(windowSize / 2);
		let start = Math.max(1, safePage - half);
		let end = Math.min(totalPages, start + windowSize - 1);
		start = Math.max(1, end - windowSize + 1);
		for (let i = start; i <= end; i += 1) numbers.push(i);
		return numbers;
	}, [safePage, totalPages]);

    function formatDateTimeLines(dateStr: string) {
        if (!dateStr) return { dateLine: "-", timeLine: "" };

        const d = new Date(dateStr);
        if (!Number.isFinite(d.getTime())) return { dateLine: "-", timeLine: "" };

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");

        const dateLine = `${yyyy}-${mm}-${dd}`;

        const timeLine = d.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        return { dateLine, timeLine };
    }

    function startOfTodayMs(nowMs: number) {
        const d = new Date(nowMs);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    function endOfTodayMs(nowMs: number) {
        const d = new Date(nowMs);
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    }

    function addDaysMs(nowMs: number, days: number) {
        return nowMs + days * 86400000;
    }

    function isTodayStart(start: string, nowMs: number) {
        const d = parseDate(start);
        if (!d) return false;
        const s = startOfTodayMs(nowMs);
        const e = endOfTodayMs(nowMs);
        const t = d.getTime();
        return t >= s && t <= e;
    }

    function isClosingSoon(deadline: string, nowMs: number) {
        const endMs = getDeadlineDateMs(deadline);
        if (endMs == null) return false;

        const todayMs = getDateOnlyMs(nowMs);
        const diffDays = Math.round((endMs - todayMs) / 86400000);

        return diffDays >= 0 && diffDays <= 3;
    }


    const [recoOpen, setRecoOpen] = useState(false);
    useEffect(() => {
        if (!is_reco_popup_suppressed_today()) {
            setRecoOpen(true);
        }
    }, []);



	return (

		<div className="space-y-4">
            <RecommendedBidsModal
                open={recoOpen}
                onOpenChange={setRecoOpen}
            />
			<Card>
				<CardHeader className="space-y-1">
					<CardTitle className="text-xl">공고 찾기</CardTitle>
					<CardDescription>
						키워드/기관/정렬 기반으로 공고를 빠르게 찾고, 장바구니에 담아 관리하세요.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:flex-wrap">
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                            <div className="relative flex-1 min-w-[240px]">
								<Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={keyword}
									onChange={(e) => {
										setKeyword(e.target.value);
										setPage(1);
									}}
									placeholder={
										urlQuery ? `검색어: ${urlQuery}` : "키워드 검색 (공고명/기관/예산/마감)"
									}
									className="pl-8"
								/>
							</div>

							<Button variant="outline" onClick={() => void load()} className="shrink-0">
								<RefreshCw className="mr-2 size-4" />
								새로고침
							</Button>

							<Button variant="ghost" onClick={resetFilters} className="shrink-0">
								<FilterX className="mr-2 size-4" />
								필터 초기화
							</Button>
						</div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
							<Select
								value={agency}
								onValueChange={(v) => {
									setAgency(v);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-[220px]">
									<SelectValue placeholder="기관" />
								</SelectTrigger>
								<SelectContent>
									{agencies.map((a) => (
										<SelectItem key={a} value={a}>
											{a === "all" ? "전체 기관" : a}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
								<SelectTrigger className="w-[200px]">
									<SelectValue placeholder="정렬" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="deadline_asc">마감 빠른 순</SelectItem>
									<SelectItem value="deadline_desc">마감 늦은 순</SelectItem>
									<SelectItem value="title_asc">공고명 A→Z</SelectItem>
								</SelectContent>
							</Select>

							<div className="flex items-center gap-2 sm:ml-auto">
								<Select
									value={String(pageSize)}
									onValueChange={(v) => {
										setPageSize(Number(v));
										setPage(1);
									}}
								>
									<SelectTrigger className="w-[160px]">
										<SelectValue placeholder="페이지 크기" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="10">10개씩</SelectItem>
										<SelectItem value="20">20개씩</SelectItem>
										<SelectItem value="50">50개씩</SelectItem>
									</SelectContent>
								</Select>

								<div className="text-sm text-muted-foreground">
									총 <span className="font-medium text-foreground">{total}</span>건
								</div>
							</div>
						</div>
					</div>

                            <div className="rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                        <div className="p-2 border-b flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2 pl-2">
                                <span className="text-sm text-muted-foreground">
                                    {selectedIds.size}개 선택됨
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pr-2">
                                {selectedIds.size > 0 ? (
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8"
                                        onClick={() => {
                                            const ids = Array.from(selectedIds).join(",");
                                            navigate(`/compare?ids=${ids}`);
                                        }}
                                    >
                                        비교하기 ({selectedIds.size})
                                    </Button>
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        공고를 선택하여 비교하기
                                    </span>
                                )}
                            </div>
                        </div>
                        <Table>
                            <TableHeader className="bg-slate-50/60">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[40px] pl-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const allIds = paged.map(b => b.bidId);
                                                    setSelectedIds(prev => new Set([...prev, ...allIds]));
                                                } else {
                                                    setSelectedIds(new Set());
                                                }
                                            }}
                                            checked={paged.length > 0 && paged.every(b => selectedIds.has(b.bidId))}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[120px]">마감</TableHead>
                                    <TableHead>공고명</TableHead>
                                    <TableHead className="w-[220px]">발주기관</TableHead>
                                    <TableHead className="w-[160px] pr-6 text-center">예산</TableHead>
                                    <TableHead className="w-[140px] text-center">상태</TableHead>
                                    <TableHead className="w-[180px] pr-6 text-center">액션</TableHead>
                                </TableRow>
                            </TableHeader>

							<TableBody>
								{paged.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
											조건에 맞는 공고가 없습니다.
										</TableCell>
									</TableRow>
								) : (
									paged.map((b) => {
                                        const dday = getDDay(b.deadline, nowMs);
										const alreadyAdded = addedIds.has(b.bidId);

										const statusVariant = dday === "D-DAY" ? "destructive" : "secondary";
										const statusLabel =
											dday === "D-DAY" ? "오늘 마감" : dday ? "진행중" : "확인 필요";

										return (
											<TableRow
												key={`${b.bidId}-${b.realId}`}
												className="cursor-pointer"
												onClick={() => navigate(`/bids/${b.bidId}`)}
											>
                                                <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300"
                                                        checked={selectedIds.has(b.bidId)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setSelectedIds(prev => {
                                                                const next = new Set(prev);
                                                                if (checked) next.add(b.bidId);
                                                                else next.delete(b.bidId);
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                </TableCell>
												<TableCell className="whitespace-normal">
													<div className="flex flex-col">
														{(() => {
															const { dateLine, timeLine } = formatDateTimeLines(b.deadline);

															return (
																<div className="flex flex-col">
																	<span className="text-sm font-medium">{dday || dateLine}</span>

																	{dday ? (
																		<span className="text-xs text-muted-foreground">
																			{dateLine} <br /> {timeLine}
																		</span>
																	) : (
																		timeLine && (
																			<span className="text-xs text-muted-foreground">{timeLine}</span>
																		)
																	)}
																</div>
															);
														})()}
													</div>
												</TableCell>

												<TableCell className="whitespace-normal">
													<div className="line-clamp-2 font-medium">{b.title}</div>
													<div className="text-xs text-muted-foreground">{b.realId}</div>
												</TableCell>

												<TableCell className="whitespace-normal">
													<div className="line-clamp-2">{b.agency}</div>
												</TableCell>

												<TableCell className="pr-6 text-right tabular-nums">
													{Number(b.budget).toLocaleString()}
												</TableCell>

												<TableCell className="text-center">
													<Badge variant={statusVariant} className="px-2.5">
														{statusLabel}
													</Badge>
												</TableCell>

												<TableCell className="pr-6">
													<div className="flex justify-end gap-2">
                                                        {isAdmin && (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-9 rounded-xl"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!window.confirm("삭제하시겠습니까?")) return;
                                                                    try {
                                                                        await deleteBid(b.bidId);
                                                                        showToast("삭제되었습니다", "success");
                                                                        void load(); // Reload list
                                                                    } catch {
                                                                        showToast("삭제 실패", "error");
                                                                    }
                                                                }}
                                                            >
                                                                삭제
                                                            </Button>
                                                        )}
														<Button
															variant="outline"
															size="sm"
															className="h-9 rounded-xl"
															onClick={(e) => {
																e.stopPropagation();
																navigate(`/bids/${b.bidId}`);
															}}
														>
															<Eye className="mr-2 size-4" />
															상세
														</Button>

														<Button
															size="sm"
															disabled={addingId === b.bidId || !wishlistSynced}
															className={cn("h-9 rounded-xl", alreadyAdded && "opacity-70")}
															onClick={(e) => {
																e.stopPropagation();

																if (!wishlistSynced) {
																	showToast(
																		"장바구니 상태를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.",
																		"error",
																	);
																	return;
																}

																if (alreadyAdded) {
																	showToast("이미 장바구니에 담긴 공고입니다.", "success");
																	return;
																}

																void addToCart(b.bidId);
															}}
														>
															<Plus className="mr-2 size-4" />
															{alreadyAdded ? "담김" : "담기"}
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>

					{totalPages > 1 && (
						<div className="border-t py-3">
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											href="#"
											onClick={(e) => {
												e.preventDefault();
												setPage((p) => Math.max(1, p - 1));
											}}
										/>
									</PaginationItem>

									{paginationNumbers.map((n) => (
										<PaginationItem key={n}>
											<PaginationLink
												href="#"
												isActive={n === safePage}
												onClick={(e) => {
													e.preventDefault();
													setPage(n);
												}}
											>
												{n}
											</PaginationLink>
										</PaginationItem>
									))}

									<PaginationItem>
										<PaginationNext
											href="#"
											onClick={(e) => {
												e.preventDefault();
												setPage((p) => Math.min(totalPages, p + 1));
											}}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
