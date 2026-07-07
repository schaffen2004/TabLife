import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  new: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-info/15 text-info border-info/30",
  done: "bg-success/15 text-success border-success/30",
  cancel: "bg-muted text-muted-foreground border-border",
  active: "bg-info/15 text-info border-info/30",
  draft: "bg-warning/15 text-warning border-warning/40",
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/40",
  low: "bg-success/15 text-success border-success/30",
};

const labels: Record<string, string> = {
  new: "Mới",
  in_progress: "Đang làm",
  done: "Hoàn thành",
  cancel: "Đã huỷ",
  active: "Đang chạy",
  draft: "Nháp",
  high: "Cao",
  medium: "TB",
  low: "Thấp",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
