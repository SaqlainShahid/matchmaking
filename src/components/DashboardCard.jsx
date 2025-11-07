export default function DashboardCard({ title, value, total }) {
  const percentage = total > 0 ? Math.min(Math.max((value / total) * 100, 0), 100) : 0;
  return (
    <div className="og-card p-4 rounded-2xl flex flex-col gap-2 w-full">
      <h3 className="og-stat-title">{title}</h3>
      <div className="w-full mt-2" style={{ background: '#E8E8E8', borderRadius: 3, height: 6 }}>
        <div
          style={{ width: `${percentage}%`, height: 6, borderRadius: 3, background: '#00B050' }}
        />
      </div>
      <p style={{ color: '#666666', fontSize: 14 }}>
        {value} {total ? `sur ${total}` : ''}
      </p>
    </div>
  );
}
