function DateFieldBlock({ block, content }) {
  const field = block.dateField || 'effective';
  const value = content[field];
  const showTime = block.showTime;

  const formatted = value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
        ...(showTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : '';

  return (
    <div data-block-uid={block['@uid']} className="datefield-block" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
      <span data-edit-text={`/${field}`}>{formatted}</span>
    </div>
  );
}
