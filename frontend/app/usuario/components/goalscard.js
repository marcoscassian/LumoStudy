"use client";

import { useState } from "react";

const TABS = ["Diário", "Semanal", "Mensal"];

export default function GoalsCard({ goalsByPeriod }) {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const goals = goalsByPeriod[activeTab] || [];

  return (
    <div className="panel goals-panel">
      <div className="panel-header">
        <h3>Suas metas</h3>
      </div>

      <div className="goals-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`goals-tab ${tab === activeTab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="goals-list">
        {goals.map((goal) => {
          const Icon = goal.icon;
          const percent = Math.min(
            100,
            Math.round((goal.current / goal.total) * 100)
          );

          return (
            <div className="goal-item" key={goal.label}>
              <span className={`goal-icon goal-${goal.color}`}>
                <Icon size={16} />
              </span>

              <div className="goal-info">
                <div className="goal-top">
                  <span>{goal.label}</span>
                  <span>
                    {goal.current}/{goal.total}
                  </span>
                </div>
                <div className="goal-bar">
                  <div
                    className={`goal-fill goal-fill-${goal.color}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}