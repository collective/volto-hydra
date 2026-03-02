<template>
  <component :is="componentFor(block['@type'])" :block="block" :blockId="block['@uid']" />
</template>

<script setup>
import SlateBlock from './SlateBlock.vue';
import IntroductionBlock from './IntroductionBlock.vue';
import ImageBlock from './ImageBlock.vue';
import HeroBlock from './HeroBlock.vue';
import TeaserBlock from './TeaserBlock.vue';
import TableBlock from './TableBlock.vue';
import ColumnsBlock from './ColumnsBlock.vue';
import GridBlock from './GridBlock.vue';
import AccordionBlock from './AccordionBlock.vue';
import SliderBlock from './SliderBlock.vue';
import ListingBlock from './ListingBlock.vue';
import SearchBlock from './SearchBlock.vue';
import FormBlock from './FormBlock.vue';
import HeadingBlock from './HeadingBlock.vue';
import SeparatorBlock from './SeparatorBlock.vue';
import ButtonBlock from './ButtonBlock.vue';
import HighlightBlock from './HighlightBlock.vue';
import VideoBlock from './VideoBlock.vue';
import TocBlock from './TocBlock.vue';
import { h } from 'vue';

defineProps({ block: Object, blockId: String });

const typeMap = {
  slate: SlateBlock,
  introduction: IntroductionBlock,
  image: ImageBlock,
  hero: HeroBlock,
  teaser: TeaserBlock,
  slateTable: TableBlock,
  columns: ColumnsBlock,
  gridBlock: GridBlock,
  accordion: AccordionBlock,
  slider: SliderBlock,
  listing: ListingBlock,
  search: SearchBlock,
  form: FormBlock,
  heading: HeadingBlock,
  separator: SeparatorBlock,
  __button: ButtonBlock,
  highlight: HighlightBlock,
  video: VideoBlock,
  toc: TocBlock,
};

function componentFor(type) {
  return typeMap[type] || {
    props: ['block'],
    render() {
      return h('div', { 'data-block-uid': this.block['@uid'] }, `Unknown block: ${type}`);
    },
  };
}
</script>
