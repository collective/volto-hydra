function ImageBlock({ block }) {
  const src = block.url || '';
  const alt = block.alt || '';
  const href = block.href?.[0]?.['@id'] || block.href;

  const img = (
    <img data-edit-media="url" src={src} alt={alt} />
  );

  return (
    <div data-block-uid={block['@uid']}>
      {href ? (
        <a href={href} data-edit-link="href">{img}</a>
      ) : (
        <>{img}</>
      )}
    </div>
  );
}
