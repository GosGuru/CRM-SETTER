"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateLead, useBulkCreateLeads } from "@/hooks/use-leads";
import { useCurrentUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { HiOutlineArrowLeft, HiOutlineUserPlus, HiOutlineUsers } from "react-icons/hi2";
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
    return now.toISOString().slice(0, 10);
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

    const createdAt = `${fecha}T12:00:00`;

    createLead.mutate(
      {
        nombre: nombre.trim(),
        setter_id: currentUser.id,
        created_at: createdAt,
      },
      {
        onSuccess: () => {
          toast.success("Lead cargado correctamente");
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
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error("Ingresá al menos un nombre");
      return;
    }

    if (!currentUser) {
      toast.error("No se pudo obtener el usuario actual");
      return;
    }

    const createdAt = `${fecha}T12:00:00`;

    const leads = lines.map((n) => ({
      nombre: n,
      setter_id: currentUser.id,
      created_at: createdAt,
    }));

    bulkCreate.mutate(leads, {
      onSuccess: (result) => {
        const { created, duplicates } = result;
        if (duplicates.length > 0) {
          toast.warning(
            `${created.length} cargados. ${duplicates.length} duplicado${duplicates.length !== 1 ? "s" : ""} omitido${duplicates.length !== 1 ? "s" : ""}: ${duplicates.slice(0, 5).join(", ")}${duplicates.length > 5 ? "..." : ""}`
          );
        } else {
          toast.success(`${created.length} leads cargados correctamente`);
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
    <div className="max-w-md mx-auto space-y-4 animate-blur-in">
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
                  autoFocus
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
                  autoFocus
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
    </div>
  );
}
