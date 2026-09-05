import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { login, persistLogin } from "../api/auth";
import {
	format_mmss,
	is_login_locked,
	is_password_expired,
	login_lock_remaining_ms,
	record_login_failure,
	record_login_success,
	should_require_captcha,
	ensure_password_changed_at_initialized,
	migrate_password_changed_at,
} from "../utils/accessControl";

import { SimpleCaptcha } from "./SimpleCaptcha";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { ENABLE_TEST_LOGIN, TEST_LOGIN } from "../utils/testLogin";
import { mark_reco_popup_trigger } from "./RecommendedBidsModal";

function parse_user_id(res: any): string | null {
	const data = res?.data;
	const cand = data?.id ?? data?.userId ?? data?.user_id;
	if (typeof cand === "number" && Number.isFinite(cand)) return String(cand);
	if (typeof cand === "string" && cand.trim()) return cand.trim();
	return null;
}

function cleanLoginErrorMessage(input: unknown) {
	let msg =
		typeof input === "string"
			? input
			: typeof (input as any)?.message === "string"
				? (input as any).message
				: "";

	try {
		const parsed = JSON.parse(msg);
		if (parsed?.message) msg = String(parsed.message);
	} catch {
	}

	msg = msg.replace(/^서버 내부 오류가 발생했습니다:\s*/g, "").trim();

	if (msg.includes("비밀번호가 일치하지 않습니다")) return "비밀번호가 올바르지 않습니다.";
	if (msg.includes("존재하지") || msg.includes("계정을 찾을 수")) return "등록되지 않은 이메일입니다.";
	if (!msg) return "로그인에 실패했습니다. 다시 시도해 주세요.";

	return msg;
}

export function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation() as any;

	const from = location?.state?.from || "/";

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [captchaValid, setCaptchaValid] = useState(true);
	const captchaRequired = useMemo(() => {
		return should_require_captcha(email.trim());
	}, [email]);

	const [lockRemaining, setLockRemaining] = useState(0);

	useEffect(() => {
		const em = email.trim();
		if (!em) {
			setLockRemaining(0);
			return;
		}

		const tick = () => {
			setLockRemaining(login_lock_remaining_ms(em));
		};
		tick();

		const id = window.setInterval(tick, 500);
		return () => window.clearInterval(id);
	}, [email]);

	const locked = useMemo(() => {
		const em = email.trim();
		if (!em) return false;
		return is_login_locked(em);
	}, [email, lockRemaining]);

	const doLogin = async (em: string, pw: string) => {
		setErrorMsg(null);

		if (!em || !pw) {
			setErrorMsg("이메일과 비밀번호를 입력해 주세요.");
			return;
		}

		if (is_login_locked(em)) {
			setErrorMsg(`로그인이 잠겨 있습니다. ${format_mmss(login_lock_remaining_ms(em))} 후 다시 시도해 주세요.`);
			return;
		}

		if (should_require_captcha(em) && !captchaValid) {
			setErrorMsg("캡챠 인증을 완료해 주세요.");
			return;
		}

		try {
			setSubmitting(true);
			const res = await login(em, pw);

			if (res.status !== "success" || !res.data) {
				const st = record_login_failure(em);
				const remaining = Math.max(0, 5 - st.count);

				if (st.lock_until && st.lock_until > Date.now()) {
					setErrorMsg(
						`로그인 실패가 누적되어 계정이 잠겼습니다. ${format_mmss(login_lock_remaining_ms(em))} 후 다시 시도해 주세요.`,
					);
					return;
				}

				const clean = cleanLoginErrorMessage(res);
				setErrorMsg(`${clean} (남은 시도: ${remaining}회)`);
				return;
			}

			const userId = parse_user_id(res);
			if (!userId) {
				setErrorMsg("로그인 정보 처리 중 문제가 발생했습니다. 다시 시도해주세요.");
				return;
			}

			persistLogin({
				...res.data,
				userId,
				name: String(res.data.name ?? ""),
				email: String(res.data.email ?? em),
			});

			localStorage.setItem("name", String(res.data.name ?? ""));

			record_login_success(em);
			mark_reco_popup_trigger();

			migrate_password_changed_at(String(res.data.email ?? em), userId);
			ensure_password_changed_at_initialized(userId);

			if (is_password_expired(userId)) {
				navigate("/profile", {
					replace: true,
					state: { passwordExpired: true, fromAfterChange: from },
				});
				return;
			}

			navigate(from, { replace: true });
		} catch (err: any) {
			const st = record_login_failure(em);

			if (st.lock_until && st.lock_until > Date.now()) {
				setErrorMsg(
					`로그인 실패가 누적되어 계정이 잠겼습니다. ${format_mmss(login_lock_remaining_ms(em))} 후 다시 시도해 주세요.`,
				);
			} else {
				const remaining = Math.max(0, 5 - st.count);
				const clean = cleanLoginErrorMessage(err);
				setErrorMsg(`${clean} (남은 시도: ${remaining}회)`);
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await doLogin(email.trim(), password);
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

				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								이메일
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@company.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="h-11"
								autoComplete="username"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								비밀번호
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="h-11"
								autoComplete="current-password"
								required
							/>
						</div>

						{captchaRequired && (
							<SimpleCaptcha onValidChange={setCaptchaValid} />
						)}

						{errorMsg && (
							<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{errorMsg}
							</div>
						)}

						{locked && (
							<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
								로그인 시도가 제한되었습니다. {format_mmss(lockRemaining)} 후 다시 시도해 주세요.
							</div>
						)}
					</CardContent>

					<CardFooter className="flex flex-col gap-3 pt-6">
						<Button
							type="submit"
							className="w-full h-11 text-base font-semibold"
							disabled={submitting || locked || (captchaRequired && !captchaValid)}
						>
							{submitting ? "로그인 중..." : "로그인"}
						</Button>

						{ENABLE_TEST_LOGIN && (
							<Button
								type="button"
								variant="outline"
								className="w-full h-11"
								disabled={submitting}
								onClick={async () => {
									setEmail(TEST_LOGIN.email);
									setPassword(TEST_LOGIN.password);
									await doLogin(TEST_LOGIN.email, TEST_LOGIN.password);
								}}
							>
								테스트 로그인
							</Button>
						)}

						<div className="text-sm text-center text-muted-foreground">
							계정이 없으신가요?{" "}
							<button
								type="button"
								onClick={() => navigate("/signup")}
								className="font-medium text-slate-900 pt-6 hover:underline"
							>
								회원가입
							</button>
						</div>

						<div className="flex justify-between gap-4 text-sm">
							<button
								type="button"
								onClick={() => navigate("/find-account")}
								className="text-muted-foreground hover:text-slate-900 hover:underline"
							>
								계정 찾기
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
