import { useEffect, useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";
import { Bot, Send, Sparkles, Loader2, Paperclip, X } from "lucide-react";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { fetchChatResponse, ChatRequest } from "../api/chatbot";

type Sender = "user" | "bot";

type Message = {
	id: number;
	sender: Sender;
	text: string;
	timestamp: string;
	suggestions?: string[];
};

const QUICK_PROMPTS = [
	{ title: "마감 임박 공고", desc: "D-3 이내만 요약", text: "마감 임박한 공고만 요약해줘" },
	{ title: "지역별 공고", desc: "서울/경기 등", text: "서울 지역 공고 알려줘" },
	{ title: "예산 조건", desc: "30억 이하", text: "30억 이하 공사 찾아줘" },
];

function nowTime() {
	return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function Bubble({
	message,
	onSendSuggestion,
}: {
	message: Message;
	onSendSuggestion: (text: string) => void;
}) {
	const isUser = message.sender === "user";

	return (
		<div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
			<Avatar className="h-9 w-9 shrink-0">
				<AvatarFallback
					className={isUser ? "bg-slate-800 text-white" : "bg-blue-600 text-white"}
				>
					{isUser ? "나" : <Bot className="h-4 w-4" />}
				</AvatarFallback>
			</Avatar>

			<div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
				<div
					className={[
						"rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
						isUser ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900",
					].join(" ")}
				>
					{message.text}
				</div>
				<div className="mt-1 text-[11px] text-slate-500 tabular-nums">{message.timestamp}</div>

				{/*  FIX: suggestions 클릭 시 실제 전송되도록 연결 */}
				{!isUser && message.suggestions && message.suggestions.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-2">
						{message.suggestions.map((s, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => onSendSuggestion(s)}
								className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
							>
								<Badge variant="outline" className="cursor-pointer hover:bg-slate-50">
									{s}
								</Badge>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

const CHATBOT_STORAGE_KEY = "chatbot_messages";

const loadMessages = (): Message[] => {
	try {
		const saved = localStorage.getItem(CHATBOT_STORAGE_KEY);
		if (saved) {
			const parsed = JSON.parse(saved) as Message[];
			if (Array.isArray(parsed) && parsed.length > 0) return parsed;
		}
	} catch {
		// 파싱 실패 시 기본값 사용
	}

	// 기본 환영 메시지
	return [
		{
			id: 1,
			sender: "bot",
			text: "안녕하세요. 입찰인사이트 AI 도우미입니다.\n원하시는 조건(지역/예산/마감)을 말해주시면 공고를 빠르게 좁혀드릴게요.",
			timestamp: nowTime(),
			suggestions: ["서울 지역 공고 알려줘", "30억 이하 공사 찾아줘", "마감 임박 공고는?"],
		},
	];
};

export function ChatbotModal({ onClose }: { onClose: () => void }) {
	void onClose;

	const [messages, setMessages] = useState<Message[]>(loadMessages);

	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const bottomRef = useRef<HTMLDivElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 메시지 변경 시 localStorage에 저장
	useEffect(() => {
		try {
			localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(messages));
		} catch {
			// 저장 실패 시 무시 (용량 초과 등)
		}
	}, [messages]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages, isTyping]);

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setSelectedFile(e.target.files[0]);
		}
	};

	const clearFile = () => {
		setSelectedFile(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const send = async (text: string) => {
		const trimmed = text.trim();
		if ((!trimmed && !selectedFile) || isTyping) return;

		const userMessage: Message = {
			id: Date.now(),
			text: trimmed + (selectedFile ? `\n[첨부파일: ${selectedFile.name}]` : ""),
			sender: "user",
			timestamp: nowTime(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsTyping(true);

		const fileToSend = selectedFile;

		try {
			const result = await fetchChatResponse({
				query: trimmed || "파일 분석 요청",
				thread_id: "user_session_1",
				file: fileToSend ?? undefined,
			});

			setMessages((prev) => [
				...prev,
				{
					id: Date.now() + 1,
					text: result.data.message,
					sender: "bot",
					timestamp: nowTime(),
					suggestions: [],
				},
			]);

			clearFile();
		} catch (error) {
			setMessages((prev) => [
				...prev,
				{
					id: Date.now() + 1,
					text: "죄송합니다. 서버 연결에 실패했습니다.",
					sender: "bot",
					timestamp: nowTime(),
				},
			]);
		} finally {
			setIsTyping(false);
		}
	};

	const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.nativeEvent.isComposing) return;

		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send(input);
		}
	};

	return (
		<div className="w-full h-full bg-slate-50 rounded-2xl overflow-hidden flex">
			<div className="flex-1 min-w-0 flex flex-col min-h-0">
				<div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between shrink-0 rounded-t-2xl">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
							<Sparkles className="h-5 w-5" />
						</div>
						<div className="leading-tight">
							<div className="text-sm font-semibold tracking-[-0.01em]">AI 도우미</div>
							<div className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
								<span className="inline-flex items-center gap-1">
									<span className="h-2 w-2 rounded-full bg-emerald-400" />
									온라인
								</span>
								<span>·</span>
								<span>질문을 구체적으로 적을수록 정확도가 올라갑니다</span>
							</div>
						</div>
					</div>
					<div className="hidden" />
				</div>

				<ScrollArea className="flex-1 min-h-0 bg-white">
					<div className="p-5 space-y-4 pb-10">
						{messages.map((m) => (
							<div key={m.id}>
								<Bubble message={m} onSendSuggestion={send} />
							</div>
						))}

						{isTyping && (
							<div className="flex gap-3">
								<Avatar className="h-9 w-9 shrink-0">
									<AvatarFallback className="bg-blue-600 text-white">
										<Bot className="h-4 w-4" />
									</AvatarFallback>
								</Avatar>
								<div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
									<Loader2 className="h-3 w-3 animate-spin" />
									답변을 작성하고 있습니다...
								</div>
							</div>
						)}

						<div ref={bottomRef} />
					</div>
				</ScrollArea>

				<div className="border-t bg-white p-4 shrink-0">
					{selectedFile && (
						<div className="flex items-center gap-2 mb-2 p-2 bg-slate-100 rounded-lg w-fit text-xs border">
							<Paperclip className="h-3 w-3 text-slate-500" />
							<span className="max-w-[200px] truncate">{selectedFile.name}</span>
							<button onClick={clearFile} className="hover:bg-slate-200 rounded-full p-0.5">
								<X className="h-3 w-3 text-slate-500" />
							</button>
						</div>
					)}

					<div className="flex gap-2 items-end">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							className="hidden"
						/>
						<Button
							variant="ghost"
							size="icon"
							className="h-11 w-11 shrink-0"
							onClick={() => fileInputRef.current?.click()}
							disabled={isTyping}
						>
							<Paperclip className="h-5 w-5 text-slate-500" />
						</Button>

						<div className="flex-1">
							<Textarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={onKeyDown}
								placeholder="메시지를 입력하거나 파일을 첨부하세요..."
								className="min-h-[44px] max-h-[140px] resize-none"
								disabled={isTyping}
							/>
						</div>

						<Button
							onClick={() => send(input)}
							className="h-11 px-4"
							disabled={isTyping || (!input.trim() && !selectedFile)}
						>
							<Send className="h-4 w-4 mr-2" />
							전송
						</Button>
					</div>
				</div>
			</div>

			<div className="hidden lg:flex w-[269px] border-l bg-slate-50 flex-col min-h-0">
				<div className="p-5 shrink-0">
					<div className="text-sm font-semibold text-slate-900">빠른 질문</div>
					<div className="mt-1 text-xs text-slate-600">자주 쓰는 질문을 한 번에 보내세요.</div>
				</div>

				<Separator />

				<ScrollArea className="flex-1 min-h-0">
					<div className="p-4 space-y-2">
						{QUICK_PROMPTS.map((p) => (
							<button
								key={p.title}
								type="button"
								onClick={() => send(p.text)}
								className="w-full text-left rounded-xl border bg-white p-3 hover:border-slate-300 hover:shadow-sm transition"
							>
								<div className="text-sm font-semibold text-slate-900">{p.title}</div>
								<div className="mt-0.5 text-xs text-slate-600">{p.desc}</div>
								<div className="mt-2 text-[11px] text-slate-500">{p.text}</div>
							</button>
						))}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
