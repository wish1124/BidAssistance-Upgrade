import { api } from "./client";

export interface ChatRequest {
    query: string;
    thread_id?: string;
}

export interface ChatResponse {
    status: string;
    message: string;
    data: {
        message: string;
    }
}
export const fetchChatResponse = async (
    request: ChatRequest & { file?: File }
): Promise<ChatResponse> => {
    if (request.file) {
        const formData = new FormData();

        formData.append("text", request.query || "파일 분석 요청");

        if (request.thread_id) {
            formData.append("thread_id", request.thread_id);
        }

        formData.append("file", request.file);

        return api<ChatResponse>("/chatbots/file", {
            method: "POST",
            body: formData,
        });
    }

    return api<ChatResponse>("/chatbots", {
        method: "POST",
        body: JSON.stringify(request),
    });
};

