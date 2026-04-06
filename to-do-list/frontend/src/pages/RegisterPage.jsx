import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import authService from "@/services/authService";

const registerSchema = z
  .object({
    email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
    displayName: z.string().min(2, "Họ tên phải ít nhất 2 ký tự"),
    password: z.string().min(8, "Mật khẩu phải ít nhất 8 ký tự"),
    confirmPassword: z.string().min(8, "Xác nhận mật khẩu là bắt buộc"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không trùng khớp",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

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
        authService.setToken(response.data.accessToken);
        toast.success("Đăng ký thành công!");
        navigate("/");
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

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-12">
      <div className="flex flex-1 flex-col justify-center w-full max-w-sm mx-auto">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 inline-flex size-20 items-center justify-center rounded-2xl border-[3px] border-border bg-[#00c2ff] comic-shadow rotate-6">
            <UserPlusIcon className="size-10 text-white -rotate-6" />
          </div>
          <h1 className="text-[2.5rem] leading-none font-black uppercase tracking-tight text-foreground">
            Đăng ký
          </h1>
          <p className="mt-2 text-base font-bold text-muted-foreground uppercase tracking-wide">
            Tạo tài khoản mới
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="displayName"
              className="text-sm font-black uppercase tracking-tight text-foreground"
            >
              Họ và tên
            </label>
            <Input
              id="displayName"
              type="text"
              placeholder="Nhập họ và tên"
              {...register("displayName")}
              className={`h-14 rounded-2xl border-[3px] border-border px-4 text-base font-bold uppercase ${
                errors.displayName ? "border-destructive bg-destructive/10" : "bg-card"
              }`}
            />
            {errors.displayName && (
              <p className="text-xs font-bold text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>

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
              placeholder="Tối thiểu 8 ký tự"
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

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-black uppercase tracking-tight text-foreground"
            >
              Xác nhận mật khẩu
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              {...register("confirmPassword")}
              className={`h-14 rounded-2xl border-[3px] border-border px-4 text-base font-bold ${
                errors.confirmPassword ? "border-destructive bg-destructive/10" : "bg-card"
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
            className="mt-6 h-14 w-full rounded-2xl text-lg uppercase comic-shadow active:translate-y-1"
          >
            {isLoading ? "Đang xử lý..." : "Đăng ký"}
          </Button>
        </form>

        <div className="mt-8 text-center pb-8">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline hover:text-primary/80"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
