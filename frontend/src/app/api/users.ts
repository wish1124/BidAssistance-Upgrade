import { api } from "./client";

export type ApiStatus = "success" | "error";

export interface ApiResponse<T> {
	status: ApiStatus;
	message?: string;
	data: T;
}

export interface UserProfile {
	id?: number;
	userId: string;
	name: string;
	nickname?: string;
	email: string;
	role: number;
	bid?: unknown;
}

export function getUserProfile(userId: string) {
	return api<ApiResponse<UserProfile>>(`/users/${userId}`);
}

export function updateUserProfile(
	userId: string,
	payload: { email: string; name: string; role: number; password?: string },
) {
	return api<ApiResponse<{ message?: string }>>(`/users/${userId}`, {
		method: "PUT",
		body: JSON.stringify(payload),
	});
}

export function deleteUserAccount(userId: string) {
	return api<ApiResponse<{ message?: string }>>(`/users/${userId}`, {
	});

}export function deleteUser(userId: string | number) {
    return api<{ status: "success" | "error"; message: string; data?: any }>(`/users/${userId}`, {
        method: "DELETE",
    });
}

export function checkLogin() {
	return api<ApiResponse<UserProfile>>("/users/checkLogin", { method: "GET" });
}

