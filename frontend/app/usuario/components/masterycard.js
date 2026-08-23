"use client";

export default function MasteryCard({ image, title, percent, color, general = false, onContinue }) {
  return (
    <div className={`mastery-card mastery-${color} ${general ? "mastery-general" : ""}`}>
      <div className="mastery-ring" style={{ background: `conic-gradient(var(--mastery-color) ${percent}%, #eee 0)` }}>
        <div className="mastery-ring-inner">
          {image ? <img src={image} alt="" /> : <span className="mastery-general-percent">{percent}%</span>}
        </div>
      </div>
      <strong className="mastery-percent">{percent}%</strong>
      <h4>{title}</h4>
      <button type="button" className="mastery-btn" onClick={onContinue}>Continuar</button>
    </div>
  );
}
