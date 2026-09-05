export type Id = string | number;
export type PostId = number;
export type CommentId = number;
export type AttachmentId = number;
export type PostCategory = "question" | "info" | "review" | "discussion" | "notice";

export interface Attachment {
	id: AttachmentId;
	name: string;
	type: string;
	url: string;
	size: number;
	isImage: boolean;
}

export interface Comment {
	id:CommentId;
	authorId?: string;
	authorName: string;
	content: string;
	createdAt: string;
	likes: number;
	likedByMe?: boolean;
	isAdopted?: boolean;
	userExpertLevel?: number;
}

export interface Post {
	id: PostId;
	title: string;

	content?: string;
	contentPreview?: string;

	category: PostCategory;

	authorId?: string;
	authorName: string;
	authorExpertLevel?: number;

	createdAt: string;
	views: number;
	likes: number;
	likedByMe: boolean;

	commentCount?: number;
	comments?: Comment[];

	attachmentCount?: number;
	attachments?: Attachment[];

	adoptedCommentId?: number;
}

export type SortKey = "latest" | "popular" | "views" | "comments";

export interface PostListData {
	items: Post[];
	page: number;
	size: number;
	total: number;
	counts?: Record<"all" | PostCategory, number>;
}

export interface ApiResponse<T> {
	status: "success" | "error";
	message?: string;
	data: T;
}

export interface UserKeyword {
	id: number;
	userId?: number;
	keyword: string;
	minPrice: number | null;
	maxPrice: number | null;
}

export interface Alarm {
	alarmId: number;
	userId: number;
	bidId: number | null;
	bidName: string | null;
	content: string;
	alarmType: string;
	date: string;
}

