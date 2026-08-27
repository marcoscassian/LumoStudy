"use client";

import { useEffect } from "react";

export const CASAS_POR_AVATAR = {
  "/loja/perfil1.png": "corvinal",
  "/loja/perfil2.png": "lufa-lufa",
  "/loja/perfil3.png": "sonserina",
  "/loja/perfil4.png": "grifinoria",
};

export const NOMES_CASAS = {
  corvinal: "Corvinal",
  "lufa-lufa": "Lufa-Lufa",
  sonserina: "Sonserina",
  grifinoria: "Grifinória",
};

export function casaDaFoto(avatarUrl) {
  return CASAS_POR_AVATAR[String(avatarUrl || "")] || null;
}

export function resolverCorDoTema(avatarUrl, temaRoxoPadrao = false) {
  if (temaRoxoPadrao) return "padrao";
  return casaDaFoto(avatarUrl) || "padrao";
}

export function aplicarTema(escuro, casa = null, temaRoxoPadrao = false, avatarUrl = null) {
  if (typeof document === "undefined") return;

  const dark = Boolean(escuro);
  const corTema = resolverCorDoTema(avatarUrl, temaRoxoPadrao);

  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.accent = corTema;

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("lumostudy_theme", dark ? "dark" : "light");
    localStorage.setItem("lumostudy_accent", corTema);
    localStorage.setItem("lumostudy_tema_roxo_padrao", temaRoxoPadrao ? "1" : "0");
    if (casa) localStorage.setItem("lumostudy_casa", String(casa));
    if (avatarUrl) localStorage.setItem("lumostudy_avatar", String(avatarUrl));
  }

  window.dispatchEvent(
    new CustomEvent("lumostudy:theme-changed", {
      detail: { dark, accent: corTema, casa, temaRoxoPadrao, avatarUrl },
    })
  );
}

export default function ThemeProvider() {
  useEffect(() => {
    const salvo = localStorage.getItem("lumostudy_theme");
    const accentSalvo = localStorage.getItem("lumostudy_accent") || "padrao";
    document.documentElement.dataset.theme = salvo === "dark" ? "dark" : "light";
    document.documentElement.dataset.accent = accentSalvo;
  }, []);

  return null;
}
