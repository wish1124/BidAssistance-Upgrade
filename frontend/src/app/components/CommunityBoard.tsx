import { ChevronRight, Eye, MessageSquare, ThumbsUp } from "lucide-react";
import type { Post } from "../types/community";

import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ExpertBadge } from "./ExpertBadge";

import { mask_name } from "../utils/masking";
import {useEffect} from "react";

interface CommunityBoardProps {
    posts: Post[];
    onSelectPost: (post: Post) => void;
}

const categoryLabels: Record<NonNullable<Post["category"]>, string> = {
    question: "질문",
    info: "정보",
    review: "후기",
    discussion: "토론",
    notice: "공지",
};

function CategoryBadge({ category }: { category: Post["category"] }) {
    const cls =
        category === "question"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : category === "info"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : category === "review"
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-amber-200 bg-amber-50 text-amber-700";

    return (
        <Badge variant="outline" className={cls}>
            {categoryLabels[category]}
        </Badge>
    );
}

function formatCreatedAt(input: unknown) {
    if (!input) return "";
    if (input instanceof Date) {
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(input);
    }

    const s = String(input).trim();
    const normalized = s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return s;

    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(d);
}

function to_num(v: unknown): number {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return 0;
    if (n < 0) return 0;
    return Math.floor(n);
}

function get_attachment_count(post: Post): number {
    const anyPost = post as any;
    return to_num(
        post.attachmentCount ??
        (post.attachments?.length ?? 0) ??
        anyPost.fileCount ??
        (anyPost.files?.length ?? 0),
    );
}

function AttachmentMark({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <span
            className="shrink-0 inline-flex items-center gap-1 text-xs text-gray-400"
            aria-label={`첨부파일 ${count}개`}
            title={`첨부파일 ${count}개`}
        >
			<span aria-hidden="true">📎</span>
            {count > 1 ? <span className="tabular-nums">{count}</span> : null}
		</span>
    );
}
function isImageUrl(url: string) {
    return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url);
}

function isPdfUrl(url: string) {
    return /\.pdf(\?.*)?$/i.test(url);
}

function getThumbImageUrl(post: Post): string | null {
    // 1) attachments에서 이미지 찾기
    const atts = (post as any).attachments as any[] | undefined;
    if (Array.isArray(atts) && atts.length > 0) {
        const img = atts.find((a) => typeof a?.url === "string" && isImageUrl(a.url));
        if (img?.url) return img.url;

        // PDF만 있으면 썸네일 안 띄움
        const hasPdf = atts.some((a) => typeof a?.url === "string" && isPdfUrl(a.url));
        if (hasPdf) return null;
    }

    // 2) 목록에 attachments가 없을 때: 본문(content)에서 이미지 URL을 직접 추출
    //     contentPreview는 잘릴 수 있으니, 가능하면 content를 우선 사용
    const text = String((post as any).content ?? post.contentPreview ?? "");

    // 마크다운 이미지 ![](url) (닫는 괄호 없어도 어느 정도 잡기)
    const md = text.match(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)?/i) || text.match(/!\[]\((https?:\/\/[^\s)]+)\)?/i);
    const mdUrl = md?.[1];
    if (mdUrl && isImageUrl(mdUrl)) return mdUrl;

    // 그냥 이미지 URL (마크다운이 깨져도 잡히도록)
    const plain = text.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?\S*)?/i);
    if (plain?.[0]) return plain[0];

    return null;
}


/** 목록 미리보기에서 URL/마크다운 이미지/링크를 제거 */
function stripUrlsFromPreview(input: string) {
    let s = input ?? "";

    // 1) 마크다운 이미지 ![](url) / ![alt](url)
    //    - 닫는 괄호가 없어도 지우기 위해 \)? 허용
    s = s.replace(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)?/gi, "");
    s = s.replace(/!\[]\((https?:\/\/[^\s)]+)\)?/gi, "");

    // 2) 마크다운 링크 [text](url) -> text만 (닫는 괄호 없어도 처리)
    s = s.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)?/gi, "$1");

    // 3) 혹시 남아버린 조각들(![](, ![alt]( 같은)
    s = s.replace(/!\[[^\]]*]\(/g, "");
    s = s.replace(/!\[]\(/g, "");

    // 4) URL 제거
    s = s.replace(/https?:\/\/\S+/gi, "");

    // 5) 남는 괄호/공백 정리
    s = s.replace(/[()]/g, " ");
    s = s.replace(/\s{2,}/g, " ").trim();

    return s;
}


function ImageThumb({ url }: { url: string }) {
    return (
        <img
            src={url}
            alt=""
            className="h-8 w-8 rounded object-cover border border-gray-200 shrink-0"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
        />
    );
}


export function CommunityBoard({ posts, onSelectPost }: CommunityBoardProps) {
    // useEffect(() => {
    //     console.log(
    //         posts.map(p => ({ id: p.id, category: p.category, raw: p }))
    //     );
    // }, [posts]);
    useEffect(() => {
        console.log(posts.map((p: any) => ({
            id: p.id,
            attachmentCount: p.attachmentCount,
            attachments: p.attachments,
            hasContent: !!p.content,
            preview: p.contentPreview,
        })));
    }, [posts]);

    return (
        <div className="space-y-3">
            <div className="hidden md:block">
                <Card className="border dark:border-slate-700 bg-white dark:bg-slate-800">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[88px] pl-6">유형</TableHead>
                                <TableHead className="w-auto">제목</TableHead>
                                <TableHead className="w-[120px]">작성자</TableHead>
                                <TableHead className="w-[156px]">작성일</TableHead>
                                <TableHead className="w-[76px] text-right">조회</TableHead>
                                <TableHead className="w-[76px] text-right">댓글</TableHead>
                                <TableHead className="w-[76px] text-right">좋아요</TableHead>
                                <TableHead className="w-[40px] pr-6" />
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {posts.map((post) => {
                                const commentCount = post.commentCount ?? (post.comments?.length ?? 0);
                                const attachmentCount = get_attachment_count(post);

                                return (
                                    <TableRow
                                        key={post.id}
                                        onClick={() => onSelectPost(post)}
                                        className="cursor-pointer"
                                    >
                                        <TableCell className="pl-6">
                                            <CategoryBadge category={post.category} />
                                        </TableCell>

                                        <TableCell className="whitespace-normal max-w-0">
                                            {(() => {
                                                const thumb = (post as any).thumbnailUrl ?? getThumbImageUrl(post);

                                                return (
                                                    <div className="space-y-1">
                                                        {/* 1) 카테고리 배지 */}
                                                        {/* <CategoryBadge category={post.category} /> */}

                                                        {/* 2) 썸네일을 아래로 내리고 크게 */}
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            {thumb ? (
                                                                <img
                                                                    src={thumb}
                                                                    alt=""
                                                                    className="h-14 w-14 rounded-md object-cover border border-gray-200 shrink-0"
                                                                    loading="lazy"
                                                                    referrerPolicy="no-referrer"
                                                                    onError={(e) => {
                                                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                                                    }}
                                                                />
                                                            ) : null}

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="font-medium text-gray-900 truncate min-w-0">
                                                                        {post.title}
                                                                    </div>
                                                                    <AttachmentMark count={attachmentCount} />
                                                                </div>

                                                                <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                                                                    {stripUrlsFromPreview(String(post.contentPreview ?? post.content ?? ""))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>


                                        <TableCell className="text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">
                                            <span className="flex items-center gap-1.5">
                                                {mask_name(post.authorName)}
                                                <ExpertBadge level={post.authorExpertLevel} />
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-gray-500 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                                            {formatCreatedAt(post.createdAt)}
                                        </TableCell>

                                        <TableCell className="text-right text-gray-600 tabular-nums whitespace-nowrap">
											<span className="inline-flex items-center gap-1 justify-end">
												<Eye className="h-4 w-4 text-gray-400" />
                                                {post.views}
											</span>
                                        </TableCell>

                                        <TableCell className="text-right text-gray-600 tabular-nums whitespace-nowrap">
											<span className="inline-flex items-center gap-1 justify-end">
												<MessageSquare className="h-4 w-4 text-gray-400" />
                                                {commentCount}
											</span>
                                        </TableCell>

                                        <TableCell className="text-right text-gray-600 tabular-nums whitespace-nowrap">
											<span className="inline-flex items-center gap-1 justify-end">
												<ThumbsUp className="h-4 w-4 text-gray-400" />
                                                {post.likes}
											</span>
                                        </TableCell>

                                        <TableCell className="text-right pr-6 whitespace-nowrap">
                                            <ChevronRight className="h-4 w-4 text-gray-400 inline-block" />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {posts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                                        조건에 맞는 게시글이 없습니다.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            <div className="md:hidden space-y-3">
                {posts.map((post) => {
                    const commentCount = post.commentCount ?? (post.comments?.length ?? 0);
                    const attachmentCount = get_attachment_count(post);

                    return (
                        <div
                            key={post.id}
                            onClick={() => onSelectPost(post)}
                            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition cursor-pointer"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <CategoryBadge category={post.category} />
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    {mask_name(post.authorName)}
                                    <ExpertBadge level={post.authorExpertLevel} />
                                </span>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-xs text-gray-500">{formatCreatedAt(post.createdAt)}</span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0 mb-1">
                                <div className="font-semibold text-gray-900 line-clamp-1 min-w-0">
                                    {post.title}
                                </div>
                                <AttachmentMark count={attachmentCount} />
                            </div>

                            <div className="text-sm text-gray-600 line-clamp-2">
                                {stripUrlsFromPreview(String(post.contentPreview ?? (post as any).content ?? ""))}
                            </div>


                            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 tabular-nums">
								<span className="inline-flex items-center gap-1">
									<Eye className="h-4 w-4" /> {post.views}
								</span>
                                <span className="inline-flex items-center gap-1">
									<MessageSquare className="h-4 w-4" /> {commentCount}
								</span>
                                <span className="inline-flex items-center gap-1">
									<ThumbsUp className="h-4 w-4" /> {post.likes}
								</span>
                            </div>
                        </div>
                    );
                })}

                {posts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">조건에 맞는 게시글이 없습니다.</div>
                ) : null}
            </div>
        </div>
    );
}