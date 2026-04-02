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
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineUser,
  HiOutlineBriefcase,
  HiOutlineUserGroup,
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
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    nombre_real: lead.nombre_real ?? "",
    apellido: lead.apellido ?? "",
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
      ...(form.nombre_real || form.apellido ? [`Nombre real: ${[form.nombre_real, form.apellido].filter(Boolean).join(" ") || "—"}`] : []),
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
        nombre_real: form.nombre_real.trim() || null,
        apellido: form.apellido.trim() || null,
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
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <HiOutlineCalendarDays className="h-4 w-4 text-primary" />
          Completar datos de agenda
        </CardTitle>
        <CardDescription className="text-xs">
          Al guardar, el lead pasa automáticamente a &quot;Seguimiento&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Fecha *</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer h-9 text-sm"
                    />
                  }
                >
                  <HiOutlineCalendarDays className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {form.fecha_call
                      ? form.fecha_call.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                      : "Elegir"}
                  </span>
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
            <div className="space-y-1.5">
              <Label htmlFor="hora_call" className="text-xs font-medium">Hora *</Label>
              <div className="relative">
                <HiOutlineClock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="hora_call"
                  name="hora_call"
                  type="time"
                  value={form.hora_call}
                  onChange={handleChange}
                  className="pl-9 h-9 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Nombre real + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombre_real" className="text-xs font-medium flex items-center gap-1">
                <HiOutlineUser className="h-3 w-3" /> Nombre
              </Label>
              <Input id="nombre_real" name="nombre_real" value={form.nombre_real} onChange={handleChange} placeholder="Máximo" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido" className="text-xs font-medium">Apellido</Label>
              <Input id="apellido" name="apellido" value={form.apellido} onChange={handleChange} placeholder="Pereyra" className="h-9 text-sm" />
            </div>
          </div>

          {/* Edad + Trabajo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edad" className="text-xs font-medium">Edad</Label>
              <Input id="edad" name="edad" value={form.edad} onChange={handleChange} placeholder="40" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trabajo" className="text-xs font-medium flex items-center gap-1">
                <HiOutlineBriefcase className="h-3 w-3" /> Trabajo
              </Label>
              <Input id="trabajo" name="trabajo" value={form.trabajo} onChange={handleChange} placeholder="CEO de..." className="h-9 text-sm" />
            </div>
          </div>

          {/* Closer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <HiOutlineUserGroup className="h-3 w-3" /> Closer
            </Label>
            <Select
              value={form.closer_id}
              onValueChange={(v) => setForm((prev) => ({ ...prev, closer_id: v ?? "" }))}
            >
              <SelectTrigger className="w-full cursor-pointer h-9 text-sm">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="celular" className="text-xs font-medium flex items-center gap-1">
                <HiOutlinePhone className="h-3 w-3" /> Contacto
              </Label>
              <Input id="celular" name="celular" value={form.celular} onChange={handleChange} placeholder="+54 11..." className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1">
                <HiOutlineEnvelope className="h-3 w-3" /> Correo
              </Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="mail@..." className="h-9 text-sm" />
            </div>
          </div>

          {/* Respuestas */}
          <div className="space-y-1.5">
            <Label htmlFor="respuestas" className="text-xs font-medium">Respuestas / Notas</Label>
            <Textarea
              id="respuestas"
              name="respuestas"
              value={form.respuestas}
              onChange={handleChange}
              placeholder="Lo que comentó el lead sobre su situación..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Preview colapsable */}
          <div className="rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                {showPreview ? <HiOutlineEyeSlash className="h-3.5 w-3.5" /> : <HiOutlineEye className="h-3.5 w-3.5" />}
                {showPreview ? "Ocultar plantilla" : "Ver plantilla"}
              </span>
              <span className="text-[10px] text-muted-foreground/50">pre-visualización</span>
            </button>
            {showPreview && (
              <div className="px-3 py-2.5 bg-muted/40 text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground border-t">
                {buildPlantilla()}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer h-10"
              onClick={handleCopy}
            >
              {copied
                ? <HiOutlineCheck className="mr-1.5 h-4 w-4 text-green-600 shrink-0" />
                : <HiOutlineClipboardDocument className="mr-1.5 h-4 w-4 shrink-0" />
              }
              {copied ? "¡Copiado!" : "Copiar"}
            </Button>
            <Button
              type="submit"
              className="cursor-pointer h-10"
              disabled={updateLead.isPending}
            >
              <HiOutlineCalendarDays className="mr-1.5 h-4 w-4 shrink-0" />
              {updateLead.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
