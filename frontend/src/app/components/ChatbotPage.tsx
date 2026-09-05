import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Bot, User } from "lucide-react";
import { Badge } from "./ui/badge";
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { fetchChatResponse, ChatRequest } from "../api/chatbot";

interface Message {
	id: number;
	text: string;
	sender: "user" | "bot";
	timestamp: string;
	suggestions?: string[];
}
function dataUrlToFile(dataUrl: string, fileName: string): File {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";

    const binStr = atob(b64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);

    return new File([bytes], fileName, { type: mime });
}

export function ChatbotPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [messages, setMessages] = useState<Message[]>([
		{
			id: 1,
			text: "안녕하세요! 입찰 인텔리전스 AI 어시스턴트입니다. 무엇을 도와드릴까요?",
			sender: "bot",
			timestamp: "10:00",
			suggestions: ["서울 지역 신규 공고 알려줘", "30억 이하 공사 찾아줘", "마감 임박한 공고는?"],
		},
	]);

	const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
	const bottomRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end",
		});
	}, [messages, isLoading]);

	const generateBotResponse = (userInput: string): Message => {
		const input = userInput.toLowerCase();
		let responseText = "";
		let suggestions: string[] = [];

		if (input.includes("서울") || input.includes("지역")) {
			responseText =
				"서울 지역의 현재 진행 중인 공고는 총 23건입니다.\n\n주요 공고:\n• 서울시 강남구 도로 보수공사 (35억원, D-2)\n• 서울시 송파구 공공건물 신축 (52억원, D-7)\n• 서울시 마포구 학교시설 개선 (18억원, D-5)\n\n자세한 내용을 보시려면 '공고 찾기' 메뉴를 이용해주세요.";
			suggestions = ["강남구 공고 상세보기", "30억 이하만 보기", "마감일 빠른 순"];
		} else if (input.includes("마감") || input.includes("임박")) {
			responseText =
				"마감 3일 이내 공고는 8건입니다. ⚠️\n\n긴급:\n• 서울 강남구 도로공사 (D-2, 35억원)\n• 인천 연수구 학교시설 (D-4, 12억원)\n• 경기 성남시 건축공사 (D-5, 87억원)\n\n서류 준비를 서둘러주세요!";
			suggestions = ["체크리스트 확인", "투찰가 가이드", "장바구니 담기"];
		} else {
			responseText =
				'죄송합니다. 질문을 이해하지 못했습니다. 다음과 같이 질문해주세요:\n\n• "서울 지역 공고 알려줘"\n• "30억 이하 공사 찾아줘"\n• "마감 임박한 공고는?"\n• "최근 낙찰률 분석해줘"';
			suggestions = ["서울 지역 신규 공고", "30억 이하 공사", "마감 임박 공고"];
		}

		return {
			id: Date.now(),
			text: responseText,
			sender: "bot",
			timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
			suggestions,
		};
	};

    const sendMessage = async (text: string) => {
        const trimmed = text.trim();
        if ((!trimmed && !selectedFile) || isLoading) return; // 파일만 보내는 것도 허용

        const userMessage: Message = {
            id: Date.now(),
            text: trimmed || `(파일 전송: ${selectedFile?.name})`, // 파일만 보낼 때 대비
            sender: "user",
            timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const result = await fetchChatResponse({
                query: trimmed,
                thread_id: "user_session_1",
                file: selectedFile ?? undefined,
            });

            const botMessage: Message = {
                id: Date.now() + 1,
                text: result.data.message,
                sender: "bot",
                timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
                suggestions: [],
            };

            setMessages((prev) => [...prev, botMessage]);

            setSelectedFile(null); //  전송 후 파일 초기화
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    text: "죄송합니다. 서버 연결에 실패했습니다.",
                    sender: "bot",
                    timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
		sendMessage(inputValue);
	};

	const handleSuggestionClick = (suggestion: string) => {
		sendMessage(suggestion);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="space-y-6 max-h-full overflow-hidden min-h-0">
			<div>
				<h2 className="text-3xl mb-2">AI 어시스턴트</h2>
				<p className="text-muted-foreground">입찰 관련 질문을 자유롭게 물어보세요</p>
			</div>

			<Card className="h-[600px] flex flex-col min-h-0">
				<CardHeader className="border-b shrink-0">
					<div className="flex items-center gap-3">
						<Avatar>
							<AvatarFallback className="bg-blue-600 text-white">
								<Bot className="h-5 w-5" />
							</AvatarFallback>
						</Avatar>
						<div>
							<CardTitle className="text-lg">입찰 AI 어시스턴트</CardTitle>
							<CardDescription className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}></span>								온라인
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<ScrollArea className="flex-1 min-h-0">
					<div className="p-4 space-y-4 pb-10">
						{messages.map((message) => (
							<div
								key={message.id}
								className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}
							>
								<Avatar className="flex-shrink-0">
									<AvatarFallback
										className={message.sender === "bot" ? "bg-blue-600 text-white" : "bg-gray-600 text-white"}
									>
										{message.sender === "bot" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
									</AvatarFallback>
								</Avatar>

								<div className={`flex-1 max-w-[80%] ${message.sender === "user" ? "flex flex-col items-end" : ""}`}>
									<div className={`rounded-lg p-4 ${message.sender === "bot" ? "bg-gray-100" : "bg-blue-600 text-white"}`}>
										<p className="text-sm whitespace-pre-line">{message.text}</p>
									</div>
									<p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>

									{message.suggestions && message.suggestions.length > 0 && (
										<div className="flex flex-wrap gap-2 mt-3">
											{message.suggestions.map((suggestion, index) => (
												<Badge
													key={index}
													variant="outline"
													className="cursor-pointer hover:bg-blue-50"
													onClick={() => handleSuggestionClick(suggestion)}
												>
													{suggestion}
												</Badge>
											))}
										</div>
									)}
								</div>
							</div>
						))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <Avatar className="flex-shrink-0">
                                    <AvatarFallback className="bg-blue-600 text-white">
                                        <Bot className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-gray-100 rounded-lg p-4 flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                    <span className="text-sm text-gray-500">답변을 작성하고 있습니다...</span>
                                </div>
                            </div>
                        )}
						<div ref={bottomRef} />
					</div>
				</ScrollArea>

				<CardContent className="border-t pt-4 shrink-0">
                    <div className="flex gap-2">
                        <Input
                            placeholder="메시지를 입력하세요..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress as any} // 기존 함수 유지 시. (권장은 onKeyDown으로 바꾸기)
                        />

                        {/*  파일 선택 */}
                        <input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                        />

                        <Button onClick={handleSend} disabled={isLoading}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>

                </CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">자주 묻는 질문</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<Button
							variant="outline"
							className="justify-start h-auto py-3"
							onClick={() => handleSuggestionClick("서울 지역 신규 공고 알려줘")}
						>
							<div className="text-left">
								<p className="font-semibold">지역별 공고 검색</p>
								<p className="text-xs text-muted-foreground">특정 지역의 공고 찾기</p>
							</div>
						</Button>

						<Button
							variant="outline"
							className="justify-start h-auto py-3"
							onClick={() => handleSuggestionClick("30억 이하 공사 찾아줘")}
						>
							<div className="text-left">
								<p className="font-semibold">예산별 필터링</p>
								<p className="text-xs text-muted-foreground">금액대별 공고 조회</p>
							</div>
						</Button>

						<Button
							variant="outline"
							className="justify-start h-auto py-3"
							onClick={() => handleSuggestionClick("마감 임박한 공고는?")}
						>
							<div className="text-left">
								<p className="font-semibold">마감 임박 공고</p>
								<p className="text-xs text-muted-foreground">긴급 입찰 기회 확인</p>
							</div>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
