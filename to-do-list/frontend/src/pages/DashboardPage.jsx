import { useMemo } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import HomePage from "@/pages/HomePage";
import authService from "@/services/authService";

export default function DashboardPage() {
  const userRole = useMemo(() => authService.getRole(), []);

  if (userRole === "admin") {
    return <AdminDashboard />;
  }

  return <HomePage />;
}
