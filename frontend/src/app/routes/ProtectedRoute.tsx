import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { checkLogin, persistLogin } from "../api/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const [status, setStatus] = useState<"checking" | "authed" | "guest">(() => {
		return localStorage.getItem("userId") ? "authed" : "checking";
	});

	useEffect(() => {
		let ignore = false;

		if (status !== "checking") return;

		checkLogin()
			.then((data) => {
				if (ignore) return;
				if (data) {
					persistLogin(data);
					setStatus("authed");
				} else {
					setStatus("guest");
				}
			})
			.catch(() => {
				if (ignore) return;
				setStatus("guest");
			});

		return () => {
			ignore = true;
		};
	}, [status]);

	if (status === "checking") {
		return <div className="py-10 text-center text-sm text-slate-500">로그인 상태 확인 중...</div>;
	}

	if (status === "guest") {
		return (
			<Navigate
				to="/login"
				replace
				state={{ from: `${location.pathname}${location.search || ""}` }}
			/>
		);
	}

	return <>{children}</>;
}
