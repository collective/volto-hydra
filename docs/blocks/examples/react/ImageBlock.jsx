import { getImageUrl } from './utils.js';

function ImageBlock({ block }) {
  const src = getImageUrl(block.url);
  const alt = block.alt || '';
  const href = block.href?.[0]?.['@id'] || block.href;

  const img = src
    ? <img data-edit-media="url" src={src} alt={alt} />
    : <div data-edit-media="url" style={{height:100,background:'#e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,cursor:'pointer'}}>Click to add image</div>;

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
