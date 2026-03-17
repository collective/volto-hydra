function LeadImageBlock({ block, content }) {
  const src = content.preview_image?.[0]?.['@id'] || content.preview_image?.['@id'] || content.preview_image || '';

  if (!src) return <div data-block-uid={block['@uid']} />;

  return (
    <div data-block-uid={block['@uid']} className="leadimage-block">
      <img data-edit-media="preview_image" src={src} alt="" style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', maxHeight: '24rem' }} loading="lazy" />
    </div>
  );
}
