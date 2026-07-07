import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { formatId, type Project, type ProjectStage, type ProjectStatus } from "@/lib/mock-data";
import { QuickAddTask } from "@/components/layout/QuickAddTask";
import { TaskDialog } from "@/components/TaskDialog";
import { ColoredStatusSelect, workStatusOptions } from "@/components/ColoredStatusSelect";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Quản lý Project — TabLife" },
      { name: "description", content: "Quản lý project, các giai đoạn và task liên quan." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectStatusSelect({
  value,
  onChange,
  className,
}: {
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => Promise<void>;
  className?: string;
}) {
  const [isSaving, setIsSaving] = useState(false);

  return (
    <ColoredStatusSelect
      value={value}
      disabled={isSaving}
      options={workStatusOptions}
      className={className}
      onValueChange={async (status) => {
        if (status === value) return;
        setIsSaving(true);
        try {
          await onChange(status);
          toast.success("Đã cập nhật trạng thái project");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Không cập nhật được trạng thái");
        } finally {
          setIsSaving(false);
        }
      }}
    />
  );
}

const projectStatusColors: Record<
  ProjectStatus,
  {
    card: string;
    rail: string;
    tile: string;
  }
> = {
  new: {
    card: "border-warning/25 hover:border-warning/50",
    rail: "bg-warning",
    tile: "border-warning/30 bg-warning/10 text-warning",
  },
  in_progress: {
    card: "border-info/25 hover:border-info/50",
    rail: "bg-info",
    tile: "border-info/30 bg-info/10 text-info",
  },
  done: {
    card: "border-success/25 hover:border-success/50",
    rail: "bg-success",
    tile: "border-success/30 bg-success/10 text-success",
  },
  cancel: {
    card: "border-border hover:border-muted-foreground/40",
    rail: "bg-muted-foreground",
    tile: "border-border bg-muted text-muted-foreground",
  },
};

function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const addProject = useStore((s) => s.addProject);
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(today);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProject({
      name,
      description,
      status: "new",
      startAt: today,
      deadline,
    });
    toast.success("Đã tạo project");
    setName("");
    setDescription("");
    setDeadline(today);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tên project *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit">Tạo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StageEditor({
  project,
  stage,
  onClose,
}: {
  project: Project;
  stage: ProjectStage;
  onClose: () => void;
}) {
  const updateStage = useStore((s) => s.updateStage);
  const [name, setName] = useState(stage.name);
  const [status, setStatus] = useState(stage.status);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa giai đoạn</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tên giai đoạn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <ColoredStatusSelect
              value={status}
              onValueChange={setStatus}
              options={workStatusOptions}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            onClick={async () => {
              await updateStage(project.id, stage.id, { name, status });
              toast.success("Đã cập nhật giai đoạn");
              onClose();
            }}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectsPage() {
  const { projects, tasks, addStage, deleteStage, updateProject, updateStage, deleteProject } =
    useStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [stageInput, setStageInput] = useState("");
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;
  const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Project</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project · {projects.filter((p) => p.status === "in_progress").length}{" "}
            đang chạy
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setNewProjectOpen(true)}>
          <Plus className="h-4 w-4" />
          Project mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm project..."
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const projectTasks = tasks.filter((t) => t.projectId === p.id);
          return (
            <Card
              key={p.id}
              className={cn(
                "group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg",
                projectStatusColors[p.status].card,
              )}
              onClick={() => setSelectedId(p.id)}
            >
              <div className={cn("h-1.5", projectStatusColors[p.status].rail)} />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatId(p.id)}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <CardTitle className="truncate">{p.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{p.description}</CardDescription>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-end text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {p.deadline}
                  </span>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tiến độ</span>
                    <span className="font-medium">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-2" />
                </div>
                <div className="flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                  <span>{p.stages.length} giai đoạn</span>
                  <span>·</span>
                  <span>{projectTasks.length} task</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <ProjectStatusSelect
                    value={p.status}
                    onChange={(status) => updateProject(p.id, { status })}
                    className="h-8 w-full text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatId(selected.id)}
                  </span>
                </div>
                <SheetTitle className="font-display text-2xl">{selected.name}</SheetTitle>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={cn(
                      "rounded-xl border p-3",
                      projectStatusColors[selected.status].tile,
                    )}
                  >
                    <p className="mb-1 text-xs text-muted-foreground">Trạng thái</p>
                    <ProjectStatusSelect
                      value={selected.status}
                      onChange={(status) => updateProject(selected.id, { status })}
                      className="h-8 w-full justify-between shadow-none"
                    />
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Bắt đầu</p>
                    <p className="font-medium">{selected.startAt}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Deadline</p>
                    <Input
                      type="date"
                      value={selected.deadline}
                      onChange={async (e) => {
                        await useStore
                          .getState()
                          .updateProject(selected.id, { deadline: e.target.value });
                        toast.success("Đã cập nhật deadline");
                      }}
                      className="h-8 border-0 bg-transparent p-0 font-medium shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold">Tiến độ tổng</h3>
                    <span className="text-sm font-bold text-primary">{selected.progress}%</span>
                  </div>
                  <Progress value={selected.progress} className="h-2.5" />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold">Các giai đoạn</h3>
                  </div>
                  <div className="space-y-2">
                    {selected.stages.map((s) => {
                      const stageTasks = tasks.filter(
                        (t) => t.projectId === selected.id && t.stageId === s.id,
                      );
                      return (
                        <div key={s.id} className="rounded-xl border bg-card p-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={async () => {
                                const next =
                                  s.status === "new"
                                    ? "in_progress"
                                    : s.status === "in_progress"
                                      ? "done"
                                      : "new";
                                await updateStage(selected.id, s.id, { status: next });
                              }}
                              className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                                s.status === "done"
                                  ? "border-success bg-success text-success-foreground"
                                  : s.status === "in_progress"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-card text-muted-foreground hover:border-primary"
                              }`}
                              title="Đổi trạng thái"
                            >
                              {s.status === "done" ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : s.status === "in_progress" ? (
                                <Loader2 className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate font-medium">{s.name}</p>
                                <div className="flex items-center gap-1">
                                  <StatusBadge status={s.status} />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setEditingStage(s)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={async () => {
                                      await deleteStage(selected.id, s.id);
                                      toast.success("Đã xoá giai đoạn");
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <Progress value={s.progress} className="mt-2 h-1.5" />
                              {stageTasks.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {stageTasks.map((t) => (
                                    <button
                                      key={t.id}
                                      onClick={() => setOpenTaskId(t.id)}
                                      className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-2 py-1 text-left text-xs hover:bg-muted"
                                    >
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {formatId(t.id)}
                                      </span>
                                      <span className="min-w-0 flex-1 truncate">{t.goal}</span>
                                      <StatusBadge status={t.status} />
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="mt-2">
                                <QuickAddTask projectId={selected.id} stageId={s.id}>
                                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                                    <Plus className="h-3 w-3" />
                                    Tạo task trong giai đoạn
                                  </Button>
                                </QuickAddTask>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {selected.stages.length === 0 && (
                      <div className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
                        Chưa có giai đoạn nào
                      </div>
                    )}
                  </div>
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!stageInput.trim()) return;
                      await addStage(selected.id, stageInput.trim());
                      setStageInput("");
                      toast.success("Đã thêm giai đoạn");
                    }}
                  >
                    <Input
                      value={stageInput}
                      onChange={(e) => setStageInput(e.target.value)}
                      placeholder="Tên giai đoạn mới..."
                      className="h-9"
                    />
                    <Button type="submit" size="sm" className="h-9">
                      <Plus className="h-4 w-4" />
                      Thêm
                    </Button>
                  </form>
                </div>

                <div>
                  <h3 className="mb-3 font-display text-base font-semibold">
                    Tất cả task ({tasks.filter((t) => t.projectId === selected.id).length})
                  </h3>
                  <div className="space-y-2">
                    {tasks
                      .filter((t) => t.projectId === selected.id)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setOpenTaskId(t.id)}
                          className="flex w-full items-center gap-2 rounded-xl border p-2.5 text-left hover:border-primary/40"
                        >
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatId(t.id)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">{t.goal}</span>
                          <StatusBadge status={t.status} />
                        </button>
                      ))}
                    {tasks.filter((t) => t.projectId === selected.id).length === 0 && (
                      <p className="text-xs text-muted-foreground">Chưa có task nào.</p>
                    )}
                  </div>
                  <div className="mt-3">
                    <QuickAddTask projectId={selected.id}>
                      <Button variant="outline" size="sm">
                        <Plus className="h-3.5 w-3.5" />
                        Tạo task
                      </Button>
                    </QuickAddTask>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={async () => {
                      await deleteProject(selected.id);
                      toast.success("Đã xoá project");
                      setSelectedId(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xoá project
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      {editingStage && selected && (
        <StageEditor
          project={selected}
          stage={editingStage}
          onClose={() => setEditingStage(null)}
        />
      )}
      <TaskDialog
        open={!!openTask}
        onOpenChange={(o) => !o && setOpenTaskId(null)}
        task={openTask}
      />
    </div>
  );
}
