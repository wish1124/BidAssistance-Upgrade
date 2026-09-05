import { Navigate, Outlet } from "react-router-dom";

export function PublicRoute() {
  const isAuthenticated = !!localStorage.getItem("userId");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
