import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, ExternalLink, Microscope, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { ColoredStatusSelect, workStatusOptions } from "@/components/ColoredStatusSelect";
import { useStore } from "@/lib/store";
import { formatId, type ResearchTopic, type Subtopic } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research Topic — TabLife" },
      { name: "description", content: "Quản lý chủ đề nghiên cứu và subtopic." },
    ],
  }),
  component: ResearchPage,
});

function getCompletionPercentage(subtopics: Subtopic[]) {
  if (subtopics.length === 0) return 0;
  const completedSubtopics = subtopics.filter((subtopic) => subtopic.status === "done").length;
  return Math.round((completedSubtopics / subtopics.length) * 100);
}

function NewTopicDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const addResearch = useStore((s) => s.addResearch);
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Topic mới</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            addResearch({ name, description, status: "new", startAt: today });
            toast.success("Đã tạo topic");
            setName("");
            setDescription("");
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Tên topic *</Label>
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
          <DialogFooter>
            <Button type="submit">Tạo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewSubtopicDialog({
  researchId,
  open,
  onOpenChange,
}: {
  researchId: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const addSubtopic = useStore((s) => s.addSubtopic);
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subtopic mới</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            addSubtopic(researchId, {
              name,
              description,
              status: "new",
              startAt: today,
              link: link || undefined,
            });
            toast.success("Đã thêm subtopic");
            setName("");
            setDescription("");
            setLink("");
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Tên *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Link</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <DialogFooter>
            <Button type="submit">Thêm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSubtopicDialog({
  researchId,
  subtopic,
  onClose,
}: {
  researchId: number;
  subtopic: Subtopic | null;
  onClose: () => void;
}) {
  const { updateSubtopic, deleteSubtopic } = useStore();
  const [draft, setDraft] = useState<Subtopic | null>(subtopic);
  useEffect(() => setDraft(subtopic), [subtopic]);
  if (!draft) return null;

  return (
    <Dialog open={!!subtopic} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <StatusBadge status={draft.status} />
          </div>
          <DialogTitle className="pt-1 font-display text-xl">Chỉnh sửa Subtopic</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tên</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <ColoredStatusSelect
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as Subtopic["status"] })}
                options={workStatusOptions}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bắt đầu</Label>
              <Input
                type="date"
                value={draft.startAt}
                onChange={(e) => setDraft({ ...draft, startAt: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Link</Label>
            <Input
              value={draft.link ?? ""}
              onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ghi chú</Label>
            <Textarea
              rows={2}
              value={draft.note ?? ""}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              deleteSubtopic(researchId, draft.id);
              toast.success("Đã xoá");
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Xoá
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button
              onClick={() => {
                updateSubtopic(researchId, draft.id, draft);
                toast.success("Đã lưu");
                onClose();
              }}
            >
              Lưu
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResearchPage() {
  const { research, deleteResearch, updateResearch } = useStore();
  const [openTopic, setOpenTopic] = useState<ResearchTopic | null>(null);
  const [query, setQuery] = useState("");
  const [openNewTopic, setOpenNewTopic] = useState(false);
  const [openNewSub, setOpenNewSub] = useState(false);
  const [editingSub, setEditingSub] = useState<Subtopic | null>(null);

  // Keep openTopic in sync with store
  const liveTopic = openTopic ? (research.find((r) => r.id === openTopic.id) ?? null) : null;
  const liveTopicCompletion = liveTopic ? getCompletionPercentage(liveTopic.subtopics) : 0;

  const filtered = research.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Research Topic</h1>
          <p className="text-sm text-muted-foreground">
            {research.length} topic · ấn vào để xem subtopic.
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setOpenNewTopic(true)}>
          <Plus className="h-4 w-4" />
          Topic mới
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm topic..."
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r) => {
          const doneCount = r.subtopics.filter((s) => s.status === "done").length;
          const completionPercentage = getCompletionPercentage(r.subtopics);
          return (
            <button key={r.id} type="button" onClick={() => setOpenTopic(r)} className="text-left">
              <Card className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Microscope className="h-5 w-5" />
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatId(r.id)}
                    </span>
                  </div>
                  <CardTitle className="mt-1">{r.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{r.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tiến độ hoàn thành</span>
                      <span className="font-medium text-primary">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{r.subtopics.length} subtopic</span>
                    <span>{doneCount} hoàn thành</span>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            Không có topic.
          </p>
        )}
      </div>

      <Sheet open={!!liveTopic} onOpenChange={(o) => !o && setOpenTopic(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {liveTopic && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatId(liveTopic.id)}
                  </span>
                  <ColoredStatusSelect
                    value={liveTopic.status}
                    onValueChange={(v) =>
                      updateResearch(liveTopic.id, { status: v as ResearchTopic["status"] })
                    }
                    options={workStatusOptions}
                    className="h-7 w-[140px] text-xs"
                  />
                </div>
                <SheetTitle className="font-display text-2xl">{liveTopic.name}</SheetTitle>
                <SheetDescription>{liveTopic.description}</SheetDescription>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Tiến độ hoàn thành</span>
                    <span className="font-semibold text-primary">{liveTopicCompletion}%</span>
                  </div>
                  <Progress value={liveTopicCompletion} className="h-2" />
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold">
                    Subtopic ({liveTopic.subtopics.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOpenNewSub(true)}>
                      <Plus className="h-3.5 w-3.5" />
                      Subtopic
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        deleteResearch(liveTopic.id);
                        setOpenTopic(null);
                        toast.success("Đã xoá topic");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {liveTopic.subtopics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed py-12 text-center">
                    <Microscope className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">Chưa có subtopic nào</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setOpenNewSub(true)}
                    >
                      Tạo subtopic đầu tiên
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {liveTopic.subtopics.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setEditingSub(s)}
                        className="group block w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{s.name}</span>
                              <StatusBadge status={s.status} />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                            <p className="mt-1.5 text-xs text-muted-foreground">📅 {s.startAt}</p>
                          </div>
                          {s.link && (
                            <a
                              href={s.link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-muted"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <NewTopicDialog open={openNewTopic} onOpenChange={setOpenNewTopic} />
      {liveTopic && (
        <>
          <NewSubtopicDialog
            researchId={liveTopic.id}
            open={openNewSub}
            onOpenChange={setOpenNewSub}
          />
          <EditSubtopicDialog
            researchId={liveTopic.id}
            subtopic={editingSub}
            onClose={() => setEditingSub(null)}
          />
        </>
      )}
    </div>
  );
}
