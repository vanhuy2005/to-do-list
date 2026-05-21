import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import projectService from "@/services/projectService";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setIsLoading(true);
    try {
      const res = await projectService.getProjects();
      setProjects(res?.data || res || []);
    } catch (err) {
      toast.error("Không thể tải dự án.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const res = await projectService.createProject({ name: newName.trim() });
      toast.success("Dự án đã tạo");
      setNewName("");
      navigate(`/projects/${res.data._id || res._id}`);
    } catch (err) {
      toast.error("Tạo dự án thất bại");
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-black">Dự án</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tên dự án mới"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={handleCreate}>Tạo</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {isLoading && <div>Đang tải...</div>}
        {!isLoading && projects.length === 0 && <div>Chưa có dự án nào</div>}
        {!isLoading &&
          projects.map((p) => (
            <div
              key={p._id}
              className="rounded-md border-[3px] border-border bg-card p-3 cursor-pointer"
              onClick={() => navigate(`/projects/${p._id}`)}
            >
              <div className="font-black uppercase">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                Thành viên: {(p.members || []).length}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
