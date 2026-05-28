function SeparatorBlock({ block }) {
  const align = block.styles?.align || 'full';

  return (
    <div data-block-uid={block['@uid']} className={`separator-block separator-${align}`}>
      <hr />
    </div>
  );
}
