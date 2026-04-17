import { Badge } from "@/components/ui/badge";
import type { LeadEstado } from "@/types/database";
import { cn } from "@/lib/utils";

const estadoConfig: Record<
  LeadEstado,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  nuevo: { label: "Nuevo", variant: "default" },
  agendó: { label: "Agendado", variant: "secondary" },
  cerrado: { label: "Cerrado", variant: "destructive" },
  pagó: { label: "Pagó", variant: "outline" },
};

const estadoColors: Record<LeadEstado, string> = {
  nuevo: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  agendó: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  cerrado: "bg-red-100 text-red-800 hover:bg-red-100",
  pagó: "bg-green-100 text-green-800 hover:bg-green-100",
};

const estadoDotColors: Record<LeadEstado, string> = {
  nuevo: "bg-blue-500",
  agendó: "bg-amber-500",
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
  // Normalize legacy "seguimiento" value (leads not yet migrated in DB)
  const key: LeadEstado = (estado as string) === "seguimiento" ? "agendó" : estado;
  const config = estadoConfig[key] ?? { label: key, variant: "secondary" as const };
  const colorClass = estadoColors[key] ?? "bg-gray-100 text-gray-800 hover:bg-gray-100";
  const dotClass = estadoDotColors[key] ?? "bg-gray-500";

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium leading-none",
          colorClass
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
        {config.label}
      </span>
    );
  }

  return (
    <Badge variant={config.variant} className={colorClass}>
      {config.label}
    </Badge>
  );
}
