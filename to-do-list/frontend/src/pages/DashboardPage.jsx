import { useNavigate } from "react-router-dom";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import authService from "@/services/authService";

export default function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn("Logout endpoint error ignored:", error);
    } finally {
      authService.clearAuth();
      toast.success("Đăng xuất thành công");
      navigate("/login", { replace: true });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-10">
      <h1 className="text-4xl font-black uppercase tracking-tight text-foreground">
        Admin Panel
      </h1>

      <Button
        type="button"
        onClick={handleLogout}
        className="h-12 rounded-2xl px-6 text-base uppercase"
      >
        <LogOutIcon className="size-4" />
        Đăng xuất
      </Button>
    </main>
  );
}
