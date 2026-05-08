"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { HiOutlineSwatch } from "react-icons/hi2";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_THEMES, isAppTheme, type AppTheme } from "@/lib/theme-config";

export function ThemeSelector() {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedTheme = useMemo<AppTheme>(() => {
    if (theme && isAppTheme(theme)) return theme;
    return resolvedTheme === "dark" ? "dark" : "light";
  }, [resolvedTheme, theme]);

  const selectedLabel =
    APP_THEMES.find((option) => option.value === selectedTheme)?.label ?? "Seleccionar tema";

  if (!mounted) {
    return <div className="h-9 w-full rounded-lg bg-muted/70" aria-hidden="true" />;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
        Tema visual
      </p>
      <Select
        value={selectedTheme}
        onValueChange={(value) => {
          if (!value) return;
          setTheme(value);
        }}
      >
        <SelectTrigger className="h-9 w-full cursor-pointer border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent">
          <SelectValue placeholder="Seleccionar tema">{selectedLabel}</SelectValue>
          <HiOutlineSwatch className="h-4 w-4 text-sidebar-foreground/70" />
        </SelectTrigger>
        <SelectContent className="w-56">
          {APP_THEMES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
