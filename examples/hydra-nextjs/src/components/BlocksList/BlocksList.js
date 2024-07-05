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
        }
        return null;
      })}
    </ul>
  );
};

export default BlocksList;
