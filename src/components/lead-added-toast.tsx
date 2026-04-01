"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  HiOutlineUserCircle,
  HiOutlineCalendarDays,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineEye,
  HiOutlineXMark,
} from "react-icons/hi2";

interface LeadAddedToastProps {
  id: string | number;
  nombre: string;
  fecha: string;
  cantidad?: number;
  onVerLead?: () => void;
  onAgregarNota?: () => void;
}

function LeadAddedToastContent({
  id,
  nombre,
  fecha,
  cantidad,
  onVerLead,
  onAgregarNota,
}: LeadAddedToastProps) {
  const fechaLabel = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="w-full sm:w-[420px] mx-auto flex flex-col rounded-xl border bg-background shadow-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <HiOutlineUserCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {cantidad && cantidad > 1
                ? `${cantidad} leads cargados`
                : "Lead cargado"}
            </p>
            <p className="text-sm text-foreground/90 truncate">{nombre}</p>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <HiOutlineCalendarDays className="h-3 w-3" />
              <span className="capitalize">{fechaLabel}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
        >
          <HiOutlineXMark className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
        {onVerLead && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs cursor-pointer"
            onClick={() => {
              toast.dismiss(id);
              onVerLead();
            }}
          >
            <HiOutlineEye className="mr-1.5 h-3.5 w-3.5" />
            Ver lead
          </Button>
        )}
        {onAgregarNota && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs cursor-pointer"
            onClick={() => {
              toast.dismiss(id);
              onAgregarNota();
            }}
          >
            <HiOutlineChatBubbleBottomCenterText className="mr-1.5 h-3.5 w-3.5" />
            Agregar nota
          </Button>
        )}
      </div>
    </div>
  );
}

export function showLeadAddedToast(opts: {
  nombre: string;
  fecha: string;
  cantidad?: number;
  onVerLead?: () => void;
  onAgregarNota?: () => void;
}) {
  toast.custom(
    (id) => (
      <LeadAddedToastContent
        id={id}
        nombre={opts.nombre}
        fecha={opts.fecha}
        cantidad={opts.cantidad}
        onVerLead={opts.onVerLead}
        onAgregarNota={opts.onAgregarNota}
      />
    ),
    {
      duration: 6000,
    }
  );
}
