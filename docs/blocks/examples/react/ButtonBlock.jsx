function ButtonBlock({ block }) {
  const title = block.title || 'Button';
  const href = block.href?.[0]?.['@id'] || block.href || '#';

  return (
    <div data-block-uid={block['@uid']} className="button-block">
      <a href={href} data-edit-text="title" data-edit-link="href" className="btn">
        {title}
      </a>
    </div>
  );
}
