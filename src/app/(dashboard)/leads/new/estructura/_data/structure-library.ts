export type StructureBlockKind = "mensaje" | "razon" | "nota" | "seguimiento" | "objecion" | "tono" | "cta";

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
  category: string;
  title: string;
  description: string;
  blocks: StructureBlock[];
};

export const STRUCTURE_LIBRARY_STORAGE_KEY = "crm-structure-library-v3";

export const STRUCTURE_KIND_LABELS: Record<StructureBlockKind, string> = {
  mensaje: "Mensaje",
  razon: "Por qué",
  nota: "Nota",
  seguimiento: "FUP",
  objecion: "Objeción",
  tono: "Tono",
  cta: "CTA",
};

export const STRUCTURE_STEPS: StructureStep[] = [
  {
    id: "paso-1",
    number: 1,
    category: "Flujo principal",
    title: "Opener",
    description: "Abrir simple, humano y sin vender de entrada.",
    blocks: [
      {
        id: "paso-1-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Opener literal para abrir la conversación sin hacerlo demasiado intenso.",
        placeholder: "Pegá acá el opener del paso 1...",
      },
      {
        id: "paso-1-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "Intención del paso para sostener el tono correcto.",
        placeholder: "Pegá acá el por qué del paso 1...",
      },
    ],
  },
  {
    id: "paso-2",
    number: 2,
    category: "Flujo principal",
    title: "Segmentación",
    description: "Detectar rápido de dónde viene el desgaste.",
    blocks: [
      {
        id: "paso-2-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Pregunta de segmentación para ubicar el origen del cansancio.",
        placeholder: "Pegá acá el mensaje del paso 2...",
      },
      {
        id: "paso-2-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "Criterio para saber que estas detectando en este punto.",
        placeholder: "Pegá acá el por qué del paso 2...",
      },
    ],
  },
  {
    id: "paso-3",
    number: 3,
    category: "Flujo principal",
    title: "Dolor específico",
    description: "Hacer que identifique el problema real con opciones claras.",
    blocks: [
      {
        id: "paso-3-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Pregunta para bajar el dolor a algo concreto y nombrable.",
        placeholder: "Pegá acá el mensaje del paso 3...",
      },
      {
        id: "paso-3-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "Intención del paso para que no quede en una charla genérica.",
        placeholder: "Pegá acá el por qué del paso 3...",
      },
    ],
  },
  {
    id: "paso-4",
    number: 4,
    category: "Flujo principal",
    title: "Quiebre",
    description: "Pasar de algo puntual a la idea de patrón sostenido.",
    blocks: [
      {
        id: "paso-4-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Pregunta y reencuadre para que vea la continuidad del problema.",
        placeholder: "Pegá acá el mensaje del paso 4...",
      },
      {
        id: "paso-4-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "La función del quiebre dentro de la conversación.",
        placeholder: "Pegá acá el por qué del paso 4...",
      },
    ],
  },
  {
    id: "paso-5",
    number: 5,
    category: "Flujo principal",
    title: "Reframe",
    description: "Mostrar que entendés el fondo, no solo el síntoma.",
    blocks: [
      {
        id: "paso-5-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Reencuadre empático para ordenar lo que viene diciendo.",
        placeholder: "Pegá acá el mensaje del paso 5...",
      },
      {
        id: "paso-5-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "Criterio para que el reframe no suene a diagnóstico frío.",
        placeholder: "Pegá acá el por qué del paso 5...",
      },
    ],
  },
  {
    id: "paso-6",
    number: 6,
    category: "Flujo principal",
    title: "Compromiso",
    description: "Filtrar curiosos y medir si realmente quiere cambiar.",
    blocks: [
      {
        id: "paso-6-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Pregunta directa para medir intención real.",
        placeholder: "Pegá acá el mensaje del paso 6...",
      },
      {
        id: "paso-6-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "Función del filtro antes de presentar el vehículo.",
        placeholder: "Pegá acá el por qué del paso 6...",
      },
    ],
  },
  {
    id: "paso-7",
    number: 7,
    category: "Flujo principal",
    title: "Pitch corto",
    description: "Presentar el vehículo y el resultado sin vender el programa entero.",
    blocks: [
      {
        id: "paso-7-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Pitch breve para conectar patrón, sistema y resultado.",
        placeholder: "Pegá acá el mensaje del paso 7...",
      },
      {
        id: "paso-7-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "Límite del pitch para no explicar de más por chat.",
        placeholder: "Pegá acá el por qué del paso 7...",
      },
    ],
  },
  {
    id: "paso-8",
    number: 8,
    category: "Flujo principal",
    title: "Pre pitch CTA",
    description: "Instalar el valor de la revisión y diagnóstico antes de agendar.",
    blocks: [
      {
        id: "paso-8-mensaje",
        title: "Mensaje",
        kind: "mensaje",
        helper: "Encuadre de la primera instancia para que no parezca una charla genérica.",
        placeholder: "Pegá acá el mensaje del paso 8...",
      },
    ],
  },
  {
    id: "paso-9",
    number: 9,
    category: "Flujo principal",
    title: "CTA",
    description: "Invitación final para avanzar a la reunión con el valor ya encuadrado.",
    blocks: [
      {
        id: "paso-9-mensaje",
        title: "CTA principal",
        kind: "cta",
        helper: "Cierre listo para copiar y mandar tal cual o adaptar.",
        placeholder: "Pegá acá el CTA del paso 9...",
      },
      {
        id: "paso-9-por-que",
        title: "Por qué",
        kind: "razon",
        helper: "Cómo sostener el valor de la reunión sin esconderlo.",
        placeholder: "Pegá acá el por qué del paso 9...",
      },
    ],
  },
  {
    id: "follow-ups",
    number: 10,
    category: "Seguimiento",
    title: "Follow ups adaptados",
    description: "Seguimiento corto, reactivo y alineado con intención.",
    blocks: [
      {
        id: "follow-ups-logica",
        title: "Lógica",
        kind: "nota",
        helper: "Criterio general para usar estos mensajes sin sobreexplicar.",
        placeholder: "Pegá acá la lógica de follow ups...",
      },
      {
        id: "follow-ups-mensajes",
        title: "Mensajes",
        kind: "seguimiento",
        helper: "Cada follow-up queda en una línea o bloque para copiar rápido.",
        placeholder: "Pegá acá los follow ups...",
      },
    ],
  },
  {
    id: "objeciones-probables",
    number: 11,
    category: "Objeciones",
    title: "Objeciones más probables",
    description: "Respuestas base para no discutir y reencuadrar desde el fondo real.",
    blocks: [
      {
        id: "objecion-estoy-bien",
        title: "Estoy bien / lo llevo",
        kind: "objecion",
        helper: "Respuesta para abrir el fondo sin contradecirlo.",
        placeholder: "Pegá acá la respuesta...",
      },
      {
        id: "objecion-ya-probe",
        title: "Ya hice terapia / ya probe otras cosas",
        kind: "objecion",
        helper: "Respuesta para diferenciar patrón concreto de intentos anteriores.",
        placeholder: "Pegá acá la respuesta...",
      },
      {
        id: "objecion-no-tiempo",
        title: "No tengo tiempo",
        kind: "objecion",
        helper: "Respuesta para convertir falta de tiempo en señal de necesidad.",
        placeholder: "Pegá acá la respuesta...",
      },
      {
        id: "objecion-pensar",
        title: "Lo tengo que pensar",
        kind: "objecion",
        helper: "Respuesta para traer claridad sin presionar.",
        placeholder: "Pegá acá la respuesta...",
      },
    ],
  },
  {
    id: "tono-oferta",
    number: 12,
    category: "Tono",
    title: "Recomendación de tono",
    description: "Cómo debería sonar la conversación para esta oferta.",
    blocks: [
      {
        id: "tono-recomendado",
        title: "Tono recomendado",
        kind: "tono",
        helper: "Dirección de voz para mantener calma, claridad y seguridad.",
        placeholder: "Pegá acá el tono recomendado...",
      },
      {
        id: "tono-oferta-concreta",
        title: "Oferta concreta",
        kind: "nota",
        helper: "Elementos concretos de la oferta para recordar durante la conversación.",
        placeholder: "Pegá acá la oferta concreta...",
      },
    ],
  },
  {
    id: "admision-cobrada",
    number: 13,
    category: "Objeción admisión",
    title: "Cómo resolver: la admisión se cobra",
    description: "Paso a paso para reencuadrar la reunión de admisión con valor.",
    blocks: [
      {
        id: "admision-paso-a-paso",
        title: "Paso a paso",
        kind: "objecion",
        helper: "Secuencia para validar, reencuadrar, mostrar valor, ir a la raíz y cerrar.",
        placeholder: "Pegá acá el paso a paso...",
      },
      {
        id: "admision-respuesta-completa",
        title: "Respuesta completa",
        kind: "mensaje",
        helper: "Versión lista para enviar si querés responder todo junto.",
        placeholder: "Pegá acá la respuesta completa...",
      },
      {
        id: "admision-raro-pagar",
        title: "Si responde: igual me parece raro pagar una reunión",
        kind: "objecion",
        helper: "Segunda capa mas firme para no repetir lo mismo.",
        placeholder: "Pegá acá la respuesta...",
      },
      {
        id: "admision-explicar-gratis",
        title: "Si responde: prefiero que primero me expliques gratis",
        kind: "objecion",
        helper: "Respuesta para salir de la generalidad y volver al caso puntual.",
        placeholder: "Pegá acá la respuesta...",
      },
      {
        id: "admision-no-se-vale",
        title: "Si responde: no sé si vale la pena",
        kind: "objecion",
        helper: "Respuesta para ubicar la admisión como forma de comprobar valor.",
        placeholder: "Pegá acá la respuesta...",
      },
      {
        id: "admision-formula",
        title: "Fórmula para memorizar",
        kind: "nota",
        helper: "Estructura corta para resolver objeciones sin discutir.",
        placeholder: "Pegá acá la fórmula...",
      },
    ],
  },
];

export const DEFAULT_STRUCTURE_DRAFTS: Record<string, string> = {
  "paso-1-mensaje":
    "Buenas, ¿cómo va? Contame, últimamente venís bastante cargado mentalmente o sentís que la estás llevando bien?",
  "paso-1-por-que": "Abre fácil, sin vender y sin hacerlo demasiado intenso.",
  "paso-2-mensaje":
    "Claro, te entiendo. ¿Eso te pasa más por laburo, por responsabilidades personales o es una mezcla?",
  "paso-2-por-que": "Detectás rápido de dónde viene el desgaste.",
  "paso-3-mensaje":
    "Y hoy qué es lo que más te pesa, no poder desconectar, dormir mal, ansiedad/estrés o tener la cabeza en loop?",
  "paso-3-por-que": "Le das opciones y hacés que identifique el problema real.",
  "paso-4-mensaje": [
    "Claro y hace cuánto venís sosteniendo eso?",
    "Porque cuando se alarga, deja de ser algo puntual y se vuelve tu forma normal de funcionar.",
  ].join("\n"),
  "paso-4-por-que": "Acá deja de verlo como “algo que me pasa” y empieza a verlo como un patrón.",
  "paso-5-mensaje":
    "Por lo que me decís, no parece falta de ganas. Parece más que venís funcionando bien por fuera, pero por dentro seguís en alerta y eso te está drenando.",
  "paso-5-por-que": "Le mostrás que entendés el fondo, no solo el síntoma.",
  "paso-6-mensaje":
    "Te pregunto directo: ¿hoy querés ordenar esto de raíz o sentís que todavía lo podés seguir pateando?",
  "paso-6-por-que": "Filtra curiosos y mide si realmente quiere cambiar.",
  "paso-7-mensaje":
    "Justamente me dedico a trabajar eso: detectar el patrón que te está drenando y armar un sistema adaptado a tu vida real para recuperar calma, energía y control.",
  "paso-7-por-que":
    "No vendés el programa entero. Presentás el vehículo y el resultado.",
  "paso-8-mensaje": [
    "La primera instancia es una reunión de revision y diagnóstico.",
    "Ahí vemos tu caso puntual, qué patrón te está drenando y si realmente tiene sentido avanzar con Método Origen.",
    "Tiene un valor porque no es una charla informativa ni algo genérico; salís con claridad aplicada a tu situación.",
  ].join("\n"),
  "paso-9-mensaje": [
    "Hagamos algo, agendemos una reunión y te muestro bien cómo se aplicaría esto a tu caso puntual, así ves con claridad qué habría que ajustar para destrabarlo/destrabar ese problema",
    "te queda mejor mañana o pasado?",
  ].join("\n"),
  "paso-9-por-que":
    "Ponés el precio como algo natural antes de agendar. No lo escondés. La reunión no se vende como “llamada gratis”, sino como diagnóstico con valor.",
  "follow-ups-logica":
    "Tomé la lógica de seguimiento corta que aparece en tus materiales: follow-up rápido, emoji, reactivación por intención y caso similar.",
  "follow-ups-mensajes": [
    "FUP 2 (24 hs)\n🙃",
    "FUP 3 (48 hs)\nQuería saber si todavía tienes intención de cambiar eso.",
    "FUP 4 (72 hs)\nHoy vi un caso muy parecido al tuyo que logró destrabarlo.\nSi quieres, te cuento.",
  ].join("\n\n"),
  "objecion-estoy-bien": [
    "Entiendo.",
    "Te lo preguntaba más que nada porque muchas personas por fuera se ven bien, pero por dentro llevan bastante tiempo sosteniéndose en automático.",
  ].join("\n"),
  "objecion-ya-probe": [
    "Claro, te entiendo.",
    "Justamente mucha gente llega después de haber probado varias cosas, pero sin encontrar el patrón concreto que le genera ese desgaste.",
  ].join("\n"),
  "objecion-no-tiempo": [
    "Te entiendo.",
    "De hecho, justamente cuando una persona no encuentra tiempo para bajar un cambio, normalmente es cuando más necesita ordenar esto bien.",
  ].join("\n"),
  "objecion-pensar": [
    "Perfecto.",
    "Te hago una consulta, ¿qué es lo que te gustaría pensar exactamente?",
    "Te lo digo porque la idea de la charla es justamente darte claridad para que veas si esto aplica o no a tu caso.",
  ].join("\n"),
  "tono-recomendado": [
    "Para esta oferta, yo no iría con un tono demasiado “vendedor” ni demasiado informal.",
    "Lo mejor sería sonar:",
    "calmo + empático + claro + seguro",
    "Porque la oferta no promete “motivación”, sino diagnóstico, recuperación real y cambio sostenible. Eso está muy marcado en la presentación.",
  ].join("\n"),
  "tono-oferta-concreta":
    "También te deja una oferta concreta: programa de 8 semanas con sesiones 1 a 1, soporte por WhatsApp, diagnóstico personalizado y sistema a medida.",
  "admision-paso-a-paso": [
    "Paso 1: validar sin achicarse",
    "Primero no te pongas a justificarte de una ni a pelear.",
    "“Te entiendo, obvio. A muchos al principio les hace ruido.”",
    "Eso baja defensas y evita que se arme discusión.",
    "",
    "Paso 2: reencuadrar rápido",
    "Acá cambiás el marco de “me cobran por hablar” a “esto es una instancia de análisis y claridad”.",
    "“Igual no se cobra por hablar en sí.”",
    "“Se cobra porque es una admisión donde bajamos tu caso puntual y vemos si realmente esto aplica a vos o no.”",
    "Ahí cortás la interpretación equivocada.",
    "",
    "Paso 3: mostrar el valor real de la admisión (escasez)",
    "Ahora le explicás qué obtiene, sin irte largo.",
    "“La idea es que no salgas con información genérica, sino con claridad sobre qué te está frenando, qué habría que ajustar y si de verdad tiene sentido avanzar.”",
    "Esto encaja con el enfoque de tus materiales: usar la llamada para dar claridad, trabajar objeciones desde el fondo real y no desde superficie.",
    "",
    "Paso 4: llevarlo a la raíz",
    "Acá lo hacés pensar un poco.",
    "“Porque si no, terminás decidiendo desde la duda o desde una idea general, y no desde algo aplicado a tu caso.”",
    "Con eso la admisión deja de verse como gasto y pasa a verse como filtro/claridad.",
    "",
    "Paso 5: cerrar con dirección",
    "No lo dejes abierto. Terminá guiando.",
    "“Entonces, más que si se cobra o no, la pregunta real es si hoy te interesa tener claridad de verdad sobre esto y ver si aplica a tu caso.”",
    "O:",
    "“Si te interesa resolverlo en serio, la admisión justamente está para eso: que lo veas con criterio y no a ciegas.”",
  ].join("\n"),
  "admision-respuesta-completa":
    "Te entiendo, obvio. A muchos al principio les hace ruido. Igual no se cobra por hablar en sí, se cobra porque es una admisión donde bajamos tu caso puntual, vemos qué te está frenando realmente y si esto aplica a vos o no. La idea es que no salgas con algo genérico, sino con claridad para decidir con criterio y no desde la duda. Entonces, más que si se cobra o no, la pregunta real es si hoy te interesa resolver esto de verdad y verlo aplicado a tu caso.",
  "admision-raro-pagar":
    "Sí, te entiendo. Pasa que si fuera solo una charla informativa te diría que sí, sería raro. Pero justamente no es eso. Es una instancia de admisión para analizar tu caso, ordenar el panorama y ver con claridad si tiene sentido avanzar o no.",
  "admision-explicar-gratis":
    "Te podría decir cosas generales, pero justamente la idea de la admisión es no quedarnos en generalidades y bajar todo a tu situación puntual. Si no, corrés el riesgo de escuchar algo que suena bien, pero que capaz ni aplica a tu caso.",
  "admision-no-se-vale":
    "Y está perfecto, justamente para eso es la admisión. Para que puedas ver si realmente te aporta valor, si aplica a tu caso y si tiene sentido avanzar, en vez de quedarte en la duda.",
  "admision-formula": [
    "Memorizala así:",
    "validar → reencuadrar → mostrar valor → llevar a raíz → dirigir",
    "O en criollo:",
    "“te entiendo” → “no se cobra por hablar” → “se analiza tu caso” → “salís con claridad” → “la pregunta es si querés resolverlo de verdad”",
    "Eso va bastante alineado con tu material de objeciones: no discutir, entender qué hay detrás, reencuadrar y redirigir a una decisión con claridad.",
  ].join("\n"),
};
