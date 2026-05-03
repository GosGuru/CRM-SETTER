"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateLead, useBulkCreateLeads } from "@/hooks/use-leads";
import { useCurrentUser } from "@/hooks/use-users";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { showLeadAddedToast } from "@/components/lead-added-toast";
import { cn, localDateStr } from "@/lib/utils";
import {
  HiOutlineArrowLeft,
  HiOutlineClipboardDocumentCheck,
  HiOutlineUserPlus,
  HiOutlineUsers,
} from "react-icons/hi2";
import Link from "next/link";

export default function NewLeadPage() {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const createLead = useCreateLead();
  const bulkCreate = useBulkCreateLeads();
  const [modo, setModo] = useState<"single" | "bulk">("single");
  const [nombre, setNombre] = useState("");
  const [nombres, setNombres] = useState("");
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    return localDateStr(now);
  });

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (!currentUser) {
      toast.error("No se pudo obtener el usuario actual");
      return;
    }

    const now = new Date();
    const todayStr = localDateStr(now);
    const createdAt = fecha === todayStr ? now.toISOString() : `${fecha}T12:00:00`;

    createLead.mutate(
      {
        nombre: nombre.trim(),
        setter_id: currentUser.id,
        created_at: createdAt,
      },
      {
        onSuccess: (data) => {
          const leadId = data?.id;
          showLeadAddedToast({
            nombre: nombre.trim(),
            fecha,
            onVerLead: leadId ? () => router.push(`/leads/${leadId}`) : undefined,
            onAgregarNota: leadId ? () => router.push(`/leads/${leadId}`) : undefined,
          });
          router.push("/leads");
        },
        onError: (err) => {
          toast.error(`Error al cargar el lead: ${err.message}`);
        },
      }
    );
  };

  const handleSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();

    const lines = nombres
      .split(/\r?\n/)
      .flatMap((line) => {
        const trimmed = line.trim();
        return trimmed ? [trimmed] : [];
      });

    if (lines.length === 0) {
      toast.error("Ingresá al menos un nombre");
      return;
    }

    if (!currentUser) {
      toast.error("No se pudo obtener el usuario actual");
      return;
    }

    const now2 = new Date();
    const todayStr2 = localDateStr(now2);
    const baseTime = fecha === todayStr2 ? now2.toISOString() : `${fecha}T12:00:00`;

    const leads = lines.map((n) => ({
      nombre: n,
      setter_id: currentUser.id,
      created_at: baseTime,
    }));

    bulkCreate.mutate(leads, {
      onSuccess: (result) => {
        const { created, duplicates } = result;
        if (duplicates.length > 0) {
          toast.warning(
            `${created.length} cargados. ${duplicates.length} duplicado${duplicates.length !== 1 ? "s" : ""} omitido${duplicates.length !== 1 ? "s" : ""}: ${duplicates.slice(0, 5).join(", ")}${duplicates.length > 5 ? "..." : ""}`
          );
        } else {
          showLeadAddedToast({
            nombre: created.length === 1 ? created[0].nombre : `${created.length} leads`,
            fecha,
            cantidad: created.length,
            onVerLead: created.length === 1 ? () => router.push(`/leads/${created[0].id}`) : undefined,
          });
        }
        router.push("/leads");
      },
      onError: (err) => {
        toast.error(`Error al cargar leads: ${err.message}`);
      },
    });
  };

  const isPending = createLead.isPending || bulkCreate.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-blur-in">
      <Link
        href="/leads"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <HiOutlineArrowLeft className="mr-1 h-4 w-4" />
        Volver a leads
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Cargar leads</CardTitle>
          <CardDescription>
            Cargá uno o varios leads a la vez. Podés cambiar la fecha si querés registrarlos en otro día.
          </CardDescription>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant={modo === "single" ? "default" : "outline"}
              onClick={() => setModo("single")}
              className="cursor-pointer"
            >
              <HiOutlineUserPlus className="mr-1 h-4 w-4" />
              Uno
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modo === "bulk" ? "default" : "outline"}
              onClick={() => setModo("bulk")}
              className="cursor-pointer"
            >
              <HiOutlineUsers className="mr-1 h-4 w-4" />
              Varios
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={modo === "single" ? handleSubmitSingle : handleSubmitBulk}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            {modo === "single" ? (
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Pablo Álvarez"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="nombres">Nombres (uno por línea) *</Label>
                <Textarea
                  id="nombres"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder={"Pablo Álvarez\nMaría López\nJuan Pérez"}
                  rows={8}
                  required
                />
                {nombres.trim() && (
                  <p className="text-xs text-muted-foreground">
                    {nombres.split(/\r?\n/).filter((l) => l.trim()).length} lead(s) para cargar
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isPending}
            >
              {modo === "single" ? (
                <HiOutlineUserPlus className="mr-2 h-4 w-4" />
              ) : (
                <HiOutlineUsers className="mr-2 h-4 w-4" />
              )}
              {isPending
                ? "Cargando..."
                : modo === "single"
                  ? "Cargar lead"
                  : "Cargar todos"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-linear-to-br from-background via-background to-muted/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HiOutlineClipboardDocumentCheck className="h-5 w-5 text-primary" />
            <CardTitle>Estructura</CardTitle>
          </div>
          <CardDescription>
            Entrá a una vista separada con el paso a paso de Método Origen ya cargado para copiar
            mensajes, follow-ups, objeciones o toda la estructura completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Si editás algún texto, queda guardado automáticamente en este navegador para volver a usarlo.
          </p>
          <Link
            href="/leads/new/estructura"
            className={cn(
              buttonVariants({
                className: "w-full cursor-pointer sm:w-auto sm:shrink-0",
              })
            )}
          >
            <HiOutlineClipboardDocumentCheck className="mr-2 h-4 w-4" />
            Abrir estructura
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
