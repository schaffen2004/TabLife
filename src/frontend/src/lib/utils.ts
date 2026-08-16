import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const chartTooltipProps = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "#fff",
  },
  labelStyle: { color: "#fff" },
  itemStyle: { color: "#fff" },
} as const;
