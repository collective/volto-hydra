import { getImageUrl } from './utils.js';

function TeaserBlock({ block }) {
  const hrefObj = block.href?.[0] || null;
  const useBlockData = block.overwrite || !hrefObj?.title;

  const title = useBlockData ? block.title : hrefObj?.title || '';
  const description = useBlockData ? block.description : hrefObj?.description || '';
  const href = hrefObj?.['@id'] || '';
  const imageSrc = block.preview_image
    ? getImageUrl(block.preview_image)
    : (hrefObj?.hasPreviewImage ? getImageUrl({ '@id': `${href}/@@images/preview_image` }) : '');

  if (!href) {
    return (
      <div data-block-uid={block['@uid']} className="teaser-placeholder">
        <p>Select a target page for this teaser</p>
      </div>
    );
  }

  return (
    <div data-block-uid={block['@uid']} className="teaser-block">
      {imageSrc && <img data-edit-media="preview_image" src={imageSrc} alt="" />}
      <h3 data-edit-text="title">{title}</h3>
      <p data-edit-text="description">{description}</p>
      <a href={href} data-edit-link="href">Read more</a>
    </div>
  );
}
