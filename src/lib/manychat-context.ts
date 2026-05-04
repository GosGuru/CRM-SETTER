const DEFAULT_MAX_CONTEXT_LINES = 24;

const DATE_BOUNDARIES = [
  /\b(?:Hoy|Ayer),?\s*\d{1,2}:\d{2}\b/gi,
  /\b\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,12}\s+\d{4},\s*\d{1,2}:\d{2}\b/g,
];

const INLINE_NOISE_PATTERNS = [
  /PROPro indicator:\s*A premium offering that requires a paid subscription\.?/gi,
  /\bT[uú]\d+\b/gi,
];

const SYSTEM_LINE_PATTERNS = [
  /^Yo$/i,
  /^Instagram$/i,
  /^T[uú]\d*$/i,
  /^PROPro indicator:/i,
  /^(?:Hoy|Ayer),?\s*\d{1,2}:\d{2}$/i,
  /^\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]{3,12}\s+\d{4},\s*\d{1,2}:\d{2}$/i,
  /^La automatizaci[oó]n\b.*\bse activ[oó]$/i,
  /^coment[oó] en tu publicaci[oó]n o reel$/i,
  /^Contenido no disponible$/i,
  /(^|\s)La conversaci[oó]n fue (movida|asignada|cerrada|abierta)\b/i,
  /^.+\bha (pausado|pasado) temporalmente las respuestas autom[aá]ticas\b/i,
  /\bpuedes editar la pausa o reanudar la automatizaci[oó]n\b/i,
  /^(Abrir Chats|Aceptar nuevas conversaciones|Automatizaciones|Bandeja de entrada|Contexto para adaptar|Etiquetas de contacto|Inbox|No asignado|Asignado a m[ií]|Todos los chats|Ordenar|Responder|Todos Los Canales|Enviar A Instagram|Suscrito a secuencias|Todo El Historial De Canales|Tiempo de contacto|Aceptaci[oó]n de ingreso)$/i,
];

type SanitizeManychatContextOptions = {
  maxLines?: number;
};

export function sanitizeManychatContext(value?: string | null, options: SanitizeManychatContextOptions = {}) {
  const maxLines = options.maxLines ?? DEFAULT_MAX_CONTEXT_LINES;
  const lines = prepareManychatLines(value ?? "")
    .map(normalizeManychatLine)
    .filter(isUsefulManychatLine);

  return uniqueManychatLines(lines).slice(-maxLines).join("\n");
}

function prepareManychatLines(value: string) {
  let text = String(value || "").replace(/\r/g, "\n");

  for (const pattern of DATE_BOUNDARIES) {
    text = text.replace(pattern, "\n$&\n");
  }

  return text.split(/\n+/);
}

function normalizeManychatLine(value: string) {
  let text = String(value || "").replace(/\s+/g, " ").trim();

  for (const pattern of INLINE_NOISE_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  return text
    .replace(/^[✓✔]+\s*/, "")
    .replace(/\s*[✓✔]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulManychatLine(text: string) {
  if (!text || text.length < 2 || text.length > 700) return false;
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(text)) return false;
  return !SYSTEM_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

function uniqueManychatLines(values: string[]) {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const key = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }

  return unique;
}