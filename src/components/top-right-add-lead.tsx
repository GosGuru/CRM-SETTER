"use client";

import { usePathname } from "next/navigation";
import { HiOutlineUserPlus } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";

export default function TopRightAddLead() {
  const pathname = usePathname();
  const setQuickAddOpen = useUIStore((s) => s.setQuickAddOpen);

  // Hide on /leads and its subroutes
  if (pathname?.startsWith("/leads")) return null;

  return (
    <div className="fixed top-3 right-3 z-50">
      <Button
        variant="default"
        size="icon"
        className="border border-sidebar-border/80 bg-sidebar/95 text-sidebar-foreground shadow-sm hover:scale-[.99] transition-transform"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Agregar Lead"
      >
        <HiOutlineUserPlus className="h-5 w-5" />
      </Button>
    </div>
  );
}
