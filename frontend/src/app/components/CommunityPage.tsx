import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CommunityBoard } from "./CommunityBoard";
import { PostDetail } from "./PostDetail";
import { NewPostForm } from "./NewPostForm";
import { TrendingPosts } from "./TrendingPosts";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

import { Info, Plus, Search as SearchIcon } from "lucide-react";
import type { NewPostDraftForm } from "./NewPostForm";
import type { Post, PostCategory, SortKey } from "../types/community";

import {
    createCommunityComment,
    createCommunityPost,
    deleteCommunityComment,
    deleteCommunityPost,
    fetchCommunityPost,
    fetchCommunityPosts,
    fetchTrendingPosts,
    likeCommunityPost,
    unlikeCommunityPost,
    updateCommunityPost,
    uploadCommunityAttachments,
} from "../api/community";
import { fetchCommunityComments } from "../api/community";

type ViewMode = "list" | "detail" | "new";
type CategoryFilter = "all" | PostCategory;

const category_label: Record<CategoryFilter, string> = {
    all: "전체",
    question: "질문",
    info: "정보",
    review: "후기",
    discussion: "토론",
    notice: "공지", // NoticePage에서만 표시 - 커뮤니티 탭 렌더링에서 제외
};

// 커뮤니티 UI에서 표시할 카테고리 (notice 제외)
const visible_categories: CategoryFilter[] = ["all", "question", "info", "review", "discussion"];

function is_authed_now() {
    return !!localStorage.getItem("userId");
}

function safe_user_id() {
    return localStorage.getItem("userId") || "";
}

function to_valid_id(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function compute_counts(items: Post[]) {
    const base: Record<"all" | PostCategory, number> = {
        all: items.length,
        question: 0,
        info: 0,
        review: 0,
        discussion: 0,
        notice: 0,
    };

    items.forEach((p) => {
        const c = p.category;
        if (c === "question" || c === "info" || c === "review" || c === "discussion" || c === "notice") base[c] += 1;
    });

    return base;
}

/**  좋아요 localStorage (유저별) */
function likeStorageKey(userId?: string) {
    return `community_likes_v1:${userId ?? "guest"}`;
}

function loadLikedSet(userId?: string): Set<number> {
    try {
        const raw = localStorage.getItem(likeStorageKey(userId));
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return new Set();
        return new Set(
            arr
                .map((x) => Number(x))
                .filter((n) => Number.isFinite(n) && n > 0),
        );
    } catch {
        return new Set();
    }
}

function saveLikedSet(userId: string | undefined, set: Set<number>) {
    try {
        localStorage.setItem(likeStorageKey(userId), JSON.stringify(Array.from(set)));
    } catch {
        // ignore
    }
}

function isLikedLocal(userId: string | undefined, postId: number) {
    return loadLikedSet(userId).has(postId);
}

/**  likes 필드가 likes / likeCount 혼재일 수 있어서 안전 처리 */
function getLikes(p: any): number {
    const v = p?.likes ?? p?.likeCount ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function setLikes(p: any, next: number) {
    return { ...p, likes: next, likeCount: next };
}

export function CommunityPage() {
    const navigate = useNavigate();

    const [view_mode, set_view_mode] = useState<ViewMode>("list");
    const [search_query, set_search_query] = useState("");
    const [category, set_category] = useState<CategoryFilter>("all");
    const [sort_key, set_sort_key] = useState<SortKey>("latest");

    /**  목록 원본(필터 전) */
    const [all_posts, set_all_posts] = useState<Post[]>([]);

    const [list_loading, set_list_loading] = useState(false);
    const [list_error, set_list_error] = useState<string | null>(null);

    const [selected_post, set_selected_post] = useState<Post | null>(null);
    const [detail_loading, set_detail_loading] = useState(false);
    const [detail_error, set_detail_error] = useState<string | null>(null);

    const [authed, set_authed] = useState(() => is_authed_now());
    const [current_user_id, set_current_user_id] = useState(() => safe_user_id());

    /**  인기글 상위 3개 */
    const [trending_posts, set_trending_posts] = useState<Post[]>([]);
    const [user_role, set_user_role] = useState<number>(0);

    /**  게시글별 좋아요 연타 방지 */
    const [likeBusyByPost, setLikeBusyByPost] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const sync = () => {
            set_authed(is_authed_now());
            set_current_user_id(safe_user_id());
        };
        sync();

        window.addEventListener("focus", sync);
        document.addEventListener("visibilitychange", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            document.removeEventListener("visibilitychange", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    useEffect(() => {
        if (authed && current_user_id) {
             import("../api/users").then(({ getUserProfile }) => {
                 getUserProfile(current_user_id).then(res => {
                     console.log("[CommunityPage] Full API response:", JSON.stringify(res, null, 2));
                     console.log("[CommunityPage] User role fetched:", res.data?.role);
                     set_user_role(res.data?.role ?? 0);
                 }).catch((err) => {
                     console.error("[CommunityPage] Failed to fetch user profile:", err);
                     set_user_role(0);
                 });
             });
        } else {
            set_user_role(0);
        }
    }, [authed, current_user_id]);

    const go_login = () => navigate("/login", { state: { from: "/community" } });

    const counts = useMemo(() => compute_counts(all_posts), [all_posts]);

    const visible_posts = useMemo(() => {
        if (category === "all") return all_posts;
        return all_posts.filter((p) => p.category === category);
    }, [all_posts, category]);

    const fill_comment_counts = useCallback(
        async (items: Post[]) => {
            // id가 유효한 것만
            const targets = items
                .map((p: any) => ({ ...p, id: p.id ?? p.postId }))
                .filter((p: any) => to_valid_id(p.id) != null)
                .filter((p: any) => !(p as any).thumbnailUrl);


            // 10개씩 끊기
            const chunkSize = 10;
            const countMap = new Map<number, number>();

            for (let i = 0; i < targets.length; i += chunkSize) {
                const chunk = targets.slice(i, i + chunkSize);

                const results = await Promise.all(
                    chunk.map(async (p: any) => {
                        const pid = to_valid_id(p.id);
                        if (!pid) return null;

                        try {
                            const comments = await fetchCommunityComments(pid);
                            return [pid, comments.length] as const;
                        } catch {
                            return [pid, 0] as const;
                        }
                    })
                );

                results.forEach((r) => {
                    if (!r) return;
                    countMap.set(r[0], r[1]);
                });
            }

            // posts에 commentCount 주입
            set_all_posts((prev: any[]) =>
                prev.map((p: any) => {
                    const pid = to_valid_id(p.id ?? p.postId);
                    if (!pid) return p;
                    const c = countMap.get(pid);
                    return c == null ? p : { ...p, commentCount: c };
                })
            );
        },
        [set_all_posts]
    );

    const fill_thumbnails = useCallback(async (items: Post[]) => {
        const targets = items
            .map((p: any) => ({ ...p, id: p.id ?? p.postId }))
            .filter((p: any) => to_valid_id(p.id) != null)
            .filter((p: any) => (p.attachmentCount ?? 0) > 0) // 첨부 있는 글만
            .filter((p: any) => !(p as any).thumbnailUrl);     // 이미 있으면 스킵

        const chunkSize = 10;

        for (let i = 0; i < targets.length; i += chunkSize) {
            const chunk = targets.slice(i, i + chunkSize);

            const results = await Promise.all(
                chunk.map(async (p: any) => {
                    const pid = to_valid_id(p.id);
                    if (!pid) return null;

                    try {
                        const detail: any = await fetchCommunityPost(pid);
                        const atts = Array.isArray(detail?.attachments) ? detail.attachments : [];
                        const img = atts.find((a: any) =>
                            typeof a?.url === "string" && /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(a.url)
                        );

                        // PDF만 있으면 null (아예 안 뜨게)
                        const thumb = img?.url ?? null;
                        return [pid, thumb] as const;
                    } catch {
                        return [pid, null] as const;
                    }
                })
            );

            // 목록 state에 thumbnailUrl 주입
            set_all_posts((prev: any[]) =>
                prev.map((p: any) => {
                    const pid = to_valid_id(p.id ?? p.postId);
                    if (!pid) return p;

                    const found = results.find((r) => r && r[0] === pid);
                    if (!found) return p;

                    return { ...p, thumbnailUrl: found[1] };
                })
            );
        }
    }, [set_all_posts]);

    const load_list = useCallback(
        async (opts?: { q?: string; s?: SortKey }) => {
            set_list_loading(true);
            set_list_error(null);

            try {
                const q = (opts?.q ?? search_query).trim() || undefined;
                const s = opts?.s ?? sort_key;

                const data = await fetchCommunityPosts({
                    q,
                    sort: s,
                    page: 1,
                    size: 200,
                });

                const likedSet = loadLikedSet(current_user_id);

                const fixedItems = data.items
                    // 공지(notice)는 NoticePage에서만 보이므로 커뮤니티에서 제외
                    .filter((p: any) => p.category !== "notice")
                    .map((p: any) => {
                    const pid = to_valid_id(p?.id ?? p?.postId);

                    // id 보장
                    const base = { ...p, id: p.id ?? p.postId };

                    //  서버 필드명 -> UI 필드명 맞추기 (목록에서 쓰는 필드들)
                    const normalized = {
                        ...base,
                        authorName: base.authorName ?? base.userName ?? "",

                        // list에서 views/likes로 쓰고 있으니 맞춰주기
                        views: base.views ?? base.viewCount ?? 0,
                        likes: base.likes ?? base.likeCount ?? 0,

                        // 목록에 content/attachments가 없을 수도 있으니 기본값
                        content: base.content ?? "",
                        attachments: Array.isArray(base.attachments) ? base.attachments : [],
                    };

                    // likes / likeCount 혼재 안전 처리
                    const withLikes = setLikes(normalized, getLikes(normalized));

                    if (!pid) return withLikes;

                    const liked = likedSet.has(pid);
                    return { ...withLikes, likedByMe: liked };
                });


                set_all_posts(fixedItems);
                void fill_thumbnails(fixedItems);


//  목록 화면 댓글수 채우기(프론트 계산)
                void fill_comment_counts(fixedItems);

            } catch (e: any) {
                set_list_error(e?.message || "게시글 목록을 불러오지 못했습니다.");
            } finally {
                set_list_loading(false);
            }
        },
        [search_query, sort_key, current_user_id],
    );

    const load_detail = useCallback(
        async (post_id: number) => {
            set_detail_loading(true);
            set_detail_error(null);

            try {
                const [post, comments] = await Promise.all([
                    fetchCommunityPost(post_id),
                    fetchCommunityComments(post_id),
                ]);

                const pid = to_valid_id(post_id);
                const localLiked = pid ? isLikedLocal(current_user_id, pid) : false;

                const withLikes = setLikes(post as any, getLikes(post));
                const fixed: Post = {
                    ...(withLikes as any),
                    likedByMe: localLiked,          // likedByMe를 마지막에
                    comments,
                    commentCount: comments.length,
                    attachments: (post as any).attachments ?? [],
                };
                set_selected_post(fixed);
            } catch (e: any) {
                set_detail_error(e?.message || "게시글을 불러오지 못했습니다.");
            } finally {
                set_detail_loading(false);
            }
        },
        [current_user_id],
    );

    useEffect(() => {
        const t = window.setTimeout(() => {
            void load_list();
            // 인기글 불러오기
            fetchTrendingPosts()
                .then(set_trending_posts)
                .catch(() => {}); // 인기글 에러는 무시
        }, 250);
        return () => window.clearTimeout(t);
    }, [load_list]);

    const on_submit_search = (e: React.FormEvent) => {
        e.preventDefault();
        void load_list({ q: search_query });
    };

    const open_detail = (post: Post) => {
        const idNum = to_valid_id((post as any).id);
        if (idNum == null) {
            alert(`게시글 ID가 올바르지 않습니다. (id=${String((post as any).id)})`);
            return;
        }
        set_view_mode("detail");
        set_selected_post(null);
        void load_detail(idNum);
    };

    const back_to_list = () => {
        set_selected_post(null);
        set_view_mode("list");
    };

    const on_click_write = () => {
        if (!authed) return go_login();
        set_view_mode("new");
    };

    const can_edit_selected = useMemo(() => {
        if (!authed || !selected_post) return false;
        const sp: any = selected_post;

        if (sp.authorId != null) return String(sp.authorId) === String(current_user_id);

        const myName = localStorage.getItem("userName") || "";
        return !!myName && sp.authorName === myName;
    }, [authed, selected_post, current_user_id]);

    const add_post = async (draft: NewPostDraftForm) => {
        if (!authed) return go_login();

        try {
            const inlineIds = draft.inlineAttachmentIds ?? [];
            const inlineKeySet = new Set(draft.inlineFileKeys ?? []);

            const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

            //  인라인으로 이미 업로드된 파일은 재업로드하지 않기
            const filesToUpload = (draft.files ?? []).filter((f) => !inlineKeySet.has(fileKey(f)));

            let attachment_ids: string[] | undefined;

            const combined: string[] = [];

            // 인라인 업로드된 attachmentId 먼저 포함
            for (const id of inlineIds) {
                const n = Number(id);
                if (Number.isFinite(n) && n > 0) combined.push(String(n));
            }

            //  첨부파일 중 인라인 아닌 것만 업로드
            if (filesToUpload.length > 0) {
                const uploaded = await uploadCommunityAttachments(filesToUpload);
                combined.push(...uploaded.map((a) => String((a as any).id)));
            }

            attachment_ids = combined.length > 0 ? combined : undefined;

            const created = await createCommunityPost({
                title: draft.title,
                content: draft.content,
                category: draft.category,
                attachmentIds: attachment_ids,
            });

            const createdId = to_valid_id((created as any)?.id);
            if (createdId == null) {
                alert("작성된 게시글 ID가 올바르지 않습니다. 목록에서 다시 확인해주세요.");
                back_to_list();
                await load_list();
                return;
            }

            set_view_mode("detail");
            set_selected_post(null);
            await load_list();
            await load_detail(createdId);
        } catch (e: any) {
            alert(e?.message || "게시글 작성에 실패했습니다.");
        }
    };


    const add_comment = async (post_id: number, content: string) => {
        if (!authed) return go_login();
        const pid = Number(post_id);
        if (!Number.isFinite(pid) || pid <= 0) return;

        try {
            await createCommunityComment(pid, content);
            const comments = await fetchCommunityComments(pid);
            set_selected_post((prev: any) =>
                prev && Number(prev.id) === pid ? { ...prev, comments, commentCount: comments.length } : prev,
            );
        } catch (e: any) {
            alert(e?.message || "댓글 작성에 실패했습니다.");
        }
    };

    const update_post = async (
        post_id: number,
        patch: Partial<Pick<Post, "title" | "content" | "category">>,
    ) => {
        if (!authed) return go_login();
        const pid = to_valid_id(post_id);
        if (pid == null) {
            alert(`게시글 ID가 올바르지 않습니다. (id=${String(post_id)})`);
            return;
        }

        try {
            const updated = await updateCommunityPost(pid, {
                title: patch.title,
                content: patch.content,
                category: patch.category,
            });

            const localLiked = isLikedLocal(current_user_id, pid);
            const fixed: Post = {
                ...(updated as any),
                likedByMe: localLiked,
                ...setLikes(updated as any, getLikes(updated)),
                comments: (updated as any).comments ?? [],
                attachments: (updated as any).attachments ?? [],
            };

            set_selected_post((prev) => (prev && Number((prev as any).id) === pid ? fixed : prev));
            set_all_posts((prev) => prev.map((p: any) => (Number(p.id) === pid ? { ...p, ...fixed } : p)));
        } catch (e: any) {
            alert(e?.message || "게시글 수정에 실패했습니다.");
        }
    };

    const delete_post = async (post_id: number) => {
        if (!authed) return go_login();
        const pid = to_valid_id(post_id);
        if (pid == null) {
            alert(`게시글 ID가 올바르지 않습니다. (id=${String(post_id)})`);
            return;
        }

        try {
            await deleteCommunityPost(pid);

            //  로컬 좋아요 기록에서도 제거
            const set = loadLikedSet(current_user_id);
            set.delete(pid);
            saveLikedSet(current_user_id, set);

            back_to_list();
            await load_list();
        } catch (e: any) {
            alert(e?.message || "게시글 삭제에 실패했습니다.");
        }
    };

    /**
     *  좋아요 토글:
     * - 연타 방지(게시글별)
     * - 서버 응답 data를 신뢰 못하는 상황에서도(local liked 저장) 안정적으로 동작
     * - 느린 load_detail 재호출 제거
     */
    const toggle_post_like = async (post_id: number) => {
        if (!authed) return go_login();
        const pid = to_valid_id(post_id);
        if (pid == null) {
            alert(`게시글 ID가 올바르지 않습니다. (id=${String(post_id)})`);
            return;
        }

        if (likeBusyByPost[pid]) return;

        const likedNow = isLikedLocal(current_user_id, pid);
        const delta = likedNow ? -1 : 1;

        try {
            setLikeBusyByPost((prev) => ({ ...prev, [pid]: true }));

            if (likedNow) await unlikeCommunityPost(pid);
            else await likeCommunityPost(pid);

            // localStorage 업데이트
            const set = loadLikedSet(current_user_id);
            if (likedNow) set.delete(pid);
            else set.add(pid);
            saveLikedSet(current_user_id, set);

            // 목록 UI 업데이트
            set_all_posts((prev) =>
                prev.map((p: any) => {
                    if (Number(p.id) !== pid) return p;
                    const nextLikes = Math.max(0, getLikes(p) + delta);
                    return { ...setLikes(p, nextLikes), likedByMe: !likedNow };
                }),
            );

            // 상세 UI 업데이트
            set_selected_post((prev: any) => {
                if (!prev || Number(prev.id) !== pid) return prev;
                const nextLikes = Math.max(0, getLikes(prev) + delta);
                return { ...setLikes(prev, nextLikes), likedByMe: !likedNow };
            });

            // load_detail(pid) 재호출하지 않음
        } catch (e: any) {
            alert(e?.message || "좋아요 처리에 실패했습니다.");
        } finally {
            setLikeBusyByPost((prev) => ({ ...prev, [pid]: false }));
        }
    };

    const delete_comment = async (post_id: number, comment_id: string) => {
        if (!authed) return go_login();
        const pid = Number(post_id);
        const cid = Number(comment_id);
        if (!Number.isFinite(pid) || pid <= 0) return;
        if (!Number.isFinite(cid) || cid <= 0) return;

        try {
            await deleteCommunityComment(String(cid));
            const comments = await fetchCommunityComments(pid);
            set_selected_post((prev: any) =>
                prev && Number(prev.id) === pid ? { ...prev, comments, commentCount: comments.length } : prev,
            );
        } catch (e: any) {
            alert(e?.message || "댓글 삭제에 실패했습니다.");
        }
    };

    const on_adopted = (post_id: number, comment_id: number) => {
        const pid = Number(post_id);
        const cid = Number(comment_id);

        set_selected_post((prev: any) =>
            prev && Number(prev.id) === pid ? { ...prev, adoptedCommentId: cid } : prev
        );

        set_all_posts((prev) =>
            prev.map((p: any) =>
                Number(p.id) === pid ? { ...p, adoptedCommentId: cid } : p
            )
        );
    };

    return (
        <div className="space-y-4">
            {view_mode === "list" ? (
                <Card>
                    <CardHeader className="space-y-1">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl">커뮤니티</CardTitle>
                                <CardDescription>입찰 실무 노하우/질문/정보를 빠르게 공유하고 검색하세요.</CardDescription>
                            </div>

                            <div className="shrink-0">
                                <Button
                                    variant={authed ? "default" : "outline"}
                                    onClick={on_click_write}
                                    className="gap-2"
                                >
                                    {authed ? <Plus className="h-4 w-4" /> : null}
                                    {authed ? "글쓰기" : "로그인 후 글쓰기"}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <Tabs value={category} onValueChange={(v) => set_category(v as CategoryFilter)}>
                            <div className="flex items-center justify-between gap-3">
                                <TabsList className="w-fit justify-start rounded-lg">
                                    <TabsTrigger value="all" className="flex-none px-3 rounded-md text-[13px]">
                                        전체 <span className="ml-1 text-xs opacity-70">{counts.all}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="question" className="flex-none px-3 rounded-md text-[13px]">
                                        질문 <span className="ml-1 text-xs opacity-70">{counts.question}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="info" className="flex-none px-3 rounded-md text-[13px]">
                                        정보 <span className="ml-1 text-xs opacity-70">{counts.info}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="review" className="flex-none px-3 rounded-md text-[13px]">
                                        후기 <span className="ml-1 text-xs opacity-70">{counts.review}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="discussion" className="flex-none px-3 rounded-md text-[13px]">
                                        토론 <span className="ml-1 text-xs opacity-70">{counts.discussion}</span>
                                    </TabsTrigger>
                                </TabsList>

                                <div className="hidden md:block text-xs text-gray-500 tabular-nums">
                                    {category_label[category]} · {visible_posts.length}건
                                </div>
                            </div>
                        </Tabs>

                        <form onSubmit={on_submit_search} className="flex flex-col md:flex-row md:items-center gap-2">
                            <div className="relative flex-1">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={search_query}
                                    onChange={(e) => set_search_query(e.target.value)}
                                    placeholder="검색: 제목/내용/작성자"
                                    className="pl-9"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="submit" className="whitespace-nowrap">
                                    검색하기
                                </Button>

                                <Select value={sort_key} onValueChange={(v) => set_sort_key(v as SortKey)}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="정렬" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="latest">최신순</SelectItem>
                                        <SelectItem value="popular">인기순</SelectItem>
                                        <SelectItem value="views">조회순</SelectItem>
                                        <SelectItem value="comments">댓글순</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </form>

                        {!authed ? (
                            <Alert className="bg-slate-50">
                                <Info />
                                <AlertTitle>게스트 모드</AlertTitle>
                                <AlertDescription>글쓰기/좋아요/댓글은 로그인 후 이용할 수 있습니다.</AlertDescription>
                            </Alert>
                        ) : null}

                        {list_error ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {list_error}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            ) : null}

            {view_mode === "list" ? (
                list_loading ? (
                    <div className="text-sm text-gray-500 py-8 text-center">목록을 불러오는 중...</div>
                ) : (
                    <>
                        <TrendingPosts posts={trending_posts} onClickPost={open_detail} />
                        <CommunityBoard posts={visible_posts} onSelectPost={open_detail} />
                    </>
                )
            ) : null}

            {view_mode === "detail" ? (
                detail_loading ? (
                    <div className="text-sm text-gray-500 py-8 text-center">게시글을 불러오는 중...</div>
                ) : detail_error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {detail_error}
                    </div>
                ) : selected_post ? (
                    <PostDetail
                        post={selected_post}
                        onBack={back_to_list}
                        onAddComment={add_comment}
                        onUpdatePost={update_post}
                        onDeletePost={delete_post}
                        onToggleLike={toggle_post_like}
                        onDeleteComment={delete_comment}
                        canEdit={can_edit_selected}
                        canInteract={authed}
                        onRequireAuth={go_login}
                        currentUserId={current_user_id}
                        onAdopt={on_adopted}
                        isAdmin={user_role === 2}
                    />
                ) : null
            ) : null}

            {view_mode === "new" ? (
                <NewPostForm
                    isAdmin={user_role === 2}
                    onSubmit={add_post}
                    onCancel={() => set_view_mode("list")}
                    onUploadInlineFile={async (file) => {
                        const uploaded = await uploadCommunityAttachments([file]);
                        const first = uploaded[0];
                        const id = Number((first as any)?.id);
                        const url = (first as any)?.url;

                        if (!Number.isFinite(id) || id <= 0 || !url) {
                            throw new Error("파일 업로드에 실패했습니다.");
                        }
                        return { url, attachmentId: id };
                    }}
                />
            ) : null}

        </div>
    );
}
