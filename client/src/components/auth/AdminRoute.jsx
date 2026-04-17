import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

function AdminRoute({ children }) {
  const { user, accessToken, isLoading } = useAuthStore();

  // Debug log
  console.log("AdminRoute - user:", user);
  console.log("AdminRoute - accessToken:", !!accessToken);
  console.log("AdminRoute - user role:", user?.role);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-cyan border-t-transparent" />
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}

export default AdminRoute;