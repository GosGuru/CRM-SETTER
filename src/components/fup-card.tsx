"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { Followup } from "@/types/database";
import {
  HiOutlinePhone,
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineClipboard,
  HiOutlineClipboardDocumentCheck,
  HiOutlineChatBubbleLeftEllipsis,
} from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FupCardProps {
  fup: Followup;
  onComplete: (id: string, completado: boolean) => void;
  onDelete: (id: string) => void;
  isPending?: boolean;
}

export const FupCard = memo(function FupCard({
  fup,
  onComplete,
  onDelete,
  isPending,
}: FupCardProps) {
  const router = useRouter();
  const lead = fup.lead;
  const [copied, setCopied] = useState(false);

  const displayName = lead?.nombre_real
    ? `${lead.nombre_real}${lead.apellido ? " " + lead.apellido : ""}`
    : (lead?.nombre ?? "—");

  // Última nota primero, si no la última interacción de cualquier tipo
  const sortedInteractions = lead?.interactions
    ?.slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const lastNote =
    sortedInteractions?.find((i) => i.tipo === "nota") ??
    sortedInteractions?.[0];

  const handleCopyName = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!displayName || displayName === "—") return;
    navigator.clipboard.writeText(displayName);
    setCopied(true);
    toast.success("Nombre copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 group",
        fup.completado
          ? "bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500"
          : "border-l-4 border-l-amber-400 hover:shadow-sm"
      )}
    >
      <CardContent className="py-2.5 px-3">
        <div className="flex items-start gap-2.5">
          {/* Checkbox */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => onComplete(fup.id, !fup.completado)}
            aria-label={`Marcar FUP como ${fup.completado ? "pendiente" : "completado"} para ${lead?.nombre ?? "lead"}`}
            className={cn(
              "mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              fup.completado
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground/40 hover:border-green-400 hover:bg-green-50"
            )}
          >
            {fup.completado && <HiOutlineCheck className="h-3 w-3" />}
          </button>

          {/* Info principal */}
          <div className="flex-1 min-w-0 space-y-1">

            {/* Fila 1: nombre + copy + estado */}
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  "font-semibold text-sm leading-tight cursor-pointer hover:underline truncate",
                  fup.completado && "text-muted-foreground line-through"
                )}
                onClick={() => lead && router.push(`/leads/${lead.id}`)}
              >
                {displayName}
              </p>
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
              {lead && (
                <span className="ml-auto shrink-0">
                  <StatusBadge estado={lead.estado} compact />
                </span>
              )}
            </div>

            {/* Fila 2: teléfono + instagram + closer */}
            {(lead?.celular || lead?.instagram || lead?.closer) && (
              <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                {lead?.celular && (
                  <span className="flex items-center gap-1">
                    <HiOutlinePhone className="h-3 w-3 shrink-0" />
                    {lead.celular}
                  </span>
                )}
                {lead?.instagram && (
                  <span className="text-violet-500 truncate">
                    @{lead.instagram.replace("@", "")}
                  </span>
                )}
                {lead?.closer && (
                  <span className="hidden sm:inline truncate text-muted-foreground/60">
                    {lead.closer.full_name}
                  </span>
                )}
              </div>
            )}

            {/* Fila 3: última nota/interacción */}
            {lastNote && (
              <div className="flex items-start gap-1 bg-muted/50 rounded-md px-2 py-1.5">
                <HiOutlineChatBubbleLeftEllipsis className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {lastNote.contenido}
                </p>
              </div>
            )}
          </div>

          {/* Eliminar */}
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            onClick={() => onDelete(fup.id)}
            className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer mt-0.5"
            aria-label={`Eliminar FUP de ${lead?.nombre ?? "lead"}`}
          >
            <HiOutlineTrash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
