"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import {
  DEFAULT_STRUCTURE_DRAFTS,
  STRUCTURE_KIND_LABELS,
  STRUCTURE_LIBRARY_STORAGE_KEY,
  STRUCTURE_STEPS,
  type StructureBlock,
  type StructureStep,
} from "../_data/structure-library";
import {
  HiOutlineCheck,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClipboardDocument,
  HiOutlineCloudArrowUp,
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineUserPlus,
} from "react-icons/hi2";

function buildBlockCopy(block: StructureBlock, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return `${block.title}\n${trimmed}`;
}

function buildStepCopy(step: StructureStep, drafts: Record<string, string>) {
  const sections = step.blocks.flatMap((block) => {
    const copy = buildBlockCopy(block, drafts[block.id] ?? "");
    return copy ? [copy] : [];
  });

  if (sections.length === 0) return "";
  return `${step.number}. ${step.title}\n\n${sections.join("\n\n")}`;
}

function buildFullCopy(drafts: Record<string, string>) {
  const steps = STRUCTURE_STEPS.flatMap((step) => {
    const copy = buildStepCopy(step, drafts);
    return copy ? [copy] : [];
  });

  return steps.join("\n\n--------------------\n\n");
}

function extractLines(value: string) {
  return value
    .split(/\r?\n/)
    .flatMap((line) => {
      const trimmed = line.trim();
      return trimmed ? [trimmed] : [];
    });
}

function countCompletedBlocks(step: StructureStep, drafts: Record<string, string>) {
  return step.blocks.filter((block) => (drafts[block.id] ?? "").trim()).length;
}

function getBlockRows(block: StructureBlock, value: string) {
  const lineCount = extractLines(value).length;
  const minimumRows = block.kind === "objecion" || block.kind === "mensaje" ? 7 : 5;

  return Math.min(Math.max(lineCount + 2, minimumRows), 14);
}

function stepMatchesQuery(step: StructureStep, drafts: Record<string, string>, query: string) {
  if (!query) return true;

  const searchable = [
    step.category,
    step.title,
    step.description,
    ...step.blocks.flatMap((block) => [block.title, block.helper, STRUCTURE_KIND_LABELS[block.kind], drafts[block.id] ?? ""]),
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

export function StructureWorkspace() {
  const setQuickAddOpen = useUIStore((state) => state.setQuickAddOpen);
  const [activeStepId, setActiveStepId] = useState(STRUCTURE_STEPS[0]?.id ?? "paso-1");
  const [drafts, setDrafts] = useState<Record<string, string>>(DEFAULT_STRUCTURE_DRAFTS);
  const [storageReady, setStorageReady] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STRUCTURE_LIBRARY_STORAGE_KEY);
      if (!stored) {
        setStorageReady(true);
        return;
      }

      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        setDrafts({
          ...DEFAULT_STRUCTURE_DRAFTS,
          ...parsed,
        });
      }
    } catch {
      toast.error("No se pudo cargar la estructura guardada en este navegador.");
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(STRUCTURE_LIBRARY_STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts, storageReady]);

  const activeStep = STRUCTURE_STEPS.find((step) => step.id === activeStepId) ?? STRUCTURE_STEPS[0];
  const activeStepIndex = STRUCTURE_STEPS.findIndex((step) => step.id === activeStep.id);
  const previousStep = activeStepIndex > 0 ? STRUCTURE_STEPS[activeStepIndex - 1] : null;
  const nextStep = activeStepIndex < STRUCTURE_STEPS.length - 1 ? STRUCTURE_STEPS[activeStepIndex + 1] : null;
  const activeStepCopy = buildStepCopy(activeStep, drafts);
  const fullCopy = buildFullCopy(drafts);
  const normalizedQuery = query.trim().toLowerCase();

  const totalBlocks = useMemo(
    () => STRUCTURE_STEPS.reduce((total, step) => total + step.blocks.length, 0),
    []
  );
  const completedBlocks = useMemo(
    () => STRUCTURE_STEPS.reduce((total, step) => total + countCompletedBlocks(step, drafts), 0),
    [drafts]
  );
  const visibleSteps = useMemo(
    () => STRUCTURE_STEPS.filter((step) => stepMatchesQuery(step, drafts, normalizedQuery)),
    [drafts, normalizedQuery]
  );
  const activeCompletedBlocks = countCompletedBlocks(activeStep, drafts);

  const handleChange = (blockId: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [blockId]: value,
    }));
  };

  const handleStepChange = (stepId: string) => {
    setActiveStepId(stepId);
  };

  const handleCopy = async (text: string, key: string, label: string) => {
    if (!text.trim()) {
      toast.error(`Primero agrega contenido en ${label}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copiado.`);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1600);
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  };

  const handleReset = () => {
    if (!window.confirm("Se va a restaurar la estructura base de Método Origen en este navegador. ¿Seguimos?")) {
      return;
    }

    setDrafts(DEFAULT_STRUCTURE_DRAFTS);
    window.localStorage.removeItem(STRUCTURE_LIBRARY_STORAGE_KEY);
    toast.success("Estructura restaurada.");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
      <Card className="h-fit lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-hidden">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Método Origen</Badge>
            <Badge variant="outline">{STRUCTURE_STEPS.length} secciones</Badge>
            <Badge variant="outline">
              {completedBlocks}/{totalBlocks} cargados
            </Badge>
          </div>
          <div className="space-y-1">
            <CardTitle>Biblioteca de estructura</CardTitle>
            <CardDescription>
              Paso a paso precargado desde el Word para copiar mensajes, follow-ups, objeciones y
              respuestas de admisión.
            </CardDescription>
          </div>
          <div className="relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar en estructura"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar paso, objeción, fup..."
              className="h-9 pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 lg:max-h-[calc(100vh-17rem)] lg:overflow-y-auto">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {visibleSteps.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No hay secciones que coincidan con la búsqueda.
              </div>
            ) : (
              visibleSteps.map((step) => {
                const stepCompletedBlocks = countCompletedBlocks(step, drafts);

                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-current={activeStepId === step.id ? "step" : undefined}
                    onClick={() => setActiveStepId(step.id)}
                    className={cn(
                      "flex min-w-0 items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                      activeStepId === step.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background hover:bg-muted/60"
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {step.category}
                      </p>
                      <p className="wrap-break-word text-sm font-medium leading-5">
                        {step.number}. {step.title}
                      </p>
                      <p className="wrap-break-word text-xs leading-5 text-muted-foreground">{step.description}</p>
                    </div>
                    <Badge variant={stepCompletedBlocks > 0 ? "secondary" : "outline"} className="shrink-0">
                      {stepCompletedBlocks}/{step.blocks.length}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <HiOutlineCloudArrowUp className="h-4 w-4" />
              {storageReady ? "Guardado automático activo" : "Cargando contenido guardado..."}
            </div>
            <p className="mt-1 leading-5">
              El Word queda como base. Si editás algún texto, se guarda en este navegador sin tocar
              el resto del CRM.
            </p>
          </div>

          <div className="grid gap-2">
            <Button
              type="button"
              className="w-full cursor-pointer"
              onClick={() => handleCopy(activeStepCopy, `${activeStep.id}-step`, activeStep.title)}
            >
              {copiedKey === `${activeStep.id}-step` ? (
                <>
                  <HiOutlineCheck className="mr-2 h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <HiOutlineClipboardDocument className="mr-2 h-4 w-4" />
                  Copiar sección actual
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer"
              onClick={() => handleCopy(fullCopy, "all-steps", "Toda la estructura")}
            >
              {copiedKey === "all-steps" ? (
                <>
                  <HiOutlineCheck className="mr-2 h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <HiOutlineClipboardDocument className="mr-2 h-4 w-4" />
                  Copiar todo
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" className="w-full cursor-pointer" onClick={handleReset}>
              <HiOutlineTrash className="mr-2 h-4 w-4" />
              Restaurar base
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-background via-background to-muted/60">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{activeStep.category}</Badge>
                <Badge variant="outline">
                  {activeStep.number} de {STRUCTURE_STEPS.length}
                </Badge>
                <Badge variant="outline">{activeStep.blocks.length} bloques</Badge>
              </div>
              <Badge variant={activeCompletedBlocks === activeStep.blocks.length ? "secondary" : "outline"} className="w-fit">
                {activeCompletedBlocks}/{activeStep.blocks.length} listos
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl leading-tight">{activeStep.title}</CardTitle>
              <CardDescription className="leading-6">{activeStep.description}</CardDescription>
            </div>
            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!previousStep}
                  className="w-full cursor-pointer sm:w-auto"
                  onClick={() => previousStep && handleStepChange(previousStep.id)}
                >
                  <HiOutlineChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!nextStep}
                  className="w-full cursor-pointer sm:ml-auto sm:w-auto"
                  onClick={() => nextStep && handleStepChange(nextStep.id)}
                >
                  Siguiente
                  <HiOutlineChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-2 pb-1">
                  {(visibleSteps.length > 0 ? visibleSteps : STRUCTURE_STEPS).map((step) => (
                    <Button
                      key={step.id}
                      type="button"
                      size="sm"
                      variant={step.id === activeStepId ? "default" : "outline"}
                      aria-current={step.id === activeStepId ? "step" : undefined}
                      className="cursor-pointer"
                      onClick={() => handleStepChange(step.id)}
                    >
                      {step.number}. {step.title}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {activeStep.blocks.map((block) => {
            const value = drafts[block.id] ?? "";
            const isCopied = copiedKey === block.id;
            const lines = extractLines(value);

            return (
              <Card key={block.id} className="min-w-0 border-border/80">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <Badge variant="outline">{STRUCTURE_KIND_LABELS[block.kind]}</Badge>
                      <div className="space-y-1">
                        <CardTitle className="text-base leading-snug">{block.title}</CardTitle>
                        <CardDescription className="leading-6">{block.helper}</CardDescription>
                      </div>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:shrink-0 sm:items-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="w-full cursor-pointer sm:w-auto"
                        onClick={() => setQuickAddOpen(true)}
                      >
                        <HiOutlineUserPlus className="mr-1 h-3.5 w-3.5" />
                        Lead
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isCopied ? "secondary" : "outline"}
                        className="w-full cursor-pointer sm:w-auto"
                        onClick={() => handleCopy(value, block.id, block.title)}
                      >
                        {isCopied ? (
                          <>
                            <HiOutlineCheck className="mr-1 h-3.5 w-3.5" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <HiOutlineClipboardDocument className="mr-1 h-3.5 w-3.5" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={value}
                    onChange={(event) => handleChange(block.id, event.target.value)}
                    placeholder={block.placeholder}
                    rows={getBlockRows(block, value)}
                    className="min-h-36 resize-y font-mono text-sm leading-6"
                  />
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {value.trim()
                        ? `${value.trim().length} caracteres listos para copiar`
                        : "Todavía no hay texto en este bloque."}
                    </span>
                    <span>{value.trim() ? "Editable" : "Vacío"}</span>
                  </div>
                  {lines.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Copiar por renglón
                      </p>
                      <div className="space-y-2">
                        {lines.map((line, index) => {
                          const lineCopyKey = `${block.id}-line-${index}`;
                          const isLineCopied = copiedKey === lineCopyKey;

                          return (
                            <div
                              key={lineCopyKey}
                              className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2 sm:flex-row sm:items-start"
                            >
                              <Badge variant="secondary" className="w-fit shrink-0 sm:mt-0.5">
                                {index + 1}
                              </Badge>
                              <p className="min-w-0 flex-1 wrap-break-word text-sm leading-6 text-foreground">
                                {line}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant={isLineCopied ? "secondary" : "outline"}
                                className="h-auto min-h-8 w-full shrink-0 cursor-pointer px-3 py-1.5 sm:w-auto"
                                onClick={() => handleCopy(line, lineCopyKey, `${block.title} · renglón ${index + 1}`)}
                              >
                                {isLineCopied ? (
                                  <>
                                    <HiOutlineCheck className="mr-1 h-3.5 w-3.5" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <HiOutlineClipboardDocument className="mr-1 h-3.5 w-3.5" />
                                    Copiar
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
