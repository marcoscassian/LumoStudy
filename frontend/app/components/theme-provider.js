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

export const NOMES_CASAS = {
  corvinal: "Corvinal",
  "lufa-lufa": "Lufa-Lufa",
  sonserina: "Sonserina",
  grifinoria: "Grifinória",
};

export function resolverCorDoTema(casa) {
  const slug = String(casa || "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(NOMES_CASAS, slug) ? slug : "grifinoria";
}

/**
 * A identidade visual vem da casa vinculada ao curso. Avatar e mascote são
 * cosméticos e nunca alteram a casa do usuário.
 *
 * Os parâmetros antigos são mantidos para compatibilidade com chamadas já
 * existentes. `temaRoxoPadrao` permite usar o roxo clássico sem alterar a casa.
 */
/**
 * @param {boolean} escuro
 * @param {string | undefined | null} [casa]
 * @param {boolean} [temaRoxoPadrao]
 * @param {string | undefined | null} [avatarUrl]
 */
export function aplicarTema(escuro, casa = "grifinoria", temaRoxoPadrao = false, avatarUrl = undefined) {
  if (typeof document === "undefined") return;

  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const isPublic = isPublicThemeRoute(pathname);
  const dark = Boolean(escuro) && !isPublic;
  const casaResolvida = resolverCorDoTema(casa);
  const corTema = temaRoxoPadrao ? "padrao" : casaResolvida;

  document.documentElement.dataset.publicTheme = String(isPublic);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.accent = corTema;

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("lumostudy_theme", dark ? "dark" : "light");
    localStorage.setItem("lumostudy_accent", corTema);
    localStorage.setItem("lumostudy_casa", casaResolvida);
    localStorage.setItem("lumostudy_tema_roxo_padrao", String(Boolean(temaRoxoPadrao)));
    if (avatarUrl) localStorage.setItem("lumostudy_avatar", String(avatarUrl));
  }

  window.dispatchEvent(
    new CustomEvent("lumostudy:theme-changed", {
      detail: { dark, accent: corTema, casa: casaResolvida, temaRoxoPadrao: Boolean(temaRoxoPadrao), avatarUrl },
    })
  );
}

export default function ThemeProvider() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const salvo = localStorage.getItem("lumostudy_theme") || "light";
    const accentSalvo = localStorage.getItem("lumostudy_accent") || "grifinoria";
    aplicarThemePorRota(pathname, salvo);
    document.documentElement.dataset.accent = accentSalvo;
  }, [pathname]);

  useEffect(() => {
    const handleThemeEvent = () => {
      const salvo = localStorage.getItem("lumostudy_theme") || "light";
      const accentSalvo = localStorage.getItem("lumostudy_accent") || "grifinoria";
      aplicarThemePorRota(window.location.pathname, salvo);
      document.documentElement.dataset.accent = accentSalvo;
    };

    window.addEventListener("lumostudy:theme-changed", handleThemeEvent);
    return () => window.removeEventListener("lumostudy:theme-changed", handleThemeEvent);
  }, []);

  return null;
}
