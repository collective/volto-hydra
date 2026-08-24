"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { stripPagingFromPath } from "#utils/paging";
import { initBridge } from "#utils/hydra";
import BlocksList from "@/components/BlocksList";
// Bundle the doc-blocks schema bundle so addNodeIdsToAllSlateFields can
// see e.g. highlight.description as a slate widget — without this the
// bridge skips assigning data-node-id to slate field nodes.
import docPageDefinitions from "../../../../../docs/examples/block-definitions.json";
const docBlocksConfig = Object.fromEntries(
  Object.values(docPageDefinitions).flatMap((page) => Object.entries(page.blocks)),
);

// socialLinks renders one <a data-block-uid> per entry in `links`, but the doc
// bundle never declared the block, so buildBlockPathMap had no schema to descend
// into: the links appeared on screen and were absent from the pathMap, i.e. they
// could not be selected, edited, moved or navigated. Declared here (rather than
// in block-definitions.json) because that file also drives the generated block
// reference pages, and this is a gap in THIS example's config.
docBlocksConfig.socialLinks = {
  ...docBlocksConfig.socialLinks,
  blockSchema: {
    properties: {
      links: {
        title: 'Links',
        widget: 'object_list',
        idField: '@id',
        schema: {
          properties: {
            url: { title: 'URL', widget: 'url' },
          },
        },
      },
    },
  },
};

// The content-type metadata blocks. They project a field of the CONTENT item
// (its title, description, lead image, a date, event details) rather than
// holding their own content, and the docs pages use all of them — but the doc
// bundle never declared them, so they rendered as "Not implemented Block"
// (title alone appears in 102 places). Declared here for the same reason
// socialLinks is: block-definitions.json also drives the generated block
// reference pages, and this is a gap in THIS example's config.
//
// All are `restricted`: an author never inserts them from the chooser — a
// content-type layout places them.
const metadataBlock = (id, title, group, properties = {}, fieldsets = []) => ({
  id,
  title,
  group,
  restricted: true,
  blockSchema: { fieldsets, properties, required: [] },
});

Object.assign(docBlocksConfig, {
  title: metadataBlock('title', 'Title', 'text'),
  description: metadataBlock('description', 'Description', 'text'),
  leadimage: metadataBlock('leadimage', 'Lead image', 'media', {
    align: { title: 'Alignment', widget: 'align' },
  }),
  dateField: metadataBlock(
    'dateField',
    'Date',
    'text',
    {
      dateField: {
        title: 'Field',
        type: 'string',
        factory: 'Choice',
        choices: [
          ['effective', 'Published'],
          ['created', 'Created'],
          ['modified', 'Modified'],
        ],
      },
      showTime: { title: 'Show time', type: 'boolean' },
    },
    [{ id: 'default', title: 'Default', fields: ['dateField', 'showTime'] }],
  ),
  eventMetadata: metadataBlock('eventMetadata', 'Event metadata', 'text', {
    required: { title: 'Required', type: 'boolean' },
  }),
});

export default function PageClient({ initialData, apiUrl }) {
  const [data, setData] = useState(initialData);
  // The blocks below use this as the CONTENT path they belong to (a listing
  // queries relative to it), so the paging segment has to come off — it names a
  // block, not a place in the content tree.
  const pathname = stripPagingFromPath(usePathname());

  useEffect(() => {
    initBridge({
      page: {
        schema: {
          properties: {
                        // The page's content region is `items` — the KEY inside the shared
            // blocks_layout dict (formData.blocks_layout.items), which is what
            // buildBlockPathMap and the template merge look up. Declaring it as
            // `blocks_layout` meant they resolved blocks_layout.blocks_layout,
            // found nothing, and skipped the region: no path map for the page's
            // own blocks and no template merge, so definition blocks never got
            // the instance id that makes them unlockable.
            items: { title: 'Content', widget: 'blocks_layout', allowedBlocks: ['slate', 'image', 'video', 'teaser', 'title', 'description', 'introduction', 'leadimage', 'dateField', 'hero', 'columns', 'gridBlock', 'accordion', 'slider', 'listing', 'search', 'slateTable', 'heading', 'separator', 'button', 'highlight', 'maps', 'toc', 'form', 'codeExample', 'eventMetadata', 'socialLinks'] },
          },
        },
      },
      blocks: { ...docBlocksConfig },
      onEditChange: (updatedData) => {
        if (updatedData) {
          setData(updatedData);
        }
      },
    });
  }, []);

  // Update data when navigating to a new page (SSR provides fresh initialData)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  return (
    <div className="page">
      <BlocksList data={data} apiUrl={apiUrl} contextPath={pathname} />
    </div>
  );
}
