"use client";

export default function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div className="stat-text">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}