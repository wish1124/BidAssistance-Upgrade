import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";

import { ThemeProvider } from "./context/ThemeContext";
import { AppLayout } from "./layout/AppLayout";
import { PageContainer } from "./layout/PageContainer";

import { HomePage } from "./components/HomePage";
import { LoginPage } from "./components/LoginPage";
import { SignupPage } from "./components/SignupPage";
import { FindAccountPage } from "./components/FindAccount";
import { ResetPasswordPage } from "./components/ResetPasswordPage";

import { Dashboard } from "./components/Dashboard";
import { BidDiscovery } from "./components/BidDiscovery";
import { ComparePage } from "./components/ComparePage";
import { CartPage } from "./components/CartPage";
import { CommunityPage } from "./components/CommunityPage";
import { NoticePage } from "./components/NoticePage";
import { NoticeDetailPage } from "./components/NoticeDetailPage";
import { NotificationsPage } from "./components/NotificationsPage";
import { ProfilePage } from "./components/ProfilePage";
import { TermsAndConditionsPage } from "./components/TermsAndConditions";
import { PrivacyPolicyPage} from "./components/PrivacyPolicy";
import { CustomerSupportPage } from "./components/CustomerSupport";

import { ProtectedRoute } from "./routes/ProtectedRoute";

import { Toast } from "./components/ui/Toast";
import {ToastType, useToast} from "./components/ui/useToast";
import {BidSummary} from "./components/BidSummary";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
	try {
		const parts = token.split(".");
		if (parts.length < 2) return null;

		const base64Url = parts[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

		const json = atob(padded);
		return JSON.parse(json) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function isOperatorAccount(): boolean {
	const token = localStorage.getItem("accessToken");
	if (!token) return false;

	const payload = decodeJwtPayload(token);
	const role =
		String(
			payload?.role ?? payload?.authority ?? payload?.userRole ?? payload?.user_type ?? "",
		).toUpperCase();

	if (role.includes("ADMIN") || role.includes("OPERATOR")) return true;

	const authorities = payload?.authorities ?? payload?.roles ?? payload?.authority;
	if (Array.isArray(authorities)) {
		if (authorities.some((x) => String(x).toUpperCase().includes("ADMIN"))) return true;
	}
	if (typeof authorities === "string") {
		if (authorities.toUpperCase().includes("ADMIN")) return true;
	}

	const email = (localStorage.getItem("email") || "").trim().toLowerCase();
	const env = (import.meta.env.VITE_ADMIN_EMAILS || "") as string;
	const allow = env
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

	return !!email && allow.includes(email);
}

function SignupRoute({showToast,}: {
    showToast: (message: string, type: ToastType) => void;
}) {
    const navigate = useNavigate();

    return (
        <SignupPage
            onSignup={() => navigate("/login")}
            onNavigateToLogin={() => navigate("/login")}
            onNavigateToHome={() => navigate("/")}
            showToast={showToast}
        />
    );
}

function FindAccountRoute() {
	const navigate = useNavigate();
	return (
		<FindAccountPage
			onFindAccount={async () => {}}
			onNavigateToLogin={() => navigate("/login")}
			onNavigateToHome={() => navigate("/")}
		/>
	);
}

function ResetPasswordRoute() {
	const navigate = useNavigate();
	return (
		<ResetPasswordPage
			onNavigateToLogin={() => navigate("/login")}
			onNavigateToHome={() => navigate("/")}
		/>
	);
}

export default function App() {
	const [globalLoading, setGlobalLoading] = useState(false);
    const { toast, showToast } = useToast();

	const canManageNotices = isOperatorAccount();

	return (
		<ThemeProvider>
		<HashRouter>
			{globalLoading && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
					<div className="bg-white px-6 py-3 rounded-lg shadow">처리 중...</div>
				</div>
			)}
			{toast && <Toast message={toast.message} type={toast.type} />}

			<Routes>
				<Route element={<AppLayout />}>
					<Route path="/" element={<HomePage />} />

					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<PageContainer>
									<Dashboard />
								</PageContainer>
							</ProtectedRoute>
						}
					/>

                    <Route
                        path="/bids"
                        element={
                            <PageContainer>
                                <BidDiscovery setGlobalLoading={setGlobalLoading} showToast={showToast} />
                            </PageContainer>
                        }
                    />

                    <Route
                        path="/bids/:bidId"
                        element={
                            <PageContainer>
                                <BidSummary />
                            </PageContainer>
                        }
                    />

                    <Route
                        path="/bids/:bidId"
                        element={
                            <PageContainer>
                                <BidSummary />
                            </PageContainer>
                        }
                    />
                    <Route
                        path="/compare"
                        element={
                            <PageContainer>
                                <ComparePage />
                            </PageContainer>
                        }
                    />
					<Route
						path="/cart"
						element={
							<ProtectedRoute>
								<PageContainer>
									<CartPage setGlobalLoading={setGlobalLoading} showToast={showToast} />
								</PageContainer>
							</ProtectedRoute>
						}
					/>


					<Route
						path="/community"
						element={
							<PageContainer>
								<CommunityPage />
							</PageContainer>
						}
					/>


					<Route
						path="/notice"
						element={
							<PageContainer>
								<NoticePage />
							</PageContainer>
						}
					/>
                    <Route
                        path="/notice/:id"
                        element={
                            <PageContainer>
                                <NoticeDetailPage />
                            </PageContainer>
                        }
                    />

					<Route
						path="/notifications"
						element={
							<ProtectedRoute>
								<PageContainer>
									<NotificationsPage />
								</PageContainer>
							</ProtectedRoute>
						}
					/>

					<Route
						path="/profile"
						element={
							<ProtectedRoute>
								<PageContainer>
									<ProfilePage />
								</PageContainer>
							</ProtectedRoute>
						}
					/>

					<Route
						path="/terms"
						element={
							<PageContainer>
								<TermsAndConditionsPage />
							</PageContainer>
						}
					/>

					<Route
						path="/privacy"
						element={
							<PageContainer>
								<PrivacyPolicyPage />
							</PageContainer>
						}
					/>
					
					<Route
						path="/support"
						element={
							<PageContainer>
								<CustomerSupportPage />
							</PageContainer>
						}
					/>
				</Route>

				<Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupRoute showToast={showToast} />} />
				<Route path="/find-account" element={<FindAccountRoute />} />
				<Route path="/reset-password" element={<ResetPasswordRoute />} />
			</Routes>
		</HashRouter>
		</ThemeProvider>
	);
}
