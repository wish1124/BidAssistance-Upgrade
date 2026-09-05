import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./ui/card";

const SECURITY_QUESTIONS = [
	"가장 기억에 남는 선생님 성함은?",
	"첫 반려동물 이름은?",
	"출생한 도시는?",
	"가장 좋아하는 음식은?",
] as const;

type Notice = { type: "error" | "success"; text: string } | null;

export function FindAccountPage() {
	const navigate = useNavigate();

	const [formData, setFormData] = useState({
		name: "",
		birthDate: "",
		answer: "",
	});

	const [step, setStep] = useState<"identify" | "answer" | "result">("identify");
	const [questionIndex, setQuestionIndex] = useState<number | null>(null);
	const [identifiedEmail, setIdentifiedEmail] = useState<string>("");
    const [requestId, setRequestId] = useState<number | null>(null);

	const [message, setMessage] = useState<Notice>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const canIdentify = useMemo(() => {
		return Boolean(formData.name.trim() && formData.birthDate);
	}, [formData.name, formData.birthDate]);

	const canAnswer = useMemo(() => {
        return Boolean(requestId !== null && questionIndex !== null && formData.answer.trim());
	}, [requestId, questionIndex, formData.answer]);

	const resetToIdentify = () => {
		setStep("identify");
		setQuestionIndex(null);
        setRequestId(null);
		setIdentifiedEmail("");
		setFormData((prev) => ({ ...prev, answer: "" }));
		setMessage(null);
	};

const BASE_URL = import.meta.env.VITE_API_URL || "";

	const handleIdentify = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage(null);
		if (!canIdentify) return;

		try {
			setIsSubmitting(true);

			const name = formData.name.trim();
			const birth = formData.birthDate;
            const qs = new URLSearchParams({ name, birth }).toString();


            const res = await fetch(`${BASE_URL}/api/users/find-email/identify?${qs}`, { method: "GET" });
			const json = await res.json().catch(() => null);

			if (!res.ok || json?.status === "error") {
				const msg =
					json?.message ??
					(res.status === 404 ? "가입된 계정을 찾을 수 없습니다." : "요청에 실패했습니다. 다시 시도해 주세요.");
				setMessage({ type: "error", text: msg });
				return;
			}

			const rid = json?.data?.requestId;
			const qIndex = json?.data?.questionIndex;

            if (typeof rid !== "number" || typeof qIndex !== "number") {
                setMessage({ type: "error", text: "서버 응답 형식이 올바르지 않아요." });
                return;
            }

			setRequestId(rid);
			setQuestionIndex(qIndex);
			setStep("answer");
			setMessage({ type: "success", text: "확인 완료. 가입 시 설정한 질문에 답변해 주세요." });
		} catch {
			setMessage({ type: "error", text: "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleVerifyAnswer = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage(null);
		if (!canAnswer) return;

		try {
			setIsSubmitting(true);

			const answer = formData.answer.trim();
            const qs = new URLSearchParams({
                userId: String(requestId),
                answer,
            }).toString();
			const res = await fetch(`${BASE_URL}/api/users/find-email/verify?${qs}`, { method: "GET" });
			const json = await res.json().catch(() => null);

			if (!res.ok || json?.status === "error") {
				const msg =
					json?.message ??
					(res.status === 401 ? "답변이 일치하지 않습니다." : "요청에 실패했습니다. 다시 시도해 주세요.");
				setMessage({ type: "error", text: msg });
				return;
			}

            const email =
                typeof json?.data?.email === "string"
                    ? json.data.email
                    : typeof json?.message === "string"
                        ? json.message
                        : null;

            if (!email) {
                setMessage({ type: "error", text: "서버 응답 형식이 올바르지 않아요." });
                return;
            }

            setIdentifiedEmail(email);
            setStep("result");
            setMessage({ type: "success", text: "계정을 찾았어요!" });

		} catch {
			setMessage({ type: "error", text: "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(1200px_500px_at_50%_-20%,rgba(59,130,246,0.18),transparent),radial-gradient(900px_420px_at_15%_110%,rgba(99,102,241,0.12),transparent)]">
			<Card className="w-full max-w-[420px] rounded-2xl border-slate-200/60 shadow-xl">
				<CardHeader className="space-y-2 pb-5">
					<div className="flex items-center justify-center">
						<img
							src="/logo2.png"
							alt="입찰인사이트 로고"
							className="h-14 w-auto object-contain cursor-pointer hover:opacity-90 transition"
							onClick={() => navigate("/")}
							title="홈페이지 이동하기"
						/>
					</div>
				</CardHeader>

				<form onSubmit={step === "identify" ? handleIdentify : step === "answer" ? handleVerifyAnswer : (e) => e.preventDefault()}>
					<CardContent className="space-y-5">
						<div className="space-y-1">
							<CardTitle className="text-2xl text-center">계정 찾기</CardTitle>
							<CardDescription className="text-center">
								가입 시 등록한 정보로 계정(이메일)을 찾습니다
							</CardDescription>
						</div>

                        {message && step !== "result" && (
                            <div
                                role="alert"
                                className={[
                                    "rounded-lg border px-3 py-2 text-sm",
                                    message.type === "success"
                                        ? "border-green-200 bg-green-50 text-green-700"
                                        : "border-red-200 bg-red-50 text-red-700",
                                ].join(" ")}
                            >
                                {message.text}
                            </div>
                        )}


                        {step === "identify" && (
							<>
								<div className="space-y-2">
									<Label htmlFor="name" className="text-sm font-medium">이름</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
										className="h-11"
										required
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="birthDate" className="text-sm font-medium">생년월일</Label>
									<Input
										id="birthDate"
										type="date"
										value={formData.birthDate}
										onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
										className="h-11"
										required
									/>
								</div>
							</>
						)}

						{step === "answer" && (
							<>
								<div className="space-y-2">
									<Label className="text-sm font-medium">가입 시 설정한 질문</Label>
									<div className="rounded-lg border bg-white px-3 py-3 text-sm leading-relaxed">
										{questionIndex !== null ? SECURITY_QUESTIONS[questionIndex] : ""}
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="answer" className="text-sm font-medium">답변</Label>
									<Input
										id="answer"
										value={formData.answer}
										onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
										className="h-11"
										required
									/>
								</div>

								<Button
									type="button"
									variant="outline"
									className="w-full h-11"
									onClick={resetToIdentify}
									disabled={isSubmitting}
								>
									다시 입력하기
								</Button>
							</>
						)}

						{step === "result" && (
							<>
								<div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
									계정을 찾았어요!
								</div>

								<div className="text-sm">
									당신의 계정(이메일):{" "}
									<span className="font-medium text-slate-900">{identifiedEmail}</span>
								</div>

								<Button
									type="button"
									className="w-full h-11 text-base font-semibold"
									onClick={() => navigate("/login")}
								>
									로그인하러 가기
								</Button>

								<Button
									type="button"
									variant="outline"
									className="w-full h-11"
									onClick={() => {
										setStep("identify");
										setQuestionIndex(null);
                                        setRequestId(null);
										setIdentifiedEmail("");
										setFormData({ name: "", birthDate: "", answer: "" });
										setMessage(null);
									}}
								>
									다시 찾기
								</Button>
							</>
						)}
					</CardContent>

					<CardFooter className="flex flex-col gap-3 pt-6">
						{step !== "result" && (
							<Button
								type="submit"
								className="w-full h-11 text-base font-semibold"
								disabled={
									isSubmitting ||
									(step === "identify" && !canIdentify) ||
									(step === "answer" && !canAnswer)
								}
							>
								{isSubmitting ? "확인 중..." : step === "identify" ? "다음" : "계정 확인"}
							</Button>
						)}

						<div className="flex justify-between gap-4 text-sm">
							<button
								type="button"
								onClick={() => navigate("/login")}
								className="text-muted-foreground hover:text-slate-900 hover:underline"
							>
								로그인
							</button>
							<button
								type="button"
								onClick={() => navigate("/reset-password")}
								className="text-muted-foreground hover:text-slate-900 hover:underline"
							>
								비밀번호 찾기
							</button>
						</div>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
