"use client";

import { usePathname } from "next/navigation";
import { HiOutlineUserPlus } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

export default function TopRightAddLead() {
  const pathname = usePathname();
  const setQuickAddOpen = useUIStore((s) => s.setQuickAddOpen);

  // Only hide on the exact /leads listing page
  const normalized = pathname ? pathname.replace(/\/+$/, "") : pathname;
  if (normalized === "/leads") return null;

  return (
    <div className="fixed top-3 right-3 z-[9999] md:top-4 md:right-6">
      <Button
        variant="default"
        size="lg"
        className="h-12 px-3 rounded-full border border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground shadow-lg transition-transform active:scale-95"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Agregar Lead"
      >
        <HiOutlineUserPlus className="h-6 w-6" />
        <span className="hidden md:inline ml-2">Agregar Lead</span>
      </Button>
    </div>
  );
}
