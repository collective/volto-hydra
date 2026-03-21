import { getImageUrl } from './utils.js';

function LeadImageBlock({ block, content }) {
  const src = getImageUrl(content.preview_image || content.image);

  if (!src) return <div data-block-uid={block['@uid']} />;

  return (
    <div data-block-uid={block['@uid']} className="leadimage-block">
      <img data-edit-media={content.preview_image ? '/preview_image' : '/image'} src={src} alt="" style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', maxHeight: '24rem' }} loading="lazy" />
    </div>
  );
}
