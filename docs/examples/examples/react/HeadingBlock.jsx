function HeadingBlock({ block }) {
  const Tag = block.tag || 'h2';
  const text = block.heading || '';

  return (
    <Tag data-block-uid={block['@uid']} data-edit-text="heading">
      {text}
    </Tag>
  );
}
