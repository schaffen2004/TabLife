import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColoredStatusSelect, priorityOptions } from "@/components/ColoredStatusSelect";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatId, type Priority } from "@/lib/mock-data";

interface Props {
  children: ReactNode;
  projectId?: number;
  stageId?: number;
}

type AssociationType = "none" | "project" | "research";

export function QuickAddTask({ children, projectId, stageId }: Props) {
  const { projects, research, addTask } = useStore();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const [goal, setGoal] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [project, setProject] = useState<string>(projectId ? String(projectId) : "none");
  const [stage, setStage] = useState<string>(stageId ? String(stageId) : "none");
  const [researchId, setResearchId] = useState("none");
  const [associationType, setAssociationType] = useState<AssociationType>(
    projectId ? "project" : "none",
  );
  const [startAt, setStartAt] = useState(today);
  const [deadline, setDeadline] = useState(today);
  const [priority, setPriority] = useState<Priority>("medium");
  const [link, setLink] = useState("");

  const reset = () => {
    setGoal("");
    setStepsText("");
    setProject(projectId ? String(projectId) : "none");
    setStage(stageId ? String(stageId) : "none");
    setResearchId("none");
    setAssociationType(projectId ? "project" : "none");
    setStartAt(today);
    setDeadline(today);
    setPriority("medium");
    setLink("");
  };

  const stages =
    project !== "none" ? (projects.find((p) => p.id === Number(project))?.stages ?? []) : [];

  const changeAssociationType = (type: AssociationType) => {
    setAssociationType(type);
    if (type !== "project") {
      setProject("none");
      setStage("none");
    }
    if (type !== "research") setResearchId("none");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (associationType !== "project" || project === "none") {
      toast.error("API hiện yêu cầu task phải thuộc một project");
      return;
    }
    const steps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text, i) => ({ id: i + 1, text, done: false }));

    const created = await addTask({
      goal,
      steps,
      expectedResult: "",
      status: "new",
      startAt,
      deadline,
      link: link || undefined,
      projectId: Number(project),
      stageId: associationType === "project" && stage !== "none" ? Number(stage) : undefined,
      priority,
    });
    toast.success("Đã tạo task " + formatId(created.id));
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Tạo task mới</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 pt-2" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Mục tiêu *</Label>
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="VD: Viết bài blog về Agentic AI"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Các bước thực hiện</Label>
            <Textarea
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              placeholder="Mỗi bước một dòng..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>{associationType === "research" ? "Research" : "Project"}</Label>
              <Select
                value={associationType === "research" ? researchId : project}
                onValueChange={(v) => {
                  if (associationType === "project") {
                    setProject(v);
                    setStage("none");
                  }
                  if (associationType === "research") setResearchId(v);
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            {associationType === "project" && (
              <div className="space-y-2">
                <Label>Giai đoạn</Label>
                <Select value={stage} onValueChange={setStage} disabled={project === "none"}>
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
            <div className="space-y-2">
              <Label>Ưu tiên</Label>
              <ColoredStatusSelect value={priority} onValueChange={setPriority} options={priorityOptions} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bắt đầu</Label>
              <Input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Link liên quan</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit">Tạo task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
