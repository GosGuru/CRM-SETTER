"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { User } from "@/types/database";
import { HiOutlineUsers } from "react-icons/hi2";
import { cn } from "@/lib/utils";

interface CloserComboboxProps {
  closers: User[] | undefined;
  value: string;
  onValueChange: (text: string, id: string | null) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function CloserCombobox({
  closers,
  value,
  onValueChange,
  placeholder = "Nombre del closer",
  className,
  inputClassName,
}: CloserComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = (closers ?? [])
    .filter((c) => c.full_name.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 5);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    const exactMatch = (closers ?? []).find(
      (c) => c.full_name.toLowerCase() === text.toLowerCase()
    );
    onValueChange(text, exactMatch?.id ?? null);
    setOpen(true);
  };

  const handleSelect = (closer: User) => {
    onValueChange(closer.full_name, closer.id);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <HiOutlineUsers className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn("pl-9 h-9 text-sm", inputClassName)}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur
                handleSelect(c);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              {c.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
