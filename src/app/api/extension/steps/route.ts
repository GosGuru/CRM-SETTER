import { NextResponse } from "next/server";
import {
  DEFAULT_STRUCTURE_DRAFTS,
  STRUCTURE_KIND_LABELS,
  STRUCTURE_LIBRARY_STORAGE_KEY,
  STRUCTURE_STEPS,
} from "@/app/(dashboard)/leads/new/estructura/_data/structure-library";
import { buildFullCopy, buildStepCopy } from "@/lib/structure-format";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export function GET() {
  const stepCopies = Object.fromEntries(
    STRUCTURE_STEPS.map((step) => [step.id, buildStepCopy(step, DEFAULT_STRUCTURE_DRAFTS)])
  );

  return NextResponse.json(
    {
      version: 3,
      storageKey: STRUCTURE_LIBRARY_STORAGE_KEY,
      labels: STRUCTURE_KIND_LABELS,
      steps: STRUCTURE_STEPS,
      defaultDrafts: DEFAULT_STRUCTURE_DRAFTS,
      stepCopies,
      fullCopy: buildFullCopy(STRUCTURE_STEPS, DEFAULT_STRUCTURE_DRAFTS),
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
      },
    }
  );
}