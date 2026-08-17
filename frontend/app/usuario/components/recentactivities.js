"use client";

export default function RecentActivities({ activities }) {
  return (
    <div className="panel activities-panel">
      <div className="panel-header">
        <h3>Atividades recentes</h3>
      </div>

      <ul className="activity-list">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <li className="activity-item" key={activity.id}>
              <span className={`activity-icon activity-${activity.color}`}>
                <Icon size={16} />
              </span>

              <div className="activity-text">
                <p>{activity.title}</p>
                <span>
                  {activity.subject} • {activity.time}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <button type="button" className="ver-mais">
        ver mais
      </button>
    </div>
  );
}