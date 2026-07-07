import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ColoredOption<T extends string = string> = {
  value: T;
  label: string;
};

type ColorStyle = {
  trigger: string;
  dot: string;
  item: string;
};

const colorStyles: Record<string, ColorStyle> = {
  all: {
    trigger: "border-border bg-muted/60 text-muted-foreground",
    dot: "bg-muted-foreground",
    item: "text-muted-foreground focus:bg-muted focus:text-muted-foreground",
  },
  new: {
    trigger: "border-warning/40 bg-warning/10 text-warning",
    dot: "bg-warning",
    item: "text-warning focus:bg-warning/10 focus:text-warning",
  },
  in_progress: {
    trigger: "border-info/40 bg-info/10 text-info",
    dot: "bg-info",
    item: "text-info focus:bg-info/10 focus:text-info",
  },
  done: {
    trigger: "border-success/40 bg-success/10 text-success",
    dot: "bg-success",
    item: "text-success focus:bg-success/10 focus:text-success",
  },
  cancel: {
    trigger: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    item: "text-muted-foreground focus:bg-muted focus:text-muted-foreground",
  },
  draft: {
    trigger: "border-primary/40 bg-primary/10 text-primary",
    dot: "bg-primary",
    item: "text-primary focus:bg-primary/10 focus:text-primary",
  },
  active: {
    trigger: "border-info/40 bg-info/10 text-info",
    dot: "bg-info",
    item: "text-info focus:bg-info/10 focus:text-info",
  },
  low: {
    trigger: "border-success/40 bg-success/10 text-success",
    dot: "bg-success",
    item: "text-success focus:bg-success/10 focus:text-success",
  },
  medium: {
    trigger: "border-warning/40 bg-warning/10 text-warning",
    dot: "bg-warning",
    item: "text-warning focus:bg-warning/10 focus:text-warning",
  },
  high: {
    trigger: "border-destructive/40 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    item: "text-destructive focus:bg-destructive/10 focus:text-destructive",
  },
};

const fallbackStyle: ColorStyle = {
  trigger: "border-input bg-transparent text-foreground",
  dot: "bg-muted-foreground",
  item: "",
};

export const workStatusOptions = [
  { value: "new", label: "Mới" },
  { value: "in_progress", label: "Đang làm" },
  { value: "done", label: "Hoàn thành" },
  { value: "cancel", label: "Đã huỷ" },
] as const;

export const planStatusOptions = [
  { value: "draft", label: "Nháp" },
  { value: "active", label: "Đang chạy" },
  { value: "done", label: "Hoàn thành" },
  { value: "cancel", label: "Đã huỷ" },
] as const;

export const priorityOptions = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
] as const;

export function ColoredStatusSelect<T extends string>({
  value,
  onValueChange,
  options,
  className,
  disabled,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly ColoredOption<T>[];
  className?: string;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  const selectedStyle = colorStyles[value] ?? fallbackStyle;

  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)} disabled={disabled}>
      <SelectTrigger className={cn(className, selectedStyle.trigger)}>
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", selectedStyle.dot)} />
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const style = colorStyles[option.value] ?? fallbackStyle;
          return (
            <SelectItem key={option.value} value={option.value} className={style.item}>
              <span className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                {option.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
