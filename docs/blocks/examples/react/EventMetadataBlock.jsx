function EventMetadataBlock({ block, content }) {
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '';

  return (
    <div data-block-uid={block['@uid']} className="event-metadata" style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
      <dl style={{ display: 'grid', gap: '0.5rem' }}>
        {content.start && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <dt style={{ fontWeight: 600, color: '#4b5563', minWidth: '6rem' }}>When</dt>
            <dd>
              <span data-edit-text="/start">{formatDate(content.start)}</span>
              {content.end && <span> – <span data-edit-text="/end">{formatDate(content.end)}</span></span>}
            </dd>
          </div>
        )}
        {content.location && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <dt style={{ fontWeight: 600, color: '#4b5563', minWidth: '6rem' }}>Where</dt>
            <dd data-edit-text="/location">{content.location}</dd>
          </div>
        )}
        {content.event_url && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <dt style={{ fontWeight: 600, color: '#4b5563', minWidth: '6rem' }}>Website</dt>
            <dd><a data-edit-link="/event_url" href={content.event_url} style={{ color: '#2563eb', textDecoration: 'underline' }}>{content.event_url}</a></dd>
          </div>
        )}
        {(content.contact_name || content.contact_email || content.contact_phone) && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <dt style={{ fontWeight: 600, color: '#4b5563', minWidth: '6rem' }}>Contact</dt>
            <dd>
              {content.contact_name && <span data-edit-text="/contact_name">{content.contact_name}</span>}
              {content.contact_email && <span> · <a data-edit-link="/contact_email" href={`mailto:${content.contact_email}`}>{content.contact_email}</a></span>}
              {content.contact_phone && <span data-edit-text="/contact_phone"> · {content.contact_phone}</span>}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
