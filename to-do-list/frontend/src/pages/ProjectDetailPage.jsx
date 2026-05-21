import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KanbanColumn from "@/components/KanbanColumn";
import taskService from "@/services/taskService";
import projectService from "@/services/projectService";
import ProjectMembersModal from "@/components/ProjectMembersModal";

const STATUS_ORDER = ["todo", "doing", "done"];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const p = await projectService.getProject(id);
      setProject(p?.data || p);
      const response = await taskService.getTasks({
        page: 1,
        limit: 100,
        projectId: id,
      });
      // Extract tasks array from response - handle different response structures
      let tasksList = [];
      if (Array.isArray(response?.data?.tasks)) {
        tasksList = response.data.tasks;
      } else if (Array.isArray(response?.data)) {
        tasksList = response.data;
      } else if (Array.isArray(response?.tasks)) {
        tasksList = response.tasks;
      }
      setTasks(tasksList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const tasksByStatus = useMemo(() => {
    const grouped = { todo: [], doing: [], done: [] };
    for (const task of tasks) {
      grouped[task.status || "todo"].push(task);
    }
    return grouped;
  }, [tasks]);

  const handleOpenTask = useCallback(
    (task) => {
      if (!task?._id) return;
      navigate(`/tasks/${task._id}`, {
        state: { returnTo: `/projects/${id}` },
      });
    },
    [navigate, id],
  );

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">{project?.name || "Dự án"}</h1>
          <div className="text-sm text-muted-foreground">
            {project?.description}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setMembersOpen(true)}>Thành viên</Button>
          <Button
            onClick={() => navigate(`/tasks/new?projectId=${id}`)}
            variant="secondary"
          >
            Tạo task
          </Button>
        </div>
      </header>

      {!isLoading && (
        <div className="space-y-4 md:flex md:items-start md:gap-4 md:space-y-0">
          {STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onOpenTask={handleOpenTask}
            />
          ))}
        </div>
      )}

      <ProjectMembersModal
        open={membersOpen}
        onOpenChange={setMembersOpen}
        project={project}
        onMembersUpdated={fetchProject}
      />
    </section>
  );
}
