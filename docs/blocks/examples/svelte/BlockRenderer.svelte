<script>
  import SlateBlock from './SlateBlock.svelte';
  import IntroductionBlock from './IntroductionBlock.svelte';
  import ImageBlock from './ImageBlock.svelte';
  import HeroBlock from './HeroBlock.svelte';
  import TeaserBlock from './TeaserBlock.svelte';
  import TableBlock from './TableBlock.svelte';
  import ColumnsBlock from './ColumnsBlock.svelte';
  import GridBlock from './GridBlock.svelte';
  import AccordionBlock from './AccordionBlock.svelte';
  import SliderBlock from './SliderBlock.svelte';
  import ListingBlock from './ListingBlock.svelte';
  import SearchBlock from './SearchBlock.svelte';
  import FormBlock from './FormBlock.svelte';
  import HeadingBlock from './HeadingBlock.svelte';
  import SeparatorBlock from './SeparatorBlock.svelte';
  import ButtonBlock from './ButtonBlock.svelte';
  import HighlightBlock from './HighlightBlock.svelte';
  import VideoBlock from './VideoBlock.svelte';
  import TocBlock from './TocBlock.svelte';

  export let block;
</script>

{#if block['@type'] === 'slate'}
  <SlateBlock {block} />
{:else if block['@type'] === 'introduction'}
  <IntroductionBlock {block} />
{:else if block['@type'] === 'image'}
  <ImageBlock {block} />
{:else if block['@type'] === 'hero'}
  <HeroBlock {block} />
{:else if block['@type'] === 'teaser'}
  <TeaserBlock {block} />
{:else if block['@type'] === 'slateTable'}
  <TableBlock {block} />
{:else if block['@type'] === 'columns'}
  <ColumnsBlock {block} />
{:else if block['@type'] === 'gridBlock'}
  <GridBlock {block} />
{:else if block['@type'] === 'accordion'}
  <AccordionBlock {block} />
{:else if block['@type'] === 'slider'}
  <SliderBlock {block} />
{:else if block['@type'] === 'listing'}
  <ListingBlock {block} blockId={block['@uid']} />
{:else if block['@type'] === 'search'}
  <SearchBlock {block} blockId={block['@uid']} />
{:else if block['@type'] === 'form'}
  <FormBlock {block} />
{:else if block['@type'] === 'heading'}
  <HeadingBlock {block} />
{:else if block['@type'] === 'separator'}
  <SeparatorBlock {block} />
{:else if block['@type'] === '__button'}
  <ButtonBlock {block} />
{:else if block['@type'] === 'highlight'}
  <HighlightBlock {block} />
{:else if block['@type'] === 'video'}
  <VideoBlock {block} />
{:else if block['@type'] === 'toc'}
  <TocBlock {block} />
{:else}
  <div data-block-uid={block['@uid']}>Unknown block: {block['@type']}</div>
{/if}
