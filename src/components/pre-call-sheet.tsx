"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types/database";
import { StatusBadge } from "@/components/status-badge";
import {
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineUser,
  HiOutlineHashtag,
  HiOutlineAtSymbol,
  HiOutlineFlag,
  HiOutlineUsers,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
} from "react-icons/hi2";
import { toast } from "sonner";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function buildWhatsAppText(lead: Lead): string {
  const lines: string[] = [];

  if (lead.fecha_call) {
    const d = new Date(lead.fecha_call);
    const dia = d.toLocaleDateString("es-AR", { weekday: "long" }).toUpperCase();
    const fecha = d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
    const hora = d.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
    lines.push(`Fecha: ${dia}, ${fecha} ${hora}`);
  }

  lines.push(`Nombre: ${lead.nombre}`);
  if (lead.edad) lines.push(`Edad: ${lead.edad}`);
  if (lead.trabajo) lines.push(`Trabajo: ${lead.trabajo}`);
  if (lead.closer?.full_name) lines.push(`Closer: @~${lead.closer.full_name}`);
  if (lead.objetivo) lines.push(`Objetivo: ${lead.objetivo}`);
  if (lead.decisor) lines.push(`Decisor: ${lead.decisor}`);
  if (lead.inversion_ok) lines.push(`Inversion: ${lead.inversion_ok}`);
  if (lead.compromiso) lines.push(`Compromiso: ${lead.compromiso}`);
  if (lead.respuestas) lines.push(`Respuestas: ${lead.respuestas}`);
  if (lead.celular) lines.push(`Contacto (Con el +): ${lead.celular}`);
  if (lead.email) lines.push(`Correo: ${lead.email}`);
  if (lead.instagram) lines.push(`Instagram: ${lead.instagram}`);

  return lines.join("\n");
}

export function PreCallSheet({ lead }: { lead: Lead }) {
  const [copied, setCopied] = useState(false);

  const fechaCall = lead.fecha_call
    ? new Date(lead.fecha_call).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : null;

  const horaCall = lead.fecha_call
    ? new Date(lead.fecha_call).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleCopyWhatsApp = async () => {
    const text = buildWhatsAppText(lead);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Ficha de pre-call</CardTitle>
          <StatusBadge estado={lead.estado} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow icon={HiOutlineUser} label="Nombre" value={lead.nombre} />
        <InfoRow icon={HiOutlineHashtag} label="Edad" value={lead.edad} />
        <InfoRow icon={HiOutlineBriefcase} label="Trabajo" value={lead.trabajo} />
        <InfoRow icon={HiOutlinePhone} label="Celular" value={lead.celular} />
        <InfoRow icon={HiOutlineEnvelope} label="Email" value={lead.email} />
        <InfoRow icon={HiOutlineAtSymbol} label="Instagram" value={lead.instagram} />
        {fechaCall && (
          <InfoRow icon={HiOutlineCalendarDays} label="Fecha call" value={`${fechaCall} · ${horaCall}`} />
        )}
        {lead.closer && (
          <InfoRow icon={HiOutlineUser} label="Closer" value={lead.closer.full_name} />
        )}

        <Separator />

        <InfoRow icon={HiOutlineFlag} label="Objetivo" value={lead.objetivo} />
        <InfoRow icon={HiOutlineUsers} label="Decisor" value={lead.decisor} />
        <InfoRow icon={HiOutlineBanknotes} label="Inversión" value={lead.inversion_ok} />
        <InfoRow icon={HiOutlineCheckCircle} label="Compromiso" value={lead.compromiso} />

        {lead.respuestas && (
          <>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Respuestas / Notas:</p>
              <p className="text-sm whitespace-pre-wrap">{lead.respuestas}</p>
            </div>
          </>
        )}

        <Separator />

        <Button
          onClick={handleCopyWhatsApp}
          className="w-full cursor-pointer"
          variant={copied ? "outline" : "default"}
        >
          {copied ? (
            <>
              <HiOutlineCheck className="mr-2 h-4 w-4" />
              Copiado
            </>
          ) : (
            <>
              <HiOutlineClipboardDocument className="mr-2 h-4 w-4" />
              Copiar WhatsApp
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
