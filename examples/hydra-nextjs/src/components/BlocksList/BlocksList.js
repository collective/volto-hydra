/* eslint-disable @next/next/no-img-element */
import React from "react";
import SlateBlock from "@/components/SlateBlock";

const BlocksList = ({ data }) => {
  return (
    <div className="blog-list">
      {data.blocks_layout.items.map((id) => {
        if (data.blocks[id]["@type"] === "slate") {
          const slateValue = data.blocks[id].value;

          return (
            <div key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <SlateBlock
                value={
                  slateValue || [
                    { nodeId: 1, type: "p", children: [{ text: "&nbsp;" }] },
                  ]
                }
              />
            </div>
          );
        } else if (data.blocks[id]["@type"] === "image") {
          const image_url = data.blocks[id]?.image_scales
            ? `${data.blocks[id].url}/++api++/${data.blocks[id]?.image_scales.image[0].download}`
            : data.blocks[id].url;
          const size = data.blocks[id].size;
          const align = data.blocks[id].align;
          return (
            <div key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <img
                src={image_url}
                className={`blog-list-item-img image-size-${size} image-align-${align}`}
                alt=""
                width={100}
                height={100}
              />
            </div>
          );
        } else if (data.blocks[id]["@type"] === "teaser") {
          const teaser = data.blocks[id];
          const teaserHeadTitle = teaser.head_title;
          const teaserTitle = teaser.title;
          const teaserDescription = teaser.description;
          const teaserLink =
            teaser.href && teaser.href.length > 0
              ? teaser.href[0]["@id"]
              : null;
          const teaserLinkTitle =
            teaser.href && teaser.href.length > 0 ? teaser.href[0].title : null;

          return (
            <div
              key={id}
              className="blog-list-item teaser-block"
              data-block-uid={`${id}`}>
              <div className="teaser-content">
                {teaserHeadTitle && (
                  <h3 className="teaser-head-title">{teaserHeadTitle}</h3>
                )}
                {teaserTitle && (
                  <h2 className="teaser-title" data-editable-field="title">
                    {teaserTitle}
                  </h2>
                )}
                {teaserDescription && (
                  <p
                    data-editable-field="description"
                    className="teaser-description">
                    {teaserDescription}
                  </p>
                )}
                {teaserLink && (
                  <a href={teaserLink} className="teaser-link">
                    {teaserLinkTitle}
                  </a>
                )}
              </div>
            </div>
          );
        } else if (data.blocks[id]["@type"] === "video") {
          const video_url = data.blocks[id].url;
          const size = data.blocks[id].size;
          const align = data.blocks[id].align;
          return (
            <div key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <video
                src={video_url}
                className={`blog-list-item-video video-size-${size} video-align-${align}`}
                controls
                width={100}
                height={100}
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export default BlocksList;
