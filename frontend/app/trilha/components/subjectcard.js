
"use client";

import { CheckCircle2, Lock, PlayCircle, ChevronDown } from "lucide-react";

export default function SubjectCard({
  image,
  title,
  description,
  progress,
  completed,
  topics = [],
  color,
  onContinue,
  onTrain
}) {
  return (
    <div className={`subject-card ${color}`}>

      <div className="subject-top">

        <img src={image} alt={title} className="subject-image" />

        <div className="subject-meta">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <div className="subject-action">
          <button
            className="subject-cta"
            onClick={() => onTrain && onTrain({ title })}
          >
            Treinar
          </button>
        </div>

      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>{completed}</span>
      </div>

      {topics.length > 0 && (
        <div className="topics">
          {topics.map((topic, index) => (
            <div className="topic" key={index}>
              <div className="topic-left">
                {topic.status === "done" && <CheckCircle2 size={18} className="done" />}
                {topic.status === "play" && <PlayCircle size={18} className="play" />}
                {topic.status === "lock" && <Lock size={18} className="lock" />}
                <span>{topic.name}</span>
              </div>

              <div className="topic-right">
                {topic.status === "lock" ? (
                  <button className="continue-btn locked" disabled>
                    <Lock size={14} /> Bloqueado
                  </button>
                ) : topic.link ? (
                  <a className="continue-btn" href={topic.link}>
                    Continuar
                  </a>
                ) : (
                  <button
                    className="continue-btn"
                    onClick={() => onContinue && onContinue(topic)}
                  >
                    Continuar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
