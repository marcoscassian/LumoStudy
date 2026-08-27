"use client";

import { useState } from "react";

export default function RecentActivities({ activities }) {
  const [showAll, setShowAll] = useState(false);
  const visibleActivities = showAll ? activities : activities.slice(0, 4);

  return (
    <div className="panel activities-panel">
      <div className="panel-header"><h3>Atividades recentes</h3></div>
      {visibleActivities.length === 0 ? (
        <p className="activity-empty">Responda questões, revise flashcards ou conclua simulados para ver suas atividades aqui.</p>
      ) : (
        <ul className="activity-list">
          {visibleActivities.map((activity) => {
            const Icon = activity.icon;
            return (
              <li className="activity-item" key={activity.id}>
                <span className={`activity-icon activity-${activity.color}`}><Icon size={16} /></span>
                <div className="activity-text">
                  <p>{activity.title}</p>
                  <span>{activity.subject} • {activity.time}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {activities.length > 4 && (
        <button type="button" className="ver-mais" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "ver menos" : "ver mais"}
        </button>
      )}
    </div>
  );
}
