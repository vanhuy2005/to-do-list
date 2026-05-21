import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2Icon, XCircleIcon, Loader2Icon, MailOpenIcon, HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  const userId = searchParams.get("userId");
  const token = searchParams.get("token");

  useEffect(() => {
    const performUnsubscribe = async () => {
      if (!userId || !token) {
        setStatus("error");
        setErrorMessage("Thiếu mã người dùng hoặc mã xác thực token hợp lệ trong đường dẫn liên kết.");
        return;
      }

      try {
        // Trigger the public POST request
        const response = await api.post(`/profile/notifications/unsubscribe?userId=${userId}&token=${token}`);
        if (response?.success) {
          setStatus("success");
        } else {
          throw new Error(response?.message || "Không thể xử lý yêu cầu hủy đăng ký.");
        }
      } catch (error) {
        console.error("Unsubscribe request error:", error);
        setStatus("error");
        setErrorMessage(
          error?.response?.data?.error?.message || 
          "Đường dẫn hủy đăng ký không hợp lệ, đã hết hạn hoặc chữ ký token bảo mật không chính xác."
        );
      }
    };

    performUnsubscribe();
  }, [userId, token]);

  return (
    <div className="min-h-screen bg-[#fffaf0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border-[3px] border-border rounded-[1.6rem] comic-shadow p-8 flex flex-col items-center text-center">
        
        {/* Logo / Header Branding */}
        <div className="inline-flex size-14 items-center justify-center rounded-2xl border-[3px] border-border bg-[#ffd400] comic-shadow-sm mb-6">
          <MailOpenIcon className="size-8 text-foreground" />
        </div>

        {status === "loading" && (
          <div className="space-y-4 py-6 w-full flex flex-col items-center">
            <Loader2Icon className="size-16 text-[#00c2ff] animate-spin" />
            <h1 className="font-heading text-xl font-black uppercase tracking-tight text-foreground">
              Đang hủy đăng ký...
            </h1>
            <p className="text-sm font-bold text-muted-foreground max-w-xs">
              Hệ thống đang xác thực chữ ký bảo mật HMAC và cập nhật tùy chọn thông báo của bạn.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-border bg-[#10b981] p-3 shadow-[3px_3px_0px_0px_#000000] text-white">
              <CheckCircle2Icon className="size-10" />
            </div>
            
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-foreground">
                HỦY ĐĂNG KÝ THÀNH CÔNG
              </h1>
              <p className="text-sm font-bold text-muted-foreground">
                Tài khoản của bạn đã được tắt nhận các thư cảnh báo công việc trễ hạn và Daily Digest.
              </p>
            </div>

            <div className="rounded-xl border-[2px] border-border bg-secondary/10 p-4 text-xs font-bold text-muted-foreground w-full">
              Bạn có thể bật lại tùy chọn nhận thông báo bất kỳ lúc nào trong mục 
              <strong className="text-foreground uppercase"> Cài đặt → Thông báo qua Email</strong> của ứng dụng.
            </div>

            <Button
              asChild
              type="button"
              className="w-full border-[3px] border-border bg-[#ffd400] text-foreground hover:bg-[#ffd400]/95 font-black uppercase tracking-tight shadow-[3px_3px_0px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000000]"
            >
              <Link to="/login" className="flex items-center justify-center gap-2">
                <HomeIcon className="size-4" /> QUAY LẠI TRANG CHỦ
              </Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-border bg-[#ff3b57] p-3 shadow-[3px_3px_0px_0px_#000000] text-white">
              <XCircleIcon className="size-10" />
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-[#ff3b57]">
                KHÔNG THỂ XỬ LÝ YÊU CẦU
              </h1>
              <p className="text-xs font-bold text-[#ff3b57] bg-[#ff3b57]/10 rounded border border-[#ff3b57]/20 px-3 py-2 w-full max-w-xs break-words">
                {errorMessage}
              </p>
            </div>

            <p className="text-xs font-bold text-muted-foreground">
              Vui lòng kiểm tra lại liên kết trong email của bạn hoặc liên hệ với quản trị viên nếu lỗi này tiếp tục xảy ra.
            </p>

            <Button
              asChild
              type="button"
              variant="secondary"
              className="w-full border-[3px] border-border font-black uppercase tracking-tight shadow-[3px_3px_0px_0px_#000000] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000000]"
            >
              <Link to="/login" className="flex items-center justify-center gap-2">
                <HomeIcon className="size-4" /> ĐI ĐẾN ĐĂNG NHẬP
              </Link>
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
