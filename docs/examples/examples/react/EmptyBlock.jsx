function EmptyBlock({ block }) {
  return (
    <div data-block-uid={block['@uid']} className="empty-block" style={{ minHeight: '60px' }} />
  );
}
