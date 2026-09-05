import { api } from "./client";

export type ApiStatus = "success" | "error";

export interface ApiResponse<T> {
	status: ApiStatus;
	message?: string;
	data?: T;
}

export type CompanyInfo = {
	companyId?: number;
	id?: number;
	userId?: number | string;
	name: string;
	position?: string;
};

function to_str(v: unknown): string {
	if (typeof v === "string") return v;
	if (v == null) return "";
	return String(v);
}

function to_num(v: unknown): number | undefined {
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}

function normalize_company(raw: any): CompanyInfo {
	const obj = raw && typeof raw === "object" ? raw : {};
	return {
		companyId: to_num(obj.companyId ?? obj.company_id),
		id: to_num(obj.id),
		userId: obj.userId ?? obj.user_id,
		name: to_str(obj.name),
		position: to_str(obj.position),
	};
}

function pick_list(res: any): any[] {
	if (Array.isArray(res)) return res;
	if (Array.isArray(res?.data)) return res.data;
	if (Array.isArray(res?.data?.items)) return res.data.items;
	if (Array.isArray(res?.data?.content)) return res.data.content;
	return [];
}

export async function fetchCompanies(): Promise<CompanyInfo[]> {
	const res = await api<any>("/company", { method: "GET" });
	return pick_list(res).map(normalize_company);
}

export async function getCompanyForUser(userId: string | number): Promise<CompanyInfo | null> {
	const uid = String(userId);
	const list = await fetchCompanies();

	const direct = list.find((c) => String(c.userId ?? "") === uid);
	if (direct) return direct;

	const byCompanyId = list.find((c) => String(c.companyId ?? "") === uid);
	if (byCompanyId) return byCompanyId;

	const byId = list.find((c) => String(c.id ?? "") === uid);
	if (byId) return byId;

	if (list.length === 1) return list[0];

	return null;
}

export function upsertCompany(payload: {
	id?: number;
	name: string;
	position?: string;
}) {
	return api<ApiResponse<CompanyInfo>>("/company", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function updateCompany(id: number, payload: { name: string; position?: string }) {
	return api<ApiResponse<CompanyInfo>>(`/company/${id}`, {
		method: "PUT",
		body: JSON.stringify(payload),
	});
}

