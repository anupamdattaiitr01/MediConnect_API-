import './EmptyState.css';

export default function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty card card-pad">
      {icon && <span className="empty-icon">{icon}</span>}
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}
