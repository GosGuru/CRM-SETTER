import { Badge } from "@/components/ui/badge";
import type { LeadEstado } from "@/types/database";
import { cn } from "@/lib/utils";

const estadoConfig: Record<
  LeadEstado,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  nuevo: { label: "Nuevo", variant: "default" },
  seguimiento: { label: "Seguimiento", variant: "secondary" },
  cerrado: { label: "Cerrado", variant: "destructive" },
  pagó: { label: "Pagó", variant: "outline" },
};

const estadoColors: Record<LeadEstado, string> = {
  nuevo: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  seguimiento: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  cerrado: "bg-red-100 text-red-800 hover:bg-red-100",
  pagó: "bg-green-100 text-green-800 hover:bg-green-100",
};

const estadoDotColors: Record<LeadEstado, string> = {
  nuevo: "bg-blue-500",
  seguimiento: "bg-amber-500",
  cerrado: "bg-red-500",
  pagó: "bg-green-500",
};

export function StatusBadge({
  estado,
  compact = false,
}: {
  estado: LeadEstado;
  compact?: boolean;
}) {
  const config = estadoConfig[estado];

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
          estadoColors[estado]
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", estadoDotColors[estado])} />
        {config.label}
      </span>
    );
  }

  return (
    <Badge variant={config.variant} className={estadoColors[estado]}>
      {config.label}
    </Badge>
  );
}
