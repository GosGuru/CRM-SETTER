export const APP_THEME_VALUES = ["light", "dark", "productivity", "habits"] as const;

export type AppTheme = (typeof APP_THEME_VALUES)[number];

export const APP_THEMES: ReadonlyArray<{
  value: AppTheme;
  label: string;
  description: string;
}> = [
  {
    value: "light",
    label: "Claro",
    description: "Blanco/negro limpio",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Negro/blanco de alto contraste",
  },
  {
    value: "productivity",
    label: "Azul Productividad",
    description: "Foco y concentración",
  },
  {
    value: "habits",
    label: "Verde Hábitos",
    description: "Consistencia y progreso",
  },
] as const;

export function isAppTheme(value: string): value is AppTheme {
  return (APP_THEME_VALUES as readonly string[]).includes(value);
}
