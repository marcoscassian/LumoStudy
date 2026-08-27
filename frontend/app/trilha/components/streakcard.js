"use client";

export default function StreakCard({ streak = 0, week = [], loading = false }) {
  const dias = Number(streak) || 0;
  const semana = Array.from({ length: 7 }, (_, index) => week[index] || { estudou: false });
  const textoDias = dias === 1 ? "1 dia" : `${dias} dias`;

  return (
    <div className="side-card">
      <h3>Sequência</h3>

      <div className="streak-icon">
        <img src="/header/fire.png" alt="Sequência de estudos" width={80} height={80} />
      </div>

      <h1>{loading ? "--" : textoDias}</h1>

      <p>
        {dias > 0
          ? "Continue estudando para manter sua sequência."
          : "Estude hoje para começar uma nova sequência."}
      </p>

      <div className="week" aria-label="Dias estudados nesta semana">
        {semana.map((dia, index) => (
          <span
            key={dia.data || index}
            className={dia.estudou ? "active" : ""}
            title={dia.estudou ? "Estudou neste dia" : "Sem estudo registrado"}
          />
        ))}
      </div>
    </div>
  );
}
