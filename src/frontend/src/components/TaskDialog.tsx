import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ColoredStatusSelect,
  priorityOptions,
  workStatusOptions,
} from "@/components/ColoredStatusSelect";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatId, type Task, type TaskStatus, type Priority } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  defaultStatus?: TaskStatus;
  defaultProjectId?: number;
  defaultStageId?: number;
}

type AssociationType = "none" | "project" | "research";

const today = () => new Date().toISOString().slice(0, 10);

function createDraft({
  defaultStatus = "new",
  defaultProjectId,
  defaultStageId,
}: Pick<Props, "defaultStatus" | "defaultProjectId" | "defaultStageId">): Task {
  const currentDate = today();

  return {
    id: 0,
    goal: "",
    steps: [],
    expectedResult: "",
    status: defaultStatus,
    startAt: currentDate,
    deadline: currentDate,
    projectId: defaultProjectId,
    stageId: defaultStageId,
    priority: "medium",
  };
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus,
  defaultProjectId,
  defaultStageId,
}: Props) {
  const { projects, research, addTask, updateTask, deleteTask, toggleStep } = useStore();
  const isCreating = !task;
  const [isEditing, setIsEditing] = useState(isCreating);
  const [draft, setDraft] = useState<Task | null>(task);
  const [newStep, setNewStep] = useState("");
  const [newLink, setNewLink] = useState("");
  const [associationType, setAssociationType] = useState<AssociationType>(
    task?.projectId ? "project" : task?.researchId ? "research" : "none",
  );

  useEffect(() => {
    const nextDraft =
      task ??
      (open
        ? createDraft({
            defaultStatus,
            defaultProjectId,
            defaultStageId,
          })
        : null);

    setDraft(nextDraft);
    setNewStep("");
    setNewLink("");
    setIsEditing(!task);
    setAssociationType(
      nextDraft?.projectId ? "project" : nextDraft?.researchId ? "research" : "none",
    );
  }, [defaultProjectId, defaultStageId, defaultStatus, open, task]);

  if (!draft) return null;

  const stages = draft.projectId
    ? (projects.find((p) => p.id === draft.projectId)?.stages ?? [])
    : [];
  const project = draft.projectId ? projects.find((p) => p.id === draft.projectId) : undefined;
  const stage = draft.stageId ? stages.find((item) => item.id === draft.stageId) : undefined;
  const researchTopic = draft.researchId
    ? research.find((item) => item.id === draft.researchId)
    : undefined;

  const doneCount = draft.steps.filter((s) => s.done).length;
  const progress = draft.steps.length ? (doneCount / draft.steps.length) * 100 : 0;
  const taskLinks = draft.links ?? (draft.link ? [draft.link] : []);
  const canEdit = isCreating || isEditing;

  const persist = (patch: Partial<Task>) => {
    setDraft({ ...draft, ...patch });
  };

  const changeAssociationType = (type: AssociationType) => {
    setAssociationType(type);
    persist(
      type === "project"
        ? { researchId: undefined }
        : type === "research"
          ? { projectId: undefined, stageId: undefined }
          : { projectId: undefined, stageId: undefined, researchId: undefined },
    );
  };

  const save = async () => {
    if (!draft.goal.trim()) {
      toast.error("Vui lòng nhập mục tiêu task");
      return;
    }

    const links = taskLinks.map((link) => link.trim()).filter(Boolean);

    if (isCreating) {
      if (!draft.projectId) {
        toast.error("API hiện yêu cầu task phải thuộc một project");
        return;
      }

      const { id: _id, ...taskPayload } = draft;
      const created = await addTask({
        ...taskPayload,
        goal: draft.goal.trim(),
        link: links[0],
        links: links.length ? links : undefined,
      });
      toast.success("Đã tạo task " + formatId(created.id));
      onOpenChange(false);
      return;
    }

    await updateTask(draft.id, {
      ...draft,
      goal: draft.goal.trim(),
      link: undefined,
      links: links.length ? links : undefined,
    });
    toast.success("Đã cập nhật task " + formatId(draft.id));
    setIsEditing(false);
  };

  const remove = async () => {
    if (isCreating) {
      onOpenChange(false);
      return;
    }

    await deleteTask(draft.id);
    toast.success("Đã xoá task");
    onOpenChange(false);
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    const nextId = Math.max(0, ...draft.steps.map((s) => s.id)) + 1;
    persist({ steps: [...draft.steps, { id: nextId, text: newStep.trim(), done: false }] });
    setNewStep("");
  };

  const addLink = () => {
    const link = newLink.trim();
    if (!link || taskLinks.includes(link)) return;
    persist({ link: undefined, links: [...taskLinks, link] });
    setNewLink("");
  };

  const toggleDraftStep = async (stepId: number) => {
    const step = draft.steps.find((item) => item.id === stepId);
    if (!step) return;

    const nextSteps = draft.steps.map((item) =>
      item.id === stepId ? { ...item, done: !item.done } : item,
    );

    persist({ steps: nextSteps });

    if (isCreating) return;

    try {
      await toggleStep(draft.id, stepId);
    } catch (error) {
      persist({ steps: draft.steps });
      toast.error(error instanceof Error ? error.message : "Không cập nhật được subtask");
    }
  };

  const cancelEdit = () => {
    if (isCreating) {
      onOpenChange(false);
      return;
    }

    setDraft(task);
    setNewStep("");
    setNewLink("");
    setAssociationType(task?.projectId ? "project" : task?.researchId ? "research" : "none");
    setIsEditing(false);
  };

  const updateLink = (index: number, link: string) => {
    persist({
      link: undefined,
      links: taskLinks.map((currentLink, currentIndex) =>
        currentIndex === index ? link : currentLink,
      ),
    });
  };

  const removeLink = (index: number) => {
    persist({
      link: undefined,
      links: taskLinks.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {isCreating ? "TASK MỚI" : formatId(draft.id)}
            </span>
          </div>
          <DialogTitle className="pt-2 font-display text-2xl">
            {canEdit ? (isCreating ? "Tạo task mới" : "Chỉnh sửa task") : draft.goal}
          </DialogTitle>
        </DialogHeader>

        {canEdit ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tên task *</Label>
                <Input
                  value={draft.goal}
                  onChange={(e) => persist({ goal: e.target.value })}
                  placeholder="Nhập tên task..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kết quả mong đợi</Label>
                <Textarea
                  rows={2}
                  value={draft.expectedResult}
                  onChange={(e) => persist({ expectedResult: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kết quả thực tế</Label>
                <Textarea
                  rows={2}
                  value={draft.actualResult ?? ""}
                  onChange={(e) => persist({ actualResult: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Links liên quan</Label>
              {taskLinks.map((link, index) => (
                <div key={`${link}-${index}`} className="flex gap-2">
                  <Input
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeLink(index)}
                    aria-label="Xoá link"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
                  placeholder="Thêm link mới..."
                />
                <Button type="button" variant="outline" className="shrink-0" onClick={addLink}>
                  <Plus className="h-4 w-4" />
                  Thêm link
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Loại liên kết</Label>
                <Select
                  value={associationType}
                  onValueChange={(v) => changeAssociationType(v as AssociationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không liên kết</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{associationType === "research" ? "Research" : "Project"}</Label>
                <Select
                  value={
                    associationType === "research"
                      ? draft.researchId
                        ? String(draft.researchId)
                        : "none"
                      : draft.projectId
                        ? String(draft.projectId)
                        : "none"
                  }
                  onValueChange={(v) => {
                    if (associationType === "project") {
                      persist({
                        projectId: v === "none" ? undefined : Number(v),
                        stageId: undefined,
                      });
                    }
                    if (associationType === "research") {
                      persist({ researchId: v === "none" ? undefined : Number(v) });
                    }
                  }}
                  disabled={associationType === "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không</SelectItem>
                    {associationType === "project" &&
                      projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    {associationType === "research" &&
                      research.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {associationType === "project" && (
                <div className="space-y-1.5">
                  <Label>Giai đoạn</Label>
                  <Select
                    value={draft.stageId ? String(draft.stageId) : "none"}
                    onValueChange={(v) =>
                      persist({ stageId: v === "none" ? undefined : Number(v) })
                    }
                    disabled={!draft.projectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không</SelectItem>
                      {stages.map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Bắt đầu</Label>
                <Input
                  className="hide-date-picker-icon"
                  type="date"
                  value={draft.startAt}
                  onChange={(e) => persist({ startAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input
                  className="hide-date-picker-icon"
                  type="date"
                  value={draft.deadline}
                  onChange={(e) => persist({ deadline: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <ColoredStatusSelect
                  value={draft.status}
                  onValueChange={(v) => persist({ status: v as TaskStatus })}
                  options={workStatusOptions}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ưu tiên</Label>
                <ColoredStatusSelect
                  value={draft.priority}
                  onValueChange={(v) => persist({ priority: v as Priority })}
                  options={priorityOptions}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Tiến độ các bước
                </Label>
                <span className="text-xs font-medium">
                  {doneCount}/{draft.steps.length}
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
              <div className="mt-3 space-y-1.5">
                {draft.steps.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-center gap-2 rounded-lg border bg-card p-2"
                  >
                    <Checkbox
                      checked={s.done}
                      onCheckedChange={() => toggleDraftStep(s.id)}
                    />
                    <Input
                      value={s.text}
                      onChange={(e) =>
                        persist({
                          steps: draft.steps.map((x) =>
                            x.id === s.id ? { ...x, text: e.target.value } : x,
                          ),
                        })
                      }
                      className={`h-7 border-0 px-1 shadow-none focus-visible:ring-0 ${s.done ? "text-muted-foreground line-through" : ""}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => persist({ steps: draft.steps.filter((x) => x.id !== s.id) })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newStep}
                    onChange={(e) => setNewStep(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStep())}
                    placeholder="Thêm bước..."
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={addStep}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={draft.status} />
              <StatusBadge status={draft.priority} />
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Bắt đầu</p>
                <p className="mt-1">{draft.startAt}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Deadline</p>
                <p className="mt-1">{draft.deadline}</p>
              </div>
              {project && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Project</p>
                  <p className="mt-1">{project.name}</p>
                </div>
              )}
              {stage && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Giai đoạn</p>
                  <p className="mt-1">{stage.name}</p>
                </div>
              )}
              {researchTopic && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Research</p>
                  <p className="mt-1">{researchTopic.name}</p>
                </div>
              )}
            </div>

            {draft.expectedResult.trim() && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Kết quả mong đợi
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{draft.expectedResult}</p>
              </div>
            )}

            {draft.actualResult?.trim() && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Kết quả thực tế
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{draft.actualResult}</p>
              </div>
            )}

            {taskLinks.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Links liên quan
                </p>
                <div className="mt-2 space-y-1">
                  {taskLinks.map((link, index) => (
                    <a
                      key={`${link}-${index}`}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {draft.steps.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Tiến độ các bước
                  </p>
                  <span className="text-xs font-medium">
                    {doneCount}/{draft.steps.length}
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
                <div className="mt-3 space-y-1.5">
                  {draft.steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 rounded-lg border p-2">
                      <Checkbox
                        checked={step.done}
                        onCheckedChange={() => toggleDraftStep(step.id)}
                      />
                      <span
                        className={`text-sm ${step.done ? "text-muted-foreground line-through" : ""}`}
                      >
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {isCreating || !canEdit ? (
            <span />
          ) : (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={remove}
            >
              <Trash2 className="h-4 w-4" />
              Xoá
            </Button>
          )}
          <div className="flex gap-2">
            {canEdit ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>
                  Huỷ
                </Button>
                <Button onClick={save}>{isCreating ? "Tạo task" : "Lưu thay đổi"}</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Đóng
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
