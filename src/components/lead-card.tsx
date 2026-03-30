"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { Lead } from "@/types/database";
import {
  HiOutlinePhone,
  HiOutlineCalendarDays,
  HiOutlineChevronRight,
  HiOutlineCheck,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineBriefcase,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  lastNote?: { contenido: string; tipo: string; created_at: string };
}

export const LeadCard = memo(function LeadCardInner({ lead, selectable, selected, onToggle, onTogglePin, lastNote }: LeadCardProps) {
  const router = useRouter();

  const fechaCall = lead.fecha_call
    ? new Date(lead.fecha_call).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
      })
    : null;

  const horaCall = lead.fecha_call
    ? new Date(lead.fecha_call).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleCardClick = () => {
    if (selectable) {
      onToggle?.(lead.id);
    } else {
      router.push(`/leads/${lead.id}`);
    }
  };

  // Cuántos datos tiene completados (para indicador de completitud)
  const datosCompletos = [lead.celular, lead.email, lead.instagram, lead.objetivo, lead.trabajo].filter(Boolean).length;

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "transition-all duration-200 cursor-pointer hover:shadow-md group",
        selected && "ring-2 ring-primary bg-primary/5",
        lead.pinned && "ring-1 ring-amber-300 bg-amber-50/40",
        lead.estado === "pagó" && "border-l-4 border-l-green-500",
        lead.estado === "seguimiento" && "border-l-4 border-l-amber-400",
        lead.estado === "cerrado" && "border-l-4 border-l-red-400",
        lead.estado === "nuevo" && "border-l-4 border-l-blue-400"
      )}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          {selectable && (
            <div
              className={cn(
                "shrink-0 mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                selected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/40"
              )}
            >
              {selected && <HiOutlineCheck className="h-3 w-3" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Fila 1: Nombre + Estado + Agenda */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <p className="font-semibold text-sm truncate">{lead.nombre}</p>
              <StatusBadge estado={lead.estado} />
              {fechaCall ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <HiOutlineCalendarDays className="h-3 w-3" />
                  {fechaCall} · {horaCall}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                  Sin agendar
                </span>
              )}
            </div>

            {/* Fila 2: Detalles de contacto + objetivo */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {lead.celular && (
                <span className="flex items-center gap-1">
                  <HiOutlinePhone className="h-3 w-3 shrink-0" />
                  {lead.celular}
                </span>
              )}
              {lead.instagram && (
                <span className="truncate max-w-[120px]">
                  @{lead.instagram.replace("@", "")}
                </span>
              )}
              {lead.trabajo && (
                <span className="hidden sm:flex items-center gap-1 truncate max-w-[140px]">
                  <HiOutlineBriefcase className="h-3 w-3 shrink-0" />
                  {lead.trabajo}
                </span>
              )}
              {lead.objetivo && (
                <span className="hidden md:inline truncate max-w-[160px] text-primary/70 font-medium">
                  🎯 {lead.objetivo}
                </span>
              )}
              {lead.closer && (
                <span className="hidden lg:flex items-center gap-1">
                  <HiOutlineUserCircle className="h-3 w-3 shrink-0" />
                  {lead.closer.full_name}
                </span>
              )}
            </div>

            {/* Fila 3: Notas/respuestas (si existen) */}
            {lead.respuestas && (
              <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground/80 bg-muted/50 rounded-md px-2 py-1.5">
                <HiOutlineChatBubbleBottomCenterText className="h-3 w-3 shrink-0 mt-0.5" />
                <p className="line-clamp-2 leading-relaxed">{lead.respuestas}</p>
              </div>
            )}

            {/* Fila 4: Indicadores rápidos (dots) */}
            {datosCompletos > 0 && (
              <div className="mt-1.5 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 w-4 rounded-full transition-colors",
                      i < datosCompletos ? "bg-primary/60" : "bg-muted"
                    )}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">{datosCompletos}/5 datos</span>
              </div>
            )}
          </div>

          {/* Última nota — visible en desktop */}
          {lastNote && (
            <div className="hidden lg:flex items-start gap-2 shrink-0 max-w-[280px] xl:max-w-[360px] border-l pl-3 ml-1">
              <HiOutlineChatBubbleBottomCenterText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{lastNote.contenido}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {new Date(lastNote.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}{" · "}
                  {new Date(lastNote.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )}

          {/* Pin button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(lead.id, !lead.pinned);
            }}
            className={cn(
              "shrink-0 mt-0.5 p-1 rounded-md transition-all",
              lead.pinned
                ? "text-amber-500 bg-amber-100 hover:bg-amber-200"
                : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-50"
            )}
            title={lead.pinned ? "Desfijar" : "Fijar"}
          >
            <Pin className={cn("h-3.5 w-3.5", lead.pinned && "fill-amber-500")} />
          </button>

          <HiOutlineChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
});
