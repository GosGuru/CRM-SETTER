"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  HiOutlineTrash,
} from "react-icons/hi2";

function buildBlockCopy(block: StructureBlock, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return `${block.title}\n${trimmed}`;
}

function buildStepCopy(step: StructureStep, drafts: Record<string, string>) {
  const sections = step.blocks
    .map((block) => buildBlockCopy(block, drafts[block.id] ?? ""))
    .filter(Boolean);

  if (sections.length === 0) return "";
  return `${step.title}\n\n${sections.join("\n\n")}`;
}

function buildFullCopy(drafts: Record<string, string>) {
  const steps = STRUCTURE_STEPS
    .map((step) => buildStepCopy(step, drafts))
    .filter(Boolean);

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

export function StructureWorkspace() {
  const [activeStepId, setActiveStepId] = useState(STRUCTURE_STEPS[0]?.id ?? "paso-1");
  const [drafts, setDrafts] = useState<Record<string, string>>(DEFAULT_STRUCTURE_DRAFTS);
  const [storageReady, setStorageReady] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      toast.error(`Primero pegá contenido en ${label}.`);
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copiado.`);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1600);
  };

  const handleReset = () => {
    if (!window.confirm("Se va a limpiar toda la estructura guardada en este navegador. ¿Seguimos?")) {
      return;
    }

    setDrafts(DEFAULT_STRUCTURE_DRAFTS);
    window.localStorage.removeItem(STRUCTURE_LIBRARY_STORAGE_KEY);
    toast.success("Estructura reiniciada.");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">5 pasos</Badge>
            <Badge variant="outline">Autoguardado local</Badge>
          </div>
          <div className="space-y-1">
            <CardTitle>Biblioteca de estructura</CardTitle>
            <CardDescription>
              Pegá el contenido del PDF una vez y después copiá por bloque, por paso o toda la
              estructura completa.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {STRUCTURE_STEPS.map((step) => {
              const completedBlocks = step.blocks.filter((block) => (drafts[block.id] ?? "").trim()).length;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                    activeStepId === step.id
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background hover:bg-muted/60"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <Badge variant={completedBlocks > 0 ? "secondary" : "outline"}>
                    {completedBlocks}/{step.blocks.length}
                  </Badge>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <HiOutlineCloudArrowUp className="h-4 w-4" />
              {storageReady ? "Guardado automatico activo" : "Cargando contenido guardado..."}
            </div>
            <p className="mt-1">
              Todo lo que pegues aca queda guardado en este navegador para volver a copiarlo
              despues.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="cursor-pointer"
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
                  Copiar este paso
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
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
                  Copiar toda la estructura
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={handleReset}
            >
              <HiOutlineTrash className="mr-2 h-4 w-4" />
              Limpiar todo
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-muted/60">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Paso actual</Badge>
              <Badge variant="outline">
                {activeStep.number} de {STRUCTURE_STEPS.length}
              </Badge>
              <Badge variant="outline">{activeStep.blocks.length} bloques</Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">{activeStep.title}</CardTitle>
              <CardDescription>{activeStep.description}</CardDescription>
            </div>
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!previousStep}
                  className="cursor-pointer"
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
                  className="ml-auto cursor-pointer"
                  onClick={() => nextStep && handleStepChange(nextStep.id)}
                >
                  Siguiente
                  <HiOutlineChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-2 pb-1">
                  {STRUCTURE_STEPS.map((step) => (
                    <Button
                      key={step.id}
                      type="button"
                      size="sm"
                      variant={step.id === activeStepId ? "default" : "outline"}
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

        <div className="grid gap-4 lg:grid-cols-2">
            {activeStep.blocks.map((block) => {
              const value = drafts[block.id] ?? "";
              const isCopied = copiedKey === block.id;
              const lines = extractLines(value);

              return (
                <Card key={block.id} className="border-border/80">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-2">
                      <Badge variant="outline">{STRUCTURE_KIND_LABELS[block.kind]}</Badge>
                      <div>
                        <CardTitle>{block.title}</CardTitle>
                        <CardDescription>{block.helper}</CardDescription>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isCopied ? "secondary" : "outline"}
                      className="cursor-pointer"
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
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={value}
                    onChange={(event) => handleChange(block.id, event.target.value)}
                    placeholder={block.placeholder}
                    rows={block.kind === "principal" ? 9 : 7}
                    className="min-h-40 font-mono text-sm leading-6"
                  />
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {value.trim()
                        ? `${value.trim().length} caracteres listos para copiar`
                        : "Todavia no hay texto pegado en este bloque."}
                    </span>
                    <span>{value.trim() ? "Editable" : "Vacio"}</span>
                  </div>
                  {lines.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Copiar por renglon
                      </p>
                      <div className="space-y-2">
                        {lines.map((line, index) => {
                          const lineCopyKey = `${block.id}-line-${index}`;
                          const isLineCopied = copiedKey === lineCopyKey;

                          return (
                            <div
                              key={lineCopyKey}
                              className="flex items-start gap-2 rounded-xl border bg-muted/30 p-2"
                            >
                              <Badge variant="secondary" className="mt-0.5 shrink-0">
                                {index + 1}
                              </Badge>
                              <p className="min-w-0 flex-1 text-sm leading-6 text-foreground">
                                {line}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant={isLineCopied ? "secondary" : "outline"}
                                className="h-auto min-h-8 shrink-0 cursor-pointer px-3 py-1.5"
                                onClick={() => handleCopy(line, lineCopyKey, `${block.title} · renglon ${index + 1}`)}
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
