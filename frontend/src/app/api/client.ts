const DOMAIN = import.meta.env.VITE_API_URL || "";
const BASE_URL = `${DOMAIN}/api`;

type Auth401Mode = "logout" | "ignore";

type ApiConfig = {
	on401?: Auth401Mode;
};

function isFormData(body: unknown): body is FormData {
	return typeof FormData !== "undefined" && body instanceof FormData;
}

function attach_auth_header(headers: Record<string, string>) {
	const token = localStorage.getItem("accessToken");
	if (!token) return;
	if (headers.Authorization) return;
	headers.Authorization = `Bearer ${token}`;
}

function clear_auth_storage() {
	localStorage.removeItem("userId");
	localStorage.removeItem("userName");
	localStorage.removeItem("name");
	localStorage.removeItem("email");
	localStorage.removeItem("role");
	localStorage.removeItem("accessToken");
	localStorage.removeItem("refreshToken");
}

function looks_like_json(text: string) {
	const t = text.trim();
	if (!t) return false;
	return t.startsWith("{") || t.startsWith("[");
}

async function parse_success_response<T>(res: Response): Promise<T> {

	if (res.status === 204) return undefined as T;

	const content_type = (res.headers.get("content-type") || "").toLowerCase();

	const text = await res.text().catch(() => "");

	if (!text.trim()) return undefined as T;

	if (content_type.includes("application/json") || looks_like_json(text)) {
		try {
			return JSON.parse(text) as T;
		} catch {
			return text as unknown as T;
		}
	}

	return text as unknown as T;
}

export async function api<T>(
	url: string,
	options: RequestInit = {},
	config: ApiConfig = {},
): Promise<T> {
	const headers: Record<string, string> = {
		...((options.headers as Record<string, string>) ?? {}),
	};

	attach_auth_header(headers);

	if (options.body && isFormData(options.body)) {

	} else {
		if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
	}

	const res = await fetch(`${BASE_URL}${url}`, {
		...options,
		credentials: "include",
		headers,
	});

	if (res.status === 401) {

        if ((config.on401 ?? "ignore") === "logout") clear_auth_storage();
		throw new Error("인증이 필요합니다.");
	}

	if (!res.ok) {

		const msg = await res.text().catch(() => "");
		throw new Error(msg || "API 오류");
	}

	return await parse_success_response<T>(res);
}
