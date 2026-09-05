import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBids } from "../api/bids";
import { login, logout as apiLogout } from "../api/auth";
import { fetchWishlist } from "../api/wishlist";
import { getCompanyForUser } from "../api/company";
import { mask_name } from "../utils/masking";
import {
	format_mmss,
	is_login_locked,
	is_password_expired,
	login_lock_remaining_ms,
	migrate_password_changed_at,
	record_login_failure,
	record_login_success,
	should_require_captcha,
	ensure_password_changed_at_initialized,
} from "../utils/accessControl";

import { SimpleCaptcha } from "./SimpleCaptcha";
import { ENABLE_TEST_LOGIN, TEST_LOGIN } from "../utils/testLogin";
import { mark_reco_popup_trigger } from "./RecommendedBidsModal";



function DashboardIcon() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="w-full h-full"
			aria-hidden="true"
		>
			<style>{`
				.dash-bar { animation: grow 2s ease-in-out infinite alternate; transform-origin: bottom; }
				.dash-line { stroke-dasharray: 100; stroke-dashoffset: 100; animation: draw 3s ease-in-out infinite; }
				@keyframes grow { 0% { transform: scaleY(0.6); } 100% { transform: scaleY(1); } }
				@keyframes draw { 0% { stroke-dashoffset: 100; } 50% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; } }
				@media (prefers-reduced-motion: reduce) {
					.dash-bar, .dash-line { animation: none !important; }
				}
			`}</style>
			<circle cx="32" cy="32" r="30" fill="#E8F0FE" />
			<path d="M16 48H48" stroke="#1A73E8" strokeWidth="2" strokeLinecap="round" />
			<path d="M16 48V20" stroke="#1A73E8" strokeWidth="2" strokeLinecap="round" />
			<rect
				x="20"
				y="30"
				width="6"
				height="18"
				rx="1"
				fill="#8AB4F8"
				className="dash-bar"
				style={{ animationDelay: "0s" }}
			/>
			<rect
				x="29"
				y="24"
				width="6"
				height="24"
				rx="1"
				fill="#4285F4"
				className="dash-bar"
				style={{ animationDelay: "0.2s" }}
			/>
			<rect
				x="38"
				y="18"
				width="6"
				height="30"
				rx="1"
				fill="#1967D2"
				className="dash-bar"
				style={{ animationDelay: "0.4s" }}
			/>
			<path
				d="M46 22L52 16M52 16H46M52 16V22"
				stroke="#1A73E8"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function BidSearchIcon() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="w-full h-full"
			aria-hidden="true"
		>
			<style>{`
				.search-glass { animation: searchMove 3s ease-in-out infinite; transform-origin: center; }
				.doc-lines { opacity: 0.5; }
				@keyframes searchMove { 0% { transform: translate(-2px, -2px) rotate(0deg); } 50% { transform: translate(2px, 2px) rotate(5deg); } 100% { transform: translate(-2px, -2px) rotate(0deg); } }
				@media (prefers-reduced-motion: reduce) {
					.search-glass { animation: none !important; }
				}
			`}</style>
			<circle cx="32" cy="32" r="30" fill="#E8F0FE" />
			<rect x="20" y="16" width="24" height="32" rx="2" fill="white" stroke="#1A73E8" strokeWidth="2" />
			<path
				d="M24 24H36M24 30H40M24 36H36"
				stroke="#1A73E8"
				strokeWidth="2"
				strokeLinecap="round"
				className="doc-lines"
			/>
			<g className="search-glass">
				<circle cx="38" cy="38" r="9" fill="#E8F0FE" stroke="#1967D2" strokeWidth="2.5" />
				<path d="M44 44L50 50" stroke="#1967D2" strokeWidth="2.5" strokeLinecap="round" />
				<path d="M35 34C35 34 36 32 39 32" stroke="#8AB4F8" strokeWidth="2" strokeLinecap="round" />
			</g>
		</svg>
	);
}

function CartIcon() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="w-full h-full"
			aria-hidden="true"
		>
			<style>{`
				.cart-item { animation: dropIn 2.5s ease-out infinite; }
				@keyframes dropIn { 0% { transform: translateY(-10px); opacity: 0; } 30% { transform: translateY(0); opacity: 1; } 80% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(0); opacity: 0; } }
				@media (prefers-reduced-motion: reduce) {
					.cart-item { animation: none !important; }
				}
			`}</style>
			<circle cx="32" cy="32" r="30" fill="#E8F0FE" />
			<path
				d="M16 20H20L23 42H45L48 24H22"
				stroke="#1A73E8"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="#E8F0FE"
			/>
			<circle cx="25" cy="46" r="2" fill="#1A73E8" />
			<circle cx="43" cy="46" r="2" fill="#1A73E8" />
			<g className="cart-item">
				<rect x="28" y="14" width="14" height="18" rx="1" fill="#4285F4" stroke="#1967D2" strokeWidth="1.5" />
				<path d="M32 20H38M32 24H36" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
			</g>
		</svg>
	);
}

function CommunityIcon() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="w-full h-full"
			aria-hidden="true"
		>
			<style>{`
				.bubble-1 { animation: popup 3s infinite; transform-origin: bottom left; }
				.bubble-2 { animation: popup 3s infinite 1.5s; transform-origin: bottom right; }
				@keyframes popup { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
				@media (prefers-reduced-motion: reduce) {
					.bubble-1, .bubble-2 { animation: none !important; }
				}
			`}</style>
			<circle cx="32" cy="32" r="30" fill="#E8F0FE" />
			<g className="bubble-1">
				<path
					d="M16 22C16 18.6863 18.6863 16 22 16H38C41.3137 16 44 18.6863 44 22V32C44 35.3137 41.3137 38 38 38H22L16 42V22Z"
					fill="#4285F4"
				/>
				<circle cx="24" cy="27" r="2" fill="white" />
				<circle cx="30" cy="27" r="2" fill="white" />
				<circle cx="36" cy="27" r="2" fill="white" />
			</g>
			<g className="bubble-2">
				<path
					d="M48 42C48 45.3137 45.3137 48 42 48H26C22.6863 48 20 45.3137 20 42V36C20 36 24 36 28 36H42V26L48 30V42Z"
					fill="#1967D2"
					stroke="#E8F0FE"
					strokeWidth="2"
				/>
			</g>
		</svg>
	);
}

function NewBidIcon() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="w-full h-full"
			aria-hidden="true"
		>
			<style>{`
				.new-sparkle { animation: sparkle 2s ease-in-out infinite; transform-origin: center; }
				.new-doc { animation: float 3s ease-in-out infinite; }
				@keyframes sparkle { 0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.2) rotate(180deg); opacity: 1; } }
				@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
				@media (prefers-reduced-motion: reduce) {
					.new-sparkle, .new-doc { animation: none !important; }
				}
			`}</style>
			<circle cx="32" cy="32" r="30" fill="#E8F0FE" />
			<g className="new-doc">
				<rect x="22" y="18" width="20" height="28" rx="2" fill="white" stroke="#1A73E8" strokeWidth="2" />
				<path d="M27 26H37M27 32H37M27 38H33" stroke="#8AB4F8" strokeWidth="2" strokeLinecap="round" />
			</g>
			<g className="new-sparkle">
				<path
					d="M46 16L47.5 20L51.5 21.5L47.5 23L46 27L44.5 23L40.5 21.5L44.5 20L46 16Z"
					fill="#1A73E8"
				/>
			</g>
		</svg>
	);
}

function ClosingSoonIcon() {
	return (
		<svg
			width="100%"
			height="100%"
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="w-full h-full"
			aria-hidden="true"
		>
			<style>{`
				.clock-hand { animation: tick 4s linear infinite; transform-origin: 32px 32px; }
				.clock-bell { animation: ring 0.2s ease-in-out infinite alternate; display: none; }
				@keyframes tick { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
				@media (prefers-reduced-motion: reduce) {
					.clock-hand, .clock-bell { animation: none !important; }
				}
			`}</style>
			<circle cx="32" cy="32" r="30" fill="#E8F0FE" />
			<circle cx="32" cy="32" r="14" fill="white" stroke="#1A73E8" strokeWidth="2" />
			<path d="M32 14V18" stroke="#1A73E8" strokeWidth="2" strokeLinecap="round" />
			<path d="M26 16L28 18M38 16L36 18" stroke="#1A73E8" strokeWidth="2" strokeLinecap="round" />
			<g className="clock-hand">
				<line x1="32" y1="32" x2="32" y2="24" stroke="#1967D2" strokeWidth="2" strokeLinecap="round" />
				<line x1="32" y1="32" x2="36" y2="32" stroke="#8AB4F8" strokeWidth="2" strokeLinecap="round" />
				<circle cx="32" cy="32" r="2" fill="#1A73E8" />
			</g>
		</svg>
	);
}

type AuthUser = {
	name: string;
	email?: string;
};

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
        // msg가 JSON이 아니면 무시
    }

    msg = msg.replace(/^서버 내부 오류가 발생했습니다:\s*/g, "").trim();

    if (msg.includes("비밀번호가 일치하지 않습니다")) return "비밀번호가 올바르지 않습니다.";
    if (msg.includes("존재하지") || msg.includes("계정을 찾을 수")) return "등록되지 않은 이메일입니다.";
    if (!msg) return "로그인에 실패했습니다. 다시 시도해 주세요.";

    return msg;
}
export function Home() {
	const navigate = useNavigate();

	const [wishlistCount, setWishlistCount] = useState(0);
	const [newBidsToday, setNewBidsToday] = useState(0);
	const [closingSoon3Days, setClosingSoon3Days] = useState(0);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [isAuthed, setIsAuthed] = useState(() => {
		const uid = localStorage.getItem("userId");
		return !!uid && uid !== "undefined";
	});

	const [user, setUser] = useState<AuthUser | null>(() => {
		const uid = localStorage.getItem("userId");
		if (!uid || uid === "undefined") return null;

		const name = localStorage.getItem("userName") || localStorage.getItem("name");
		const storedEmail = localStorage.getItem("email") || undefined;

		return { name: name || "사용자", email: storedEmail };
	});

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

		const tick = () => setLockRemaining(login_lock_remaining_ms(em));
		tick();

		const id = window.setInterval(tick, 500);
		return () => window.clearInterval(id);
	}, [email]);


	const [companyLabel, setCompanyLabel] = useState("");

	useEffect(() => {
		if (!isAuthed) return;
		const uid = localStorage.getItem("userId");
		if (!uid) return;

		getCompanyForUser(uid).then((c) => {
			if (!c) return;
			const n = c.name?.trim() || "";
			const p = c.position?.trim() || "";
			if (!n && !p) setCompanyLabel("");
			else if (n && p) setCompanyLabel(`${n} · ${p}`);
			else setCompanyLabel(n || p);
		});
	}, [isAuthed]);

	const locked = useMemo(() => {
		const em = email.trim();
		if (!em) return false;
		return is_login_locked(em);
	}, [email, lockRemaining]);

	useEffect(() => {
		if (!isAuthed) {
			setWishlistCount(0);
			return;
		}

		const uidStr = localStorage.getItem("userId");
		const uid = Number(uidStr);
		if (!Number.isFinite(uid)) return;

		fetchWishlist(uid)
			.then((items) => setWishlistCount(items.length))
			.catch(() => setWishlistCount(0));
	}, [isAuthed]);

	useEffect(() => {
		const loadHomeKpi = async () => {
			try {
				const bids = await fetchBids();

				const now = new Date();
				const todayStart = new Date(now);
				todayStart.setHours(0, 0, 0, 0);
				const todayEnd = new Date(now);
				todayEnd.setHours(23, 59, 59, 999);
				const threeDaysLater = new Date(now);
				threeDaysLater.setDate(threeDaysLater.getDate() + 3);

				const parse = (s: any) => {
					const t = Date.parse(String(s ?? ""));
					return Number.isFinite(t) ? new Date(t) : null;
				};

				const newToday = bids.filter((b: any) => {
					const s = parse(b.startDate ?? b.bidStart);
					return !!s && s >= todayStart && s <= todayEnd;
				}).length;

				const soon3 = bids.filter((b: any) => {
					const e = parse(b.endDate ?? b.bidEnd);
					return !!e && e >= now && e <= threeDaysLater;
				}).length;

				setNewBidsToday(newToday);
				setClosingSoon3Days(soon3);
			} catch {
				setNewBidsToday(0);
				setClosingSoon3Days(0);
			}
		};

		void loadHomeKpi();
	}, []);

	const doLogin = async (em: string, pw: string) => {
		setErrorMsg(null);

		if (!em || !pw) {
			setErrorMsg("이메일과 비밀번호를 입력해 주세요.");
			return;
		}

		if (is_login_locked(em)) {
			setErrorMsg(
				`로그인 시도가 제한되었습니다. ${format_mmss(login_lock_remaining_ms(em))} 후 다시 시도해 주세요.`,
			);
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
				if (st.lock_until && st.lock_until > Date.now()) {
					setErrorMsg(
						`로그인 실패가 누적되어 계정이 잠겼습니다. ${format_mmss(login_lock_remaining_ms(em))} 후 다시 시도해 주세요.`,
					);
					return;
				}
				const remaining = Math.max(0, 5 - st.count);
                const clean = cleanLoginErrorMessage(res);
                setErrorMsg(`${clean} (남은 시도: ${remaining}회)`);
				return;
			}

			const userId = parse_user_id(res);
			if (!userId) {
				localStorage.removeItem("userId");
				setErrorMsg("로그인 정보 처리 중 문제가 발생했습니다. 다시 시도해주세요.");
				return;
			}

			record_login_success(em);
			localStorage.setItem("userId", userId);
			localStorage.setItem("userName", String(res.data?.name ?? ""));
			localStorage.setItem("email", String(res.data?.email ?? em));
			mark_reco_popup_trigger();
			navigate("/", { replace: true });

			migrate_password_changed_at(String(res.data?.email ?? em), userId);
			ensure_password_changed_at_initialized(userId);

			setIsAuthed(true);
			setUser({
				name: String(res.data?.name ?? "사용자"),
				email: String(res.data?.email ?? em),
			});

			if (is_password_expired(userId)) {
				navigate("/profile", {
					replace: true,
					state: { passwordExpired: true, fromAfterChange: "/" },
				});
				return;
			}

			navigate("/", { replace: true });
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

	const onQuickLogin = async (e?: React.FormEvent) => {
		e?.preventDefault();
		await doLogin(email.trim(), password.trim());
	};

const onLogout = () => {

	try {
		void apiLogout();
	} finally {
		window.dispatchEvent(new Event("auth:changed"));

		window.location.replace("/");
	}
};

	return (
		<div className="bg-slate-50 dark:bg-slate-900">
			<div className="max-w-7xl mx-auto px-5 py-8">
				<div className="flex items-end justify-between gap-4 mb-6">
					<div>
						<div className="text-sm text-slate-500 dark:text-slate-400">AI 기반 입찰 탐색 · 관리</div>
						<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
							공고를 더 빠르게 찾고, 더 확실하게 준비하세요
						</h1>
					</div>
					<div className="hidden md:flex gap-2"></div>
				</div>


				<div className="grid grid-cols-12 gap-6 items-start">
					<div className="col-span-12 lg:col-span-8 space-y-6">
						<section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 shadow-sm h-[320px] flex flex-col">
							<div className="flex items-center justify-between mb-4">
								<h2 className="font-semibold text-slate-900 dark:text-slate-100">바로가기</h2>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<QuickBox
									title="대시보드"
									desc="지표/분포/현황 한눈에"
									icon={<DashboardIcon />}
									onClick={() => navigate("/dashboard")}
								/>
								<QuickBox
									title="공고 찾기"
									desc="조건 필터 & AI 검색"
									icon={<BidSearchIcon />}
									onClick={() => navigate("/bids")}
								/>
								<QuickBox
									title="장바구니"
									desc={`관심 공고 관리${wishlistCount ? ` · ${wishlistCount}건` : ""}`}
									badge={wishlistCount}
									icon={<CartIcon />}
									onClick={() => navigate("/cart")}
								/>
								<QuickBox
									title="커뮤니티"
									desc="실무 팁/질문/공유"
									icon={<CommunityIcon />}
									onClick={() => navigate("/community")}
								/>
							</div>
						</section>

						<section className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 shadow-sm">
							<div className="flex items-center justify-between mb-3">
								<h3 className="font-semibold text-slate-900 dark:text-slate-100">오늘의 추천</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<MiniStat
									label="신규 공고"
									value={String(newBidsToday)}
									sub="오늘 시작"
									icon={<NewBidIcon />}
									onClick={() => navigate("/dashboard?focus=new")}
								/>
								<MiniStat
									label="마감 임박"
									value={String(closingSoon3Days)}
									sub="3일 이내"
									icon={<ClosingSoonIcon />}
									onClick={() => navigate("/dashboard?focus=closingSoon")}
								/>
							</div>
						</section>
					</div>

					<div className="col-span-12 lg:col-span-4">
						{!isAuthed ? (
							<aside className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col">
								<div className="mb-4">
									<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">로그인</h3>
									<p className="text-sm text-slate-500 dark:text-slate-400">
										로그인하면 장바구니/알림/AI 기능을 이용할 수 있습니다.
									</p>
								</div>

								<form className="space-y-3" onSubmit={onQuickLogin}>
									<div>
										<div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">이메일</div>
										<input
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 px-3 outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 dark:text-slate-100"
											placeholder="name@company.com"
											type="email"
										/>
									</div>

									<div>
										<div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">비밀번호</div>
										<input
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 px-3 outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 dark:text-slate-100"
											placeholder="••••••••"
											type="password"
										/>
									</div>

									<SimpleCaptcha required={captchaRequired} onValidChange={setCaptchaValid} />

									{errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

									{locked && (
										<div className="text-sm text-amber-700">
											로그인 시도가 제한되었습니다. {format_mmss(lockRemaining)} 후 다시
											시도해 주세요.
										</div>
									)}

									<button
										type="submit"
										disabled={submitting || locked || (captchaRequired && !captchaValid)}
										className="w-full h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
									>
										{submitting ? "로그인 중..." : "로그인"}
									</button>

									<div className="grid grid-cols-1 gap-3">
										<button
											type="button"
											onClick={() => navigate("/signup")}
											className="h-11 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-100"
										>
											회원가입
										</button>
										{ENABLE_TEST_LOGIN && (
											<button
												type="button"
												disabled={submitting}
												onClick={async () => {
													setEmail(TEST_LOGIN.email);
													setPassword(TEST_LOGIN.password);
													await doLogin(TEST_LOGIN.email, TEST_LOGIN.password);
												}}
												className="h-11 rounded-xl border hover:bg-slate-50"
											>
												테스트 로그인
											</button>
										)}
									</div>

									<div className="flex justify-between text-sm text-slate-500 pt-2">
										<button
											type="button"
											onClick={() => navigate("/find-account")}
											className="hover:text-blue-600 hover:underline"
										>
											계정 찾기
										</button>
										<button
											type="button"
											onClick={() => navigate("/reset-password")}
											className="hover:text-blue-600 hover:underline"
										>
											비밀번호 찾기
										</button>
									</div>
								</form>
							</aside>
						) : (
							<aside className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col">
								<div className="flex items-center justify-between mb-4">
									<div>
										<div className="text-sm text-slate-500 dark:text-slate-400">환영합니다</div>
										<div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
											{mask_name(user?.name ?? "사용자")}
										</div>
										{companyLabel ? (
											<div className="text-xs text-muted-foreground">{companyLabel}</div>
										) : null}
										{user?.email && <div className="text-sm text-slate-500">{user.email}</div>}
									</div>
									<div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
										{user?.name?.slice(0, 1) ?? "U"}
									</div>
								</div>

								<div className="space-y-2">
									<button
										onClick={() => navigate("/profile")}
										className="w-full h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
									>
										프로필 수정
									</button>
									<button
										onClick={onLogout}
										className="w-full h-11 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
									>
										로그아웃
									</button>
								</div>
							</aside>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function QuickBox({
	title,
	desc,
	onClick,
	badge,
	icon,
}: {
	title: string;
	desc: string;
	onClick: () => void;
	badge?: number;
	icon?: React.ReactNode;
}) {
	return (
		<button
			onClick={onClick}
			className="group relative text-left border dark:border-slate-600 rounded-2xl p-4 hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-slate-700/50 transition"
		>
			<div className="flex items-start gap-4">
				{icon ? (
					<div className="shrink-0 w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 flex items-center justify-center overflow-hidden">
						<div className="w-12 h-12">{icon}</div>
					</div>
				) : null}
				<div className="min-w-0 flex-1">
					<div className="flex items-center justify-between gap-3 mb-1">
						<div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</div>
						{!!badge && badge > 0 && (
							<span className="min-w-[22px] h-[22px] px-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[12px] flex items-center justify-center">
								{badge}
							</span>
						)}
					</div>
					<div className="text-sm text-slate-500 dark:text-slate-400 leading-snug">{desc}</div>
				</div>
			</div>

			<div className="absolute right-4 bottom-4 text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition">
				이동 →
			</div>
		</button>
	);
}

function MiniStat({
	label,
	value,
	sub,
	icon,
	onClick,
}: {
	label: string;
	value: string;
	sub: string;
	icon?: React.ReactNode;
	onClick?: () => void;
}) {
	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className="group w-full text-left border dark:border-slate-600 rounded-2xl p-4 bg-slate-50 dark:bg-slate-700 hover:bg-blue-50/40 dark:hover:bg-slate-600 hover:border-blue-200 dark:hover:border-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-200"
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3 min-w-0">
						{icon ? (
							<div className="shrink-0 w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-600 flex items-center justify-center overflow-hidden">
								<div className="w-10 h-10">{icon}</div>
							</div>
						) : null}
						<div className="min-w-0">
							<div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
							<div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
							<div className="text-sm text-slate-500 dark:text-slate-400">{sub}</div>
						</div>
					</div>
					<div className="text-blue-600 text-sm mt-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
						이동 →
					</div>
				</div>
			</button>
		);
	}

	return (
		<div className="border dark:border-slate-600 rounded-2xl p-4 bg-slate-50 dark:bg-slate-700 w-full">
			<div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
			<div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
			<div className="text-sm text-slate-500 dark:text-slate-400">{sub}</div>
		</div>
	);
}

function MiniKpi({ label, value }: { label: string; value: string }) {
	return (
		<div className="border rounded-2xl p-4 bg-slate-50">
			<div className="text-sm text-slate-500">{label}</div>
			<div className="text-xl font-bold text-slate-900">{value}</div>
			<div className="text-sm text-slate-500">{value}</div>
		</div>
	);
}
