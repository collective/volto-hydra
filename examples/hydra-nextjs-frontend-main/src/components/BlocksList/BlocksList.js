import React from "react";
import SlateBlock from "@/components/SlateBlock";

const BlocksList = ({ data }) => {
  return (
    <ul className="blog-list">
      {data.blocks_layout.items.map((id) => {
        if (data.blocks[id]["@type"] === "slate") {
          const slateValue = data.blocks[id].value;
          return (
            <li key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <SlateBlock value={slateValue} />
            </li>
          );
        } else if (data.blocks[id]["@type"] === "image") {
          const image_url = data.blocks[id].url;
          return (
            <li key={id} className="blog-list-item" data-block-uid={`${id}`}>
              <img src={image_url} alt="" width={100} height={100} />
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
};

export default BlocksList;
