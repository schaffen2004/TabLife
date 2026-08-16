import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Plus, Search, Target, Trash2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ColoredStatusSelect,
  planStatusOptions,
  workStatusOptions,
} from "@/components/ColoredStatusSelect";
import { useStore } from "@/lib/store";
import { formatId, type Plan, type PlanRequirement } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plan — TabLife" },
      { name: "description", content: "Kế hoạch cá nhân và mục tiêu dài hạn." },
    ],
  }),
  component: PlansPage,
});

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatViDate(value?: string): string {
  const date = parseIsoDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatViDateFull(value?: string): string {
  const date = parseIsoDate(value);
  if (!date) return "Chưa đặt ngày";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function sortedMilestones(requirements: PlanRequirement[]): PlanRequirement[] {
  return [...requirements].sort((a, b) => {
    if (a.dueAt && b.dueAt && a.dueAt !== b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return a.id - b.id;
  });
}

function nextMilestoneDate(requirements: PlanRequirement[]): string {
  const dated = sortedMilestones(requirements).filter((item) => item.dueAt);
  const last = dated[dated.length - 1]?.dueAt;
  return last ? addDays(last, 7) : todayKey();
}

function isOverdue(milestone: PlanRequirement): boolean {
  if (!milestone.dueAt || milestone.status === "done" || milestone.status === "cancel")
    return false;
  return milestone.dueAt < todayKey();
}

function milestoneProgress(requirements: PlanRequirement[]): {
  done: number;
  total: number;
  percent: number;
} {
  const countable = requirements.filter((item) => item.status !== "cancel");
  const done = countable.filter((item) => item.status === "done").length;
  const total = countable.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

function milestoneDotClass(milestone: PlanRequirement): string {
  if (milestone.status === "done") return "border-success bg-success text-white";
  if (milestone.status === "cancel") return "border-border bg-muted text-muted-foreground";
  if (isOverdue(milestone)) return "border-destructive bg-destructive text-destructive-foreground";
  if (milestone.status === "in_progress") return "border-info bg-background";
  return "border-border bg-background";
}

function MilestoneDot({
  milestone,
  className,
}: {
  milestone: PlanRequirement;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full border-2",
        milestoneDotClass(milestone),
        className,
      )}
    >
      {milestone.status === "done" && <Check className="h-[60%] w-[60%]" strokeWidth={3} />}
    </span>
  );
}

function milestonePositions(milestones: PlanRequirement[]): number[] {
  if (milestones.length <= 1) return [50];
  const times = milestones.map((item) => parseIsoDate(item.dueAt)?.getTime() ?? null);
  const known = times.filter((value): value is number => value !== null);
  if (known.length === milestones.length) {
    const min = Math.min(...known);
    const max = Math.max(...known);
    if (max === min) return milestones.map(() => 50);
    return known.map((value) => ((value - min) / (max - min)) * 100);
  }
  return milestones.map((_, index) => (index / (milestones.length - 1)) * 100);
}

function trackOffset(percent: number): string {
  return `calc(0.75rem + (100% - 1.5rem) * ${percent} / 100)`;
}

function MilestoneTrack({ requirements }: { requirements: PlanRequirement[] }) {
  const milestones = sortedMilestones(requirements);
  if (milestones.length === 0) return null;

  const positions = milestonePositions(milestones);
  const times = milestones.map((item) => parseIsoDate(item.dueAt)?.getTime() ?? null);
  const known = times.filter((value): value is number => value !== null);
  let todayLeft: number | null = null;
  if (known.length >= 2) {
    const min = Math.min(...known);
    const max = Math.max(...known);
    const today = parseIsoDate(todayKey())?.getTime();
    if (today != null && max > min && today >= min && today <= max) {
      todayLeft = ((today - min) / (max - min)) * 100;
    }
  }

  return (
    <div className="relative h-14">
      <div className="absolute inset-x-3 top-[11px] h-0.5 bg-border" />
      {todayLeft != null && (
        <div
          className="absolute top-0 h-7 w-px bg-primary/60"
          style={{ left: trackOffset(todayLeft) }}
          title="Hôm nay"
        />
      )}
      {milestones.map((milestone, index) => (
        <div
          key={milestone.id}
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: trackOffset(positions[index]) }}
          title={`${milestone.name} · ${formatViDateFull(milestone.dueAt)}`}
        >
          <MilestoneDot milestone={milestone} className="h-6 w-6 shadow-sm" />
          <span className="mt-1 max-w-16 truncate text-[10px] text-muted-foreground">
            {formatViDate(milestone.dueAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MilestoneTimeline({
  requirements,
  compact = false,
}: {
  requirements: PlanRequirement[];
  compact?: boolean;
}) {
  const milestones = sortedMilestones(requirements);
  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có mốc nào</p>;
  }

  return (
    <ol>
      {milestones.map((milestone, index) => {
        const overdue = isOverdue(milestone);
        return (
          <li key={milestone.id} className="relative flex gap-3 pb-3 last:pb-0">
            {index < milestones.length - 1 && (
              <span className="absolute left-[9px] top-5 h-[calc(100%-8px)] w-px bg-border" />
            )}
            <MilestoneDot
              milestone={milestone}
              className="relative z-10 mt-0.5 h-[18px] w-[18px] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "text-sm font-medium leading-5",
                    compact && "truncate",
                    milestone.status === "cancel" && "text-muted-foreground line-through",
                  )}
                >
                  {milestone.name}
                </p>
                <StatusBadge status={milestone.status} className="shrink-0" />
              </div>
              <p
                className={cn(
                  "mt-0.5 text-xs text-muted-foreground",
                  overdue && "font-medium text-destructive",
                )}
              >
                {formatViDateFull(milestone.dueAt)}
                {overdue ? " · Quá hạn" : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function MilestoneProgress({ requirements }: { requirements: PlanRequirement[] }) {
  const { done, total, percent } = milestoneProgress(requirements);
  if (total === 0) return null;

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {done}/{total} mốc
        </span>
        <span>{percent}%</span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}

function MilestoneEditor({
  requirements,
  onChange,
}: {
  requirements: PlanRequirement[];
  onChange: (requirements: PlanRequirement[]) => void;
}) {
  const [newRequirement, setNewRequirement] = useState("");

  const addRequirement = () => {
    const name = newRequirement.trim();
    if (!name) return;

    const id = Math.max(0, ...requirements.map((requirement) => requirement.id)) + 1;
    onChange([
      ...requirements,
      { id, name, status: "new", dueAt: nextMilestoneDate(requirements) },
    ]);
    setNewRequirement("");
  };

  const updateRequirement = (id: number, patch: Partial<PlanRequirement>) => {
    onChange(
      requirements.map((requirement) =>
        requirement.id === id ? { ...requirement, ...patch } : requirement,
      ),
    );
  };

  return (
    <div className="space-y-2">
      <Label>Các mốc theo thời gian</Label>
      <div className="space-y-2">
        {sortedMilestones(requirements).map((requirement) => (
          <div key={requirement.id} className="space-y-2 rounded-xl border p-2">
            <Input
              value={requirement.name}
              onChange={(event) => updateRequirement(requirement.id, { name: event.target.value })}
              placeholder="Tên mốc"
            />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={requirement.dueAt ?? ""}
                onChange={(event) =>
                  updateRequirement(requirement.id, { dueAt: event.target.value || undefined })
                }
                className="flex-1"
              />
              <ColoredStatusSelect
                value={requirement.status}
                onValueChange={(status) =>
                  updateRequirement(requirement.id, { status: status as PlanRequirement["status"] })
                }
                options={workStatusOptions}
                className="w-32 shrink-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(requirements.filter((item) => item.id !== requirement.id))}
                aria-label={`Xoá mốc ${requirement.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newRequirement}
          onChange={(event) => setNewRequirement(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addRequirement();
            }
          }}
          placeholder="Thêm mốc mới"
        />
        <Button type="button" variant="outline" onClick={addRequirement}>
          <Plus className="h-4 w-4" />
          Thêm
        </Button>
      </div>
    </div>
  );
}

function NewPlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { projects, addPlan } = useStore();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [requirements, setRequirements] = useState<PlanRequirement[]>([]);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [projectId, setProjectId] = useState("none");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plan mới</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            addPlan({
              name,
              goal,
              requirements,
              estimatedTime,
              status: "draft",
              relatedProjectId: projectId === "none" ? undefined : Number(projectId),
            });
            toast.success("Đã tạo plan");
            setName("");
            setGoal("");
            setRequirements([]);
            setEstimatedTime("");
            setProjectId("none");
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Tên plan *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Mục tiêu</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <MilestoneEditor requirements={requirements} onChange={setRequirements} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Thời gian dự kiến</Label>
              <Input
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                placeholder="VD: 8 tuần"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Tạo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { projects, updatePlan, deletePlan } = useStore();
  const [draft, setDraft] = useState<Plan | null>(plan);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraft(plan);
    setIsEditing(false);
  }, [plan]);

  if (!draft) return null;

  const relatedProject = projects.find((p) => p.id === draft.relatedProjectId);

  const cancelEdit = () => {
    setDraft(plan);
    setIsEditing(false);
  };

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {formatId(draft.id)}
            </span>
            <StatusBadge status={draft.status} />
          </div>
          <DialogTitle className="pt-1 font-display text-2xl">
            {isEditing ? "Chỉnh sửa Plan" : draft.name}
          </DialogTitle>
        </DialogHeader>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tên plan</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mục tiêu</Label>
              <Input
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
              />
            </div>
            <MilestoneEditor
              requirements={draft.requirements}
              onChange={(requirements) => setDraft({ ...draft, requirements })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <ColoredStatusSelect
                  value={draft.status}
                  onValueChange={(v) => setDraft({ ...draft, status: v as Plan["status"] })}
                  options={planStatusOptions}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Thời gian dự kiến</Label>
                <Input
                  value={draft.estimatedTime}
                  onChange={(e) => setDraft({ ...draft, estimatedTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Project liên quan</Label>
                <Select
                  value={draft.relatedProjectId ? String(draft.relatedProjectId) : "none"}
                  onValueChange={(v) =>
                    setDraft({ ...draft, relatedProjectId: v === "none" ? undefined : Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Mục tiêu</p>
              <p className="mt-1 whitespace-pre-wrap">{draft.goal || "—"}</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Các mốc</p>
              <MilestoneProgress requirements={draft.requirements} />
              <MilestoneTrack requirements={draft.requirements} />
              <div className="mt-2">
                <MilestoneTimeline requirements={draft.requirements} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Thời gian dự kiến
                </p>
                <p className="mt-1">{draft.estimatedTime || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Project liên quan
                </p>
                <p className="mt-1">{relatedProject?.name ?? "—"}</p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          {isEditing ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                deletePlan(draft.id);
                toast.success("Đã xoá plan");
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Xoá
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>
                  Huỷ
                </Button>
                <Button
                  onClick={() => {
                    updatePlan(draft.id, draft);
                    toast.success("Đã lưu");
                    setIsEditing(false);
                  }}
                >
                  Lưu thay đổi
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
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

function PlansPage() {
  const { plans, projects } = useStore();
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const filtered = plans.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Plan</h1>
          <p className="text-sm text-muted-foreground">
            Biến kế hoạch thành các mốc theo thời gian.
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" />
          Plan mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm plan..."
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((plan) => {
          const project = projects.find((p) => p.id === plan.relatedProjectId);
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setEditing(plan)}
              className="text-left"
            >
              <Card className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-primary-glow/15 text-primary">
                      <Target className="h-5 w-5" />
                    </div>
                    <StatusBadge status={plan.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatId(plan.id)}
                    </span>
                  </div>
                  <CardTitle className="mt-1">{plan.name}</CardTitle>
                  <CardDescription>{plan.goal}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Các mốc
                    </p>
                    <MilestoneProgress requirements={plan.requirements} />
                    <MilestoneTrack requirements={plan.requirements} />
                    <div className="mt-1">
                      <MilestoneTimeline requirements={plan.requirements} compact />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>⏱ {plan.estimatedTime || "—"}</span>
                    {project && <span className="truncate text-primary">→ {project.name}</span>}
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <NewPlanDialog open={openNew} onOpenChange={setOpenNew} />
      <EditPlanDialog plan={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
