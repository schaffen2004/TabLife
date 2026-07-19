import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorTheme = "indigo" | "ocean" | "emerald" | "rose" | "amber";

export const colorThemes: { id: ColorTheme; name: string; swatch: string[] }[] = [
  { id: "indigo", name: "Midnight Indigo", swatch: ["#6366f1", "#8b5cf6"] },
  { id: "ocean", name: "Ocean Blue", swatch: ["#0ea5e9", "#22d3ee"] },
  { id: "emerald", name: "Emerald Forest", swatch: ["#10b981", "#34d399"] },
  { id: "rose", name: "Rose Bloom", swatch: ["#ec4899", "#f43f5e"] },
  { id: "amber", name: "Amber Sunset", swatch: ["#f59e0b", "#fb923c"] },
];

interface ThemeState {
  color: ColorTheme;
  setColor: (c: ColorTheme) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      color: "indigo",
      setColor: (color) => set({ color }),
    }),
    { name: "tablife-theme" },
  ),
);

export function applyTheme(color: ColorTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", color);
  root.classList.add("dark");
}
