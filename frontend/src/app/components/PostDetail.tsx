import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    ArrowLeft,
    Download,
    Eye,
    Image as ImageIcon,
    FileText as FileTextIcon,
    MessageSquare,
    Send,
    ThumbsUp,
    CheckCircle,
    Award,
} from "lucide-react";

import type { Post, PostCategory } from "../types/community";
import { mask_name } from "../utils/masking";
import { adoptComment } from "../api/community";
import { ExpertBadge } from "./ExpertBadge";
import { Badge } from "./ui/badge";

interface PostDetailProps {
    post: Post;
    onBack: () => void;

    onAddComment: (postId: number, content: string) => void;
    onUpdatePost: (
        postId: number,
        patch: Partial<Pick<Post, "title" | "content" | "category">>
    ) => void;
    onDeletePost: (postId: number) => void;
    onToggleLike: (postId: number) => void | Promise<void>;
    onDeleteComment: (postId: number, commentId: string) => void;

    canEdit?: boolean;
    canInteract?: boolean;
    onRequireAuth?: () => void;
    currentUserId?: string;
    onAdopt?: (postId: number, commentId: number) => void;
    isAdmin?: boolean;
}

const category_labels: Record<PostCategory, string> = {
    question: "질문",
    info: "정보",
    review: "후기",
    discussion: "토론",
    notice: "공지",
};

const category_colors: Record<PostCategory, string> = {
    question: "bg-blue-100 text-blue-800",
    info: "bg-green-100 text-green-800",
    review: "bg-purple-100 text-purple-800",
    discussion: "bg-orange-100 text-orange-800",
    notice: "bg-red-100 text-red-800",
};

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

function getLikes(post: any): number {
    const v = post?.likes ?? post?.likeCount ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function renderInlineMarkdown(src: string): ReactNode[] {
    const text = src ?? "";
    const nodes: ReactNode[] = [];

    const re = /(!?)\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;

    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
        const [whole, bang, label, url] = m;
        const start = m.index;

        if (start > lastIndex) {
            const chunk = text.slice(lastIndex, start);

            nodes.push(...chunk.split("\n").map((line, i) => (i === 0 ? [line] : [<br key={`br-${nodes.length}-${i}`} />, line])).reduce((acc, val) => acc.concat(val), []));
        }


        if (bang === "!") {
            nodes.push(
                <div key={`img-${start}`} className="my-4">
                    <img
                        src={url}
                        alt={label || "image"}
                        className="max-w-full rounded-lg border bg-white"
                        loading="lazy"
                    />
                    {label ? (
                        <div className="mt-1 text-xs text-gray-500">{label}</div>
                    ) : null}
                </div>
            );
        } else {
            nodes.push(
                <a
                    key={`link-${start}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                >
                    {label || url}
                </a>
            );
        }

        lastIndex = start + whole.length;
    }


    if (lastIndex < text.length) {
        const tail = text.slice(lastIndex);
        nodes.push(...tail.split("\n").map((line, i) => (i === 0 ? [line] : [<br key={`br-tail-${nodes.length}-${i}`} />, line])).reduce((acc, val) => acc.concat(val), []));
    }

    return nodes;
}

export function PostDetail({
                               post,
                               onBack,
                               onAddComment,
                               onUpdatePost,
                               onDeletePost,
                               onToggleLike,
                               onDeleteComment,
                               canEdit = false,
                               canInteract = false,
                               onRequireAuth,
                               currentUserId,
                               onAdopt,
                               isAdmin = false,
                           }: PostDetailProps) {
    const postId = useMemo(() => {
        const n = Number((post as any).id);
        return Number.isFinite(n) && n > 0 ? n : null;
    }, [post]);

    if (postId == null) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                게시글 ID가 올바르지 않습니다. (id={String((post as any).id)})
            </div>
        );
    }

    const comments = useMemo(() => (post as any).comments ?? [], [post]);
    const attachments = useMemo(() => (post as any).attachments ?? [], [post]);
    const comment_count = (post as any).commentCount ?? comments.length;

    const author_name =
        (post as any).authorName ?? (post as any).userName ?? (post as any).author ?? "—";

    const [comment_text, set_comment_text] = useState("");
    const [is_editing, set_is_editing] = useState(false);

    const [edit_title, set_edit_title] = useState((post as any).title ?? "");
    const [edit_content, set_edit_content] = useState((post as any).content ?? "");
    const [edit_category, set_edit_category] = useState<PostCategory>((post as any).category);

    useEffect(() => {
        if (!is_editing) {
            set_edit_title((post as any).title ?? "");
            set_edit_content((post as any).content ?? "");
            set_edit_category((post as any).category);
        }
    }, [postId, is_editing, post]);

    const handleAdopt = async (commentId: number) => {
        const ok = window.confirm("이 답변을 채택하시겠습니까? 채택 후에는 취소할 수 없습니다.");
        if (!ok) return;
        
        try {
            await adoptComment(postId, commentId);
            alert("답변이 채택되었습니다!");
            // Reload to get updated comment data with isAdopted flag
            window.location.reload();
        } catch (err: any) {
            console.error("채택 오류:", err);
            const msg = err?.message || "채택에 실패했습니다.";
            alert(msg);
        }
    };

    const submit_comment = () => {
        if (!canInteract) {
            onRequireAuth?.();
            return;
        }

        const text = comment_text.trim();
        if (!text) return;

        onAddComment(postId, text);
        set_comment_text("");
    };

    const start_edit = () => {
        set_is_editing(true);
        set_edit_title((post as any).title ?? "");
        set_edit_content((post as any).content ?? "");
        set_edit_category((post as any).category);
    };

    const cancel_edit = () => {
        set_is_editing(false);
        set_edit_title((post as any).title ?? "");
        set_edit_content((post as any).content ?? "");
        set_edit_category((post as any).category);
    };

    const save_edit = () => {
        const t = edit_title.trim();
        const c = edit_content.trim();
        if (!t || !c) return;

        onUpdatePost(postId, { title: t, content: c, category: edit_category });
        set_is_editing(false);
    };

    const delete_post = () => {
        const ok = window.confirm("이 게시글을 삭제할까요? 삭제 후 복구할 수 없습니다.");
        if (!ok) return;
        onDeletePost(postId);
    };

    const [like_busy, set_like_busy] = useState(false);

    const likedByMe = !!(post as any).likedByMe;
    const likes = getLikes(post);

    const toggle_like = async () => {
        if (!canInteract) {
            onRequireAuth?.();
            return;
        }
        if (like_busy) return;

        try {
            set_like_busy(true);
            await Promise.resolve(onToggleLike(postId));
        } finally {
            set_like_busy(false);
        }
    };


    const categoryKey = ((post as any).category as PostCategory) ?? "question";
    
    const hasAdoptedComment = post.comments?.some((c: any) => c.isAdopted) ?? false;
    const canAdopt = canEdit && categoryKey === "question" && !hasAdoptedComment;

    return (
        <div className="space-y-6">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>목록으로</span>
            </button>

            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="mb-4">
                    {is_editing ? (
                        <select
                            value={edit_category}
                            onChange={(e) => set_edit_category(e.target.value as PostCategory)}
                            className="px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="question">질문</option>
                            <option value="info">정보</option>
                            <option value="review">후기</option>
                            <option value="discussion">토론</option>
                        </select>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded text-sm font-medium ${category_colors[categoryKey]}`}>
                              {category_labels[categoryKey]}
                            </span>
                            {hasAdoptedComment && (
                                <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50 gap-1">
                                    <CheckCircle className="w-3 h-3" /> 해결됨
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                        {is_editing ? (
                            <input
                                value={edit_title}
                                onChange={(e) => set_edit_title(e.target.value)}
                                className="w-full text-2xl font-bold border rounded-lg px-3 py-2"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold text-gray-900 truncate">{(post as any).title}</h1>
                        )}
                    </div>

                    <div className="shrink-0 flex gap-2">
                        {(canEdit || isAdmin) && !is_editing && (
                            <button
                                type="button"
                                onClick={delete_post}
                                className="px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                            >
                                삭제
                            </button>
                        )}

                        {canEdit &&
                            (is_editing ? (
                                <>
                                    <button type="button" onClick={cancel_edit} className="px-3 py-2 rounded-lg border">
                                        취소
                                    </button>
                                    <button type="button" onClick={save_edit} className="px-3 py-2 rounded-lg bg-blue-600 text-white">
                                        저장
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={start_edit} className="px-3 py-2 rounded-lg border">
                                    수정
                                </button>
                            ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
                    <span className="font-medium text-gray-700 flex items-center gap-1.5">
                        {mask_name(author_name)}
                        <ExpertBadge level={(post as any).authorExpertLevel ?? 1} />
                    </span>
                    <span>·</span>
                    <span>{formatCreatedAt((post as any).createdAt)}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{(post as any).views ?? (post as any).viewCount ?? 0}</span>
                    </div>
                </div>


                <div className="prose max-w-none mb-6">
                    {is_editing ? (
                        <textarea
                            value={edit_content}
                            onChange={(e) => set_edit_content(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 min-h-[240px]"
                        />
                    ) : (
                        <div className="text-gray-700 leading-relaxed">
                            {renderInlineMarkdown(String((post as any).content ?? ""))}
                        </div>
                    )}
                </div>

                {attachments.length > 0 && (
                    <div className="mb-6">
                        <div className="text-sm font-medium text-gray-700 mb-2">첨부파일</div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                            {attachments
                                .filter((a: any) => a.isImage)
                                .map((a: any) => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => window.open(a.url, "_blank")}
                                        className="group border rounded-lg overflow-hidden bg-gray-50 hover:shadow-sm transition text-left"
                                        title={a.name}
                                    >
                                        <img src={a.url} alt={a.name} className="w-full h-32 object-cover" />
                                        <div className="p-2 text-xs text-gray-700 truncate">{a.name}</div>
                                    </button>
                                ))}
                        </div>

                        <div className="space-y-2">
                            {attachments.map((a: any) => (
                                <div key={a.id} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {a.isImage ? (
                                            <ImageIcon className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <FileTextIcon className="w-4 h-4 text-gray-500" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-sm text-gray-900 truncate">{a.name}</div>
                                            <div className="text-xs text-gray-500">{Math.round((a.size ?? 0) / 1024)} KB</div>
                                        </div>
                                    </div>

                                    <a
                                        href={a.url}
                                        download={a.name}
                                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border hover:bg-gray-50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Download className="w-4 h-4" />
                                        다운로드
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {categoryKey !== "notice" && (
                <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={toggle_like}
                        disabled={!canInteract || like_busy}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            likedByMe ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        } ${canInteract ? "" : "opacity-60"} ${like_busy ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                        <ThumbsUp className="w-5 h-5" />
                        <span>
              {!canInteract
                  ? `로그인 후 좋아요 (${likes})`
                  : like_busy
                      ? "처리 중..."
                      : likedByMe
                          ? `좋아요 취소 (${likes})`
                          : `좋아요 (${likes})`}
            </span>
                    </button>
                </div>
                )}
            </div>

            {categoryKey !== "notice" && (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="flex items-center gap-2 mb-6">
                    <MessageSquare className="w-5 h-5 text-gray-700" />
                    <h2 className="text-xl font-bold text-gray-900">댓글 {comment_count}</h2>
                </div>

                <div className="mb-8">
          <textarea
              value={comment_text}
              onChange={(e) => set_comment_text(e.target.value)}
              placeholder={canInteract ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
              disabled={!canInteract}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
              rows={4}
          />
                    <div className="flex justify-end mt-2">
                        <button
                            type="button"
                            onClick={submit_comment}
                            disabled={!canInteract || !comment_text.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            댓글 작성
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                {comments.map((comment: any) => {
                        const comment_author_name = comment.authorName ?? comment.author ?? "—";
                        const comment_author_id = comment.authorId != null ? String(comment.authorId) : undefined;
                        const me = currentUserId != null ? String(currentUserId) : undefined;

                        const can_delete_this_comment =
                            !!canInteract && (!!isAdmin || !!canEdit || (!!comment_author_id && !!me && comment_author_id === me));
                        
                        const isAdopted = comment.isAdopted ?? false;
                        const canNotAdoptSelf = comment_author_id !== me;

                        return (
                            <div key={comment.id} className={`border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 ${isAdopted ? "bg-green-50 dark:bg-green-900/20 -mx-4 px-4 py-3 rounded-lg" : ""}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-gray-900 flex items-center gap-1.5">
                                            {mask_name(comment_author_name)}
                                            <ExpertBadge level={comment.userExpertLevel ?? 1} />
                                        </span>
                                        <span className="text-sm text-gray-500">{formatCreatedAt(comment.createdAt)}</span>
                                        {isAdopted && (
                                            <Badge className="bg-green-600 text-white gap-1">
                                                <Award className="w-3 h-3" /> 채택된 답변
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canAdopt && !isAdopted && canNotAdoptSelf && (
                                            <button
                                                type="button"
                                                onClick={() => handleAdopt(Number(comment.id))}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-4 h-4" /> 채택하기
                                            </button>
                                        )}
                                        
                                        {can_delete_this_comment && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const ok = window.confirm("이 댓글을 삭제할까요?");
                                                    if (!ok) return;

                                                    const cid = Number(comment.id);
                                                    if (!Number.isFinite(cid) || cid <= 0) {
                                                        alert(`댓글 ID가 올바르지 않습니다. (id=${String(comment.id)})`);
                                                        return;
                                                    }

                                                    onDeleteComment(postId, String(cid));
                                                }}
                                                className="text-sm text-gray-400 hover:text-red-600"
                                            >
                                                삭제
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{comment.content}</p>

                                <button
                                    type="button"
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                                    onClick={() => {
                                        if (!canInteract) onRequireAuth?.();
                                    }}
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    <span>{comment.likes ?? 0}</span>
                                </button>
                            </div>
                        );
                    })}

                    {comments.length === 0 && <p className="text-center text-gray-500 py-8">첫 번째 댓글을 작성해보세요!</p>}
                </div>
            </div>
            )}
        </div>
    );
}
