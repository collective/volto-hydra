function BlockRenderer({ block }) {
  const type = block['@type'];
  switch (type) {
    case 'slate':         return <SlateBlock block={block} />;
    case 'introduction':  return <IntroductionBlock block={block} />;
    case 'image':         return <ImageBlock block={block} />;
    case 'hero':          return <HeroBlock block={block} />;
    case 'teaser':        return <TeaserBlock block={block} />;
    case 'slateTable':    return <TableBlock block={block} />;
    case 'columns':       return <ColumnsBlock block={block} />;
    case 'gridBlock':     return <GridBlock block={block} />;
    case 'accordion':     return <AccordionBlock block={block} />;
    case 'slider':        return <SliderBlock block={block} />;
    case 'listing':       return <ListingBlock block={block} blockId={block['@uid']} />;
    case 'search':        return <SearchBlock block={block} blockId={block['@uid']} />;
    case 'form':          return <FormBlock block={block} />;
    case 'heading':       return <HeadingBlock block={block} />;
    case 'separator':     return <SeparatorBlock block={block} />;
    case '__button':      return <ButtonBlock block={block} />;
    case 'highlight':     return <HighlightBlock block={block} />;
    case 'video':         return <VideoBlock block={block} />;
    case 'toc':           return <TocBlock block={block} />;
    default:              return <div data-block-uid={block['@uid']}>Unknown block: {type}</div>;
  }
}
