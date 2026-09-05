import { api } from "./client";
import type {
	ApiResponse,
	Post,
	PostListData,
	SortKey,
	PostCategory,
	Comment,
	Attachment,
	UserKeyword,
	Alarm,
} from "../types/community";

function toNum(v: any, fallback = 0) {
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
}

function toStr(v: any, fallback = "") {
	return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function isImageByName(name: string) {
	return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function pickAuthorId(raw: any): string | undefined {
	const v =
		raw?.authorId ??
		raw?.userId ??
		raw?.writerId ??
		raw?.memberId ??
		raw?.user?.id ??
		raw?.user?.userId ??
		raw?.member?.id;

	if (v == null) return undefined;
	const s = String(v);
	return s ? s : undefined;
}

function normalizeAttachment(a: any): Attachment {
	const name = toStr(a?.name ?? a?.fileName ?? a?.originalName ?? "file");
	const url = toStr(a?.url ?? a?.downloadUrl ?? "");
	return {
		id: toNum(a?.id ?? a?.fileId ?? a?.attachmentId ?? 0),
		name,
		type: toStr(a?.type ?? a?.mimeType ?? ""),
		url,
		size: toNum(a?.size ?? a?.fileSize ?? 0),
		isImage: !!a?.isImage || isImageByName(name) || url.startsWith("data:image"),
	};
}

function normalizeComment(raw: any): Comment {
	const id = toNum(raw?.id ?? raw?.commentId);
	if (!Number.isFinite(id) || id <= 0) {
		throw new Error(
			`댓글 ID가 올바르지 않습니다. (id=${String(raw?.id ?? raw?.commentId)})`,
		);
	}

	return {
		id,
		authorId: pickAuthorId(raw),
		authorName: toStr(raw?.authorName ?? raw?.userName ?? raw?.author ?? "—"),
		content: toStr(raw?.content ?? ""),
		createdAt: toStr(raw?.createdAt ?? raw?.commentCreatedAt ?? ""),
		likes: toNum(raw?.likes ?? raw?.likeCount ?? 0),
		likedByMe: !!raw?.likedByMe,
		isAdopted: !!raw?.isAdopted,
		userExpertLevel: toNum(raw?.userExpertLevel ?? 1),
	};
}

function normalizePostFromDetail(raw: any): Post {
	const id = toNum(raw?.id ?? raw?.postId);
	if (!Number.isFinite(id) || id <= 0) {
		throw new Error(
			`게시글 ID가 올바르지 않습니다. (id=${String(raw?.id ?? raw?.postId)})`,
		);
	}

	const attachments = (raw?.attachments ?? raw?.files ?? []).map(normalizeAttachment);

	return {
		id,
		title: toStr(raw?.title),
		content: toStr(raw?.content ?? ""),
		contentPreview: toStr(raw?.contentPreview ?? ""),
		category: raw?.category ?? "question",
		authorId: raw?.authorId != null ? String(raw.authorId) : pickAuthorId(raw),
		authorName: toStr(raw?.userName ?? raw?.authorName ?? raw?.writerName ?? "—"),
		authorExpertLevel: toNum(raw?.authorExpertLevel ?? 1),
		createdAt: toStr(raw?.createdAt),
		views: toNum(raw?.viewCount ?? raw?.views ?? 0),
		likes: toNum(raw?.likeCount ?? raw?.likes ?? 0),
		likedByMe: !!raw?.likedByMe,
		comments: (raw?.comments ?? []).map(normalizeComment),
		commentCount: toNum(raw?.commentCount ?? (raw?.comments?.length ?? 0)),
		attachmentCount: toNum(raw?.attachmentCount ?? raw?.fileCount ?? attachments.length),
		attachments,
		adoptedCommentId: raw?.adoptedCommentId ?? undefined,
	};
}

function yn_to_bool(v: any): boolean | null {
	if (typeof v === "boolean") return v;
	if (typeof v === "number") return v !== 0;
	if (typeof v !== "string") return null;
	const s = v.trim().toUpperCase();
	if (s === "Y" || s === "YES" || s === "TRUE" || s === "T") return true;
	if (s === "N" || s === "NO" || s === "FALSE" || s === "F") return false;
	return null;
}

function pickListAttachments(it: any): any[] {
	return (
		it?.attachments ??
		it?.files ??
		it?.fileList ??
		it?.attachFiles ??
		it?.attachmentList ??
		it?.attachedFiles ??
		it?.uploadFiles ??
		[]
	);
}

function pickListAttachmentCount(it: any, list: any[]): number {
	const raw =
		it?.attachmentCount ??
		it?.attachmentsCount ??
		it?.attachmentCnt ??
		it?.attachCount ??
		it?.attachCnt ??
		it?.fileCount ??
		it?.filesCount ??
		it?.fileCnt ??
		it?.uploadCount ??
		it?.uploadCnt;

	const n = Number(raw);
	if (Number.isFinite(n) && n >= 0) return n;

	const b1 = yn_to_bool(it?.hasAttachment ?? it?.hasAttachments ?? it?.hasFile);
	if (b1 === true) return 1;

	const b2 = yn_to_bool(it?.fileYn ?? it?.fileYN ?? it?.attachYn ?? it?.attachYN ?? it?.attchYn);
	if (b2 === true) return 1;

	const idLike =
		it?.atchFileId ??
		it?.attachmentId ??
		it?.fileId ??
		it?.fileGroupId ??
		it?.fileGroup ??
		it?.attachGroupId ??
		it?.attachFileId;
	if (idLike != null && String(idLike).trim() !== "" && String(idLike).trim() !== "0") return 1;

	if (Array.isArray(list) && list.length > 0) return list.length;

	return 0;
}

function normalizePostFromList(it: any): Post {
	const id = toNum(it?.postId ?? it?.id);
	if (!Number.isFinite(id) || id <= 0) {
		throw new Error(`목록 게시글 ID 오류 (id=${String(it?.postId ?? it?.id)})`);
	}

	const listAttachments = pickListAttachments(it);
	const attachmentCount = pickListAttachmentCount(it, listAttachments);

	return {
		id,
		title: toStr(it?.title),
		contentPreview: toStr(it?.contentPreview ?? it?.preview ?? ""),
		category: it?.category ?? "question",
		authorId: it?.authorId != null ? String(it.authorId) : pickAuthorId(it),
		authorName: toStr(it?.authorName ?? it?.userName ?? it?.writerName ?? "—"),
		authorExpertLevel: toNum(it?.authorExpertLevel ?? 1),
		createdAt: toStr(it?.createdAt),
		views: toNum(it?.views ?? it?.viewCount ?? 0),
		likes: toNum(it?.likes ?? it?.likeCount ?? 0),
		likedByMe: !!it?.likedByMe,
		commentCount: toNum(it?.commentCount ?? 0),
		comments: it?.comments ?? [],
		attachmentCount,
		attachments: Array.isArray(it?.attachments) ? it.attachments : [],
		content: it?.content,
		adoptedCommentId: it?.adoptedCommentId ?? undefined,
	};
}

function qs(params: Record<string, string | number | undefined>) {
	const sp = new URLSearchParams();
	Object.entries(params).forEach(([k, v]) => {
		if (v === undefined || v === "") return;
		sp.set(k, String(v));
	});
	const s = sp.toString();
	return s ? `?${s}` : "";
}

function unwrap<T>(res: ApiResponse<T>): T {
	if (res.status !== "success") throw new Error(res.message || "요청에 실패했습니다.");
	return res.data;
}

export function fetchCommunityPosts(opts: {
	category?: PostCategory;
	q?: string;
	sort?: SortKey;
	page?: number;
	size?: number;
}) {
	return api<ApiResponse<PostListData>>(
		`/board/posts${qs({
			category: opts.category,
			q: opts.q,
			sort: opts.sort,
			page: opts.page,
			size: opts.size,
		})}`,
	)
		.then(unwrap)
		.then((data: any) => {
			const items = (data?.items ?? []).map(normalizePostFromList);

			if ((import.meta as any)?.env?.DEV) {
				const sample = items.slice(0, 5).map((p: any) => ({
					id: p.id,
					title: p.title,
					attachmentCount: p.attachmentCount,
				}));

				console.debug("[community] list attachmentCount sample:", sample);
			}

			return { ...data, items };
		});
}

export function fetchCommunityPost(postId: number) {
	return api<ApiResponse<any>>(`/board/${postId}`)
		.then(unwrap)
		.then((raw) => normalizePostFromDetail(raw));
}

export function createCommunityPost(payload: {
	title: string;
	content: string;
	category: PostCategory;
	attachmentIds?: string[];
}) {
	return api<ApiResponse<any>>("/board", {
		method: "POST",
		body: JSON.stringify(payload),
	})
		.then(unwrap)
		.then((raw) => normalizePostFromDetail(raw));
}

export function updateCommunityPost(
	postId: number,
	payload: Partial<{
		title: string;
		content: string;
		category: PostCategory;
		attachmentIds: string[];
	}>,
) {
	return api<ApiResponse<any>>(`/board/${postId}`, {
		method: "POST",
		body: JSON.stringify(payload),
	})
		.then(unwrap)
		.then((raw) => normalizePostFromDetail(raw));
}

export function deleteCommunityPost(postId: number) {
	return api<ApiResponse<{ message?: string }>>(`/board/${postId}`, { method: "DELETE" }).then(unwrap);
}

export function likeCommunityPost(postId: number) {
	return api<ApiResponse<null>>(`/board/posts/${postId}/like`, { method: "POST" }).then(unwrap);
}

export function unlikeCommunityPost(postId: number) {
	return api<ApiResponse<null>>(`/board/posts/${postId}/dislike`, { method: "POST" }).then(unwrap);
}

export function fetchCommunityComments(boardId: number) {
	return api<ApiResponse<any[]>>(`/boards/${boardId}/comments`, { method: "GET" })
		.then(unwrap)
		.then((list) => (list ?? []).map(normalizeComment));
}

export function createCommunityComment(postId: number, content: string) {
	const userIdRaw = localStorage.getItem("userId");
	const userId = userIdRaw ? Number(userIdRaw) : NaN;
	if (!Number.isFinite(userId) || userId <= 0) {
		throw new Error("로그인이 필요합니다. (userId 없음)");
	}

	return api<ApiResponse<any>>(`/boards/${postId}/comments`, {
		method: "POST",
		body: JSON.stringify({ content, userId }),
	})
		.then(unwrap)
		.then(normalizeComment);
}

export function deleteCommunityComment(commentId: string) {
	const userId = localStorage.getItem("userId");
	if (!userId) throw new Error("로그인이 필요합니다.");

	return api<ApiResponse<{ message?: string }>>(`/comments/${commentId}?userId=${userId}`, {
		method: "DELETE",
	}).then(unwrap);
}

export async function uploadCommunityAttachments(files: File[]) {
	const fd = new FormData();
	files.forEach((f) => fd.append("files", f));

	const json = await api<ApiResponse<any[]>>("/board/attachments", {
		method: "POST",
		body: fd,
	});

	const rawList = unwrap(json) ?? [];
	return rawList.map(normalizeAttachment);
}


export async function fetchTrendingPosts(): Promise<Post[]> {
	const json = await api<ApiResponse<any[]>>("/board/trending");
	const rawList = unwrap(json) ?? [];
	return rawList.map(normalizePostFromList);
}


export async function adoptComment(postId: number, commentId: number): Promise<Comment> {
	const userId = localStorage.getItem("userId");
	if (!userId) throw new Error("로그인이 필요합니다.");

	const json = await api<ApiResponse<any>>(`/comments/${commentId}/adopt?userId=${userId}`, {
		method: "PUT",
	});
	return normalizeComment(unwrap(json));
}



export async function getUserKeywords(userId: number): Promise<UserKeyword[]> {
	const json = await api<ApiResponse<UserKeyword[]>>(`/keywords/${userId}`);
	return unwrap(json) ?? [];
}

export async function addUserKeyword(payload: {
	userId: number;
	keyword: string;
	minPrice?: number | null;
	maxPrice?: number | null;
}): Promise<string> {
	const json = await api<ApiResponse<string>>("/keywords", {
		method: "POST",
		body: JSON.stringify(payload),
	});
	return unwrap(json);
}

export async function deleteUserKeyword(id: number): Promise<string> {
	const json = await api<ApiResponse<string>>(`/keywords/${id}`, {
		method: "DELETE",
	});
	return unwrap(json);
}


export async function getMyAlarms(userId: number): Promise<Alarm[]> {
	const json = await api<ApiResponse<Alarm[]>>(`/alarms/${userId}`);
	return unwrap(json) ?? [];
}

export async function deleteAlarm(alarmId: number): Promise<string> {
	const json = await api<ApiResponse<string>>(`/alarms/${alarmId}`, {
		method: "DELETE",
	});
	return unwrap(json);
}
