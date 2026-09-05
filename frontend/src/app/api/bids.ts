import { api } from "./client";

export interface Bid {
    bidId: number;
    id: number;
    realId: string;
    name: string;
    startDate: string;
    endDate: string;
    openDate: string;
    region: string;
    organization: string;
    bidURL: string;
    bidReportURL: string;
    estimatePrice : bigint;

    budget?: string;
    basicPrice?: bigint;
    agency?: string;
    bidRange?: number;

    minimumBidRate?: number | null;
    analysisResult?: string | null;
    bidDetail?: any | null;
    attachments?: any[];
}

function pickBidList(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    return [];
}

export async function fetchBids(): Promise<Bid[]> {
    const res = await api<any>("/bids");
    return pickBidList(res) as Bid[];
}

export async function fetchRecommendedBids(userId: number): Promise<Bid[]> {
    const res = await api<any>(`/bids/recommendations?userId=${userId}`);
    return pickBidList(res) as Bid[];
}

export async function logBidView(bidId: number, userId: number): Promise<void> {
    await api<void>(`/bids/${bidId}/log?userId=${userId}`, { method: 'POST' });
}

export async function fetchBidsBatch(ids: number[]): Promise<Bid[]> {
    if (ids.length === 0) return [];
    const res = await api<any>(`/bids/batch?ids=${ids.join(',')}`);
    return pickBidList(res) as Bid[];
}

export async function deleteBid(bidId: number): Promise<void> {
    await api<void>(`/bids/${bidId}`, { method: 'DELETE' });
}

export async function fetchBidHistory(userId: number | string): Promise<Bid[]> {
	try {
        const res = await api<any>(`/bids/history?userId=${userId}`, { method: "GET" });
        return pickBidList(res) as Bid[];
	} catch (e) {
		console.error("Failed to fetch bid history", e);
		return [];
	}
}
