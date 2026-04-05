import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Đăng ký
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Tạo tài khoản mới để bắt đầu
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name input */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Họ và tên
            </label>
            <Input
              id="displayName"
              type="text"
              placeholder="Nhập họ và tên"
              {...register("displayName")}
              className={errors.fullName ? "border-red-500" : ""}
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@gmail.com"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Mật khẩu
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
              {...register("password")}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Xác nhận mật khẩu
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              {...register("confirmPassword")}
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 mt-6"
          >
            {isLoading ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:underline font-semibold"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
