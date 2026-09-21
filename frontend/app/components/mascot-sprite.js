"use client";

import { useEffect, useMemo, useState } from "react";

// As sprites novas ficam em public/sprites como quadros separados.
// O nome normal usa o animal (ex.: coruja_1.png) e a versão com
// notificação acrescenta "n" (ex.: corujan_1.png).
const MASCOT_SPRITES = {
  coruja: {
    arquivo: "coruja",
    normal: [1, 2, 3, 4, 5, 6],
    notificacao: [1, 2, 3],
  },
  gato: {
    arquivo: "gato",
    normal: [2, 3, 4, 5, 6],
    notificacao: [1, 2, 3, 4],
  },
  sapo: {
    arquivo: "sapo",
    normal: [4, 5, 6],
    notificacao: [1, 2, 3, 4, 5],
  },
  rato: {
    arquivo: "rato",
    normal: [3, 4, 5, 6],
    notificacao: [1, 2, 3, 4, 5],
  },
  serpente: {
    arquivo: "cobra",
    normal: [1, 2, 3, 4, 5, 6],
    notificacao: [1, 2, 3],
  },
  cobra: {
    arquivo: "cobra",
    normal: [1, 2, 3, 4, 5, 6],
    notificacao: [1, 2, 3],
  },
};

function limparNome(valor = "") {
  return String(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^mascote-/, "")
    .replace(/\.png$/i, "")
    .replace(/_\d+$/, "")
    .replace(/n$/, "")
    .trim();
}

function descobrirMascote({ slug, src, fallbackSrc, nome }) {
  const arquivoSrc = String(src || "").split("/").pop() || "";
  const arquivoFallback = String(fallbackSrc || "").split("/").pop() || "";
  const candidatos = [slug, arquivoSrc, arquivoFallback, nome].map(limparNome);

  for (const candidato of candidatos) {
    if (MASCOT_SPRITES[candidato]) return candidato;
    if (candidato.includes("serpente") || candidato.includes("cobra")) return "serpente";
    if (candidato.includes("coruja")) return "coruja";
    if (candidato.includes("gato")) return "gato";
    if (candidato.includes("sapo")) return "sapo";
    if (candidato.includes("rato")) return "rato";
  }

  return "coruja";
}

export default function MascotSprite({
  src = "/sprites/mascotes/coruja.png",
  fallbackSrc = "/sprites/mascotes/coruja.png",
  slug = "",
  nome = "Mascote",
  size = 64,
  duration = 2.4,
  animated = true,
  notification = false,
}) {
  const mascotKey = useMemo(
    () => descobrirMascote({ slug, src, fallbackSrc, nome }),
    [slug, src, fallbackSrc, nome],
  );

  const frameSources = useMemo(() => {
    const config = MASCOT_SPRITES[mascotKey] || MASCOT_SPRITES.coruja;
    const numeros = notification ? config.notificacao : config.normal;
    const prefixo = `${config.arquivo}${notification ? "n" : ""}`;
    return numeros.map((numero) => `/sprites/${prefixo}_${numero}.png`);
  }, [mascotKey, notification]);

  const [frameIndex, setFrameIndex] = useState(0);
  const framesKey = frameSources.join("|");

  useEffect(() => {
    setFrameIndex(0);
    if (!animated || frameSources.length <= 1) return undefined;

    const intervaloMs = Math.max(140, (Math.max(0.4, Number(duration) || 2.4) * 1000) / frameSources.length);
    const timer = window.setInterval(() => {
      setFrameIndex((atual) => (atual + 1) % frameSources.length);
    }, intervaloMs);

    return () => window.clearInterval(timer);
  }, [animated, duration, frameSources.length, framesKey]);

  const config = MASCOT_SPRITES[mascotKey] || MASCOT_SPRITES.coruja;
  const fallbackFrame = `/sprites/${config.arquivo}_${config.normal[0]}.png`;
  const currentFrame = frameSources[frameIndex] || fallbackFrame;

  return (
    <span
      className="mascot-sprite"
      style={{ "--mascot-size": `${size}px` }}
      aria-label={nome}
      role="img"
    >
      <img
        src={currentFrame}
        alt=""
        className="mascot-sprite-sheet"
        draggable={false}
        onError={(event) => {
          if (event.currentTarget.getAttribute("src") === fallbackFrame) return;
          event.currentTarget.src = fallbackFrame;
        }}
      />
    </span>
  );
}
