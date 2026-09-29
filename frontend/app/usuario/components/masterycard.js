"use client";

export default function MasteryCard({ image, title, percent, color, general = false, onContinue }) {
  return (
    <div className={`mastery-card mastery-${color} ${general ? "mastery-general" : ""}`}>
      {image ? (
        <div className="mastery-image-frame" style={{ "--mastery-progress": `${percent}%` }}>
          <img src={image} alt="" />
        </div>
      ) : (
        <div className="mastery-ring" style={{ background: `conic-gradient(var(--mastery-color) ${percent}%, #eee 0)` }}>
          <div className="mastery-ring-inner">
            <span className="mastery-general-percent">{percent}%</span>
          </div>
        </div>
      )}
      <strong className="mastery-percent">{percent}%</strong>
      <h4>{title}</h4>
      {!general && <button type="button" className="mastery-btn" onClick={onContinue}>Continuar</button>}
    </div>
  );
}
