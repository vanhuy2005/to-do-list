import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RocketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import authService from "@/services/authService";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
  password: z.string().min(8, "Mật khẩu phải ít nhất 8 ký tự"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);

      if (response?.data?.accessToken) {
        authService.setToken(response.data.accessToken);
        toast.success("Đăng nhập thành công!");
        navigate("/");
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Đăng nhập thất bại. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="flex flex-1 flex-col justify-center w-full max-w-sm mx-auto">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 inline-flex size-20 items-center justify-center rounded-2xl border-[3px] border-border bg-[#ffd400] comic-shadow -rotate-6">
            <RocketIcon className="size-10 text-primary rotate-12" />
          </div>
          <h1 className="text-[2.5rem] leading-none font-black uppercase tracking-tight text-foreground">
            Đăng nhập
          </h1>
          <p className="mt-2 text-base font-bold text-muted-foreground uppercase tracking-wide">
            Chào mừng trở lại
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-black uppercase tracking-tight text-foreground"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@gmail.com"
              {...register("email")}
              className={`h-14 rounded-2xl border-[3px] border-border px-4 text-base font-bold ${
                errors.email ? "border-destructive bg-destructive/10" : "bg-card"
              }`}
            />
            {errors.email && (
              <p className="text-xs font-bold text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-black uppercase tracking-tight text-foreground"
            >
              Mật khẩu
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              {...register("password")}
              className={`h-14 rounded-2xl border-[3px] border-border px-4 text-base font-bold ${
                errors.password ? "border-destructive bg-destructive/10" : "bg-card"
              }`}
            />
            {errors.password && (
              <p className="text-xs font-bold text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="mt-4 h-14 w-full rounded-2xl text-lg uppercase comic-shadow active:translate-y-1"
          >
            {isLoading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="text-primary hover:underline hover:text-primary/80"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
