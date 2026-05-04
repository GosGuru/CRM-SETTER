import type { StructureBlock, StructureStep } from "@/app/(dashboard)/leads/new/estructura/_data/structure-library";

export function buildBlockCopy(block: StructureBlock, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "";
  return `${block.title}\n${trimmed}`;
}

export function buildStepCopy(step: StructureStep, drafts: Record<string, string>) {
  const sections = step.blocks.flatMap((block) => {
    const copy = buildBlockCopy(block, drafts[block.id] ?? "");
    return copy ? [copy] : [];
  });

  if (sections.length === 0) return "";
  return `${step.number}. ${step.title}\n\n${sections.join("\n\n")}`;
}

export function buildFullCopy(steps: StructureStep[], drafts: Record<string, string>) {
  const stepCopies = steps.flatMap((step) => {
    const copy = buildStepCopy(step, drafts);
    return copy ? [copy] : [];
  });

  return stepCopies.join("\n\n--------------------\n\n");
}

export function extractStructureLines(value: string) {
  return value
    .split(/\r?\n/)
    .flatMap((line) => {
      const trimmed = line.trim();
      return trimmed ? [trimmed] : [];
    });
}