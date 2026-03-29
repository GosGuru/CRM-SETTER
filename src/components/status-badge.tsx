import { Badge } from "@/components/ui/badge";
import type { LeadEstado } from "@/types/database";

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

export function StatusBadge({ estado }: { estado: LeadEstado }) {
  const config = estadoConfig[estado];

  return (
    <Badge variant={config.variant} className={estadoColors[estado]}>
      {config.label}
    </Badge>
  );
}
