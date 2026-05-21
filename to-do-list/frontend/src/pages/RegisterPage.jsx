import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GlobeIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import authService from "@/services/authService";

const registerSchema = z
  .object({
    email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
    displayName: z.string().min(2, "Họ tên phải ít nhất 2 ký tự"),
    password: z.string().min(8, "Mật khẩu phải ít nhất 8 ký tự"),
    confirmPassword: z
      .string()
      .min(8, "Xác nhận mật khẩu là bắt buộc"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không trùng khớp",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authService.register({
        email: data.email,
        displayName: data.displayName,
        password: data.password,
      });

      if (response?.data?.accessToken) {
        authService.setSession({
          token: response.data.accessToken,
          user: response.data.user,
        });
        toast.success("Đăng ký thành công!");
        navigate(
          authService.getDefaultRouteByRole(response?.data?.user?.role),
          { replace: true },
        );
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        "Đăng ký thất bại. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsOAuthLoading(true);
    window.location.href = authService.getGoogleAuthUrl();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-10 lg:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_20%,rgba(0,194,255,0.18),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(255,45,85,0.15),transparent_36%),radial-gradient(circle_at_70%_88%,rgba(255,212,0,0.2),transparent_34%)]" />
      <div className="pointer-events-none absolute -left-14 bottom-16 hidden h-44 w-44 -rotate-12 rounded-[2rem] border-[6px] border-border/30 bg-[#00c2ff]/40 lg:block" />
      <div className="pointer-events-none absolute -right-24 top-14 hidden h-60 w-60 rounded-full border-[6px] border-border/30 bg-[#ff2d55]/35 lg:block" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl items-center justify-center">
        <section className="w-full max-w-90 rounded-[2rem] border-4 border-border bg-card px-4 py-6 comic-shadow sm:px-6 lg:py-7">
          <div className="text-center">
            <div className="mx-auto mb-5 inline-flex size-16 rotate-6 items-center justify-center rounded-2xl border-[3px] border-border bg-[#00c2ff] comic-shadow">
              <UserPlusIcon className="size-8 -rotate-6 text-white" />
            </div>
            <h1 className="text-[2.2rem] font-black leading-none tracking-tight text-foreground uppercase">
              Đăng ký
            </h1>
            <p className="mt-1.5 text-sm font-bold tracking-wide text-muted-foreground uppercase">
              Tạo tài khoản mới
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-2.5">
              <label
                htmlFor="displayName"
                className="text-sm font-black tracking-tight text-foreground uppercase"
              >
                Họ và tên
              </label>
              <Input
                id="displayName"
                type="text"
                placeholder="Nhập họ và tên"
                {...register("displayName")}
                className={`h-12 rounded-2xl border-[3px] border-border px-4 text-sm font-bold uppercase ${
                  errors.displayName
                    ? "border-destructive bg-destructive/10"
                    : "bg-card"
                }`}
              />
              {errors.displayName && (
                <p className="text-xs font-bold text-destructive">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="email"
                className="text-sm font-black tracking-tight text-foreground uppercase"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="example@gmail.com"
                {...register("email")}
                className={`h-12 rounded-2xl border-[3px] border-border px-4 text-sm font-bold ${
                  errors.email
                    ? "border-destructive bg-destructive/10"
                    : "bg-card"
                }`}
              />
              {errors.email && (
                <p className="text-xs font-bold text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="password"
                className="text-sm font-black tracking-tight text-foreground uppercase"
              >
                Mật khẩu
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                {...register("password")}
                className={`h-12 rounded-2xl border-[3px] border-border px-4 text-sm font-bold ${
                  errors.password
                    ? "border-destructive bg-destructive/10"
                    : "bg-card"
                }`}
              />
              {errors.password && (
                <p className="text-xs font-bold text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-black tracking-tight text-foreground uppercase"
              >
                Xác nhận mật khẩu
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu"
                {...register("confirmPassword")}
                className={`h-12 rounded-2xl border-[3px] border-border px-4 text-sm font-bold ${
                  errors.confirmPassword
                    ? "border-destructive bg-destructive/10"
                    : "bg-card"
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs font-bold text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-4 h-12 w-full rounded-2xl text-base uppercase comic-shadow active:translate-y-1"
            >
              {isLoading ? "Đang xử lý..." : "Đăng ký"}
            </Button>

            <Button
              type="button"
              disabled={isOAuthLoading}
              onClick={handleGoogleSignIn}
              className="h-12 w-full rounded-2xl border-[3px] border-border bg-white text-sm font-black uppercase text-foreground comic-shadow hover:bg-[#fff6d6] active:translate-y-1"
            >
              <GlobeIcon className="mr-2 size-4" />
              {isOAuthLoading ? "Đang chuyển hướng..." : "Đăng ký với Google"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 hover:underline"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
