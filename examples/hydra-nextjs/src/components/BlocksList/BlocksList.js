/* eslint-disable @next/next/no-img-element */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import SlateBlock from "@/components/SlateBlock";
import { expandTemplatesSync, expandListingBlocks, ploneFetchItems, staticBlocks } from "#utils/hydra";

// Template context for nested block expansion
const TemplateContext = createContext({ templates: {}, templateState: {} });

/**
 * Expand child blocks using expandTemplatesSync with template context
 * For blocks dicts: expand(layout, blocks)
 * For object_list arrays: expand(items, null, '@id')
 */
function useExpand() {
  const { templates, templateState } = useContext(TemplateContext);
  return (layout, blocks, idField) =>
    expandTemplatesSync(layout, {
      blocks,
      templateState,
      templates,
      ...(idField && { idField }),
    });
}

/**
 * Render Slate JSON nodes inline (for hero descriptions, table cells, etc.)
 */
function SlateNodes({ value }) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return <SlateBlock value={value} />;
}

/**
 * Get a display URL from a link value (handles Plone's array/object format)
 */
function getUrl(value) {
  if (!value) return "";
  if (Array.isArray(value) && value.length) return value[0]["@id"] || value[0];
  if (typeof value === "object" && value["@id"]) return value["@id"];
  return String(value);
}

/**
 * Get image props from a block value (handles all Plone image formats).
 * Ported from Nuxt composables/imageProps.js
 * @param {object|string|Array} block - image value in various Plone formats
 * @param {string} backendBaseUrl - backend base URL for relative paths
 * @returns {{ url: string|null, size: string, align: string }}
 */
function imageProps(block, backendBaseUrl) {
  if (!block) return { url: null };

  // Unwrap preview_image field
  if (block?.preview_image) {
    block = block.preview_image;
  }
  // Handle array format: [{ download, scales }]
  if (Array.isArray(block) && block.length > 0) {
    block = block[0];
  }

  if (!block) return { url: null };

  let image_url = null;

  if (typeof block === "string") {
    // Plain URL string (e.g., data URI, external URL)
    image_url = block;
  } else if ("@id" in block && block?.image_scales) {
    // Image content object with scales
    image_url = block["@id"];
  } else if ("@id" in block && block?.hasPreviewImage) {
    // href object with a preview image (e.g., teaser target)
    image_url = block["@id"];
    image_url = image_url.startsWith("/") ? `${backendBaseUrl}${image_url}` : image_url;
    image_url = `${image_url}/@@images/preview_image`;
    return { url: image_url };
  } else if ("@id" in block) {
    // Image reference without scales
    image_url = block["@id"];
  } else if (block?.download) {
    image_url = block.download;
  } else if (block?.url && block["@type"] === "image") {
    // Image block with url field
    const urlValue = block.url;
    if (typeof urlValue === "string") {
      image_url = urlValue;
    } else if (urlValue?.image_scales && urlValue?.image_field) {
      // Catalog brain format from listing expansion
      const field = urlValue.image_field;
      const scales = urlValue.image_scales[field];
      if (scales?.[0]?.download) {
        image_url = `${urlValue["@id"] || ""}/${scales[0].download}`;
      }
    } else if (urlValue?.["@id"]) {
      image_url = urlValue["@id"];
    }
  } else {
    return { url: null };
  }

  if (!image_url) return { url: null };

  // Prepend backend base URL for relative paths
  image_url = image_url.startsWith("/") ? `${backendBaseUrl}${image_url}` : image_url;

  // Use image_scales download path if available
  if (block?.image_scales && block?.image_field) {
    const field = block.image_field;
    image_url = `${image_url}/${block.image_scales[field][0].download}`;
  } else if (block?.scales) {
    image_url = block.download;
  } else if (block?.url && block?.image_field) {
    image_url = `${image_url}/@@images/${block.image_field}`;
  } else if (
    block["@type"] === "image" &&
    !image_url.includes("@@images") &&
    !image_url.includes("@@download") &&
    !image_url.includes("@@display-file") &&
    !image_url.startsWith("data:")
  ) {
    // Image block without scale info - add default image scale
    image_url = `${image_url}/@@images/image`;
  }

  return {
    url: image_url,
    size: block.size,
    align: block.align,
  };
}

/**
 * Teaser helpers: use block data if overwrite is set OR if hrefObj has no content data
 */
function getTeaserTitle(block) {
  const hrefObj = block.href?.[0];
  const hrefObjHasContentData = hrefObj?.title !== undefined;
  const useBlockData = block.overwrite || !hrefObjHasContentData;
  if (useBlockData) return block.title || hrefObj?.title || "";
  return hrefObj?.title || "";
}

function getTeaserDescription(block) {
  const hrefObj = block.href?.[0];
  const hrefObjHasContentData = hrefObj?.title !== undefined;
  const useBlockData = block.overwrite || !hrefObjHasContentData;
  if (useBlockData) return block.description || hrefObj?.description || "";
  return hrefObj?.description || "";
}

/**
 * Format a date string for display
 */
function formatDate(dateStr, showTime) {
  if (!dateStr) return "";
  const opts = { year: "numeric", month: "long", day: "numeric" };
  if (showTime) {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
  }
  return new Date(dateStr).toLocaleDateString(undefined, opts);
}

/**
 * YouTube ID extraction
 */
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/
  );
  return m ? m[1] : null;
}

// ─── Social Icons ────────────────────────────────────────────────────────────

const SOCIAL_ICONS = {
  "github.com":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  "youtube.com":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  "x.com":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  "twitter.com":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  "mastodon.social":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.547c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054 19.648 19.648 0 0 0 4.636.536c.397 0 .794 0 1.192-.013 1.99-.059 4.088-.163 5.985-.67a.175.175 0 0 0 .023-.006c2.298-.665 4.48-2.688 4.623-7.828.006-.238.046-2.476.046-2.717 0-.833.31-5.907-.046-7.172zM19.903 13.24h-2.558v-5.9c0-1.243-.525-1.875-1.575-1.875-1.16 0-1.74.749-1.74 2.23v3.227h-2.544V7.695c0-1.481-.58-2.23-1.74-2.23-1.05 0-1.576.632-1.576 1.875v5.9H5.612V7.514c0-1.243.317-2.232.954-2.965.657-.733 1.517-1.108 2.584-1.108 1.234 0 2.17.474 2.795 1.423L12 4.958l.055.906c.625-.95 1.56-1.423 2.795-1.423 1.066 0 1.926.375 2.583 1.108.637.733.955 1.722.955 2.965v5.726z"/></svg>',
  "bsky.app":
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.6 3.494 6.67 3.06-4.576.78-5.865 3.36-3.397 5.94 3.006 3.144 5.434-1.056 6.103-3.26.079-.26.114-.39.114-.26 0-.13.035 0 .114.26.669 2.204 3.097 6.404 6.103 3.26 2.468-2.58 1.179-5.16-3.397-5.94 3.07.434 5.885-.433 6.67-3.06.246-.828.624-5.79.624-6.479 0-.688-.139-1.86-.902-2.203-.66-.299-1.664-.621-4.3 1.24C12.046 4.747 9.087 8.686 8 10.8z"/></svg>',
};

const DEFAULT_LINK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

function getSocialInfo(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const svg = SOCIAL_ICONS[hostname];
    return svg ? { name: hostname, svg } : { name: hostname, svg: DEFAULT_LINK_SVG };
  } catch {
    return { name: "Link", svg: DEFAULT_LINK_SVG };
  }
}

// ─── Listing Block (async fetcher) ───────────────────────────────────────────

function ListingBlock({ id, block, data, apiUrl, contextPath }) {
  const [items, setItems] = useState([]);
  const [paging, setPaging] = useState(null);

  useEffect(() => {
    if (!apiUrl) return;
    const fetchItems = {
      listing: ploneFetchItems({ apiUrl, contextPath: contextPath || "/" }),
    };
    expandListingBlocks([id], {
      blocks: { [id]: block },
      fetchItems,
      itemTypeField: "variation",
    }).then((result) => {
      setItems(result.items || []);
      setPaging(result.paging);
    });
  }, [id, block, apiUrl, contextPath]);

  if (!items.length) return null;
  return (
    <>
      {items.map((item) => (
        <Block key={item["@uid"]} block={item} id={item["@uid"]} data={data} apiUrl={apiUrl} contextPath={contextPath} />
      ))}
    </>
  );
}

// ─── Block Component ─────────────────────────────────────────────────────────

function Block({ block, id, data, apiUrl, contextPath }) {
  const type = block["@type"];
  const expand = useExpand();

  switch (type) {
    // ── Slate (rich text) ──
    case "slate":
      return (
        <div data-block-uid={id}>
          <SlateBlock
            value={
              block.value || [
                { nodeId: 1, type: "p", children: [{ text: "\u00A0" }] },
              ]
            }
          />
        </div>
      );

    // ── Title ──
    case "title":
      return (
        <h1 data-block-uid={id} data-edit-text="/title">
          {data.title}
        </h1>
      );

    // ── Description ──
    case "description":
      return (
        <p data-block-uid={id} data-edit-text="/description" className="description">
          {data.description}
        </p>
      );

    // ── Introduction ──
    case "introduction":
      return (
        <div data-block-uid={id} className="introduction-block">
          <h1 data-edit-text="/title">{data.title}</h1>
          {data.description && (
            <p data-edit-text="/description" className="description">
              {data.description}
            </p>
          )}
        </div>
      );

    // ── Image ──
    case "image": {
      const imgProps = imageProps(block, apiUrl);
      const src = imgProps.url || "";
      const href = getUrl(block.href);
      return (
        <div
          data-block-uid={id}
          className={`image-size-${imgProps.size || block.size || "l"} image-align-${imgProps.align || block.align || "center"}`}
        >
          {href ? (
            <a href={href} className="image-link" data-edit-link="href">
              <img data-edit-media="url" src={src} alt={block.alt || ""} />
            </a>
          ) : (
            <img data-edit-media="url" data-edit-link="href" src={src} alt={block.alt || ""} />
          )}
        </div>
      );
    }

    // ── Lead Image ──
    case "leadimage": {
      const leadImgProps = imageProps(data.preview_image, apiUrl);
      if (!leadImgProps.url) return <div data-block-uid={id} />;
      return (
        <div data-block-uid={id} className="leadimage-block">
          <img data-edit-media="preview_image" src={leadImgProps.url} alt="" loading="lazy" />
        </div>
      );
    }

    // ── Date Field ──
    case "dateField": {
      const field = block.dateField || "effective";
      return (
        <div data-block-uid={id} className="datefield-block">
          <span data-edit-text={`/${field}`}>
            {formatDate(data[field], block.showTime)}
          </span>
        </div>
      );
    }

    // ── Hero ──
    case "hero":
      return (
        <div data-block-uid={id} className="hero-block">
          {block.image ? (
            <img
              className="hero-image"
              src={imageProps(block.image, apiUrl).url || ""}
              alt="Hero image"
            />
          ) : (
            <div className="hero-image hero-placeholder" />
          )}
          <h1 className="hero-heading" data-edit-text="heading">
            {block.heading}
          </h1>
          <p className="hero-subheading" data-edit-text="subheading">
            {block.subheading}
          </p>
          <div className="hero-description" data-edit-text="description">
            <SlateNodes value={block.description} />
          </div>
          {block.buttonText && (
            <a
              className="hero-button"
              href={getUrl(block.buttonLink)}
              data-edit-link="buttonLink"
            >
              {block.buttonText}
            </a>
          )}
        </div>
      );

    // ── Teaser ──
    case "teaser": {
      const teaserHref = getUrl(block.href);
      const teaserTitle = getTeaserTitle(block);
      const teaserDesc = getTeaserDescription(block);
      const teaserImgProps = block.preview_image
        ? imageProps(block.preview_image, apiUrl)
        : block.href?.[0]?.hasPreviewImage
          ? imageProps(block.href[0], apiUrl)
          : null;
      return (
        <div
          data-block-uid={block._blockUid || id}
          data-block-readonly={block.overwrite ? undefined : ""}
          className="teaser-block"
        >
          {teaserImgProps?.url ? (
            <a href={teaserHref} data-edit-link="href">
              <img
                data-edit-media="preview_image"
                src={teaserImgProps.url}
                alt=""
                className="teaser-image"
              />
            </a>
          ) : (
            <div
              data-edit-media="preview_image"
              className="teaser-image-placeholder"
              style={{ height: "200px", backgroundColor: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <span style={{ color: "#9ca3af" }}>Click to add image</span>
            </div>
          )}
          <div className="teaser-content">
            {teaserTitle && (
              <a href={teaserHref} data-edit-link="href">
                {block.head_title && (
                  <div className="teaser-head-title">{block.head_title}</div>
                )}
                <h2 className="teaser-title" data-edit-text="title">
                  {teaserTitle}
                </h2>
              </a>
            )}
            {teaserDesc && (
              <p className="teaser-description" data-edit-text="description">
                {teaserDesc}
              </p>
            )}
            <a href={teaserHref} className="teaser-link" data-edit-link="href">
              Read more
            </a>
          </div>
        </div>
      );
    }

    // ── Columns ──
    case "columns": {
      return (
        <div data-block-uid={id} data-block-container="{allowed:['Column'],add:'horizontal'}" className="columns-block" style={{ display: "flex", gap: "1rem" }}>
          {block.title && <h3 data-edit-text="title">{block.title}</h3>}
          {(block.columns?.items || []).map((columnId) => {
            const col = block.blocks?.[columnId];
            if (!col) return null;
            const children = expand(col.blocks_layout?.items || [], col.blocks || {});
            return (
              <div key={columnId} data-block-uid={columnId} data-block-add="right" style={{ flex: 1 }}>
                {children.map((item) => (
                  <Block key={item["@uid"]} block={item} id={item["@uid"]} data={data} apiUrl={apiUrl} contextPath={contextPath} />
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    // ── Grid Block ──
    case "gridBlock": {
      const gridLayout = block.blocks_layout?.items || [];
      const gridChildren = gridLayout.map((childId) => {
        const childBlock = block.blocks?.[childId];
        if (!childBlock) return null;
        if (childBlock["@type"] === "listing") {
          return { id: childId, block: childBlock, isListing: true };
        }
        const items = expand([childId], block.blocks || {});
        return { id: childId, items, isListing: false };
      }).filter(Boolean);
      return (
        <div data-block-uid={id} data-block-container="{}" className="grid-block" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(gridLayout.length, 4)}, 1fr)`, gap: "1rem" }}>
          {gridChildren.map((entry) =>
            entry.isListing ? (
              <ListingBlock key={entry.id} id={entry.id} block={entry.block} data={data} apiUrl={apiUrl} contextPath={contextPath} />
            ) : (
              entry.items.map((item) => (
                <Block key={item["@uid"]} block={item} id={item["@uid"]} data={data} apiUrl={apiUrl} contextPath={contextPath} />
              ))
            )
          )}
        </div>
      );
    }

    // ── Accordion ──
    case "accordion": {
      const panels = expand(block.panels || [], null, "@id");
      return (
        <div data-block-uid={id} className="accordion-block">
          {panels.map((panel, i) => {
            const children = expand(panel.blocks_layout?.items || [], panel.blocks || {});
            return (
              <details key={panel["@uid"] || i} data-block-uid={panel["@uid"]}>
                <summary>{panel.title || `Panel ${i + 1}`}</summary>
                <div>
                  {children.map((item) => (
                    <Block key={item["@uid"]} block={item} id={item["@uid"]} data={data} apiUrl={apiUrl} contextPath={contextPath} />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      );
    }

    // ── Slider ──
    case "slider": {
      const slides = expand(block.value?.slides || block.blocks_layout?.items || [], block.blocks || {}, block.value?.slides ? "@id" : undefined);
      return (
        <div data-block-uid={id} data-block-container="{allowed:['Slide'],add:'horizontal'}" className="slider-block" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex" }}>
            {slides.map((slide) => (
              <div key={slide["@uid"]} data-block-uid={slide["@uid"]} data-block-add="right" style={{ minWidth: "100%", flexShrink: 0, position: "relative" }}>
                {slide.preview_image ? (
                  <img data-edit-media="preview_image" src={imageProps(slide, apiUrl).url || ""} alt="" style={{ width: "100%" }} />
                ) : (
                  <div data-edit-media="preview_image" style={{ width: "100%", height: "300px", backgroundColor: "#374151" }} />
                )}
                {slide.head_title && <div data-edit-text="head_title">{slide.head_title}</div>}
                {slide.title && <h2 data-edit-text="title">{slide.title}</h2>}
                {slide.description && <p data-edit-text="description">{slide.description}</p>}
                {slide.href ? (
                  <a href={getUrl(slide.href)} data-edit-link="href" data-edit-text="buttonText">
                    {slide.buttonText || "Read More"}
                  </a>
                ) : (
                  <a href="#" data-edit-link="href" data-edit-text="buttonText">
                    {slide.buttonText || "Read More"}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Listing ──
    case "listing":
      return (
        <div data-block-uid={id} className="listing-block">
          <ListingBlock id={id} block={block} data={data} apiUrl={apiUrl} contextPath={contextPath} />
        </div>
      );

    // ── Search ──
    case "search": {
      const facets = expand(block.facets || [], null, "@id");
      const searchResults = expand(block.listing?.items || [], block.blocks || {});
      return (
        <div data-block-uid={id} className="search-block">
          {block.headline && <h2 data-edit-text="headline">{block.headline}</h2>}
          {block.showSearchInput && (
            <form onSubmit={(e) => e.preventDefault()} style={{ marginBottom: "1rem" }}>
              <input type="search" placeholder="Search..." />
              <button type="submit">Search</button>
            </form>
          )}
          {facets.length > 0 && (
            <div className="search-facets" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {facets.map((facet, i) => (
                <div key={facet["@uid"] || i} data-block-uid={facet["@uid"]} data-block-add="bottom" style={{ padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px" }}>
                  <div data-edit-text="title" style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>{facet.title}</div>
                  {facet.type === "selectFacet" && <select><option value="">Select...</option></select>}
                  {facet.type === "checkboxFacet" && <label><input type="checkbox" /> {facet.title}</label>}
                </div>
              ))}
            </div>
          )}
          <div className="search-results">
            {searchResults.map((item) => (
              <Block key={item["@uid"]} block={item} id={item["@uid"]} data={data} apiUrl={apiUrl} contextPath={contextPath} />
            ))}
          </div>
        </div>
      );
    }

    // ── Slate Table ──
    case "slateTable": {
      const rows = expand(block.table?.rows || [], null, "key");
      return (
        <div data-block-uid={id} className="table-block">
          <table>
            <tbody>
              {rows.map((row) => {
                const cells = expand(row.cells || [], null, "key");
                return (
                  <tr key={row["@uid"]} data-block-uid={row["@uid"]} data-block-add="bottom">
                    {cells.map((cell) => {
                      const CellTag = cell.type === "header" ? "th" : "td";
                      return (
                        <CellTag key={cell["@uid"]} data-block-uid={cell["@uid"]} data-block-add="right">
                          <SlateNodes value={cell.value} />
                        </CellTag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // ── Heading ──
    case "heading": {
      const Tag = block.tag || "h2";
      return (
        <Tag data-block-uid={id} data-edit-text="heading">
          {block.heading || ""}
        </Tag>
      );
    }

    // ── Separator ──
    case "separator":
      return <hr data-block-uid={id} />;

    // ── Button ──
    case "__button":
      return (
        <div data-block-uid={id} className="button-block">
          <a
            href={getUrl(block.href)}
            data-edit-link="href"
            className="button"
          >
            <span data-edit-text="title">{block.title || "Button"}</span>
          </a>
        </div>
      );

    // ── Highlight ──
    case "highlight": {
      const highlightImgProps = imageProps(block.image, apiUrl);
      return (
        <section
          data-block-uid={id}
          className="highlight-block"
          style={{ position: "relative", overflow: "hidden", borderRadius: "8px" }}
        >
          {highlightImgProps.url ? (
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${highlightImgProps.url})`,
                backgroundSize: "cover", backgroundPosition: "center",
              }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, backgroundColor: block.color || "#f0f0f0" }} />
          )}
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />
          <div style={{ position: "relative", padding: "4rem 1rem", textAlign: "center", color: "#fff" }}>
            <h2 data-edit-text="title" style={{ marginBottom: "1rem" }}>{block.title}</h2>
            <div style={{ marginBottom: "2rem" }}>
              <SlateNodes value={block.description || block.value || []} />
            </div>
            {block.cta_title && (
              <a
                href={getUrl(block.cta_link)}
                data-edit-text="cta_title"
                data-edit-link="cta_link"
                className="highlight-cta"
                style={{ padding: "0.75rem 1.25rem", backgroundColor: "#1d4ed8", color: "#fff", borderRadius: "8px", textDecoration: "none" }}
              >
                {block.cta_title}
              </a>
            )}
          </div>
        </section>
      );
    }

    // ── Video ──
    case "video": {
      const videoUrl = block.url || "";
      const ytId = getYouTubeId(videoUrl);
      return (
        <div data-block-uid={id} className="video-block">
          {ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              allowFullScreen
              style={{ width: "100%", aspectRatio: "16/9", border: "none" }}
            />
          ) : videoUrl ? (
            <video src={videoUrl} controls style={{ width: "100%" }} />
          ) : (
            <p>No video URL set</p>
          )}
        </div>
      );
    }

    // ── Maps ──
    case "maps":
      return (
        <div data-block-uid={id} className="maps-block">
          {block.title && <h3 data-edit-text="title">{block.title}</h3>}
          {block.url ? (
            <iframe
              src={block.url}
              data-edit-link="url"
              title={block.title || "Map"}
              allowFullScreen
              loading="lazy"
              style={{ width: "100%", height: "450px", border: "none" }}
            />
          ) : (
            <p>No map URL configured</p>
          )}
        </div>
      );

    // ── Table of Contents ──
    case "toc":
      return (
        <nav data-block-uid={id} className="toc-block">
          <h3>Table of Contents</h3>
          <p>(Auto-generated from headings)</p>
        </nav>
      );

    // ── Form ──
    case "form": {
      const formFields = expand(block.subblocks || [], null, "field_id");
      return (
        <div data-block-uid={id} className="form-block">
          {block.title && <h3 data-edit-text="title">{block.title}</h3>}
          <form onSubmit={(e) => e.preventDefault()}>
            {formFields.map((field) => (
              <div
                key={field["@uid"]}
                data-block-uid={field["@uid"]}
                data-block-type={field.field_type}
                data-block-add="bottom"
                style={{ marginBottom: "1rem" }}
              >
                {field.field_type === "text" && (
                  <>
                    <label data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    <input type="text" name={field.field_id} placeholder={field.placeholder || ""} style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
                  </>
                )}
                {field.field_type === "textarea" && (
                  <>
                    <label data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    <textarea name={field.field_id} rows={4} style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
                  </>
                )}
                {field.field_type === "number" && (
                  <>
                    <label data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    <input type="number" name={field.field_id} style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
                  </>
                )}
                {field.field_type === "select" && (
                  <>
                    <label data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    <select name={field.field_id} style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }}>
                      <option value="">Select...</option>
                      {(field.input_values || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </>
                )}
                {field.field_type === "single_choice" && (
                  <fieldset>
                    <legend data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </legend>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    {(field.input_values || []).map((opt) => (
                      <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="radio" name={field.field_id} value={opt} /> {opt}
                      </label>
                    ))}
                  </fieldset>
                )}
                {field.field_type === "multiple_choice" && (
                  <fieldset>
                    <legend data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </legend>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    {(field.input_values || []).map((opt) => (
                      <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="checkbox" name={field.field_id} value={opt} /> {opt}
                      </label>
                    ))}
                  </fieldset>
                )}
                {field.field_type === "checkbox" && (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input type="checkbox" name={field.field_id} />
                      <span data-edit-text="label">{field.label}{field.required && <span style={{ color: "red" }}> *</span>}</span>
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                  </>
                )}
                {field.field_type === "date" && (
                  <>
                    <label data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    <input type="date" name={field.field_id} style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
                  </>
                )}
                {field.field_type === "from" && (
                  <>
                    <label data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    <input type="email" name={field.field_id} style={{ width: "100%", padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.5rem" }} />
                  </>
                )}
                {field.field_type === "attachment" && (
                  <>
                    <label data-edit-text="label">
                      {field.label}{field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.description && <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{field.description}</p>}
                    <input type="file" name={field.field_id} />
                  </>
                )}
                {field.field_type === "static_text" && (
                  <div>
                    {field.label && <strong data-edit-text="label">{field.label}</strong>}
                    {field.description && <p>{field.description}</p>}
                  </div>
                )}
                {field.field_type === "hidden" && (
                  <input type="hidden" name={field.field_id} value={field.value || ""} />
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
              <button type="submit" data-edit-text="submit_label">
                {block.submit_label || "Submit"}
              </button>
              {block.show_cancel && (
                <button type="reset" data-edit-text="cancel_label">
                  {block.cancel_label || "Cancel"}
                </button>
              )}
            </div>
          </form>
        </div>
      );
    }

    // ── Code Example ──
    case "codeExample":
      return (
        <div data-block-uid={id} className="code-example">
          {block.title && <h3 data-edit-text="title">{block.title}</h3>}
          <pre data-edit-text="code" style={{ background: "#1e1e1e", color: "#d4d4d4", padding: "1rem", borderRadius: "8px", overflow: "auto" }}>
            <code>{block.code || ""}</code>
          </pre>
        </div>
      );

    // ── Empty ──
    case "empty":
      return <div data-block-uid={id} className="empty-block" style={{ minHeight: "60px" }} />;

    // ── Event Metadata ──
    case "eventMetadata":
      return (
        <div data-block-uid={id} className="event-metadata">
          <dl>
            {data.start && (
              <div className="event-row">
                <dt>When</dt>
                <dd>
                  <span data-edit-text="/start">{formatDate(data.start, true)}</span>
                  {data.end && (
                    <span>
                      {" – "}
                      <span data-edit-text="/end">{formatDate(data.end, true)}</span>
                    </span>
                  )}
                </dd>
              </div>
            )}
            {data.location && (
              <div className="event-row">
                <dt>Where</dt>
                <dd data-edit-text="/location">{data.location}</dd>
              </div>
            )}
            {data.event_url && (
              <div className="event-row">
                <dt>Website</dt>
                <dd><a href={data.event_url}>{data.event_url}</a></dd>
              </div>
            )}
            {(data.contact_name || data.contact_email || data.contact_phone) && (
              <div className="event-row">
                <dt>Contact</dt>
                <dd>
                  {data.contact_name && <span data-edit-text="/contact_name">{data.contact_name}</span>}
                  {data.contact_email && <span> · <a href={`mailto:${data.contact_email}`}>{data.contact_email}</a></span>}
                  {data.contact_phone && <span data-edit-text="/contact_phone"> · {data.contact_phone}</span>}
                </dd>
              </div>
            )}
          </dl>
        </div>
      );

    // ── Social Links ──
    case "socialLinks": {
      const links = expand(block.links || [], null, "@id");
      return (
        <div data-block-uid={id} className="social-links">
          <span>Follow us:</span>
          {links.map((link, i) => {
            const info = getSocialInfo(link.url);
            return (
              <a
                key={link["@uid"] || i}
                data-block-uid={link["@uid"]}
                data-block-add="right"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                data-edit-link="url"
                title={info.name}
                dangerouslySetInnerHTML={{ __html: info.svg }}
              />
            );
          })}
        </div>
      );
    }

    // ── Default listing item: title + description (no image) ──
    case "default":
      return (
        <div data-block-uid={id} className="listing-item default-item">
          <h4>
            <a href={getUrl(block.href)} data-edit-link="href" data-edit-text="title">
              {block.title}
            </a>
          </h4>
          {block.description && (
            <p data-edit-text="description">{block.description}</p>
          )}
        </div>
      );

    // ── Summary listing item: image thumbnail + title + description ──
    case "summary": {
      const summaryImgProps = block.image ? imageProps(block.image, apiUrl) : null;
      return (
        <div data-block-uid={id} className="listing-item summary-item" style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          {summaryImgProps?.url && (
            <img
              data-edit-media="image"
              src={summaryImgProps.url}
              alt=""
              style={{ width: "8rem", height: "6rem", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1 }}>
            {block.date && (
              <time>{formatDate(block.date)}</time>
            )}
            <h4>
              <a href={getUrl(block.href)} data-edit-link="href" data-edit-text="title">
                {block.title}
              </a>
            </h4>
            {block.description && (
              <p data-edit-text="description">{block.description}</p>
            )}
          </div>
        </div>
      );
    }

    // ── Unknown ──
    default:
      return (
        <div data-block-uid={id}>
          Unknown block: {type}
        </div>
      );
  }
}

// ─── BlocksList (entry point) ────────────────────────────────────────────────

const BlocksList = ({ data, apiUrl, contextPath }) => {
  if (!data?.blocks_layout?.items) return null;

  const templates = data._templates || {};
  const templateState = {};

  return (
    <TemplateContext.Provider value={{ templates, templateState }}>
      <div className="blocks-list">
        {data.blocks_layout.items.map((id) => {
          const block = data.blocks[id];
          if (!block) return null;
          return <Block key={id} block={block} id={id} data={data} apiUrl={apiUrl} contextPath={contextPath} />;
        })}
      </div>
    </TemplateContext.Provider>
  );
};

export default BlocksList;
