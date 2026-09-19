export type CursoSlug = "informatica" | "eletro" | "vestuario" | "textil";
export type CasaSlug = "corvinal" | "grifinoria" | "sonserina" | "lufa-lufa";

export const CURSOS = [
  { slug: "informatica" as const, nome: "Informática", casa: "grifinoria" as const, casaNome: "Grifinória" },
  { slug: "eletro" as const, nome: "Eletro", casa: "sonserina" as const, casaNome: "Sonserina" },
  { slug: "vestuario" as const, nome: "Vestuário", casa: "corvinal" as const, casaNome: "Corvinal" },
  { slug: "textil" as const, nome: "Têxtil", casa: "lufa-lufa" as const, casaNome: "Lufa-Lufa" },
];

export const CURSO_POR_SLUG = Object.fromEntries(CURSOS.map((curso) => [curso.slug, curso])) as Record<CursoSlug, (typeof CURSOS)[number]>;
export const CASA_POR_CURSO = Object.fromEntries(CURSOS.map((curso) => [curso.slug, curso.casa])) as Record<CursoSlug, CasaSlug>;

export const NOMES_CASAS: Record<string, string> = {
  corvinal: "Corvinal",
  grifinoria: "Grifinória",
  sonserina: "Sonserina",
  "lufa-lufa": "Lufa-Lufa",
};

export const NOMES_CURSOS: Record<string, string> = {
  informatica: "Informática",
  eletro: "Eletro",
  vestuario: "Vestuário",
  textil: "Têxtil",
};
