"use client";

export default function ProgressCard({ progress = 0, completed = 0, total = 0, loading = false }) {
  const percentual = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <div className="side-card">
      <h3>Progresso Geral</h3>

      <div
        className="circle circle--large"
        style={{
          background: `conic-gradient(#7b2cff 0 ${percentual}%, #e7dafa ${percentual}% 100%)`,
        }}
        aria-label={`${percentual}% de progresso geral`}
      >
        <div className="circle-value">{loading ? "--" : `${percentual}%`}</div>
      </div>

      <p>
        {loading ? "Carregando progresso..." : `${completed}/${total} temas concluídos`}
      </p>
    </div>
  );
}
