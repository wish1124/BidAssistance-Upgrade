import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";
import type { PostCategory } from "../types/community";

export type NewPostDraftForm = {
    title: string;
    content: string;
    category: PostCategory;
    files: File[];

    inlineAttachmentIds?: number[];
    inlineFileKeys?: string[];
};

interface NewPostFormProps {
    onSubmit: (draft: NewPostDraftForm) => void;
    onCancel: () => void;

    onUploadInlineFile?: (file: File) => Promise<{ url: string; attachmentId: number }>;
    isAdmin?: boolean;
}

export function NewPostForm({ onSubmit, onCancel, onUploadInlineFile, isAdmin = false }: NewPostFormProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<PostCategory>("question");
    const [files, setFiles] = useState<File[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const [inlineIds, setInlineIds] = useState<number[]>([]);
    const [inlineKeys, setInlineKeys] = useState<string[]>([]);

    function fileKey(f: File) {
        return `${f.name}:${f.size}:${f.lastModified}`;
    }

    function isImageFile(f: File) {
        return f.type.startsWith("image/");
    }

    function insertAtCursor(snippet: string) {
        const el = textareaRef.current;
        if (!el) {
            setContent((prev) => prev + snippet);
            return;
        }

        const start = el.selectionStart ?? content.length;
        const end = el.selectionEnd ?? content.length;

        setContent((prev) => prev.slice(0, start) + snippet + prev.slice(end));

        requestAnimationFrame(() => {
            const pos = start + snippet.length;
            el.focus();
            el.setSelectionRange(pos, pos);
        });
    }

    const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        if (selected.length === 0) return;

        setFiles((prev) => {
            const next = [...prev];
            for (const f of selected) {
                if (!next.some((x) => fileKey(x) === fileKey(f))) next.push(f);
            }
            return next;
        });

        e.target.value = "";
    };

    async function uploadAndInsert(file: File) {
        if (!onUploadInlineFile) {

            setFiles((prev) => {
                const k = fileKey(file);
                return prev.some((x) => fileKey(x) === k) ? prev : [...prev, file];
            });
            return;
        }

        const k = fileKey(file);
        if (inlineKeys.includes(k)) {

            return;
        }

        const { url, attachmentId } = await onUploadInlineFile(file);

        if (isImageFile(file)) {
            insertAtCursor(`\n\n![](${url})\n\n`);
        } else {
            insertAtCursor(`\n\n[${file.name}](${url})\n\n`);
        }

        setFiles((prev) => {
            const exists = prev.some((x) => fileKey(x) === k);
            return exists ? prev : [...prev, file];
        });

        setInlineIds((prev) => (prev.includes(attachmentId) ? prev : [...prev, attachmentId]));
        setInlineKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
    }

    async function handleDropUrl(url: string) {
        const u = url.trim();
        if (!u) return;

        insertAtCursor(`\n\n![](${u})\n\n`);
    }

    const removeFile = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const [noticeSubCategory, setNoticeSubCategory] = useState<"service" | "update" | "maintenance" | "policy">("service");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        let finalTitle = title.trim();
        
        if (category === "notice") {
            const labels = { service: "서비스", update: "업데이트", maintenance: "점검", policy: "정책" };
            const tag = `[${labels[noticeSubCategory]}]`;
            
            if (!finalTitle.startsWith("[")) {
                finalTitle = `${tag} ${finalTitle}`;
            }
        }

        onSubmit({
            title: finalTitle,
            content: content.trim(),
            category,
            files,
            inlineAttachmentIds: inlineIds,
            inlineFileKeys: inlineKeys,
        });
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">새 글 작성</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setCategory("question")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                category === "question"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            질문
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory("info")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                category === "info"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            정보
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory("review")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                category === "review"
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            후기
                        </button>
                        <button
                            type="button"
                            onClick={() => setCategory("discussion")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                category === "discussion"
                                    ? "bg-orange-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            토론
                        </button>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCategory("notice");
                                    setNoticeSubCategory("service");
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    category === "notice"
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                공지
                            </button>
                        )}
                    </div>


                    {category === "notice" && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
                            <label className="block text-sm font-medium text-red-800 mb-2">공지 분류 선택</label>
                            <div className="flex gap-2">
                                {(["service", "update", "maintenance", "policy"] as const).map((sub) => {
                                    const labels = { service: "서비스", update: "업데이트", maintenance: "점검", policy: "정책" };
                                    const isActive = noticeSubCategory === sub;
                                    return (
                                        <button
                                            key={sub}
                                            type="button"
                                            onClick={() => setNoticeSubCategory(sub)}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                                isActive
                                                    ? "bg-red-600 text-white"
                                                    : "bg-white text-red-700 border border-red-200 hover:bg-red-100"
                                            }`}
                                        >
                                            {labels[sub]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="제목을 입력하세요"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>


                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="내용을 입력하세요 (이미지 드래그/붙여넣기 가능)"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                            dragOver ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-300"
                        }`}
                        rows={12}
                        required
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={async (e) => {
                            e.preventDefault();
                            setDragOver(false);

                            // 1) 파일 드롭
                            const droppedFiles = Array.from(e.dataTransfer.files ?? []);
                            if (droppedFiles.length > 0) {
                                for (const f of droppedFiles) {
                                    await uploadAndInsert(f);
                                }
                                return;
                            }

                            // 2) URL 드롭
                            const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
                            if (uri) {
                                await handleDropUrl(uri);
                            }
                        }}
                        onPaste={async (e) => {
                            const items = Array.from(e.clipboardData?.items ?? []);
                            const pastedFiles: File[] = [];

                            for (const it of items) {
                                if (it.kind === "file") {
                                    const f = it.getAsFile();
                                    if (f) pastedFiles.push(f);
                                }
                            }

                            if (pastedFiles.length === 0) return;

                            e.preventDefault();
                            for (const f of pastedFiles) {
                                await uploadAndInsert(f);
                            }
                        }}
                    />
                    <div className="mt-2 text-xs text-gray-500">
                        사진을 본문에 넣으려면: 파일을 여기로 드래그하거나, 캡처 후 붙여넣기(Ctrl+V)
                    </div>
                </div>


                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">첨부파일</label>
                    <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFilesChange}
                        className="block w-full text-sm text-gray-600
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-gray-100 file:text-gray-700
              hover:file:bg-gray-200"
                    />

                    {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <div className="text-sm text-gray-600">선택된 파일 {files.length}개</div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {files.map((f, idx) => {
                                    const isImage = f.type.startsWith("image/");
                                    const previewUrl = isImage ? URL.createObjectURL(f) : null;

                                    return (
                                        <div key={`${fileKey(f)}-${idx}`} className="border rounded-lg p-2 bg-gray-50">
                                            {isImage && previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt={f.name}
                                                    className="w-full h-24 object-cover rounded-md"
                                                    onLoad={() => URL.revokeObjectURL(previewUrl)}
                                                />
                                            ) : (
                                                <div className="w-full h-24 flex items-center justify-center text-xs text-gray-500 bg-white rounded-md">
                                                    {f.type || "file"}
                                                </div>
                                            )}

                                            <div className="mt-2 flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-medium text-gray-800 truncate">{f.name}</div>
                                                    <div className="text-[11px] text-gray-500">{Math.round(f.size / 1024)} KB</div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="text-gray-400 hover:text-gray-700"
                                                    aria-label="remove"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border hover:bg-gray-50">
                        취소
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                        등록
                    </button>
                </div>
            </form>
        </div>
    );
}
