import { NextResponse } from "next/server";

import { STRUCTURE_STEPS } from "@/app/(dashboard)/leads/new/estructura/_data/structure-library";
import { hasValidExtensionToken } from "@/lib/extension-auth";
import { sanitizeManychatContext } from "@/lib/manychat-context";

type DetectStepBody = {
  chatContext?: string;
  contactName?: string;
  aiProvider?: string;
};

type StepDetection = {
  stepId: string;
  stepNumber: number;
  title: string;
  reason: string;
  confidence: number;
  source: "ai" | "heuristic";
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Extension-Token",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

function readProviderConfig(provider?: string) {
  const selectedProvider = provider === "edipsic" || provider === "edith" ? provider : "deepseek";
  const providerConfig = {
    deepseek: {
      url: process.env.DEEPSEEK_API_URL,
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      openAiCompatible: true,
    },
    edipsic: {
      url: process.env.EDIPSIC_API_URL,
      key: process.env.EDIPSIC_API_KEY,
      model: process.env.EDIPSIC_MODEL ?? "deepseek-chat",
      openAiCompatible: Boolean(process.env.EDIPSIC_API_URL?.includes("/chat/completions")),
    },
    edith: {
      url: process.env.EDITH_API_URL,
      key: process.env.EDITH_API_KEY,
      model: process.env.EDITH_MODEL ?? "deepseek-chat",
      openAiCompatible: Boolean(process.env.EDITH_API_URL?.includes("/chat/completions")),
    },
  }[selectedProvider];

  const extensionToken = process.env.EXTENSION_API_TOKEN;
  return { ...providerConfig, extensionToken };
}

function buildDetectionPrompt(body: Required<Pick<DetectStepBody, "chatContext">> & DetectStepBody) {
  const steps = STRUCTURE_STEPS.map((step) => {
    const blockHints = step.blocks.map((block) => `${block.title}: ${block.helper}`).join(" | ");
    return `${step.number}. ${step.title}: ${step.description}${blockHints ? ` (${blockHints})` : ""}`;
  }).join("\n");

  return [
    "Clasificá esta conversación de Instagram/Manychat dentro de la estructura del CRM.",
    "Ignorá texto técnico o de interfaz de Manychat: PROPro indicator, fechas, Tú con números, automatizaciones, publicaciones, movimientos de conversación, asignaciones y pausas automáticas.",
    "Elegí el PROXIMO paso que conviene usar ahora para responder, no el último paso que ya se envió.",
    "Si el lead acaba de contar un dolor específico o qué quiere cambiar, el próximo paso suele ser 4. Quiebre.",
    "Si aparece objeción, elegí el bloque de objeciones más cercano. Si ya corresponde seguimiento, elegí follow ups.",
    "Respondé solo JSON válido con este formato exacto:",
    '{"stepId":"paso-4","stepNumber":4,"reason":"Ya respondió con un dolor concreto; toca llevarlo a patrón.","confidence":0.82}',
    "Pasos disponibles:",
    steps,
    body.contactName ? `Nombre visible: ${body.contactName}` : "",
    `Conversación visible:\n${body.chatContext}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildProviderBody(prompt: string, model: string, openAiCompatible: boolean) {
  if (openAiCompatible) {
    return {
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Sos un clasificador operacional de CRM. Elegís el próximo paso de una conversación de ventas por chat. Respondés solo JSON válido.",
        },
        { role: "user", content: prompt },
      ],
    };
  }

  return {
    prompt,
    input: {
      task: "detect_manychat_crm_step",
    },
  };
}

function extractText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const data = value as Record<string, unknown>;

  for (const key of ["text", "message", "content", "output"]) {
    const candidate = data[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  const choices = data.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== "object") continue;
      const message = (choice as Record<string, unknown>).message;
      if (message && typeof message === "object") {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === "string" && content.trim()) return content.trim();
      }
    }
  }

  return "";
}

function parseDetection(value: string): Partial<StepDetection> | null {
  const cleaned = value.replace(/```json|```/g, "").trim();
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;

  try {
    return JSON.parse(objectMatch[0]) as Partial<StepDetection>;
  } catch {
    return null;
  }
}

function normalizeDetection(value: Partial<StepDetection> | null, source: StepDetection["source"]): StepDetection | null {
  if (!value) return null;
  const step = STRUCTURE_STEPS.find((item) => item.id === value.stepId || item.number === Number(value.stepNumber));
  if (!step) return null;

  return {
    stepId: step.id,
    stepNumber: step.number,
    title: step.title,
    reason: typeof value.reason === "string" && value.reason.trim() ? value.reason.trim().slice(0, 220) : step.description,
    confidence: typeof value.confidence === "number" ? Math.max(0, Math.min(1, value.confidence)) : 0.65,
    source,
  };
}

function detectWithHeuristic(chatContext: string): StepDetection {
  const text = chatContext
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const rules: Array<{ number: number; score: number; reason: string; pattern: RegExp }> = [
    {
      number: 13,
      score: 7,
      reason: "La conversación habla de pagar o cuestionar el valor de la admisión.",
      pattern: /admision|reunion paga|pagar una reunion|gratis|vale la pena|precio de la reunion/,
    },
    {
      number: 11,
      score: 6,
      reason: "Aparece una objeción o una respuesta de freno; conviene reencuadrar sin discutir.",
      pattern: /lo tengo que pensar|no tengo tiempo|ya probe|ya hice terapia|estoy bien|no puedo|mas adelante|despues veo/,
    },
    {
      number: 10,
      score: 5,
      reason: "La conversación parece estar en seguimiento o retomando una charla anterior.",
      pattern: /te escribo|seguimos|quedamos|ayer|hace unos dias|retomo|pudiste ver|como venis|recordatorio/,
    },
    {
      number: 9,
      score: 5,
      reason: "Ya hay intención suficiente para invitar a avanzar a la reunión.",
      pattern: /agendar|agenda|reunion|call|llamada|horario|calendario|coordinar/,
    },
    {
      number: 8,
      score: 4,
      reason: "Ya se presentó el vehículo y toca encuadrar la revisión antes de invitar.",
      pattern: /diagnostico|revision|ver tu caso|primera instancia|analizar tu caso|mapear/,
    },
    {
      number: 7,
      score: 4,
      reason: "El chat ya muestra compromiso y toca presentar el vehículo de forma breve.",
      pattern: /quiero cambiar|estoy dispuesto|necesito cambiar|quiero empezar|me interesa|como seria|que ofrecen|programa|acompanamiento/,
    },
    {
      number: 6,
      score: 4,
      reason: "Ya hay dolor identificado y conviene medir compromiso real antes de presentar solución.",
      pattern: /de verdad quiero|ya no quiero seguir asi|necesito ayuda|quiero estar mejor|no doy mas|me cuesta sostener/,
    },
    {
      number: 5,
      score: 3,
      reason: "Hay material emocional suficiente para devolver un reencuadre empático.",
      pattern: /entiendo|me pasa|siento que|me cuesta|no se como|no puedo manejar|me supera|culpa/,
    },
    {
      number: 4,
      score: 8,
      reason: "El lead ya respondió con un dolor concreto; toca llevarlo de síntoma puntual a patrón sostenido.",
      pattern: /presion|ansiedad|tranquilidad|decisiones|familia|mama|papa|hermano|responsable|bienestar|obligado|colaborar|duelo|perdi|fallecio|estres|miedo|problema real|que te gustaria poder cambiar|cambiar primero/,
    },
    {
      number: 3,
      score: 3,
      reason: "La conversación todavía necesita bajar el problema a un dolor concreto.",
      pattern: /que te pasa|que te gustaria|cambiar|opciones|dolor|problema|contame mas/,
    },
    {
      number: 2,
      score: 2,
      reason: "La charla todavía está ubicando de dónde viene el desgaste.",
      pattern: /de donde viene|trabajo|pareja|familia|estudio|cansancio|desgaste|segmentar/,
    },
    {
      number: 1,
      score: 1,
      reason: "Solo hay apertura o saludo; corresponde iniciar simple.",
      pattern: /hola|buenas|como estas|claro que si|te leo/,
    },
  ];

  const best = rules
    .filter((rule) => rule.pattern.test(text))
    .sort((a, b) => b.score - a.score)[0];

  const step = STRUCTURE_STEPS.find((item) => item.number === (best?.number ?? 1)) ?? STRUCTURE_STEPS[0];

  return {
    stepId: step.id,
    stepNumber: step.number,
    title: step.title,
    reason: best?.reason ?? "No hay suficiente contexto; conviene empezar o mantener el opener.",
    confidence: best ? Math.min(0.9, 0.48 + best.score / 12) : 0.45,
    source: "heuristic",
  };
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  let body: DetectStepBody;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Cuerpo JSON inválido." }, 400);
  }

  const chatContext = sanitizeManychatContext(body.chatContext, { maxLines: 28 });
  if (!chatContext) {
    return json({ error: "Contexto del chat requerido." }, 400);
  }

  const fallback = detectWithHeuristic(chatContext);
  const { url, key, model, openAiCompatible, extensionToken } = readProviderConfig(body.aiProvider);

  if (!hasValidExtensionToken(request, extensionToken)) {
    return json({ error: "Token de extensión inválido." }, 401);
  }

  if (!url || !key) {
    return json({ detection: fallback, cleanedContext: chatContext });
  }

  const prompt = buildDetectionPrompt({ ...body, chatContext });

  try {
    const providerResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildProviderBody(prompt, model, openAiCompatible)),
    });

    const data = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) return json({ detection: fallback, cleanedContext: chatContext });

    const detection = normalizeDetection(parseDetection(extractText(data)), "ai");
    return json({ detection: detection ?? fallback, cleanedContext: chatContext });
  } catch {
    return json({ detection: fallback, cleanedContext: chatContext });
  }
}
