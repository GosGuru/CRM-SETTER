"use client";

import { memo, useState } from "react";
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
  HiOutlineClipboard,
  HiOutlineClipboardDocumentCheck,
} from "react-icons/hi2";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [copied, setCopied] = useState(false);

  // Nombre principal: nombre_real + apellido si existen, si no, lead.nombre
  const primaryName = lead.nombre_real
    ? `${lead.nombre_real}${lead.apellido ? " " + lead.apellido : ""}`
    : lead.nombre;

  // Handle de Instagram (nombre) como secundario si ya tenemos nombre_real
  const showHandle = lead.nombre_real && lead.nombre
    ? lead.nombre
    : null;

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

  const handleCopyName = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(primaryName);
    setCopied(true);
    toast.success("Nombre copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  // Completion score for the progress bar
  const datosCompletos = [lead.celular, lead.email, lead.instagram, lead.objetivo, lead.trabajo].filter(Boolean).length;

  return (
    <Card
      onClick={handleCardClick}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 90px" }}
      className={cn(
        "transition-all duration-200 cursor-pointer hover:shadow-md group",
        selected && "ring-2 ring-primary bg-primary/5",
        // Calificación máxima: ambos flags → ring dorado
        lead.cliente_potencial && lead.califica_economicamente
          ? "ring-2 ring-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
          : lead.pinned && "ring-1 ring-amber-300 bg-amber-50/40",
        lead.estado === "pagó" && "border-l-4 border-l-green-500",
        lead.estado === "seguimiento" && "border-l-4 border-l-amber-400",
        lead.estado === "cerrado" && "border-l-4 border-l-red-400",
        lead.estado === "nuevo" && "border-l-4 border-l-blue-400"
      )}
    >
      <CardContent className="py-2.5 px-3">
        <div className="flex items-start gap-2.5">
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

          <div className="flex-1 min-w-0 space-y-1">

            {/* Fila 1: nombre + copy | fecha call (solo si existe) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-sm leading-tight truncate min-w-0">
                {primaryName}
              </span>
              <button
                type="button"
                onClick={handleCopyName}
                title="Copiar nombre"
                className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
                aria-label="Copiar nombre"
              >
                {copied
                  ? <HiOutlineClipboardDocumentCheck className="h-3.5 w-3.5 text-green-500" />
                  : <HiOutlineClipboard className="h-3.5 w-3.5" />
                }
              </button>
              {fechaCall && (
                <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <HiOutlineCalendarDays className="h-3 w-3" />
                  {fechaCall} · {horaCall}
                </span>
              )}
              {!fechaCall && lead.estado === "seguimiento" && (
                <span className="ml-auto shrink-0 text-[10px] text-orange-400/80">
                  Sin agendar
                </span>
              )}
            </div>

            {/* Fila 2: estado + flags + contacto */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge estado={lead.estado} compact />
              {lead.cliente_potencial && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  ⚡ Potencial
                </span>
              )}
              {lead.califica_economicamente && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  💰 Califica
                </span>
              )}
              {(showHandle || lead.celular || lead.instagram) && (
                <span className="text-muted-foreground/30 text-[10px]">·</span>
              )}
              {showHandle && (
                <span className="text-[11px] text-violet-500/80 truncate max-w-27.5">
                  @{showHandle.replace("@", "")}
                </span>
              )}
              {lead.celular && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                  <HiOutlinePhone className="h-3 w-3" />
                  {lead.celular}
                </span>
              )}
              {!showHandle && lead.instagram && (
                <span className="text-[11px] text-violet-500/80 truncate max-w-27.5">
                  @{lead.instagram.replace("@", "")}
                </span>
              )}
              {lead.trabajo && (
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-35">
                  <HiOutlineBriefcase className="h-3 w-3 shrink-0" />
                  {lead.trabajo}
                </span>
              )}
              {lead.closer && (
                <span className="hidden lg:inline text-[11px] text-muted-foreground/60 truncate">
                  {lead.closer.full_name}
                </span>
              )}
            </div>

            {/* Fila 3: última nota (todos los breakpoints) */}
            {lastNote && (
              <div className="flex items-start gap-1.5 bg-muted/50 rounded-md px-2 py-1.5">
                <HiOutlineChatBubbleBottomCenterText className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {lastNote.contenido}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {new Date(lastNote.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                    {" · "}
                    {new Date(lastNote.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            )}

            {/* Fila 4: barra de completitud */}
            {datosCompletos > 0 && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-0.5 w-5 rounded-full transition-colors",
                      i < datosCompletos ? "bg-primary/50" : "bg-muted"
                    )}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground/50 ml-1">{datosCompletos}/5</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.(lead.id, !lead.pinned);
              }}
              className={cn(
                "p-1 rounded-md transition-all",
                lead.pinned
                  ? "text-amber-500 bg-amber-100 hover:bg-amber-200"
                  : "text-muted-foreground/30 hover:text-amber-500 hover:bg-amber-50"
              )}
              title={lead.pinned ? "Desfijar" : "Fijar"}
            >
              <Pin className={cn("h-3.5 w-3.5", lead.pinned && "fill-amber-500")} />
            </button>
            <HiOutlineChevronRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
