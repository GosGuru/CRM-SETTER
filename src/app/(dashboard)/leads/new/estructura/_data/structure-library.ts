export type StructureBlockKind = "principal" | "opciones" | "nota" | "cta";

export type StructureBlock = {
  id: string;
  title: string;
  kind: StructureBlockKind;
  helper: string;
  placeholder: string;
};

export type StructureStep = {
  id: string;
  number: number;
  title: string;
  description: string;
  blocks: StructureBlock[];
};

export const STRUCTURE_LIBRARY_STORAGE_KEY = "crm-structure-library-v2";

export const STRUCTURE_KIND_LABELS: Record<StructureBlockKind, string> = {
  principal: "Guion",
  opciones: "Opciones",
  nota: "Nota",
  cta: "CTA",
};

export const STRUCTURE_STEPS: StructureStep[] = [
  {
    id: "paso-1",
    number: 1,
    title: "Opener",
    description: "Abrir simple, humano y sin vender de entrada.",
    blocks: [
      {
        id: "paso-1-opener",
        title: "Opener mas alineado con la oferta",
        kind: "principal",
        helper: "Linea lista para copiar y usar en el primer contacto.",
        placeholder: "Pegá aca el opener del paso 1...",
      },
    ],
  },
  {
    id: "paso-2",
    number: 2,
    title: "Segmentacion",
    description: "Acá buscás entender en qué punto está y si realmente encaja con la oferta.",
    blocks: [
      {
        id: "paso-2-opciones",
        title: "Preguntas de segmentacion",
        kind: "opciones",
        helper: "Cada renglon es una opcion para copiar por separado.",
        placeholder: "Pegá aca las preguntas de segmentacion...",
      },
      {
        id: "paso-2-nota-avatar",
        title: "Importante",
        kind: "nota",
        helper: "Contexto del avatar para tener claro el dolor de fondo.",
        placeholder: "Pegá aca la nota importante del paso 2...",
      },
    ],
  },
  {
    id: "paso-3",
    number: 3,
    title: "Situacion + gap",
    description: "Acá hacés que exprese el problema real.",
    blocks: [
      {
        id: "paso-3-opciones",
        title: "Preguntas de situacion + gap",
        kind: "opciones",
        helper: "Cada renglon abre una forma distinta de que exprese el problema real.",
        placeholder: "Pegá aca las preguntas del paso 3...",
      },
    ],
  },
  {
    id: "paso-4",
    number: 4,
    title: "Transicion",
    description: "Reencuadre del problema sin juzgar.",
    blocks: [
      {
        id: "paso-4-opciones",
        title: "Opciones de transicion",
        kind: "opciones",
        helper: "Frases de reencuadre listas para copiar por renglon.",
        placeholder: "Pegá aca las transiciones del paso 4...",
      },
      {
        id: "paso-4-core-oferta",
        title: "Core de la oferta",
        kind: "nota",
        helper: "Nota para sostener el encuadre correcto cuando conduzcas la conversacion.",
        placeholder: "Pegá aca el core de la oferta...",
      },
    ],
  },
  {
    id: "paso-5",
    number: 5,
    title: "CTA",
    description: "Invitacion final para avanzar a la reunion.",
    blocks: [
      {
        id: "paso-5-cta",
        title: "CTA principal",
        kind: "cta",
        helper: "Cierre listo para copiar y mandar tal cual o adaptar.",
        placeholder: "Pegá aca el CTA del paso 5...",
      },
    ],
  },
];

export const DEFAULT_STRUCTURE_DRAFTS: Record<string, string> = {
  "paso-1-opener":
    "Buenas, ¿cómo va? Contame, más allá de cómo se ve todo desde afuera, ¿vos cómo te estás sintiendo de verdad con todo lo que venís sosteniendo?",
  "paso-2-opciones": [
    "¿Eso te pasa más por trabajo, por responsabilidades de casa, o por una mezcla de todo?",
    "¿Hace cuánto vienes sintiéndote así?",
    "¿Te pasa más como estrés constante, ansiedad, agotamiento mental o problemas para descansar?",
    "¿Ya intentaste resolverlo de alguna forma o todavía no encontraste algo que te ayude de verdad?",
  ].join("\n"),
  "paso-2-nota-avatar":
    "En la presentación aparece que el avatar suele verse “bien” desde afuera, con carrera, resultados y reconocimiento, pero por dentro vive en modo alerta permanente. También menciona síntomas como opresión en el pecho, anticiparse a problemas, no poder estar presente y la cabeza en loop antes de dormir.",
  "paso-3-opciones": [
    "Te entiendo. ¿Y qué sentis que es lo que más te está desgastando hoy?",
    "¿Qué es lo que más te pesa: no poder desconectar, dormir mal, vivir en alerta o sentir que nunca bajas un cambio?",
    "¿Qué suele pasar normalmente? ¿Aguantas bien unos días y después vuelves al mismo punto?",
    "¿Ya probaste cosas antes para mejorarlo y terminaste igual?",
  ].join("\n"),
  "paso-4-opciones": [
    "Claro, te entiendo. Por lo que me decis, no parece falta de ganas, sino que todavía nadie encontró el patrón exacto que te está drenando.",
    "Tiene sentido. Muchas personas no están mal por falta de disciplina, sino porque están intentando resolver síntomas y no la raíz.",
    "Te entiendo. A veces no es que no puedas con todo, sino que llevas demasiado tiempo sosteniéndolo desde la urgencia.",
    "Sí, eso pasa mucho. Desde fuera parece que todo está bien, pero por dentro el cuerpo y la cabeza siguen en alerta.",
  ].join("\n"),
  "paso-4-core-oferta":
    "Esto está muy alineado con el core de la oferta: “no es falta de disciplina”, “no tratamos síntomas”, “identificamos el patrón exacto que genera tu agotamiento” y luego se construye un sistema adaptado a su vida real.",
  "paso-5-cta":
    "Hagamos algo, agendemos una reunión y te muestro bien cómo se aplicaría esto a tu caso puntual, así ves con claridad qué habría que ajustar para destrabarlo/destrabar ese problema",
};
