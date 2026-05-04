import { NextResponse } from "next/server";

import { hasValidExtensionToken } from "@/lib/extension-auth";
import { sanitizeManychatContext } from "@/lib/manychat-context";

type AdaptMessageBody = {
  stepTitle?: string;
  blockTitle?: string;
  baseText?: string;
  contactName?: string;
  chatContext?: string;
  aiProvider?: string;
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

function buildAdaptationPrompt(body: Required<Pick<AdaptMessageBody, "baseText">> & AdaptMessageBody) {
  return [
    "Adaptá este mensaje comercial de CRM para enviarlo por Instagram/Manychat.",
    "Devolvé solamente el texto final listo para copiar, sin explicación.",
    "Mantené un tono humano, claro, corto y no invasivo.",
    body.stepTitle ? `Paso: ${body.stepTitle}` : "",
    body.blockTitle ? `Bloque: ${body.blockTitle}` : "",
    body.contactName ? `Nombre visible del lead: ${body.contactName}` : "",
    body.chatContext ? `Contexto visible del chat:\n${body.chatContext}` : "",
    `Mensaje base:\n${body.baseText}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function readProviderConfig(provider?: string) {
  const selectedProvider = provider === "edipsic" || provider === "edith" ? provider : "deepseek";
  const providerConfig = {
    deepseek: {
      url: process.env.DEEPSEEK_API_URL,
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      openAiCompatible: true,
      needsEnv: ["DEEPSEEK_API_URL", "DEEPSEEK_API_KEY"],
    },
    edipsic: {
      url: process.env.EDIPSIC_API_URL,
      key: process.env.EDIPSIC_API_KEY,
      model: process.env.EDIPSIC_MODEL ?? "deepseek-chat",
      openAiCompatible: Boolean(process.env.EDIPSIC_API_URL?.includes("/chat/completions")),
      needsEnv: ["EDIPSIC_API_URL", "EDIPSIC_API_KEY"],
    },
    edith: {
      url: process.env.EDITH_API_URL,
      key: process.env.EDITH_API_KEY,
      model: process.env.EDITH_MODEL ?? "deepseek-chat",
      openAiCompatible: Boolean(process.env.EDITH_API_URL?.includes("/chat/completions")),
      needsEnv: ["EDITH_API_URL", "EDITH_API_KEY"],
    },
  }[selectedProvider];

  const extensionToken = process.env.EXTENSION_API_TOKEN;
  return { ...providerConfig, provider: selectedProvider, extensionToken };
}

function pickAdaptedText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const data = value as Record<string, unknown>;

  for (const key of ["adapted", "text", "message", "content", "output"]) {
    const candidate = data[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }

  const choices = data.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== "object") continue;
      const choiceRecord = choice as Record<string, unknown>;
      const message = choiceRecord.message;
      if (message && typeof message === "object") {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === "string" && content.trim()) return content.trim();
      }
    }
  }

  return "";
}

function buildProviderBody({
  prompt,
  body,
  baseText,
  model,
  openAiCompatible,
}: {
  prompt: string;
  body: AdaptMessageBody;
  baseText: string;
  model: string;
  openAiCompatible: boolean;
}) {
  if (openAiCompatible) {
    return {
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente de ventas por chat. Adaptás mensajes en español rioplatense/neutro, humanos y breves. Respondés solo con el texto final listo para enviar.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    };
  }

  return {
    prompt,
    input: {
      task: "adapt_manychat_message",
      stepTitle: body.stepTitle,
      blockTitle: body.blockTitle,
      baseText,
      contactName: body.contactName,
      chatContext: body.chatContext,
    },
  };
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  let body: AdaptMessageBody;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Cuerpo JSON inválido." }, 400);
  }

  const baseText = body.baseText?.trim();
  if (!baseText) {
    return json({ error: "Mensaje base requerido." }, 400);
  }

  const { url, key, model, extensionToken, openAiCompatible, needsEnv } = readProviderConfig(body.aiProvider);
  if (!url || !key) {
    return json(
      {
        error: "Proveedor IA no configurado.",
        code: "AI_PROVIDER_NOT_CONFIGURED",
        needsEnv,
      },
      501
    );
  }

  if (!hasValidExtensionToken(request, extensionToken)) {
    return json({ error: "Token de extensión inválido." }, 401);
  }

  const cleanBody = {
    ...body,
    chatContext: sanitizeManychatContext(body.chatContext),
  };
  const prompt = buildAdaptationPrompt({ ...cleanBody, baseText });

  try {
    const providerResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildProviderBody({ prompt, body: cleanBody, baseText, model, openAiCompatible })),
    });

    const data = await providerResponse.json().catch(() => ({}));

    if (!providerResponse.ok) {
      return json(
        {
          error: "El proveedor IA devolvió un error.",
          status: providerResponse.status,
          provider: data,
        },
        502
      );
    }

    const adapted = pickAdaptedText(data);
    if (!adapted) {
      return json({ error: "No se pudo leer el texto adaptado del proveedor IA." }, 502);
    }

    return json({ adapted });
  } catch {
    return json({ error: "No se pudo conectar con el proveedor IA." }, 502);
  }
}