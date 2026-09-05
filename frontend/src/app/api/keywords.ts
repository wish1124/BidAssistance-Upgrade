import { api } from "./client";

export interface UserKeyword {
	id: number;
	userId: number;
	keyword: string;
	minPrice?: number;
	maxPrice?: number;
}

export async function fetchUserKeywords(userId: number | string): Promise<UserKeyword[]> {
	try {
		const res = await api<any>(`/keywords/${userId}`, { method: "GET" });
		if (Array.isArray(res?.data)) return res.data;
		if (Array.isArray(res)) return res;
		return [];
	} catch (e) {
		console.error("Failed to fetch keywords", e);
		return [];
	}
}

export async function addUserKeyword(payload: {
	userId: number | string;
	keyword: string;
	minPrice?: number;
	maxPrice?: number;
}) {
	return api<any>("/keywords", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function deleteUserKeyword(id: number) {
	return api<any>(`/keywords/${id}`, {
		method: "DELETE",
	});
}
