"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { Followup } from "@/types/database";
import {
  HiOutlinePhone,
  HiOutlineCheck,
  HiOutlineTrash,
} from "react-icons/hi2";
import { cn } from "@/lib/utils";

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

  return (
    <Card
      className={cn(
        "transition-all duration-200 group",
        fup.completado
          ? "bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500"
          : "border-l-4 border-l-amber-400 hover:shadow-sm"
      )}
    >
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {/* Checkbox */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => onComplete(fup.id, !fup.completado)}
          aria-label={`Marcar FUP como ${fup.completado ? "pendiente" : "completado"} para ${lead?.nombre ?? "lead"}`}
          className={cn(
            "shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            fup.completado
              ? "bg-green-500 border-green-500 text-white"
              : "border-muted-foreground/40 hover:border-green-400 hover:bg-green-50"
          )}
        >
          {fup.completado && <HiOutlineCheck className="h-3.5 w-3.5" />}
        </button>

        {/* Info del lead */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => lead && router.push(`/leads/${lead.id}`)}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <p
              className={cn(
                "font-medium text-sm truncate",
                fup.completado && "text-muted-foreground line-through"
              )}
            >
              {lead?.nombre ?? "—"}
            </p>
            {lead && <StatusBadge estado={lead.estado} />}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {lead?.celular && (
              <span className="flex items-center gap-1">
                <HiOutlinePhone className="h-3 w-3" />
                {lead.celular}
              </span>
            )}
            {lead?.instagram && (
              <span className="truncate">@{lead.instagram.replace("@", "")}</span>
            )}
            {lead?.closer && (
              <span className="hidden sm:inline">
                Closer: {lead.closer.full_name}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          onClick={() => onDelete(fup.id)}
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label={`Eliminar FUP de ${lead?.nombre ?? "lead"}`}
        >
          <HiOutlineTrash className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
});
