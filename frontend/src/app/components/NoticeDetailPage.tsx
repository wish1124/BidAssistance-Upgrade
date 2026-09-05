import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCommunityPost, fetchCommunityComments, deleteCommunityPost, updateCommunityPost } from "../api/community";
import { PostDetail } from "./PostDetail";
import type { Post } from "../types/community";

export function NoticeDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        const postId = Number(id);
        if (!Number.isFinite(postId)) {
            setError("잘못된 공지사항 ID입니다.");
            setLoading(false);
            return;
        }

        (async () => {
            try {

                const [p, c] = await Promise.all([
                    fetchCommunityPost(postId),
                    fetchCommunityComments(postId)
                ]);

                setPost({
                    ...p,
                    comments: c,
                    commentCount: c.length,
                    attachments: p.attachments ?? []
                } as Post);
            } catch (e: any) {
                setError(e?.message || "공지사항을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const handleBack = () => {
        navigate("/notice");
    };


    const handleDelete = async (postId: number) => {
        try {
            await deleteCommunityPost(postId);
            navigate("/notice");
        } catch (e: any) {
            alert(e?.message || "삭제 실패");
        }
    };

    const handleUpdate = async (postId: number, patch: any) => {
        try {
            await updateCommunityPost(postId, patch);
            // 리로드
            const p = await fetchCommunityPost(postId);
            const c = await fetchCommunityComments(postId);
            setPost({ ...p, comments: c, commentCount: c.length, attachments: p.attachments ?? [] } as Post);
        } catch (e: any) {
            alert(e?.message || "수정 실패");
        }
    };

    if (loading) return <div className="py-20 text-center text-gray-500">불러오는 중...</div>;
    if (error) return <div className="py-20 text-center text-red-500">{error}</div>;
    if (!post) return <div className="py-20 text-center text-gray-500">공지사항을 찾을 수 없습니다.</div>;

    const userId = localStorage.getItem("userId");
    
    const isAdmin = (() => {
        const email = localStorage.getItem("email") || "";
        const role = localStorage.getItem("role") || "";
        return role.includes("ADMIN") || role.includes("OPERATOR"); 
    })();

    return (
        <PostDetail 
            post={post}
            onBack={handleBack}
            onAddComment={async () => {}}
            onUpdatePost={handleUpdate}
            onDeletePost={handleDelete}
            onToggleLike={async () => {}}
            onDeleteComment={async () => {}}
            canEdit={isAdmin}
            canInteract={!!userId}
            currentUserId={userId ?? undefined}
            isAdmin={isAdmin}
        />
    );
}
