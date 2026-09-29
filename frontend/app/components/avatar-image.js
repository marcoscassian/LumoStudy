"use client";

import { useEffect, useState } from "react";

const LUDIMILA_CORVINAL_FRAMES = [1, 2, 3, 4, 5].map(
  (frame) => `/avatarsprite/ludimila/ludimilac/ludimilac_${frame}.png`,
);

export default function AvatarImage({ src = "/avatar.png", alt = "", className, onError }) {
  const animado = /ludimilac(?:-[^/]+)?\.png(?:$|\?)/i.test(src);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animado) {
      const reset = window.setTimeout(() => setFrame(0), 0);
      return () => window.clearTimeout(reset);
    }

    const timer = window.setInterval(() => {
      setFrame((atual) => (atual + 1) % LUDIMILA_CORVINAL_FRAMES.length);
    }, 500);

    return () => window.clearInterval(timer);
  }, [animado, src]);

  return (
    <img
      src={animado ? LUDIMILA_CORVINAL_FRAMES[frame] : src}
      alt={alt}
      className={className}
      onError={onError}
    />
  );
}
