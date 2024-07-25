/* eslint-disable @next/next/no-img-element */
import React from 'react';
import SlateBlock from '@/components/SlateBlock';

const BlocksList = ({ data }) => {
  return (
    <ul className="blog-list">
      {data.blocks_layout.items.map((id) => {
        if (data.blocks[id]['@type'] === 'slate') {
          const slateValue = data.blocks[id].value;
          return (
            <li key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <SlateBlock value={slateValue} />
            </li>
          );
        } else if (data.blocks[id]['@type'] === 'image') {
          const image_url = data.blocks[id]?.image_scales
            ? `${data.blocks[id].url}/++api++/${data.blocks[id]?.image_scales.image[0].download}`
            : data.blocks[id].url;
          const size = data.blocks[id].size;
          const align = data.blocks[id].align;
          return (
            <li key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <img
                src={image_url}
                className={`blog-list-item-img image-size-${size} image-align-${align}`}
                alt=""
                width={100}
                height={100}
              />
            </li>
          );
        } else if (data.blocks[id]['@type'] === 'teaser') {
          const teaser = data.blocks[id];
          const teaserHeadTitle = teaser.head_title;
          const teaserTitle = teaser.title;
          const teaserDescription = teaser.description;
          const teaserLink =
            teaser.href && teaser.href.length > 0
              ? teaser.href[0]['@id']
              : null;
          const teaserLinkTitle =
            teaser.href && teaser.href.length > 0 ? teaser.href[0].title : null;

          return (
            <li
              key={id}
              className="blog-list-item teaser-block"
              data-block-uid={`${id}`}
            >
              <div className="teaser-content">
                {teaserHeadTitle && (
                  <h3 className="teaser-head-title">{teaserHeadTitle}</h3>
                )}
                {teaserTitle && <h2 className="teaser-title">{teaserTitle}</h2>}
                {teaserDescription && (
                  <p
                    data-editable-field="teaser"
                    className="teaser-description"
                  >
                    {teaserDescription}
                  </p>
                )}
                {teaserLink && (
                  <a href={teaserLink} className="teaser-link">
                    {teaserLinkTitle}
                  </a>
                )}
              </div>
            </li>
          );
        } else if (data.blocks[id]['@type'] === 'video') {
          const video_url = data.blocks[id].url;
          const size = data.blocks[id].size;
          const align = data.blocks[id].align;
          return (
            <li key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <video
                src={video_url}
                className={`blog-list-item-video video-size-${size} video-align-${align}`}
                controls
                width={100}
                height={100}
              />
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
};

export default BlocksList;
