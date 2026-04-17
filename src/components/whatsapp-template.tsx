"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplates, DEFAULT_TEMPLATE_CONFIRMACION } from "@/hooks/use-templates";
import type { Lead } from "@/types/database";
import { HiOutlineClipboardDocument, HiOutlineCheck } from "react-icons/hi2";
import { useState } from "react";
import { toast } from "sonner";

function applyTemplate(template: string, lead: Lead): string {
  const fechaCall = lead.fecha_call
    ? new Date(lead.fecha_call).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "[fecha]";

  const horaCall = lead.fecha_call
    ? new Date(lead.fecha_call).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "[hora]";

  const closerName = lead.closer?.full_name ?? "[closer]";

  return template
    .replace(/{nombre}/g, lead.nombre)
    .replace(/{fecha}/g, fechaCall)
    .replace(/{hora}/g, horaCall)
    .replace(/{closer}/g, closerName);
}

export function WhatsAppTemplate({ lead }: { lead: Lead }) {
  const [copied, setCopied] = useState(false);
  const { data: templates } = useTemplates();
  const [selectedId, setSelectedId] = useState<string>("default");

  const selectedTemplate = templates?.find((t) => t.id === selectedId);
  const templateText = selectedTemplate?.contenido ?? DEFAULT_TEMPLATE_CONFIRMACION;
  const message = applyTemplate(templateText, lead);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success("Plantilla copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">Plantilla WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates && templates.length > 0 && (
          <Select value={selectedId} onValueChange={(v) => v && setSelectedId(v)}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Plantilla por defecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default" className="cursor-pointer">
                Plantilla por defecto
              </SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="rounded-md bg-muted p-3 text-base whitespace-pre-wrap font-mono">
          {message}
        </div>
        <Button onClick={handleCopy} className="w-full cursor-pointer" variant={copied ? "outline" : "default"}>
          {copied ? (
            <>
              <HiOutlineCheck className="mr-2 h-4 w-4" />
              Copiado ✓
            </>
          ) : (
            <>
              <HiOutlineClipboardDocument className="mr-2 h-4 w-4" />
              Copiar plantilla para WhatsApp
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
