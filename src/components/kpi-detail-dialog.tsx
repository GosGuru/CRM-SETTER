"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { useKPIDetail } from "@/hooks/use-stats";
import type { KPIDetailType } from "@/types/database";
import {
  HiOutlineUserPlus,
  HiOutlinePhoneArrowUpRight,
  HiOutlinePaperAirplane,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineBanknotes,
  HiOutlineArrowTopRightOnSquare,
} from "react-icons/hi2";

const TIPO_CONFIG: Record<
  KPIDetailType,
  { label: string; icon: React.ElementType; color: string }
> = {
  inbound: { label: "Inbound Nuevo", icon: HiOutlineUserPlus, color: "text-blue-600" },
  fups: { label: "FUPs hechos", icon: HiOutlinePhoneArrowUpRight, color: "text-indigo-600" },
  cal_enviados: { label: "Calendarios Enviados", icon: HiOutlinePaperAirplane, color: "text-cyan-600" },
  calls_agendadas: { label: "Calls Agendadas", icon: HiOutlineCalendarDays, color: "text-amber-600" },
  tasa: { label: "Tasa de Agenda", icon: HiOutlineChartBarSquare, color: "text-emerald-600" },
  cash: { label: "Cash Collected", icon: HiOutlineBanknotes, color: "text-green-600" },
};

interface KPIDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: KPIDetailType | null;
  fecha: string;
  fechaLabel?: string;
}

export function KPIDetailDialog({
  open,
  onOpenChange,
  tipo,
  fecha,
  fechaLabel,
}: KPIDetailDialogProps) {
  const router = useRouter();
  const { data, isLoading } = useKPIDetail(fecha, open ? tipo : null);

  const config = tipo ? TIPO_CONFIG[tipo] : null;
  const Icon = config?.icon ?? HiOutlineUserPlus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config && (
              <Icon className={`h-5 w-5 ${config.color}`} />
            )}
            {config?.label}
            {fechaLabel && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                — {fechaLabel}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {data?.meta && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-muted text-sm font-medium text-center">
                  {data.meta}
                </div>
              )}
              {data?.items && data.items.length > 0 ? (
                <ul className="space-y-1">
                  {data.items.map((item) => (
                    <li key={`${item.id}-${item.subtitle}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(`/leads/${item.id}`);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer text-left group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.nombre}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.estado && (
                            <StatusBadge estado={item.estado as import("@/types/database").LeadEstado} />
                          )}
                          {item.amount !== undefined && (
                            <span className="text-sm font-semibold text-green-600">
                              ${item.amount.toFixed(2)}
                            </span>
                          )}
                          <HiOutlineArrowTopRightOnSquare className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !data?.meta && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Sin registros para este día
                  </p>
                )
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
