import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Target, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ColoredStatusSelect, planStatusOptions, workStatusOptions } from "@/components/ColoredStatusSelect";
import { useStore } from "@/lib/store";
import { formatId, type Plan, type PlanRequirement } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plan — TabLife" },
      { name: "description", content: "Kế hoạch cá nhân và mục tiêu dài hạn." },
    ],
  }),
  component: PlansPage,
});

function RequirementsEditor({
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
    onChange([...requirements, { id, name, status: "new" }]);
    setNewRequirement("");
  };

  const updateRequirement = (id: number, patch: Partial<PlanRequirement>) => {
    onChange(requirements.map((requirement) => (requirement.id === id ? { ...requirement, ...patch } : requirement)));
  };

  return (
    <div className="space-y-2">
      <Label>Yêu cầu</Label>
      <div className="space-y-2">
        {requirements.map((requirement) => (
          <div key={requirement.id} className="flex items-center gap-2">
            <Input
              value={requirement.name}
              onChange={(event) => updateRequirement(requirement.id, { name: event.target.value })}
              placeholder="Nội dung yêu cầu"
            />
            <ColoredStatusSelect
              value={requirement.status}
              onValueChange={(status) => updateRequirement(requirement.id, { status: status as PlanRequirement["status"] })}
              options={workStatusOptions}
              className="w-32 shrink-0"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(requirements.filter((item) => item.id !== requirement.id))}
              aria-label={`Xoá yêu cầu ${requirement.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
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
          placeholder="Thêm yêu cầu mới"
        />
        <Button type="button" variant="outline" onClick={addRequirement}>
          <Plus className="h-4 w-4" />Thêm
        </Button>
      </div>
    </div>
  );
}

function NewPlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { projects, addPlan } = useStore();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [requirements, setRequirements] = useState<PlanRequirement[]>([]);
  const [estimatedTime, setEstimatedTime] = useState("");
  const [projectId, setProjectId] = useState("none");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Plan mới</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            addPlan({
              name, goal,
              requirements,
              estimatedTime,
              status: "draft",
              relatedProjectId: projectId === "none" ? undefined : Number(projectId),
            });
            toast.success("Đã tạo plan");
            setName(""); setGoal(""); setRequirements([]); setEstimatedTime(""); setProjectId("none");
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5"><Label>Tên plan *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Mục tiêu</Label><Input value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
          <RequirementsEditor requirements={requirements} onChange={setRequirements} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Thời gian dự kiến</Label><Input value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} placeholder="VD: 8 tuần" /></div>
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button type="submit">Tạo</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const { projects, updatePlan, deletePlan } = useStore();
  const [draft, setDraft] = useState<Plan | null>(plan);

  useEffect(() => setDraft(plan), [plan]);

  if (!draft) return null;

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">{formatId(draft.id)}</span>
            <StatusBadge status={draft.status} />
          </div>
          <DialogTitle className="pt-1 font-display text-2xl">Chi tiết Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Tên plan</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Mục tiêu</Label><Input value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} /></div>
          <RequirementsEditor
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
              <Input value={draft.estimatedTime} onChange={(e) => setDraft({ ...draft, estimatedTime: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Project liên quan</Label>
              <Select
                value={draft.relatedProjectId ? String(draft.relatedProjectId) : "none"}
                onValueChange={(v) => setDraft({ ...draft, relatedProjectId: v === "none" ? undefined : Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => { deletePlan(draft.id); toast.success("Đã xoá plan"); onClose(); }}
          >
            <Trash2 className="h-4 w-4" />Xoá
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Huỷ</Button>
            <Button onClick={() => { updatePlan(draft.id, draft); toast.success("Đã lưu"); onClose(); }}>Lưu thay đổi</Button>
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
          <p className="text-sm text-muted-foreground">Biến kế hoạch thành hành động cụ thể.</p>
        </div>
        <Button className="rounded-xl" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" />Plan mới</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm plan..." className="h-10 pl-9" />
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
                    <span className="font-mono text-[10px] text-muted-foreground">{formatId(plan.id)}</span>
                  </div>
                  <CardTitle className="mt-1">{plan.name}</CardTitle>
                  <CardDescription>{plan.goal}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Yêu cầu</p>
                    <ul className="space-y-1.5">
                      {plan.requirements.map((requirement) => (
                        <li key={requirement.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">{requirement.name}</span>
                          <StatusBadge status={requirement.status} className="shrink-0" />
                        </li>
                      ))}
                    </ul>
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
