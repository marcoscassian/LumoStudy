"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const ROTAS_PUBLICAS = new Set([
  "/",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/redefinir-senha",
]);

export function isPublicThemeRoute(pathname = "") {
  return ROTAS_PUBLICAS.has(pathname);
}

export function aplicarThemePorRota(pathname = "", savedTheme = "light") {
  const isPublic = isPublicThemeRoute(pathname);
  const shouldUseDark = !isPublic && savedTheme === "dark";

  document.documentElement.dataset.publicTheme = String(isPublic);
  document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";

  return shouldUseDark;
}

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

/**
 * @param {boolean} escuro
 * @param {string | undefined} [casa]
 * @param {boolean} [temaRoxoPadrao]
 * @param {string | undefined} [avatarUrl]
 */
export function aplicarTema(escuro, casa = undefined, temaRoxoPadrao = false, avatarUrl = undefined) {
  if (typeof document === "undefined") return;

  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isPublic = isPublicThemeRoute(pathname);
  const dark = Boolean(escuro) && !isPublic;
  const corTema = resolverCorDoTema(avatarUrl, temaRoxoPadrao);

  document.documentElement.dataset.publicTheme = String(isPublic);
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
  const pathname = usePathname();

  useLayoutEffect(() => {
    const salvo = localStorage.getItem("lumostudy_theme") || "light";
    const accentSalvo = localStorage.getItem("lumostudy_accent") || "padrao";
    aplicarThemePorRota(pathname, salvo);
    document.documentElement.dataset.accent = accentSalvo;
  }, [pathname]);

  useEffect(() => {
    const handleThemeEvent = () => {
      const salvo = localStorage.getItem("lumostudy_theme") || "light";
      const accentSalvo = localStorage.getItem("lumostudy_accent") || "padrao";
      aplicarThemePorRota(window.location.pathname, salvo);
      document.documentElement.dataset.accent = accentSalvo;
    };

    window.addEventListener("lumostudy:theme-changed", handleThemeEvent);
    return () => window.removeEventListener("lumostudy:theme-changed", handleThemeEvent);
  }, []);

  return null;
}
