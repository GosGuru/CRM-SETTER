"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateLeadPayment } from "@/hooks/use-leads";
import { useSettings } from "@/hooks/use-settings";
import type { Lead, PlanPago } from "@/types/database";
import { toast } from "sonner";
import {
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from "react-icons/hi2";

interface PaymentSectionProps {
  lead: Lead;
}

const PLAN_LABELS: Record<PlanPago, string> = {
  completo: "Pago completo",
  "2_partes": "2 partes",
  "3_partes": "3 partes",
};

export function PaymentSection({ lead }: PaymentSectionProps) {
  const { data: settings } = useSettings();
  const updatePayment = useUpdateLeadPayment();

  const [pagoProg, setPagoProg] = useState(lead.pago_programa);
  const [planPago, setPlanPago] = useState<PlanPago | "">(lead.plan_pago ?? "");
  const [monto, setMonto] = useState<string>(
    lead.monto_programa != null ? String(lead.monto_programa) : ""
  );
  const [fechaPago, setFechaPago] = useState<string>(
    lead.fecha_pago ? lead.fecha_pago.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  // When plan changes and monto is empty, auto-fill with program price
  const handlePlanChange = (val: PlanPago) => {
    setPlanPago(val);
    if (!monto && settings) {
      if (val === "completo") {
        setMonto(String(settings.program_price));
      }
    }
  };

  const commissionRate = settings?.commission_rate ?? 0.08;
  const montoNum = parseFloat(monto) || 0;
  const commission = montoNum * commissionRate;

  const handleSave = () => {
    if (pagoProg && (!planPago || montoNum <= 0)) {
      toast.error("Ingresá el plan y el monto del pago");
      return;
    }
    updatePayment.mutate(
      {
        id: lead.id,
        pago_programa: pagoProg,
        plan_pago: pagoProg && planPago ? (planPago as PlanPago) : null,
        monto_programa: pagoProg && montoNum > 0 ? montoNum : null,
        fecha_pago: pagoProg && fechaPago ? new Date(fechaPago + "T12:00:00").toISOString() : null,
      },
      {
        onSuccess: () => toast.success("Pago registrado"),
        onError: (err) => toast.error(`Error: ${err instanceof Error ? err.message : "desconocido"}`),
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <HiOutlineBanknotes className="h-5 w-5 text-green-600" />
          Pago del programa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle pagó programa */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPagoProg((prev) => !prev)}
            className="flex items-center gap-2 cursor-pointer"
            aria-pressed={pagoProg}
          >
            {pagoProg ? (
              <HiOutlineCheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <HiOutlineXCircle className="h-6 w-6 text-muted-foreground" />
            )}
            <span className={`text-sm font-medium ${pagoProg ? "text-green-700" : "text-muted-foreground"}`}>
              {pagoProg ? "Pagó el programa" : "No pagó el programa"}
            </span>
          </button>
        </div>

        {pagoProg && (
          <div className="space-y-3 pt-1">
            {/* Plan de pago */}
            <div className="space-y-1.5">
              <Label htmlFor={`plan-pago-${lead.id}`}>Plan de pago</Label>
              <Select
                value={planPago}
                onValueChange={(val) => handlePlanChange(val as PlanPago)}
              >
                <SelectTrigger id={`plan-pago-${lead.id}`} className="cursor-pointer">
                  <SelectValue placeholder="Seleccioná un plan" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PLAN_LABELS) as PlanPago[]).map((p) => (
                    <SelectItem key={p} value={p} className="cursor-pointer">
                      {PLAN_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monto */}
            <div className="space-y-1.5">
              <Label htmlFor={`monto-${lead.id}`}>Monto pagado ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id={`monto-${lead.id}`}
                  type="number"
                  min={0}
                  step={0.01}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="pl-7"
                  placeholder={String(settings?.program_price ?? 697)}
                />
              </div>
              {montoNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tu comisión ({Math.round(commissionRate * 100)}%):{" "}
                  <strong className="text-green-700">${commission.toFixed(2)}</strong>
                </p>
              )}
            </div>

            {/* Fecha de pago */}
            <div className="space-y-1.5">
              <Label htmlFor={`fecha-pago-${lead.id}`}>Fecha del pago</Label>
              <Input
                id={`fecha-pago-${lead.id}`}
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={updatePayment.isPending}
          className="w-full cursor-pointer"
          variant={pagoProg ? "default" : "outline"}
        >
          {updatePayment.isPending ? "Guardando…" : "Guardar pago"}
        </Button>
      </CardContent>
    </Card>
  );
}
