import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GlobeIcon, RocketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import authService from "@/services/authService";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
  password: z.string().min(8, "Mật khẩu phải ít nhất 8 ký tự"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");

    if (oauthStatus === "success") {
      const hydrate = async () => {
        const session = await authService.hydrateFromSessionCookie();

        if (session?.user) {
          toast.success("Đăng nhập Google thành công!");
          navigate(
            authService.getDefaultRouteByRole(session.user.role || "user"),
            { replace: true },
          );
        }
      };

      hydrate();
      navigate(window.location.pathname, { replace: true });
      return;
    }

    if (oauthStatus !== "error") {
      return;
    }

    const errorCode = searchParams.get("error") || searchParams.get("code");
    const message =
      errorCode === "GOOGLE_ACCOUNT_NOT_LINKED" ||
      errorCode === "ACCOUNT_NOT_LINKED" ||
      errorCode === "account_not_linked"
        ? "Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng mật khẩu trước, sau đó vào Cài đặt để liên kết Google."
        : errorCode === "GOOGLE_OAUTH_NOT_CONFIGURED"
          ? "Google OAuth chưa được cấu hình trên backend. Hãy thêm GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trước."
          : "Đăng nhập Google thất bại. Vui lòng thử lại.";

    toast.error(message);
    navigate(window.location.pathname, { replace: true });
  }, [searchParams, navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);

      if (response?.data?.accessToken) {
        authService.setSession({
          token: response.data.accessToken,
          user: response.data.user,
        });
        toast.success("Đăng nhập thành công!");
        navigate(
          authService.getDefaultRouteByRole(response?.data?.user?.role),
          { replace: true },
        );
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

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading(true);

    try {
      await authService.loginWithGoogle();
    } catch (error) {
      setIsOAuthLoading(false);
      toast.error(
        error?.message || "Đăng nhập Google thất bại. Vui lòng thử lại.",
      );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(255,45,85,0.15),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(0,194,255,0.18),transparent_36%),radial-gradient(circle_at_35%_90%,rgba(255,212,0,0.2),transparent_34%)]" />
      <div className="pointer-events-none absolute -left-24 top-14 hidden h-56 w-56 rounded-full border-[6px] border-border/30 bg-[#ffd400]/40 lg:block" />
      <div className="pointer-events-none absolute -right-16 bottom-10 hidden h-44 w-44 rotate-12 rounded-[2rem] border-[6px] border-border/30 bg-[#00c2ff]/40 lg:block" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
        <section className="w-full max-w-md rounded-[2rem] border-4 border-border bg-card px-5 py-8 comic-shadow sm:px-7 lg:px-8 lg:py-9">
          <div className="text-center">
            <div className="mx-auto mb-6 inline-flex size-20 items-center justify-center rounded-2xl border-[3px] border-border bg-[#ffd400] comic-shadow -rotate-6">
              <RocketIcon className="size-10 rotate-12 text-primary" />
            </div>
            <h1 className="text-[2.5rem] font-black leading-none tracking-tight text-foreground uppercase">
              Đăng nhập
            </h1>
            <p className="mt-2 text-base font-bold tracking-wide text-muted-foreground uppercase">
              Chào mừng trở lại
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-3">
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
                className={`h-14 rounded-2xl border-[3px] border-border px-4 text-base font-bold ${
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

            <div className="space-y-3">
              <label
                htmlFor="password"
                className="text-sm font-black tracking-tight text-foreground uppercase"
              >
                Mật khẩu
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                {...register("password")}
                className={`h-14 rounded-2xl border-[3px] border-border px-4 text-base font-bold ${
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

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-6 h-14 w-full rounded-2xl text-lg uppercase comic-shadow active:translate-y-1"
            >
              {isLoading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>

            <Button
              type="button"
              disabled={isOAuthLoading}
              onClick={handleGoogleSignIn}
              className="h-14 w-full rounded-2xl border-[3px] border-border bg-white text-base font-black uppercase text-foreground comic-shadow hover:bg-[#fff6d6] active:translate-y-1"
            >
              <GlobeIcon className="mr-2 size-5" />
              {isOAuthLoading ? "Đang chuyển hướng..." : "Tiếp tục với Google"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="text-primary hover:text-primary/80 hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
