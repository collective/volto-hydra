"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { initBridge } from "#utils/hydra";
import BlocksList from "@/components/BlocksList";

export default function PageClient({ initialData, apiUrl }) {
  const [data, setData] = useState(initialData);
  const pathname = usePathname();

  useEffect(() => {
    initBridge({
      page: {
        schema: {
          properties: {
            blocks_layout: { title: 'Content', allowedBlocks: ['slate', 'image', 'video', 'teaser', 'title', 'description', 'introduction', 'leadimage', 'dateField', 'hero', 'columns', 'gridBlock', 'accordion', 'slider', 'listing', 'search', 'slateTable', 'heading', 'separator', '__button', 'highlight', 'maps', 'toc', 'form', 'codeExample', 'eventMetadata', 'socialLinks'] },
          },
        },
      },
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
