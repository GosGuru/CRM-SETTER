import { Badge } from "@/components/ui/badge";
import type { LeadEstado } from "@/types/database";
import { cn } from "@/lib/utils";

const estadoConfig: Record<
  LeadEstado,
  { label: string }
> = {
  nuevo: { label: "Nuevo" },
  agendó: { label: "Agendado" },
  cerrado: { label: "Cerrado" },
  pagó: { label: "Pagó" },
};

const estadoColors: Record<LeadEstado, string> = {
  nuevo: "border-transparent bg-status-nuevo-bg text-status-nuevo-text hover:bg-status-nuevo-bg",
  agendó: "border-transparent bg-status-agendo-bg text-status-agendo-text hover:bg-status-agendo-bg",
  cerrado: "border-transparent bg-status-cerrado-bg text-status-cerrado-text hover:bg-status-cerrado-bg",
  pagó: "border-transparent bg-status-pago-bg text-status-pago-text hover:bg-status-pago-bg",
};

const estadoDotColors: Record<LeadEstado, string> = {
  nuevo: "bg-status-nuevo-dot",
  agendó: "bg-status-agendo-dot",
  cerrado: "bg-status-cerrado-dot",
  pagó: "bg-status-pago-dot",
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
  const config = estadoConfig[key] ?? { label: key };
  const colorClass = estadoColors[key] ?? "border-transparent bg-muted text-muted-foreground hover:bg-muted";
  const dotClass = estadoDotColors[key] ?? "bg-muted-foreground";

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
    <Badge variant="outline" className={colorClass}>
      {config.label}
    </Badge>
  );
}
