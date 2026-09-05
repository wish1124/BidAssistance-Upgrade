import { api } from "./client";

export type ApiStatus = "success" | "error";

export interface ApiResponse<T = unknown> {
	status: ApiStatus;
	message?: string;
	data?: T;
}

export interface AlarmItem {
	alarmId: number;
	userId: number;
	bidId: number;
	content: string;
	alarmType?: string;
	bidName?: string;
	date: string;
}

export interface AlarmListData {
	items: AlarmItem[];
}

function assertSuccess<T>(res: ApiResponse<T>, fallbackMsg: string): T {
	if (res.status !== "success") throw new Error(res.message || fallbackMsg);

	return (res.data as T) ?? (undefined as unknown as T);
}


export async function fetchAlarms(userId: number | string): Promise<AlarmItem[]> {
	const res = await api<ApiResponse<AlarmItem[] | AlarmListData>>(`/alarms/${userId}`);
	const data = assertSuccess(res, "알림 목록을 불러오지 못했습니다.");

	if (Array.isArray(data)) return data;
	return data?.items ?? [];
}


export async function deleteAlarm(alarmId: number | string): Promise<{ message?: string }> {
	const res = await api<ApiResponse>(`/alarms/${alarmId}`, { method: "DELETE" });

	if (res.status !== "success") throw new Error(res.message || "알림 삭제에 실패했습니다.");
	return { message: res.message };
}


export async function sendAlarmEmail(payload: {
	email: string;
	subject: string;
	content: string;
}): Promise<{ message?: string }> {
	const res = await api<ApiResponse>("/alarms/email", {
		method: "POST",
		body: JSON.stringify(payload),
	});
	if (res.status !== "success") throw new Error(res.message || "이메일 알림 발송에 실패했습니다.");
	return { message: res.message };
}


export async function sendUserEmailNotify(payload: {
	email: string;
	text: string;
}): Promise<{ message?: string }> {
	const res = await api<ApiResponse>("/users/email_notify", {
		method: "POST",
		body: JSON.stringify(payload),
	});
	if (res.status !== "success") throw new Error(res.message || "이메일 알림 전송에 실패했습니다.");
	return { message: res.message };
}


export async function sendUserNotification(payload: {
	user_id: number;
	text: string;
}): Promise<{ message?: string }> {
	const res = await api<ApiResponse>("/users/notification", {
		method: "POST",
		body: JSON.stringify(payload),
	});
	if (res.status !== "success") throw new Error(res.message || "알림 전송에 실패했습니다.");
	return { message: res.message };
}
