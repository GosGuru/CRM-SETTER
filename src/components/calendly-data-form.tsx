"use client";

import { useState } from "react";
import { useUpdateLead } from "@/hooks/use-leads";
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
import { HiOutlineCalendarDays, HiOutlineClock } from "react-icons/hi2";
import type { Lead } from "@/types/database";

const OBJETIVOS = [
  "Eliminar ansiedad",
  "Eliminar estrés",
  "Recuperar mi autoestima",
  "Dejar de sentirme agotada/o aunque descanse",
  "Entender qué me drena y tener un sistema real para gestionarlo",
  "Rendir al máximo sin quemarme en el proceso",
] as const;

const DECISOR_OPTIONS = [
  "Sí, necesito consultarlo con mi pareja.",
  "Sí, necesito consultarlo con alguien más.",
  "No, puedo tomar la decisión por mi cuenta.",
] as const;

const INVERSION_OPTIONS = [
  "Me parece bien",
  "No cuento hoy en día con esa inversión",
] as const;

function isOtroValue(value: string, predefined: readonly string[]) {
  return value !== "" && !predefined.includes(value);
}

export function CalendlyDataForm({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead();

  const [form, setForm] = useState({
    celular: lead.celular ?? "",
    email: lead.email ?? "",
    instagram: lead.instagram ?? "",
    fecha_call: lead.fecha_call ? new Date(lead.fecha_call) : (null as Date | null),
    hora_call: lead.fecha_call
      ? `${String(new Date(lead.fecha_call).getHours()).padStart(2, "0")}:${String(new Date(lead.fecha_call).getMinutes()).padStart(2, "0")}`
      : "10:00",
    objetivo: lead.objetivo ?? "",
    decisor: lead.decisor ?? "",
    inversion_ok: lead.inversion_ok ?? "",
    compromiso: lead.compromiso ?? "",
    respuestas: lead.respuestas ?? "",
  });
  const [calOpen, setCalOpen] = useState(false);

  // Track whether "Otro" is selected for objetivo and compromiso
  const [objetivoOtro, setObjetivoOtro] = useState(
    () => lead.objetivo ? isOtroValue(lead.objetivo, OBJETIVOS) : false
  );
  const [compromisoOtro, setCompromisoOtro] = useState(
    () => lead.compromiso ? lead.compromiso !== "Sí, estaré presente" && lead.compromiso !== "" : false
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
        instagram: form.instagram.trim() || null,
        fecha_call: fechaFinal.toISOString(),
        objetivo: form.objetivo.trim() || null,
        decisor: form.decisor || null,
        inversion_ok: form.inversion_ok || null,
        compromiso: form.compromiso.trim() || null,
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
          Cargá los datos que dejó en Calendly. Al guardar, el lead pasa a &quot;seguimiento&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Datos de contacto ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="celular">Celular (con código país)</Label>
              <Input
                id="celular"
                name="celular"
                value={form.celular}
                onChange={handleChange}
                placeholder="+54 11 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="val@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                name="instagram"
                value={form.instagram}
                onChange={handleChange}
                placeholder="@val_nmz"
              />
            </div>
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
                        year: "numeric",
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

          {/* ── Objetivo ── */}
          <div className="space-y-2">
            <Label>¿Cuál es el principal objetivo que desea lograr?</Label>
            <Select
              value={objetivoOtro ? "__otro__" : form.objetivo}
              onValueChange={(v) => {
                if (v === "__otro__") {
                  setObjetivoOtro(true);
                  setForm((prev) => ({ ...prev, objetivo: "" }));
                } else if (v) {
                  setObjetivoOtro(false);
                  setForm((prev) => ({ ...prev, objetivo: v ?? "" }));
                }
              }}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Seleccionar objetivo" />
              </SelectTrigger>
              <SelectContent>
                {OBJETIVOS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="cursor-pointer">
                    {opt}
                  </SelectItem>
                ))}
                <SelectItem value="__otro__" className="cursor-pointer">
                  Otro
                </SelectItem>
              </SelectContent>
            </Select>
            {objetivoOtro && (
              <Input
                name="objetivo"
                value={form.objetivo}
                onChange={handleChange}
                placeholder="Escribí el objetivo..."
              />
            )}
          </div>

          {/* ── Decisor ── */}
          <div className="space-y-2">
            <Label>
              ¿Existe alguien más que deba estar presente para tomar la decisión?
            </Label>
            <Select
              value={form.decisor}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, decisor: v ?? "" }))
              }
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Seleccionar respuesta" />
              </SelectTrigger>
              <SelectContent>
                {DECISOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="cursor-pointer">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Inversión ── */}
          <div className="space-y-2">
            <Label>
              La primera consulta tiene un valor de $45.000 ARS (descontado del
              programa). ¿Está de acuerdo?
            </Label>
            <Select
              value={form.inversion_ok}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, inversion_ok: v ?? "" }))
              }
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Seleccionar respuesta" />
              </SelectTrigger>
              <SelectContent>
                {INVERSION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="cursor-pointer">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Compromiso ── */}
          <div className="space-y-2">
            <Label>
              ¿Se compromete a estar presente a la hora acordada?
            </Label>
            <Select
              value={compromisoOtro ? "__otro__" : form.compromiso}
              onValueChange={(v) => {
                if (v === "__otro__") {
                  setCompromisoOtro(true);
                  setForm((prev) => ({ ...prev, compromiso: "" }));
                } else if (v) {
                  setCompromisoOtro(false);
                  setForm((prev) => ({ ...prev, compromiso: v ?? "" }));
                }
              }}
            >
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="Seleccionar respuesta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sí, estaré presente" className="cursor-pointer">
                  Sí, estaré presente
                </SelectItem>
                <SelectItem value="__otro__" className="cursor-pointer">
                  Otro
                </SelectItem>
              </SelectContent>
            </Select>
            {compromisoOtro && (
              <Input
                name="compromiso"
                value={form.compromiso}
                onChange={handleChange}
                placeholder="Especificar..."
              />
            )}
          </div>

          {/* ── Notas adicionales ── */}
          <div className="space-y-2">
            <Label htmlFor="respuestas">Notas adicionales</Label>
            <Textarea
              id="respuestas"
              name="respuestas"
              value={form.respuestas}
              onChange={handleChange}
              placeholder="Observaciones extras del setter..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={updateLead.isPending}
          >
            <HiOutlineCalendarDays className="mr-2 h-4 w-4" />
            {updateLead.isPending ? "Guardando..." : "Guardar datos y pasar a seguimiento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
