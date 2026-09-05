import { api } from "./client";
import type { WishlistItem } from "../types/wishlist";
import type { BidStage } from "../types/bid";
import { bid_stage_from_code, bid_stage_to_code } from "../types/bid";

type ApiBase<T> = {
	status: "success" | "error";
	message?: string;
	data?: T;
};

type AnyObj = Record<string, any>;

function to_int(v: any): number {
	if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
	if (typeof v === "string") {
		const s = v.trim();
		if (!s) return NaN;
		if (/^\d+$/.test(s)) return Number(s);
		const digits = s.replace(/[^\d]/g, "");
		if (digits) return Number(digits);
	}
	return NaN;
}

function require_pos_int(v: any, label: string): number {
	const n = to_int(v);
	if (!Number.isFinite(n) || n <= 0) throw new Error(`${label}가 올바르지 않습니다.`);
	return n;
}

function ensure_success<T extends ApiBase<any>>(res: T): T {
	if (res && res.status === "error") throw new Error(res.message || "요청에 실패했습니다.");
	return res;
}

function pick_list(res: any): any[] {
	const data = res?.data;
	if (Array.isArray(data)) return data;
	if (Array.isArray(data?.items)) return data.items;
	if (Array.isArray(data?.content)) return data.content;
	return [];
}

function pick_bid(source: AnyObj): AnyObj {
	return (
		source?.bid ??
		source?.bidDto ??
		source?.bidInfo ??
		source?.bid_info ??
		source?.bid_detail ??
		source ??
		{}
	);
}

function to_string(v: any): string {
	if (v === null || v === undefined) return "";
	return String(v);
}

function parse_stage(v: any): BidStage {
	return bid_stage_from_code(v);
}

function parse_wishlist_item(userId: number, raw: AnyObj): WishlistItem {
	const bid = pick_bid(raw);

	const id = to_int(raw.id);
	const uid = to_int(raw.userId ?? userId);
	const bidId = to_int(raw.bidId ?? bid.id ?? raw.bid_id ?? raw.bidID);

	return {
		id: Number.isFinite(id) ? id : -1,
		userId: Number.isFinite(uid) ? uid : userId,
		bidId: Number.isFinite(bidId) ? bidId : -1,
		stage: parse_stage(raw.stage),

		decidedAt: raw.decidedAt ? to_string(raw.decidedAt) : undefined,
		submittedAt: raw.submittedAt ? to_string(raw.submittedAt) : undefined,
		resultAt: raw.resultAt ? to_string(raw.resultAt) : undefined,
		memo: raw.memo ? to_string(raw.memo) : undefined,

		realId: to_string(bid.realId ?? bid.bidRealId ?? bid.real_id ?? ""),
		title: to_string(bid.name ?? bid.title ?? ""),
		agency: to_string(bid.organization ?? bid.agency ?? ""),
		baseAmount: bid.estimatePrice ?? bid.baseAmount ?? "",
		bidStart: to_string(bid.startDate ?? bid.bidStart ?? ""),
		bidEnd: to_string(bid.endDate ?? bid.bidEnd ?? ""),
		openTime: to_string(bid.openDate ?? bid.openTime ?? ""),
		region: to_string(bid.region ?? ""),
	};
}

export async function fetchWishlist(userId: number): Promise<WishlistItem[]> {
	const uid = require_pos_int(userId, "userId");
	const res = (await api<ApiBase<any>>(`/wishlist/${uid}`, { method: "GET" })) as ApiBase<any>;
	const ok = ensure_success(res);
	const list = pick_list(ok);
	return list.map((it) => parse_wishlist_item(uid, it)).filter((x) => x.bidId > 0);
}

type ToggleResponse = {
	status: "success" | "error";
	message?: string;
};

export async function toggleWishlist(userId: number, bidId: number): Promise<ToggleResponse> {
	const uid = require_pos_int(userId, "userId");
	const b = require_pos_int(bidId, "bidId");
	const res = (await api(`/wishlist/toggle?userId=${uid}&bidId=${b}`, {
		method: "POST",
	})) as ToggleResponse;
	return ensure_success(res as any) as ToggleResponse;
}

type UpdateWishlistResponse = {
	status: "success" | "error";
	message?: string;
	data?: any;
};

async function patch_stage(userId: number, bidId: number, stage: BidStage): Promise<UpdateWishlistResponse> {
	const uid = require_pos_int(userId, "userId");
	const b = require_pos_int(bidId, "bidId");
	const code = bid_stage_to_code(stage);

	const res = (await api(`/wishlist/stage/${uid}/${b}?stage=${code}`, {
		method: "PATCH",
	})) as UpdateWishlistResponse;

	return ensure_success(res as any) as UpdateWishlistResponse;
}

async function patch_memo_fallback(
	userId: number,
	bidId: number,
	wishlistId: number | undefined,
	memo: string,
): Promise<UpdateWishlistResponse> {
	const uid = require_pos_int(userId, "userId");
	const b = require_pos_int(bidId, "bidId");
	const body: Record<string, any> = { memo };

	try {
		const res = (await api(`/wishlist?userId=${uid}&bidId=${b}`, {
			method: "PATCH",
			body: JSON.stringify(body),
		})) as UpdateWishlistResponse;
		return ensure_success(res as any) as UpdateWishlistResponse;
	} catch {}

	if (wishlistId && wishlistId > 0) {
		const wid = require_pos_int(wishlistId, "wishlistId");
		const res = (await api(`/wishlist/${wid}`, {
			method: "PATCH",
			body: JSON.stringify(body),
		})) as UpdateWishlistResponse;
		return ensure_success(res as any) as UpdateWishlistResponse;
	}

	throw new Error("메모 업데이트 엔드포인트를 찾지 못했습니다.");
}

export async function updateWishlist(params: {
	userId: number;
	bidId: number;
	wishlistId?: number;
	stage?: BidStage;
	memo?: string;
}): Promise<UpdateWishlistResponse> {
	const hasStage = params.stage !== undefined;
	const hasMemo = params.memo !== undefined;

	if (hasStage && !hasMemo) {
		return await patch_stage(params.userId, params.bidId, params.stage as BidStage);
	}

	if (!hasStage && hasMemo) {
		return await patch_memo_fallback(
			params.userId,
			params.bidId,
			params.wishlistId,
			String(params.memo),
		);
	}

	if (hasStage && hasMemo) {
		await patch_stage(params.userId, params.bidId, params.stage as BidStage);
		return await patch_memo_fallback(
			params.userId,
			params.bidId,
			params.wishlistId,
			String(params.memo),
		);
	}

	throw new Error("업데이트할 값이 없습니다.");
}
