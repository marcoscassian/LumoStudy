"use client";

export default function MascotSprite({
  src = "/sprites/mascotes/coruja.png",
  fallbackSrc = "/sprites/mascotes/coruja.png",
  nome = "Mascote",
  size = 64,
  frames = 6,
  duration = 2.4,
  animated = true,
}) {
  const totalFrames = Math.max(1, Number(frames) || 1);
  const steps = Math.max(1, totalFrames - 1);

  return (
    <span
      className="mascot-sprite"
      style={{
        "--mascot-size": `${size}px`,
        "--mascot-sheet-width": `${size * totalFrames}px`,
        "--mascot-shift": `${-size * (totalFrames - 1)}px`,
        "--mascot-steps": steps,
        "--mascot-duration": `${duration}s`,
      }}
      aria-label={nome}
      role="img"
    >
      <img
        src={src}
        alt=""
        className={animated && totalFrames > 1 ? "mascot-sprite-sheet animated" : "mascot-sprite-sheet"}
        onError={(event) => {
          if (event.currentTarget.src.endsWith(fallbackSrc)) return;
          event.currentTarget.src = fallbackSrc;
        }}
      />
    </span>
  );
}
