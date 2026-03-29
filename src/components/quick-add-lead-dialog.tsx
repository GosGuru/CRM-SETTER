"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateLead } from "@/hooks/use-leads";
import { useCurrentUser } from "@/hooks/use-users";
import { useUIStore } from "@/stores/ui-store";
import { showLeadAddedToast } from "@/components/lead-added-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  HiOutlineUserPlus,
  HiOutlineUsers,
} from "react-icons/hi2";
import Link from "next/link";

export function QuickAddLeadDialog() {
  const router = useRouter();
  const open = useUIStore((s) => s.quickAddOpen);
  const setOpen = useUIStore((s) => s.setQuickAddOpen);
  const { data: currentUser } = useCurrentUser();
  const createLead = useCreateLead();

  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = nombre.trim();
    if (!trimmed) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (!currentUser) {
      toast.error("No se pudo obtener el usuario actual");
      return;
    }

    // Close immediately — optimistic UX
    setOpen(false);
    const submittedNombre = trimmed;
    const submittedFecha = fecha;
    setNombre("");

    const loadingId = toast.loading("Cargando lead…");

    createLead.mutate(
      {
        nombre: submittedNombre,
        setter_id: currentUser.id,
        created_at: `${submittedFecha}T12:00:00`,
      },
      {
        onSuccess: (data) => {
          toast.dismiss(loadingId);
          const leadId = data?.id;
          showLeadAddedToast({
            nombre: submittedNombre,
            fecha: submittedFecha,
            onVerLead: leadId ? () => router.push(`/leads/${leadId}`) : undefined,
            onAgregarNota: leadId ? () => router.push(`/leads/${leadId}`) : undefined,
          });
        },
        onError: (err) => {
          toast.dismiss(loadingId);
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setNombre("");
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HiOutlineUserPlus className="h-5 w-5 text-primary" />
            Nuevo Lead
          </DialogTitle>
          <DialogDescription>
            Escribí el nombre y presioná Enter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-nombre">Nombre *</Label>
            <Input
              ref={inputRef}
              id="quick-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Pablo Álvarez"
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-fecha">Fecha</Label>
            <Input
              id="quick-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full cursor-pointer">
            <HiOutlineUserPlus className="mr-2 h-4 w-4" />
            Cargar lead
          </Button>
        </form>

        <DialogFooter>
          <Link
            href="/leads/new"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1"
          >
            <HiOutlineUsers className="h-3.5 w-3.5" />
            Cargar varios o importar CSV
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
