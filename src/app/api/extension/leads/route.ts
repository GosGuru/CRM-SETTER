import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { hasValidExtensionToken } from "@/lib/extension-auth";
import { sanitizeManychatContext } from "@/lib/manychat-context";
import type { Lead } from "@/types/database";

type CreateLeadBody = {
  nombre?: string;
  instagram?: string;
  chatContext?: string;
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

function normalizeStoredName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenizeSearch(value: string) {
  return canonicalText(value).split(" ").filter(Boolean);
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function normalizeInstagram(value?: string) {
  const normalized = value?.trim().replace(/^@/, "").toLowerCase() ?? "";
  return /^[a-z0-9._]{3,30}$/.test(normalized) ? normalized : "";
}

function hasServiceRoleKeyFormat(token: string) {
  if (token.startsWith("sb_secret_")) return true;

  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(Buffer.from(normalizedPayload, "base64").toString("utf8")) as { role?: string };
    return data.role === "service_role";
  } catch {
    return false;
  }
}

async function resolveSetterId(adminClient: SupabaseClient) {
  const configured = process.env.EXTENSION_DEFAULT_SETTER_ID ?? process.env.EXTENSION_SETTER_ID;
  if (configured) return configured;

  const { data, error } = await adminClient
    .from("users")
    .select("id")
    .eq("role", "setter")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  const users = (data ?? []) as { id: string }[];
  return users[0]?.id ?? "";
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  const extensionToken = process.env.EXTENSION_API_TOKEN;
  if (!hasValidExtensionToken(request, extensionToken)) {
    return json({ error: "Token de extensión inválido." }, 401);
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return json(
      {
        error: "Cargar leads desde Manychat requiere SUPABASE_SERVICE_ROLE_KEY en .env.local.",
        code: "SERVICE_ROLE_NOT_CONFIGURED",
      },
      501
    );
  }

  if (!hasServiceRoleKeyFormat(serviceRoleKey)) {
    return json(
      {
        error: "SUPABASE_SERVICE_ROLE_KEY no es una service role key. Pegaste una clave anon o incorrecta.",
        code: "SERVICE_ROLE_INVALID",
      },
      501
    );
  }

  let body: CreateLeadBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Cuerpo JSON inválido." }, 400);
  }

  const nombre = normalizeStoredName(body.nombre ?? "");
  if (!nombre) {
    return json({ error: "Nombre requerido." }, 400);
  }

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const instagram = normalizeInstagram(body.instagram);
  const canonical = canonicalText(nombre);
  const probeToken = tokenizeSearch(nombre)[0] ?? canonical;
  const probe = `%${escapeLikePattern(probeToken)}%`;

  const { data: nameCandidates, error: nameError } = await adminClient
    .from("leads")
    .select("id, nombre, instagram")
    .ilike("nombre", probe)
    .limit(50);

  if (nameError) return json({ error: nameError.message }, 400);

  const duplicateByName = (nameCandidates ?? []).find((row) => canonicalText(row.nombre) === canonical);
  if (duplicateByName) {
    return json(
      {
        error: `Ya existe un lead con el nombre "${duplicateByName.nombre}".`,
        code: "DUPLICATE_LEAD",
        leadId: duplicateByName.id,
      },
      409
    );
  }

  if (instagram) {
    const { data: instagramDuplicate, error: instagramError } = await adminClient
      .from("leads")
      .select("id, nombre, instagram")
      .eq("instagram", instagram)
      .maybeSingle();

    if (instagramError) return json({ error: instagramError.message }, 400);
    if (instagramDuplicate) {
      return json(
        {
          error: `Ya existe un lead con Instagram @${instagram}.`,
          code: "DUPLICATE_LEAD",
          leadId: instagramDuplicate.id,
        },
        409
      );
    }
  }

  let setterId = "";
  try {
    setterId = await resolveSetterId(adminClient);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "No se pudo resolver el setter." }, 400);
  }

  if (!setterId) {
    return json(
      {
        error: "No hay setter configurado para crear leads desde la extensión.",
        code: "SETTER_NOT_CONFIGURED",
      },
      501
    );
  }

  const row: Record<string, unknown> = {
    nombre,
    setter_id: setterId,
    estado: "nuevo",
  };

  if (instagram) row.instagram = instagram;
  const chatContext = sanitizeManychatContext(body.chatContext, { maxLines: 40 });
  if (chatContext) row.respuestas = chatContext.slice(0, 5000);

  const { data, error } = await adminClient.from("leads").insert(row).select("id, nombre, instagram, created_at").single();

  if (error) return json({ error: error.message }, 400);

  return json({ ok: true, lead: data as Pick<Lead, "id" | "nombre" | "instagram" | "created_at"> });
}
