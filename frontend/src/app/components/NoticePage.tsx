import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Paperclip, Search } from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

import { fetch_notices_from_community, type NoticeCategory, type NoticeListItem } from "../api/notices";

type FilterCategory = "all" | NoticeCategory;

const CATEGORY_LABEL: Record<FilterCategory, string> = {
	all: "전체",
	service: "서비스",
	update: "업데이트",
	maintenance: "점검",
	policy: "정책",
};

const CATEGORY_BADGE: Record<NoticeCategory, string> = {
	service: "서비스",
	update: "업데이트",
	maintenance: "점검",
	policy: "정책",
};

function normalize_text(s: string) {
	return (s || "").trim().toLowerCase();
}

function matches_query(n: NoticeListItem, q: string) {
	if (!q) return true;
	const hay = [n.title, n.author, n.date, ...(n.keywords ?? [])].join(" ");
	return normalize_text(hay).includes(q);
}

export function NoticePage() {
	const navigate = useNavigate();

	const [category, setCategory] = useState<FilterCategory>("all");
	const [query, setQuery] = useState("");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [items, setItems] = useState<NoticeListItem[]>([]);

	const q = useMemo(() => normalize_text(query), [query]);

	useEffect(() => {
		let alive = true;

		(async () => {
			setLoading(true);
			setError(null);
			try {
				const list = await fetch_notices_from_community();
				if (!alive) return;
				setItems(list);
			} catch (e: any) {
				if (!alive) return;
				setError(e?.message || "공지사항을 불러오지 못했습니다.");
				setItems([]);
			} finally {
				if (!alive) return;
				setLoading(false);
			}
		})();

		return () => {
			alive = false;
		};
	}, []);

	const notices = useMemo(() => {
		const filtered = items
			.filter((n) => (category === "all" ? true : n.category === category))
			.filter((n) => matches_query(n, q));

		// pinned는 현재 false지만(확장 대비) 로직은 유지
		filtered.sort((a, b) => {
			const ap = a.pinned ? 1 : 0;
			const bp = b.pinned ? 1 : 0;
			if (ap !== bp) return bp - ap;
			return (b.date || "").localeCompare(a.date || "");
		});

		return filtered;
	}, [items, category, q]);

	const onSearch = (e: React.FormEvent) => {
		e.preventDefault();
	};

	return (
		<div className="w-full max-w-[1100px] space-y-6">
			<Card className="border-slate-200/70">
				<CardHeader className="space-y-3 pb-6">
					<div className="flex items-start gap-3">
						<div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
							<Megaphone className="h-5 w-5" />
						</div>
						<div className="min-w-0">
							<CardTitle className="text-xl">공지사항</CardTitle>
							<CardDescription className="mt-1">
								서비스 업데이트, 점검, 정책 변경 소식을 확인하세요.
							</CardDescription>
						</div>
					</div>

					<form onSubmit={onSearch} className="flex items-center gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
							<Input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="예: 점검, 업데이트, 정책, 관리자"
								className="h-11 pl-9 bg-slate-50"
							/>
						</div>
						<Button type="submit" className="h-11 px-5">
							검색
						</Button>
					</form>

					<div className="flex flex-wrap gap-2">
						{(Object.keys(CATEGORY_LABEL) as FilterCategory[]).map((k) => {
							const active = k === category;
							return (
								<Button
									key={k}
									type="button"
									size="sm"
									variant={active ? "default" : "outline"}
									className={active ? "" : "bg-white"}
									onClick={() => setCategory(k)}
								>
									{CATEGORY_LABEL[k]}
								</Button>
							);
						})}
					</div>
				</CardHeader>
			</Card>

			{loading ? (
				<Card>
					<CardContent className="py-16 text-center text-muted-foreground">불러오는 중...</CardContent>
				</Card>
			) : error ? (
				<Card>
					<CardContent className="py-10 space-y-3 text-center">
						<div className="text-sm text-red-600">{error}</div>
						<Button variant="outline" onClick={() => window.location.reload()}>
							새로고침
						</Button>
					</CardContent>
				</Card>
			) : notices.length === 0 ? (
				<Card>
					<CardContent className="py-16 text-center text-muted-foreground">
						등록된 공지사항이 없습니다.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{notices.map((n) => (
						<Card
							key={n.id}
							className={n.pinned ? "border-blue-300/70 shadow-sm" : "border-slate-200/70"}
						>
							<CardContent className="p-5 flex items-center justify-between gap-4">
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
										{n.pinned && <Badge className="bg-slate-900 text-white">고정</Badge>}
										<Badge variant="secondary">{CATEGORY_BADGE[n.category]}</Badge>
										<span>{n.date}</span>
										<span className="text-slate-300">•</span>
										<span>{n.author}</span>
										{n.attachments > 0 && (
											<span className="inline-flex items-center gap-1">
												<span className="text-slate-300">•</span>
												<Paperclip className="h-4 w-4" />
												첨부 {n.attachments}개
											</span>
										)}
									</div>
									<div className="font-semibold text-slate-900 truncate">{n.title}</div>
								</div>

								<Button
									variant="outline"
									className="shrink-0"
									onClick={() => navigate(`/notice/${n.id}`)}
								>
									상세
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
