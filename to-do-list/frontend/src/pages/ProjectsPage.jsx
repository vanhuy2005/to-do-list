import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  UsersIcon, 
  FolderPlusIcon, 
  KeyIcon, 
  Loader2Icon, 
  ArrowRightIcon, 
  BookOpenIcon 
} from "lucide-react";
import projectService from "@/services/projectService";
import authService from "@/services/authService";

const EMOJIS = ["📁", "🚀", "🎯", "💻", "🎨", "🔥", "🌈", "💡", "🧠", "💼", "📅", "🔒"];
const BORDER_COLORS = [
  "border-t-[#FF2D55]", // Pink
  "border-t-[#00C2FF]", // Cyan
  "border-t-[#FFD400]", // Yellow
  "border-t-[#7DE228]", // Green
  "border-t-[#9d4edd]", // Purple
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Creation state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📁");
  const [isCreating, setIsCreating] = useState(false);

  // Joining state
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setIsLoading(true);
    try {
      const res = await projectService.getProjects();
      setProjects(res?.data || res || []);
    } catch (err) {
      toast.error("Không thể tải danh sách dự án.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warning("Vui lòng nhập tên dự án!");
      return;
    }
    setIsCreating(true);
    try {
      const res = await projectService.createProject({
        name: newName.trim(),
        description: newDesc.trim(),
        emoji: selectedEmoji,
      });
      toast.success("Tạo dự án thành công!");
      setNewName("");
      setNewDesc("");
      fetchProjects();
      navigate(`/projects/${res.data?._id || res.data?.id || res._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Tạo dự án thất bại.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinByCode(e) {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.warning("Vui lòng nhập mã mời!");
      return;
    }
    if (cleanCode.length !== 6) {
      toast.warning("Mã mời phải gồm 6 ký tự!");
      return;
    }
    setIsJoining(true);
    try {
      const res = await projectService.joinByCode(cleanCode);
      const proj = res?.data || res;
      toast.success(`Đã tham gia dự án: ${proj.name}`);
      setInviteCode("");
      navigate(`/projects/${proj._id || proj.id}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message || 
        "Mã mời không đúng hoặc đã hết hạn."
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <section className="space-y-8 pb-12">
      {/* Page Header */}
      <header className="relative overflow-hidden rounded-[2rem] border-4 border-border bg-[#FFD400] p-6 sm:p-8 comic-shadow">
        {/* Absolute decorative pattern */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:12px_12px]" />
        
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[2.6rem] font-black leading-none uppercase tracking-tight text-foreground">
              Dự Án Cộng Tác
            </h1>
            <p className="mt-2 text-base font-black text-foreground/80 uppercase">
              Tạo không gian làm việc realtime tương tự Notion & Google Docs
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border-[3px] border-border bg-white px-3 py-1 text-sm font-bold comic-shadow">
              <UsersIcon className="size-4 text-primary" />
              <span>{projects.length} Không gian</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Actions (Create & Join) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Create Project Card */}
        <Card className="rounded-[2rem] border-4 border-border bg-card p-6 comic-shadow desktop-hover-lift">
          <CardContent className="p-0 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border-[3px] border-border bg-[#FF2D55] text-white comic-shadow">
                <FolderPlusIcon className="size-6" />
              </div>
              <h2 className="text-[1.6rem] font-black uppercase text-foreground leading-none">
                Tạo Dự Án Mới
              </h2>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-muted-foreground">Biểu tượng</label>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`text-2xl size-10 flex items-center justify-center rounded-xl border-[3px] border-border transition-all comic-shadow ${
                        selectedEmoji === emoji 
                          ? "bg-[#00C2FF] scale-110 -rotate-3" 
                          : "bg-white hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-muted-foreground">Tên dự án</label>
                <Input
                  placeholder="Ví dụ: Thiết kế Website, Kế hoạch ra mắt..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-12 border-[3px] border-border rounded-xl font-bold bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-muted-foreground">Mô tả dự án (Tùy chọn)</label>
                <Input
                  placeholder="Ghi chú ngắn về mục tiêu của nhóm bạn..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="h-12 border-[3px] border-border rounded-xl font-bold bg-white"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isCreating} 
                className="w-full h-12 rounded-xl uppercase font-black tracking-wider comic-shadow active:translate-y-1"
              >
                {isCreating ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  "Tạo không gian ngay"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Join Project Card */}
        <Card className="rounded-[2rem] border-4 border-border bg-card p-6 comic-shadow desktop-hover-lift">
          <CardContent className="p-0 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border-[3px] border-border bg-[#00C2FF] text-white comic-shadow">
                <KeyIcon className="size-6" />
              </div>
              <h2 className="text-[1.6rem] font-black uppercase text-foreground leading-none">
                Tham Gia Bằng Mã
              </h2>
            </div>
            
            <p className="text-sm font-bold text-muted-foreground">
              Được đồng nghiệp chia sẻ mã mời dự án? Hãy nhập mã 6 ký tự để tham gia tức thì làm thành viên.
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-muted-foreground">Mã mời 6 ký tự</label>
                <Input
                  maxLength={6}
                  placeholder="Ví dụ: A1B2C3"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="h-14 border-[3px] border-border rounded-xl text-center text-2xl font-black uppercase tracking-widest bg-white"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isJoining}
                variant="secondary"
                className="w-full h-12 rounded-xl uppercase font-black tracking-wider comic-shadow active:translate-y-1"
              >
                {isJoining ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Đang tham gia...
                  </>
                ) : (
                  "Xác nhận tham gia"
                )}
              </Button>
            </form>

            <div className="rounded-xl border-[3px] border-dashed border-[#00C2FF]/40 bg-[#00C2FF]/5 p-4 text-center mt-4">
              <p className="text-xs font-bold text-[#008dbb] uppercase flex items-center justify-center gap-1">
                <BookOpenIcon className="size-4" />
                Mẹo bảo mật
              </p>
              <p className="text-[0.7rem] font-bold text-[#008dbb] mt-1">
                Để tham gia bằng Link Mời, vui lòng nhấp trực tiếp vào liên kết được chia sẻ từ chủ sở hữu dự án.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-[1.8rem] font-black uppercase text-foreground">
          Không Gian Làm Việc Của Bạn
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div 
                key={n} 
                className="h-36 rounded-2xl border-[3px] border-border bg-card p-4 comic-shadow flex flex-col justify-between" 
              >
                <div className="flex justify-between items-start">
                  <Skeleton className="size-12 rounded-xl" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border-4 border-dashed border-border bg-muted/20 py-12 text-center">
            <span className="text-4xl">🏜️</span>
            <h3 className="mt-3 text-lg font-black uppercase text-foreground">Chưa có dự án nào</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase mt-1">
              Tạo hoặc tham gia một dự án để bắt đầu làm việc nhóm!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {projects.map((p, idx) => {
              const borderAccent = BORDER_COLORS[idx % BORDER_COLORS.length];
              const isOwner = p.ownerId?._id === p.ownerId || p.ownerId === authService.getUser()?._id; 
              
              return (
                <Link
                  key={p._id}
                  to={`/projects/${p._id}`}
                  className={`group relative block rounded-2xl border-[3px] border-border ${borderAccent} border-t-[8px] bg-card p-4 cursor-pointer comic-shadow hover:scale-[1.02] active:translate-y-0.5 transition-all duration-200`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl size-12 flex items-center justify-center rounded-xl border-[3px] border-border bg-white comic-shadow">
                      {p.emoji || "📁"}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {p.status === "archived" && (
                        <span className="rounded-md border border-border bg-[#ffd400] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-foreground">
                          Lưu trữ
                        </span>
                      )}
                      <span className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-foreground">
                        {p.visibility === "link" ? "Công khai" : "Riêng tư"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-black text-lg uppercase text-foreground truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs font-bold text-muted-foreground line-clamp-1 mt-1">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/10 flex items-center justify-between text-xs font-bold text-muted-foreground uppercase">
                    <div className="flex items-center gap-1.5">
                      <UsersIcon className="size-3.5 text-foreground" />
                      <span>{(p.members || []).length} thành viên</span>
                    </div>
                    
                    <span className="inline-flex items-center gap-0.5 text-primary group-hover:translate-x-1 transition-transform">
                      Mở <ArrowRightIcon className="size-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
