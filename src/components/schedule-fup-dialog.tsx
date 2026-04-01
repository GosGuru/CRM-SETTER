"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCreateFollowup } from "@/hooks/use-followups";
import { useCurrentUser } from "@/hooks/use-users";
import { toast } from "sonner";
import { es } from "date-fns/locale";

interface ScheduleFupDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected date in YYYY-MM-DD format (e.g. tomorrow) */
  defaultDate?: string;
}

export function ScheduleFupDialog({
  leadId,
  open,
  onOpenChange,
  defaultDate,
}: ScheduleFupDialogProps) {
  const { data: currentUser } = useCurrentUser();
  const createFollowup = useCreateFollowup();

  const parseDefault = (): Date | undefined => {
    if (!defaultDate) return undefined;
    const d = new Date(defaultDate + "T12:00:00");
    return isNaN(d.getTime()) ? undefined : d;
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(parseDefault);
  const [hora, setHora] = useState("10:00");

  // Reset state whenever dialog opens
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSelectedDate(parseDefault());
      setHora("10:00");
    }
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!selectedDate || !hora) return;
    if (!currentUser) {
      toast.error("No se pudo obtener tu usuario. Recargá la página.");
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const fechaStr = `${year}-${month}-${day}`;

    const label = selectedDate.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    createFollowup.mutate(
      {
        lead_id: leadId,
        user_id: currentUser.id,
        fecha_programada: fechaStr,
        hora_programada: hora,
      },
      {
        onSuccess: () => {
          toast.success(`FUP programado para el ${label} a las ${hora}`);
          onOpenChange(false);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Error desconocido";
          toast.error(`No se pudo programar el FUP: ${msg}`);
        },
      }
    );
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-auto max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Programar FUP</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < today}
            defaultMonth={selectedDate ?? new Date()}
            locale={es}
          />
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="fup-hora" className="w-20 shrink-0 text-sm">
              Hora
            </Label>
            <Input
              id="fup-hora"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={() => onOpenChange(false)}
              disabled={createFollowup.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 cursor-pointer"
              disabled={!selectedDate || !hora || createFollowup.isPending}
              onClick={handleConfirm}
            >
              {createFollowup.isPending ? "Guardando…" : "Confirmar FUP"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
