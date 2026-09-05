import { fetchCommunityPosts } from "./community";
import type { Post } from "../types/community";

export type NoticeCategory = "service" | "update" | "maintenance" | "policy";

export type NoticeListItem = {
	id: number;
	title: string;
	category: NoticeCategory;
	date: string;
	author: string;
	pinned: boolean;
	attachments: number;
	keywords: string[];
};

function to_ymd(raw: string) {
	if (!raw) return "";
	// already YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return raw.slice(0, 10);

	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function normalize_text(s: string) {
	return (s || "").trim().toLowerCase();
}


function infer_notice_category(p: Post): NoticeCategory {
	const t = normalize_text(p.title);
	const c = normalize_text(p.contentPreview || "");

	const hay = `${t} ${c}`;

	if (hay.includes("점검") || hay.includes("서버 점검") || hay.includes("maintenance")) return "maintenance";

	if (
		hay.includes("정책") ||
		hay.includes("약관") ||
		hay.includes("개인정보") ||
		hay.includes("privacy") ||
		hay.includes("terms")
	) {
		return "policy";
	}

	if (hay.includes("업데이트") || hay.includes("update") || hay.includes("개선") || hay.includes("릴리즈")) {
		return "update";
	}

	return "service";
}

function extract_keywords(p: Post): string[] {
	const t = (p.title || "").replace(/[()]/g, " ");
	const c = (p.contentPreview || "").replace(/[()]/g, " ");
	const tokens = `${t} ${c}`
		.split(/[\s,#|·•]+/g)
		.map((x) => x.trim())
		.filter(Boolean);

	const cleaned = tokens
		.filter((x) => x.length <= 12)
		.filter((x) => !/^\d+$/.test(x));

	const set = new Set<string>();
	for (const k of cleaned) {
		const key = k.toLowerCase();
		if (set.size >= 8) break;
		if (!set.has(key)) set.add(key);
	}
	return Array.from(set);
}

function to_notice_item(p: Post): NoticeListItem {
	return {
		id: p.id,
		title: p.title || "(제목 없음)",
		category: infer_notice_category(p),
		date: to_ymd(p.createdAt || ""),
		author: p.authorName || "관리자",

		pinned: false,
		attachments: Number.isFinite(p.attachmentCount) ? (p.attachmentCount as number) : 0,
		keywords: extract_keywords(p),
	};
}

export async function fetch_notices_from_community(): Promise<NoticeListItem[]> {
	const data = await fetchCommunityPosts({
		category: "notice" as any,
		sort: "recent" as any,
		page: 0,
		size: 50,
	});

	const items = (data?.items ?? []).map(to_notice_item);

	items.sort((a: NoticeListItem, b: NoticeListItem) => (b.date || "").localeCompare(a.date || ""));

	return items;
}
