"use client";

import { useState } from "react";
import { useUpdateLead } from "@/hooks/use-leads";
import { useClosers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
} from "react-icons/hi2";
import type { Lead } from "@/types/database";

function formatFechaCall(date: Date, hora: string): string {
  const [hh] = hora.split(":").map(Number);
  const dias = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
  const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  const dia = dias[date.getDay()];
  const num = date.getDate();
  const mes = meses[date.getMonth()];
  const ampm = hh >= 12 ? "PM" : "AM";
  const hora12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${dia}, ${num} de ${mes}⋅ ${hora12} ${ampm}`;
}

export function CalendlyDataForm({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead();
  const { data: closers } = useClosers();
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    celular: lead.celular ?? "",
    email: lead.email ?? "",
    edad: lead.edad ? String(lead.edad) : "",
    trabajo: lead.trabajo ?? "",
    fecha_call: lead.fecha_call ? new Date(lead.fecha_call) : (null as Date | null),
    hora_call: lead.fecha_call
      ? `${String(new Date(lead.fecha_call).getHours()).padStart(2, "0")}:${String(new Date(lead.fecha_call).getMinutes()).padStart(2, "0")}`
      : "10:00",
    closer_id: lead.closer_id ?? "",
    respuestas: lead.respuestas ?? "",
  });
  const [calOpen, setCalOpen] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const buildPlantilla = () => {
    const closerName = closers?.find((c) => c.id === form.closer_id)?.full_name ?? "";
    const fechaStr = form.fecha_call
      ? formatFechaCall(form.fecha_call, form.hora_call)
      : "Sin agendar";

    const lines = [
      fechaStr,
      `Nombre: ${lead.nombre}`,
      `Edad: ${form.edad || "—"}`,
      `Trabajo: ${form.trabajo || "—"}`,
      `Closer: ${closerName || "—"}`,
      `Respuestas: ${form.respuestas || "—"}`,
      `Contacto (Con el +): ${form.celular || "—"}`,
      `Correo: ${form.email || "—"}`,
    ];
    return lines.join("\n");
  };

  const handleCopy = async () => {
    const text = buildPlantilla();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Plantilla copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fecha_call) {
      toast.error("La fecha y hora del call es obligatoria");
      return;
    }

    const [hh, mm] = form.hora_call.split(":").map(Number);
    const fechaFinal = new Date(form.fecha_call);
    fechaFinal.setHours(hh, mm, 0, 0);

    updateLead.mutate(
      {
        id: lead.id,
        celular: form.celular.trim() || null,
        email: form.email.trim() || null,
        edad: form.edad ? Number(form.edad) : null,
        trabajo: form.trabajo.trim() || null,
        fecha_call: fechaFinal.toISOString(),
        fecha_call_set_at: new Date().toISOString(),
        closer_id: form.closer_id || null,
        respuestas: form.respuestas.trim() || null,
        estado: "seguimiento",
      },
      {
        onSuccess: () => {
          toast.success("Datos guardados — lead pasado a seguimiento");
        },
        onError: () => {
          toast.error("Error al guardar los datos");
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HiOutlineCalendarDays className="h-5 w-5" />
          Completar datos de agenda
        </CardTitle>
        <CardDescription>
          Cargá los datos del lead. Al guardar, pasa a &quot;seguimiento&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fecha + Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha del call *</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer"
                    />
                  }
                >
                  <HiOutlineCalendarDays className="mr-2 h-4 w-4" />
                  {form.fecha_call
                    ? form.fecha_call.toLocaleDateString("es-AR", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                      })
                    : "Seleccionar fecha"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.fecha_call ?? undefined}
                    onSelect={(day) => {
                      if (day) {
                        setForm((prev) => ({ ...prev, fecha_call: day }));
                        setCalOpen(false);
                      }
                    }}
                    defaultMonth={form.fecha_call ?? new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_call">Hora del call *</Label>
              <div className="relative">
                <HiOutlineClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hora_call"
                  name="hora_call"
                  type="time"
                  value={form.hora_call}
                  onChange={handleChange}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>

          {/* Edad + Trabajo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edad">Edad</Label>
              <Input
                id="edad"
                name="edad"
                value={form.edad}
                onChange={handleChange}
                placeholder="Ej: 40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trabajo">Trabajo</Label>
              <Input
                id="trabajo"
                name="trabajo"
                value={form.trabajo}
                onChange={handleChange}
                placeholder="CEO de empresa de logística..."
              />
            </div>
          </div>

          {/* Closer */}
          <div className="space-y-2">
            <Label>Closer</Label>
            <Select
              value={form.closer_id}
              onValueChange={(v) => setForm((prev) => ({ ...prev, closer_id: v ?? "" }))}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Asignar closer" />
              </SelectTrigger>
              <SelectContent>
                {closers?.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contacto + Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="celular">Contacto (con el +)</Label>
              <Input
                id="celular"
                name="celular"
                value={form.celular}
                onChange={handleChange}
                placeholder="+54 11 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="val@ejemplo.com"
              />
            </div>
          </div>

          {/* Respuestas */}
          <div className="space-y-2">
            <Label htmlFor="respuestas">Respuestas</Label>
            <Textarea
              id="respuestas"
              name="respuestas"
              value={form.respuestas}
              onChange={handleChange}
              placeholder="Lo que comentó el lead sobre su situación..."
              rows={4}
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted/60 p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground border">
            {buildPlantilla()}
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={handleCopy}
            >
              {copied ? (
                <HiOutlineCheck className="mr-2 h-4 w-4 text-green-600" />
              ) : (
                <HiOutlineClipboardDocument className="mr-2 h-4 w-4" />
              )}
              {copied ? "¡Copiado!" : "Copiar plantilla"}
            </Button>
            <Button
              type="submit"
              className="flex-1 cursor-pointer"
              disabled={updateLead.isPending}
            >
              <HiOutlineCalendarDays className="mr-2 h-4 w-4" />
              {updateLead.isPending ? "Guardando..." : "Guardar y pasar a seguimiento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
