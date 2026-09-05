import { useEffect, useMemo, useState } from "react";
import { set_password_changed_now_for_email } from "../utils/accessControl";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

import { PasswordRules } from "./PasswordRules";
import { is_password_valid } from "../utils/password";
import { api } from "../api/client";
import {ToastType} from "./ui/useToast";

function sanitize_birth_date_input(raw: string) {
	const digits = (raw || "").replace(/[^0-9]/g, "").slice(0, 8);
	const y = digits.slice(0, 4);
	const m = digits.slice(4, 6);
	const d = digits.slice(6, 8);
	let out = y;
	if (m) out += `-${m}`;
	if (d) out += `-${d}`;
	return out;
}

function is_valid_birth_date(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

	const [yy, mm, dd] = value.split("-").map((v) => Number(v));
	if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return false;
	if (mm < 1 || mm > 12) return false;
	if (dd < 1 || dd > 31) return false;

	const dt = new Date(`${value}T00:00:00`);
	if (Number.isNaN(dt.getTime())) return false;

	const ok = dt.getFullYear() === yy && dt.getMonth() + 1 === mm && dt.getDate() === dd;
	if (!ok) return false;

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	if (dt.getTime() > today.getTime()) return false;

	return true;
}

interface SignupPageProps {
	onSignup: (email: string) => void;
	onNavigateToLogin: () => void;
	onNavigateToHome: () => void;
    showToast: (message: string, type: ToastType) => void;
}

const SECURITY_QUESTIONS = [
	"가장 기억에 남는 선생님 성함은?",
	"첫 반려동물 이름은?",
	"출생한 도시는?",
	"가장 좋아하는 음식은?",
] as const;

export function SignupPage({
                               onSignup,
                               onNavigateToLogin,
                               onNavigateToHome,
                               showToast,
                           }: SignupPageProps) {
    const [formData, setFormData] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		nickName: "",
		birthDate: "",
		name: "",
		recoveryQuestion: "",
		recoveryAnswer: "",
	});

	const [consents, setConsents] = useState({
		privacyRequired: false,
		marketingOptional: false,
	});

	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPrivacyDetail, setShowPrivacyDetail] = useState(false);

	const canSubmit = useMemo(() => {
		if (!formData.name.trim()) return false;
		if (!formData.email.trim()) return false;
		if (!formData.nickName.trim()) return false;
		if (!is_valid_birth_date(formData.birthDate)) return false;

		if (!formData.password) return false;
		if (formData.password !== formData.confirmPassword) return false;

		const email_local = formData.email.split("@")[0] || "";
		if (
			!is_password_valid(formData.password, {
				user_id: email_local,
				nickname: formData.nickName,
			})
		) {
			return false;
		}

		if (!formData.recoveryQuestion.trim()) return false;
		if (!formData.recoveryAnswer.trim()) return false;

		if (!consents.privacyRequired) return false;
		return true;
	}, [formData, consents.privacyRequired]);

	useEffect(() => {
		setError(null);
		setSuccess(null);
	}, [formData, consents]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		setIsSubmitting(true);
		setError(null);
		setSuccess(null);

		try {
			if (!consents.privacyRequired) {
				setError("개인정보 수집·이용(필수)에 동의해야 가입할 수 있어요.");
				return;
			}

			if (formData.password !== formData.confirmPassword) {
				setError("비밀번호와 비밀번호 확인이 일치하지 않아요.");
				return;
			}

			const email_local = formData.email.split("@")[0] || "";
			if (
				!is_password_valid(formData.password, {
					user_id: email_local,
					nickname: formData.nickName,
				})
			) {
				setError("비밀번호 규칙을 충족해 주세요.");
				return;
			}

			if (!is_valid_birth_date(formData.birthDate)) {
				setError("생년월일을 YYYY-MM-DD 형식으로 올바르게 입력해 주세요.");
				return;
			}

			if (!formData.recoveryQuestion.trim()) {
				setError("계정 찾기 질문을 선택해 주세요.");
				return;
			}
			if (!formData.recoveryAnswer.trim()) {
				setError("계정 찾기 답변을 입력해 주세요.");
				return;
			}

			const questionIndex = Number(formData.recoveryQuestion);
			if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex > 3) {
				setError("계정 찾기 질문을 다시 선택해 주세요.");
				return;
			}

			const payload = {
				email: formData.email.trim(),
				password: formData.password,
				name: formData.name.trim(),
				nickname: formData.nickName.trim(),
				role: 0,
				question: questionIndex,
				answer: formData.recoveryAnswer.trim(),
				birth: formData.birthDate,

			};

            await api("/users", { method: "POST", body: JSON.stringify(payload) });

            showToast("회원가입에 성공했습니다 🎉", "success");

			set_password_changed_now_for_email(payload.email);

			setSuccess("가입이 완료됐어요! 로그인 페이지로 이동합니다.");
			onSignup(payload.email);

			setTimeout(() => onNavigateToLogin(), 300);
		} catch (err: any) {
			const errorMessage =
				err instanceof Error
					? err.message
					: err?.message || "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";
			setError(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 bg-[radial-gradient(1200px_500px_at_50%_-20%,rgba(59,130,246,0.18),transparent),radial-gradient(900px_420px_at_15%_110%,rgba(99,102,241,0.12),transparent)]">
			<Card className="w-full max-w-[420px] rounded-2xl border-slate-200/60 shadow-xl overflow-hidden">
				<CardHeader className="space-y-2 pb-5">
					<div className="flex items-center justify-center">
						<img
							src="/logo2.png"
							alt="입찰인사이트 로고"
							className="h-14 w-auto object-contain cursor-pointer hover:opacity-90 transition"
							onClick={onNavigateToHome}
							title="홈페이지 이동하기"
						/>
					</div>
				</CardHeader>

				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-5 max-h-[70vh] overflow-auto pr-1">
						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{error}
							</div>
						)}
						{success && (
							<div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
								{success}
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="name" className="text-sm font-medium">
								이름
							</Label>
							<Input
								id="name"
								className="h-11"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								autoComplete="name"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								이메일
							</Label>
							<Input
								id="email"
								type="email"
								className="h-11"
								placeholder="name@company.com"
								value={formData.email}
								onChange={(e) => setFormData({ ...formData, email: e.target.value })}
								autoComplete="username"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="nickName" className="text-sm font-medium">
								닉네임
							</Label>
							<Input
								id="nickName"
								className="h-11"
								value={formData.nickName}
								onChange={(e) => setFormData({ ...formData, nickName: e.target.value })}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="birthDate" className="text-sm font-medium">
								생년월일
							</Label>
							<Input
								id="birthDate"
								type="text"
								className="h-11"
								value={formData.birthDate}
								placeholder="YYYY-MM-DD"
								inputMode="numeric"
								maxLength={10}
								onChange={(e) => {
									const next = sanitize_birth_date_input(e.target.value);
									setFormData({ ...formData, birthDate: next });
								}}
								required
							/>
							<div className="text-xs text-muted-foreground">예시: 1999-01-31</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								비밀번호
							</Label>
							<Input
								id="password"
								type="password"
								className="h-11"
								value={formData.password}
								maxLength={64}
								onChange={(e) =>
									setFormData({
										...formData,
										password: e.target.value.replace(/\s/g, ""),
									})
								}
								autoComplete="new-password"
								required
							/>
							<PasswordRules
								password={formData.password}
								ctx={{
									user_id: (formData.email.split("@")[0] || "").trim(),
									nickname: formData.nickName.trim(),
								}}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword" className="text-sm font-medium">
								비밀번호 확인
							</Label>
							<Input
								id="confirmPassword"
								type="password"
								className="h-11"
								value={formData.confirmPassword}
								maxLength={64}
								onChange={(e) =>
									setFormData({
										...formData,
										confirmPassword: e.target.value.replace(/\s/g, ""),
									})
								}
								autoComplete="new-password"
								required
							/>
						</div>

						<div className="space-y-2 pt-1">
							<Label htmlFor="recoveryQuestion" className="text-sm font-medium">
								계정 찾기 질문
							</Label>
							<Select
								value={formData.recoveryQuestion}
								onValueChange={(value) => setFormData({ ...formData, recoveryQuestion: value })}
							>
								<SelectTrigger id="recoveryQuestion" className="h-11">
									<SelectValue placeholder="질문을 선택하세요" />
								</SelectTrigger>
								<SelectContent>
									{SECURITY_QUESTIONS.map((label, idx) => (
										<SelectItem key={String(idx)} value={String(idx)}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="recoveryAnswer" className="text-sm font-medium">
								계정 찾기 답변
							</Label>
							<Input
								id="recoveryAnswer"
								className="h-11"
								value={formData.recoveryAnswer}
								onChange={(e) => setFormData({ ...formData, recoveryAnswer: e.target.value })}
								placeholder="답변을 입력하세요"
								required
							/>
							<div className="text-xs text-muted-foreground">나중에 계정 찾기/복구에 사용됩니다.</div>
						</div>

						<div className="space-y-3 pt-2">
							<div className="text-sm font-medium">약관 동의</div>

							<label className="flex items-start gap-3 rounded-lg border bg-white px-3 py-3 text-sm">
								<input
									type="checkbox"
									className="mt-0.5 h-4 w-4"
									checked={consents.privacyRequired}
									onChange={(e) =>
										setConsents({
											...consents,
											privacyRequired: e.target.checked,
										})
									}
								/>
								<span className="flex-1">
									<span className="font-medium">개인정보 수집·이용 동의(필수)</span>
									<span className="text-red-600"> *</span>
									<div className="text-xs text-muted-foreground mt-1">
										회원가입 및 서비스 제공을 위해 필요합니다.
										<button
											type="button"
											className="ml-2 underline"
											onClick={() => setShowPrivacyDetail((v) => !v)}
										>
											{showPrivacyDetail ? "닫기" : "자세히"}
										</button>
									</div>

									{showPrivacyDetail && (
										<div className="mt-2 rounded-md bg-slate-50 border px-3 py-2 text-xs text-slate-700 space-y-1">
											<div>
												<span className="font-medium">수집 항목</span>: 이름, 이메일, 닉네임,
												생년월일(본인 확인/계정복구용)
											</div>
											<div>
												<span className="font-medium">이용 목적</span>: 회원가입, 로그인, 계정 복구,
												서비스 제공 및 고지사항 전달
											</div>
											<div>
												<span className="font-medium">보유 기간</span>: 회원 탈퇴 후 지체 없이 파기(관계
												법령에 따라 보관이 필요한 경우 예외)
											</div>
											<div>
												<span className="font-medium">동의 거부</span>: 필수 항목 동의 거부 시 회원가입 불가
											</div>
										</div>
									)}
								</span>
							</label>

							<label className="flex items-start gap-3 rounded-lg border bg-white px-3 py-3 text-sm">
								<input
									type="checkbox"
									className="mt-0.5 h-4 w-4"
									checked={consents.marketingOptional}
									onChange={(e) =>
										setConsents({
											...consents,
											marketingOptional: e.target.checked,
										})
									}
								/>
								<span className="flex-1">
									<span className="font-medium">마케팅 정보 수신 동의(선택)</span>
									<div className="text-xs text-muted-foreground mt-1">이벤트/혜택 알림을 받아볼 수 있어요.</div>
								</span>
							</label>
						</div>
					</CardContent>

					<CardFooter className="flex flex-col gap-3 pt-4">
						<Button type="submit" className="w-full h-11 text-base font-semibold" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? "가입 처리 중..." : "가입하기"}
						</Button>

						<div className="text-sm text-center text-muted-foreground">
							이미 계정이 있으신가요?{" "}
							<button
								type="button"
								onClick={onNavigateToLogin}
								className="font-medium text-slate-900 hover:underline"
							>
								로그인
							</button>
						</div>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
