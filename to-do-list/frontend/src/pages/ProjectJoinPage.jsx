import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2Icon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
import projectService from "@/services/projectService";
import { toast } from "sonner";

export default function ProjectJoinPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("joining"); // "joining" | "success" | "error"
  const [project, setProject] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function joinProject() {
      try {
        const res = await projectService.joinByLink(token);
        const payload = res?.data || res;
        const joinedProject = payload?.project || payload?.data?.project || payload?.data || payload;
        setProject(joinedProject);
        setStatus("success");
        toast.success("Tham gia dự án thành công!");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMsg(
          err?.response?.data?.error?.message || 
          "Liên kết mời này không hợp lệ, đã hết hạn hoặc đã đạt số lượt sử dụng tối đa."
        );
        toast.error("Không thể tham gia dự án.");
      }
    }
    joinProject();
  }, [token]);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      {/* Pop Art background decorative blobs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(255,45,85,0.08),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(0,194,255,0.08),transparent_40%)]" />
      
      <Card className="relative w-full max-w-md border-4 border-border bg-card p-6 comic-shadow sm:p-8">
        <CardContent className="flex flex-col items-center text-center space-y-6 pt-6">
          {status === "joining" && (
            <>
              <div className="flex size-20 items-center justify-center rounded-2xl border-[3px] border-border bg-[#ffd400] comic-shadow animate-bounce">
                <Loader2Icon className="size-10 animate-spin text-foreground" />
              </div>
              <h1 className="text-[2.2rem] font-black leading-none uppercase tracking-tight text-foreground">
                Đang xử lý...
              </h1>
              <p className="text-sm font-bold text-muted-foreground uppercase">
                Vui lòng đợi trong khi chúng tôi xác thực mã mời của bạn.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex size-20 items-center justify-center rounded-2xl border-[3px] border-border bg-[#7de228] comic-shadow -rotate-6">
                <CheckCircle2Icon className="size-10 text-white" />
              </div>
              <h1 className="text-[2.2rem] font-black leading-none uppercase tracking-tight text-foreground">
                THÀNH CÔNG!
              </h1>
              <div className="w-full rounded-2xl border-[3px] border-border bg-[#dbf5ff] p-4 text-left comic-shadow">
                <div className="text-[0.68rem] font-black uppercase text-secondary-foreground opacity-80">
                  Dự án đã tham gia
                </div>
                <div className="mt-1 text-lg font-black uppercase text-foreground leading-tight">
                  {project?.name || "Tên dự án"}
                </div>
                {project?.description && (
                  <p className="mt-2 text-xs font-bold text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs font-black uppercase text-foreground">
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-white border border-border">
                    {(project?.members || []).length}
                  </span>
                  Thành viên hiện tại
                </div>
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase">
                Bạn đã được thêm vào dự án này làm thành viên chính thức. Hãy bắt đầu cộng tác ngay bây giờ!
              </p>
              <Button
                onClick={() => {
                  const projectId = project?._id || project?.id || project?.projectId;
                  if (!projectId) {
                    toast.error("Không tìm thấy ID dự án.");
                    return;
                  }
                  navigate(`/projects/${projectId}`);
                }}
                className="w-full h-14 rounded-2xl text-lg uppercase comic-shadow hover:scale-[1.02] active:translate-y-1"
              >
                Đến ban công việc
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex size-20 items-center justify-center rounded-2xl border-[3px] border-border bg-[#ff3b57] comic-shadow rotate-6">
                <AlertTriangleIcon className="size-10 text-white" />
              </div>
              <h1 className="text-[2rem] font-black leading-none uppercase tracking-tight text-[#ff3b57]">
                THẤT BẠI!
              </h1>
              <div className="w-full rounded-2xl border-[3px] border-border bg-[#fff1f2] p-4 text-center comic-shadow">
                <p className="text-sm font-bold text-[#b42318] leading-snug">
                  {errorMsg}
                </p>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase">
                Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ với người quản trị dự án để nhận liên kết mời mới.
              </p>
              <div className="w-full flex gap-3">
                <Button
                  asChild
                  variant="secondary"
                  className="w-full h-12 rounded-xl text-sm uppercase comic-shadow"
                >
                  <Link to="/">Về trang chủ</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
