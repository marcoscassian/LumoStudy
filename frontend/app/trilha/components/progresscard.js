"use client";

export default function ProgressCard({ progress = 0, taxaAcertos = 0, loading = false }) {
  const percentual = Math.min(100, Math.max(0, Number(progress) || 0));
  const taxa = Math.min(100, Math.max(0, Number(taxaAcertos) || 0));

  return (
    <div className="side-card">
      <h3>Progresso Geral</h3>

      <div
        className="circle circle--large"
        style={{
          background: `conic-gradient(var(--lumo-accent) 0 ${percentual}%, rgba(var(--lumo-accent-rgb), .18) ${percentual}% 100%)`,
        }}
        aria-label={`${percentual}% de progresso geral`}
      >
        <div className="circle-value">{loading ? "--" : `${percentual}%`}</div>
      </div>

      <p>
        {loading ? "Carregando taxa de acerto..." : <>Taxa de acerto: <strong>{taxa}%</strong></>}
      </p>
    </div>
  );
}
