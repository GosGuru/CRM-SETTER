"use client";

import { useState } from "react";
import { useCurrentUser, useTeam, useUpdateProfile, useUpdateUserRole } from "@/hooks/use-users";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  DEFAULT_TEMPLATE_CONFIRMACION,
} from "@/hooks/use-templates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCloudArrowUp,
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineCog6Tooth,
  HiOutlineBanknotes,
} from "react-icons/hi2";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";

// ────────────────────────────────────
// Tab: Perfil
// ────────────────────────────────────
function ProfileTab() {
  const { data: currentUser } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const [fullName, setFullName] = useState(currentUser?.full_name ?? "");

  // Sync when user loads
  if (currentUser && !fullName && currentUser.full_name) {
    setFullName(currentUser.full_name);
  }

  const handleSave = () => {
    if (!currentUser) return;
    updateProfile.mutate(
      { id: currentUser.id, full_name: fullName.trim() },
      {
        onSuccess: () => toast.success("Perfil actualizado"),
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  if (!currentUser) {
    return <div className="h-32 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HiOutlineUser className="h-5 w-5" />
          Mi perfil
        </CardTitle>
        <CardDescription>Editá tu nombre y datos de perfil.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={currentUser.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">
              {currentUser.full_name?.charAt(0)?.toUpperCase() || currentUser.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{currentUser.full_name || currentUser.email}</p>
            <Badge variant="secondary">{currentUser.role === "closer" ? "Closer" : "Setter"}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={currentUser.email} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">El email no se puede cambiar.</p>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="cursor-pointer"
        >
          <HiOutlineCloudArrowUp className="mr-2 h-4 w-4" />
          {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────
// Tab: Equipo
// ────────────────────────────────────
function TeamTab() {
  const { data: team, isLoading } = useTeam();
  const { data: currentUser } = useCurrentUser();
  const updateRole = useUpdateUserRole();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al enviar invitación";
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = (userId: string, role: string) => {
    updateRole.mutate(
      { id: userId, role },
      {
        onSuccess: () => toast.success("Rol actualizado"),
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HiOutlineUsers className="h-5 w-5" />
              Equipo
            </CardTitle>
            <CardDescription>Miembros del equipo y sus roles.</CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger
              render={<Button size="sm" className="cursor-pointer" />}
            >
              <HiOutlinePlusCircle className="mr-1 h-4 w-4" />
              Invitar
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitar miembro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nuevo@equipo.com"
                  />
                </div>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="w-full cursor-pointer"
                >
                  <HiOutlineEnvelope className="mr-2 h-4 w-4" />
                  {inviting ? "Enviando..." : "Enviar invitación"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : team && team.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Miembro</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {member.full_name?.charAt(0)?.toUpperCase() || member.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {member.full_name || "Sin nombre"}
                        {member.id === currentUser?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">Yo</Badge>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(v) => v && handleRoleChange(member.id, v)}
                    >
                      <SelectTrigger className="w-28 h-8 cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="setter" className="cursor-pointer">Setter</SelectItem>
                        <SelectItem value="closer" className="cursor-pointer">Closer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay miembros en el equipo
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────
// Tab: Plantillas
// ────────────────────────────────────
function TemplatesTab() {
  const { data: currentUser } = useCurrentUser();
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editContenido, setEditContenido] = useState("");
  const [showPreview, setShowPreview] = useState<string | null>(null);

  const startEdit = (t: { id: string; nombre: string; contenido: string }) => {
    setEditingId(t.id);
    setEditNombre(t.nombre);
    setEditContenido(t.contenido);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNombre("");
    setEditContenido("");
  };

  const handleSave = () => {
    if (!editingId) return;
    updateTemplate.mutate(
      { id: editingId, nombre: editNombre.trim(), contenido: editContenido },
      {
        onSuccess: () => {
          toast.success("Plantilla guardada");
          cancelEdit();
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  const handleCreate = () => {
    if (!currentUser) return;
    createTemplate.mutate(
      {
        user_id: currentUser.id,
        nombre: "Nueva plantilla",
        contenido: DEFAULT_TEMPLATE_CONFIRMACION,
      },
      {
        onSuccess: (data) => {
          toast.success("Plantilla creada");
          startEdit({ id: data.id, nombre: data.nombre, contenido: data.contenido });
        },
        onError: (err) => toast.error(`Error: ${err.message}`),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id, {
      onSuccess: () => {
        toast.success("Plantilla eliminada");
        if (editingId === id) cancelEdit();
      },
      onError: (err) => toast.error(`Error: ${err.message}`),
    });
  };

  const renderPreview = (contenido: string) => {
    return contenido
      .replace(/{nombre}/g, "Juan Pérez")
      .replace(/{fecha}/g, "28/03/26")
      .replace(/{hora}/g, "15:30")
      .replace(/{closer}/g, "María López");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
              Plantillas WhatsApp
            </CardTitle>
            <CardDescription>
              Personalizá tus plantillas de mensajes. Variables disponibles: {"{nombre}"}, {"{fecha}"}, {"{hora}"}, {"{closer}"}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={createTemplate.isPending}
            className="cursor-pointer"
          >
            <HiOutlinePlusCircle className="mr-1 h-4 w-4" />
            Nueva
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-4">
            {templates.map((t) =>
              editingId === t.id ? (
                <div key={t.id} className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contenido</Label>
                    <Textarea
                      value={editContenido}
                      onChange={(e) => setEditContenido(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                  {showPreview === t.id && (
                    <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                      {renderPreview(editContenido)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateTemplate.isPending}
                      size="sm"
                      className="cursor-pointer"
                    >
                      <HiOutlineCloudArrowUp className="mr-1 h-4 w-4" />
                      Guardar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(showPreview === t.id ? null : t.id)}
                      className="cursor-pointer"
                    >
                      <HiOutlineEye className="mr-1 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEdit}
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex items-start justify-between rounded-lg border p-4">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-sm mb-1">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {t.contenido}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(t)}
                      className="cursor-pointer"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive cursor-pointer"
                      onClick={() => handleDelete(t.id)}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              No tenés plantillas todavía.
            </p>
            <Button
              variant="outline"
              onClick={handleCreate}
              disabled={createTemplate.isPending}
              className="cursor-pointer"
            >
              <HiOutlinePlusCircle className="mr-1 h-4 w-4" />
              Crear plantilla de ejemplo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────
// Tab: Comisiones y Precios
// ────────────────────────────────────
function CommissionsTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();

  const [cashPerAgenda, setCashPerAgenda] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [programPrice, setProgramPrice] = useState("");

  // Sync form with loaded settings
  if (settings && !cashPerAgenda && !commissionRate && !programPrice) {
    setCashPerAgenda(String(settings.cash_per_agenda));
    setCommissionRate(String(Math.round(settings.commission_rate * 100)));
    setProgramPrice(String(settings.program_price));
  }

  const handleSave = () => {
    const rate = parseFloat(commissionRate) / 100;
    const cash = parseFloat(cashPerAgenda);
    const price = parseFloat(programPrice);

    if (isNaN(rate) || isNaN(cash) || isNaN(price)) {
      toast.error("Ingresá valores válidos");
      return;
    }
    if (rate <= 0 || rate > 1) {
      toast.error("La tasa debe estar entre 1% y 100%");
      return;
    }

    const ops = [
      { key: "cash_per_agenda", value: String(cash) },
      { key: "commission_rate", value: String(rate) },
      { key: "program_price", value: String(price) },
    ];

    Promise.all(ops.map((op) => updateSetting.mutateAsync(op)))
      .then(() => toast.success("Configuración guardada"))
      .catch((err) => toast.error(`Error: ${err instanceof Error ? err.message : "desconocido"}`));
  };

  if (isLoading) {
    return <div className="h-48 bg-muted animate-pulse rounded-lg" />;
  }

  const cash = parseFloat(cashPerAgenda) || 0;
  const rate = (parseFloat(commissionRate) || 0) / 100;
  const price = parseFloat(programPrice) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HiOutlineBanknotes className="h-5 w-5 text-green-600" />
          Comisiones y precios
        </CardTitle>
        <CardDescription>Configurá los valores que se usan para calcular tu comisión en el dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Cash por agenda */}
        <div className="space-y-1.5">
          <Label htmlFor="cash-per-agenda">Valor por agenda inicial ($)</Label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="cash-per-agenda"
              type="number"
              min={0}
              step={0.01}
              value={cashPerAgenda}
              onChange={(e) => setCashPerAgenda(e.target.value)}
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Monto total que recibiós por cada call agendada.
          </p>
        </div>

        {/* Comisión % */}
        <div className="space-y-1.5">
          <Label htmlFor="commission-rate">Tu comisión (%)</Label>
          <div className="relative max-w-xs">
            <Input
              id="commission-rate"
              type="number"
              min={1}
              max={100}
              step={0.1}
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="pr-7"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tu porcentaje sobre cada venta. Actualmente: {commissionRate}% de ${cash} = <strong className="text-green-700">${(cash * rate).toFixed(2)}</strong> por agenda.
          </p>
        </div>

        {/* Precio del programa */}
        <div className="space-y-1.5">
          <Label htmlFor="program-price">Precio del programa ($)</Label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="program-price"
              type="number"
              min={0}
              step={0.01}
              value={programPrice}
              onChange={(e) => setProgramPrice(e.target.value)}
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Precio actual del programa. Tu comisión por programa completo: <strong className="text-green-700">${(price * rate).toFixed(2)}</strong>
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateSetting.isPending}
          className="cursor-pointer"
        >
          {updateSetting.isPending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────
// Página principal de Settings
// ────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold flex items-center gap-2 animate-blur-fade">
        <HiOutlineCog6Tooth className="h-6 w-6 text-primary" />
        Configuración
      </h1>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil" className="cursor-pointer">
            <HiOutlineUser className="mr-1 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="equipo" className="cursor-pointer">
            <HiOutlineUsers className="mr-1 h-4 w-4" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="cursor-pointer">
            <HiOutlineChatBubbleLeftRight className="mr-1 h-4 w-4" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="comisiones" className="cursor-pointer">
            <HiOutlineBanknotes className="mr-1 h-4 w-4" />
            Comisiones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="equipo">
          <TeamTab />
        </TabsContent>

        <TabsContent value="plantillas">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="comisiones">
          <CommissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
