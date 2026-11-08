export function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="section-card">
      <div className="section-card-header section-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

