<template>
  <!-- Slate (rich text) -->
  <div v-if="block['@type'] == 'slate'" :data-block-uid="block_uid" data-edit-text="value">
    <RichText v-for="node in block['value']" :key="node" :node="node" />
  </div>

  <!-- Title -->
  <h1 v-else-if="block['@type'] == 'title'" :data-block-uid="block_uid" data-edit-text="/title">
    {{ data.title }}
  </h1>

  <!-- Description -->
  <p v-else-if="block['@type'] == 'description'" :data-block-uid="block_uid" data-edit-text="/description"
     class="description">
    {{ data.description }}
  </p>

  <!-- Introduction -->
  <div v-else-if="block['@type'] == 'introduction'" :data-block-uid="block_uid" class="introduction-block">
    <h1 data-edit-text="/title">{{ data.title }}</h1>
    <p v-if="data.description" data-edit-text="/description" class="description">{{ data.description }}</p>
  </div>

  <!-- Image -->
  <f7-block v-else-if="block['@type'] == 'image'" :data-block-uid="block_uid"
            :class="['image-size-' + (block.size || 'l'), 'image-align-' + (block.align || 'center')]">
    <a v-if="block.href" :href="getUrl(block.href)" data-edit-link="href">
      <img v-for="props in [imageProps(block)]" :key="props.url" data-edit-media="url" :src="props.url" :alt="block.alt || ''" />
    </a>
    <img v-else v-for="props in [imageProps(block)]" :key="props.url" data-edit-media="url" data-edit-link="href" :src="props.url" :alt="block.alt || ''" />
  </f7-block>

  <!-- Lead Image -->
  <div v-else-if="block['@type'] == 'leadimage'" :data-block-uid="block_uid" class="leadimage-block">
    <img v-if="getImageUrl(data.preview_image)" data-edit-media="preview_image"
         :src="getImageUrl(data.preview_image)" alt="" loading="lazy" />
  </div>

  <!-- Date Field -->
  <div v-else-if="block['@type'] == 'dateField'" :data-block-uid="block_uid" class="datefield-block">
    <span :data-edit-text="`/${block.dateField || 'effective'}`">
      {{ formatDate(data[block.dateField || 'effective'], block.showTime) }}
    </span>
  </div>

  <!-- Hero -->
  <div v-else-if="block['@type'] == 'hero'" :data-block-uid="block_uid" class="hero-block">
    <img v-if="block.image" class="hero-image" :src="getImageUrl(block.image)" alt="Hero image" />
    <div v-else class="hero-image hero-placeholder"></div>
    <h1 class="hero-heading" data-edit-text="heading">{{ block.heading }}</h1>
    <p class="hero-subheading" data-edit-text="subheading">{{ block.subheading }}</p>
    <div class="hero-description" data-edit-text="description">
      <RichText v-for="node in (block.description || [])" :key="node" :node="node" />
    </div>
    <a v-if="block.buttonText" class="hero-button" :href="getUrl(block.buttonLink)" data-edit-link="buttonLink">
      {{ block.buttonText }}
    </a>
  </div>

  <!-- Teaser -->
  <f7-card v-else-if="block['@type'] == 'teaser'"
           :data-block-uid="block._blockUid || block_uid"
           :data-block-readonly="block.overwrite ? undefined : ''">
    <template v-if="block.preview_image || block.href?.[0]?.hasPreviewImage">
      <f7-card-header valign="bottom">
        <a :href="getUrl(block.href)" data-edit-link="href">
          <img v-if="block.preview_image" data-edit-media="preview_image"
               v-for="props in [imageProps(block.preview_image)]" :key="props.url" :src="props.url" alt="" style="width:100%" />
          <img v-else-if="block.href?.[0]?.hasPreviewImage" data-edit-media="preview_image"
               v-for="props in [imageProps(block.href[0])]" :key="props.url" :src="props.url" alt="" style="width:100%" />
        </a>
      </f7-card-header>
    </template>
    <div v-else data-edit-media="preview_image" style="height:200px; background:#e5e5e5; display:flex; align-items:center; justify-content:center; cursor:pointer;">
      <span style="color:#999">Click to add image</span>
    </div>
    <f7-card-content>
      <div v-if="block.head_title">{{ block.head_title }}</div>
      <h3 v-if="getTeaserTitle(block)" :key="`title-${block.overwrite}`" data-edit-text="title">
        <a :href="getUrl(block.href)" data-edit-link="href">{{ getTeaserTitle(block) }}</a>
      </h3>
      <p v-if="getTeaserDescription(block)" :key="`description-${block.overwrite}`" data-edit-text="description">{{ getTeaserDescription(block) }}</p>
    </f7-card-content>
    <f7-card-footer>
      <f7-link :href="getUrl(block.href)" data-edit-link="href">Read more</f7-link>
    </f7-card-footer>
  </f7-card>

  <!-- Columns -->
  <div v-else-if="block['@type'] == 'columns'" :data-block-uid="block_uid"
       data-block-container="{allowed:['Column'],add:'horizontal'}"
       class="columns-block" style="display:flex; gap:1rem">
    <h3 v-if="block.title" data-edit-text="title">{{ block.title }}</h3>
    <div v-for="columnId in (block.columns?.items || [])" :key="columnId"
         :data-block-uid="columnId" data-block-add="right" style="flex:1">
      <Block v-for="item in expand(block.blocks?.[columnId]?.blocks_layout?.items || [], block.blocks?.[columnId]?.blocks || {})"
             :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" />
    </div>
  </div>

  <!-- Grid Block -->
  <f7-block v-else-if="block['@type'] == 'gridBlock'" :data-block-uid="block_uid"
            data-block-container="{}"
            :class="['grid', 'grid-cols-' + (block.blocks_layout?.items?.length || 1), 'grid-gap']">
    <template v-for="childId in (block.blocks_layout?.items || [])" :key="childId">
      <!-- Listing child -->
      <ListingBlock v-if="block.blocks?.[childId]?.['@type'] === 'listing'"
                    :id="childId" :block="block.blocks[childId]" :data="data" />
      <!-- Static child -->
      <Block v-else v-for="item in expand([childId], block.blocks || {})"
             :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" />
    </template>
  </f7-block>

  <!-- Accordion -->
  <f7-list strong inset-md accordion-list v-else-if="block['@type'] == 'accordion'" :data-block-uid="block_uid">
    <f7-list-item v-for="panel in expand(block.panels || [], null, '@id')"
                  :key="panel['@uid']" accordion-item :title="panel.title"
                  :data-block-uid="panel['@uid']">
      <f7-accordion-content>
        <f7-block>
          <Block v-for="item in expand(panel.blocks_layout?.items || [], panel.blocks || {})"
                 :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" />
        </f7-block>
      </f7-accordion-content>
    </f7-list-item>
  </f7-list>

  <!-- Slider -->
  <section v-else-if="block['@type'] == 'slider'" :data-block-uid="block_uid"
           data-block-container="{allowed:['Slide'],add:'horizontal'}">
    <swiper-container :pagination="true" :space-between="50"
                      :speed="block.autoplayDelay && block.autoplayEnabled ? block.autoplayDelay : ''">
      <swiper-slide v-for="slide in expand(block.value?.slides || block.blocks_layout?.items || [], block.blocks || {}, block.value?.slides ? '@id' : undefined)"
                    :key="slide['@uid']" :data-block-uid="slide['@uid']" data-block-add="right">
        <f7-card>
          <f7-card-header v-if="slide.preview_image" valign="bottom"
                          :style="{ backgroundImage: `url(${getImageUrl(slide.preview_image)})`, backgroundSize: 'cover', minHeight: '200px' }">
            <div data-edit-media="preview_image" style="position:absolute; inset:0; cursor:pointer; z-index:1;"></div>
          </f7-card-header>
          <f7-card-content>
            <div v-if="slide.head_title">{{ slide.head_title }}</div>
            <h3 v-if="slide.title" data-edit-text="title">{{ slide.title }}</h3>
            <p v-if="slide.description" data-edit-text="description">{{ slide.description }}</p>
          </f7-card-content>
          <f7-card-footer v-if="slide.href">
            <a :href="getUrl(slide.href)" data-edit-link="href" data-edit-text="buttonText">
              {{ slide.buttonText || 'Read More' }}
            </a>
          </f7-card-footer>
        </f7-card>
      </swiper-slide>
    </swiper-container>
  </section>

  <!-- Listing -->
  <div v-else-if="block['@type'] === 'listing'" :data-block-uid="block_uid" class="listing-block">
    <ListingBlock :id="block_uid" :block="block" :data="data" />
  </div>

  <!-- Search -->
  <div v-else-if="block['@type'] == 'search'" :data-block-uid="block_uid" class="search-block">
    <h2 v-if="block.headline" data-edit-text="headline">{{ block.headline }}</h2>
    <div v-if="block.showSearchInput" class="search-controls" style="margin-bottom:1rem">
      <form @submit.prevent style="display:flex; gap:0.5rem">
        <input type="text" placeholder="Search..." style="flex:1; padding:0.5rem; border:1px solid #ccc; border-radius:4px" />
        <button type="submit" style="padding:0.5rem 1rem; background:#007aff; color:white; border:none; border-radius:4px">Search</button>
      </form>
    </div>
    <div v-if="block.facets?.length" class="search-facets" style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1rem">
      <div v-for="(facet, idx) in expand(block.facets || [], null, '@id')" :key="facet['@uid'] || idx"
           :data-block-uid="facet['@uid']" data-block-add="bottom"
           style="padding:0.5rem; border:1px solid #ddd; border-radius:4px">
        <div data-edit-text="title" style="font-weight:bold; margin-bottom:0.25rem">{{ facet.title }}</div>
        <select v-if="facet.type === 'selectFacet'"><option value="">Select...</option></select>
        <label v-else-if="facet.type === 'checkboxFacet'"><input type="checkbox" /> {{ facet.title }}</label>
      </div>
    </div>
    <div class="search-results">
      <Block v-for="item in expand(block.listing?.items || [], block.blocks || {})"
             :key="item['@uid']" :block_uid="item['@uid']" :block="item" :data="data" />
    </div>
  </div>

  <!-- Slate Table -->
  <div v-else-if="block['@type'] == 'slateTable'" :data-block-uid="block_uid" class="table-block">
    <table>
      <tr v-for="row in expand(block.table?.rows || [], null, 'key')"
          :key="row['@uid']" :data-block-uid="row['@uid']" data-block-add="bottom">
        <component v-for="cell in expand(row.cells || [], null, 'key')"
                   :key="cell['@uid']"
                   :is="cell.type === 'header' ? 'th' : 'td'"
                   :data-block-uid="cell['@uid']" data-block-add="right">
          <RichText v-for="(node, idx) in (cell.value || [])" :key="idx" :node="node" data-edit-text="value" />
        </component>
      </tr>
    </table>
  </div>

  <!-- Heading -->
  <component v-else-if="block['@type'] == 'heading'" :is="block.tag || 'h2'"
             :data-block-uid="block_uid" data-edit-text="heading">
    {{ block.heading }}
  </component>

  <!-- Separator -->
  <hr v-else-if="block['@type'] == 'separator'" :data-block-uid="block_uid" />

  <!-- Button -->
  <div v-else-if="block['@type'] == '__button'" :data-block-uid="block_uid" class="button-block">
    <a :href="getUrl(block.href)" data-edit-link="href" class="button">
      <span data-edit-text="title">{{ block.title || 'Button' }}</span>
    </a>
  </div>

  <!-- Highlight -->
  <section v-else-if="block['@type'] == 'highlight'" :data-block-uid="block_uid" class="highlight-block"
           :style="{ position: 'relative', overflow: 'hidden', borderRadius: '8px', padding: '0' }">
    <div v-if="imageProps(block.image).url"
         :style="{ position: 'absolute', inset: '0', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url(${imageProps(block.image).url})` }" />
    <div v-else :style="{ position: 'absolute', inset: '0', background: highlightGradient(block.styles?.descriptionColor) }" />
    <div :style="{ position: 'absolute', inset: '0', background: 'rgba(0,0,0,0.5)' }" />
    <div :style="{ position: 'relative', zIndex: '1', padding: '4rem 2rem', textAlign: 'center', color: 'white' }">
      <h2 data-edit-text="title" style="margin-bottom:1rem; font-size:2rem; font-weight:800;">{{ block.title }}</h2>
      <div style="margin-bottom:2rem; font-size:1.1rem;">
        <RichText v-for="node in (block.description || block['value'] || [])" :key="node" :node="node" />
      </div>
      <a v-if="block.cta_title" :href="getUrl(block.cta_link)"
         data-edit-text="cta_title" data-edit-link="cta_link"
         style="padding:0.75rem 1.25rem; background:#1d4ed8; color:white; border-radius:8px; text-decoration:none;">
        {{ block.cta_title }}
      </a>
    </div>
  </section>

  <!-- Video -->
  <div v-else-if="block['@type'] == 'video'" :data-block-uid="block_uid" class="video-block">
    <iframe v-if="getYouTubeId(block.url)"
            :src="`https://www.youtube.com/embed/${getYouTubeId(block.url)}`"
            allowfullscreen style="width:100%; aspect-ratio:16/9; border:none" />
    <video v-else-if="block.url" :src="block.url" controls style="width:100%" />
    <p v-else>No video URL set</p>
  </div>

  <!-- Maps -->
  <div v-else-if="block['@type'] == 'maps'" :data-block-uid="block_uid" class="maps-block">
    <h3 v-if="block.title" data-edit-text="title">{{ block.title }}</h3>
    <iframe v-if="block.url" :src="block.url" data-edit-link="url"
            :title="block.title || 'Map'" allowfullscreen loading="lazy"
            style="width:100%; height:450px; border:none" />
    <p v-else>No map URL configured</p>
  </div>

  <!-- Table of Contents -->
  <nav v-else-if="block['@type'] == 'toc'" :data-block-uid="block_uid" class="toc-block">
    <h3>Table of Contents</h3>
    <p>(Auto-generated from headings)</p>
  </nav>

  <!-- Form -->
  <div v-else-if="block['@type'] == 'form'" :data-block-uid="block_uid" class="form-block">
    <h3 v-if="block.title" data-edit-text="title">{{ block.title }}</h3>
    <form @submit.prevent novalidate>
      <template v-for="field in expand(block.subblocks, null, 'field_id')" :key="field['@uid']">
        <div :data-block-uid="field['@uid']" :data-block-type="field.field_type" data-block-add="bottom"
             style="margin-bottom:1rem">
          <!-- Text -->
          <template v-if="field.field_type === 'text'">
            <label data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
            <input type="text" :name="field.field_id" :placeholder="field.placeholder || ''" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px" />
          </template>
          <!-- Textarea -->
          <template v-else-if="field.field_type === 'textarea'">
            <label data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
            <textarea :name="field.field_id" rows="4" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px"></textarea>
          </template>
          <!-- Number -->
          <template v-else-if="field.field_type === 'number'">
            <label data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
            <input type="number" :name="field.field_id" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px" />
          </template>
          <!-- Select -->
          <template v-else-if="field.field_type === 'select'">
            <label data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
            <select :name="field.field_id" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px">
              <option value="">Select...</option>
              <option v-for="opt in field.input_values" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </template>
          <!-- Single Choice (Radio) -->
          <template v-else-if="field.field_type === 'single_choice'">
            <fieldset>
              <legend data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></legend>
              <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
              <div v-for="opt in field.input_values" :key="opt" style="margin:0.25rem 0">
                <label><input type="radio" :name="field.field_id" :value="opt" /> {{ opt }}</label>
              </div>
            </fieldset>
          </template>
          <!-- Multiple Choice (Checkboxes) -->
          <template v-else-if="field.field_type === 'multiple_choice'">
            <fieldset>
              <legend data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></legend>
              <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
              <div v-for="opt in field.input_values" :key="opt" style="margin:0.25rem 0">
                <label><input type="checkbox" :name="field.field_id" :value="opt" /> {{ opt }}</label>
              </div>
            </fieldset>
          </template>
          <!-- Checkbox -->
          <template v-else-if="field.field_type === 'checkbox'">
            <label>
              <input type="checkbox" :name="field.field_id" />
              <span data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></span>
            </label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
          </template>
          <!-- Date -->
          <template v-else-if="field.field_type === 'date'">
            <label data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
            <input type="date" :name="field.field_id" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px" />
          </template>
          <!-- Email (from) -->
          <template v-else-if="field.field_type === 'from'">
            <label data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
            <input type="email" :name="field.field_id" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px" />
          </template>
          <!-- Attachment -->
          <template v-else-if="field.field_type === 'attachment'">
            <label data-edit-text="label">{{ field.label }}<span v-if="field.required" style="color:red"> *</span></label>
            <p v-if="field.description" style="font-size:0.85em; color:#666">{{ field.description }}</p>
            <input type="file" :name="field.field_id" />
          </template>
          <!-- Static text -->
          <template v-else-if="field.field_type === 'static_text'">
            <div>
              <strong v-if="field.label" data-edit-text="label">{{ field.label }}</strong>
              <p v-if="field.description">{{ field.description }}</p>
            </div>
          </template>
          <!-- Hidden -->
          <template v-else-if="field.field_type === 'hidden'">
            <input type="hidden" :name="field.field_id" :value="field.value || ''" />
          </template>
        </div>
      </template>
      <div style="display:flex; gap:0.75rem; padding-top:0.5rem">
        <button type="submit" data-edit-text="submit_label">{{ block.submit_label || 'Submit' }}</button>
        <button v-if="block.show_cancel" type="reset" data-edit-text="cancel_label">{{ block.cancel_label || 'Cancel' }}</button>
      </div>
    </form>
  </div>

  <!-- Code Example -->
  <div v-else-if="block['@type'] == 'codeExample'" :data-block-uid="block_uid" class="code-example">
    <h3 v-if="block.title" data-edit-text="title">{{ block.title }}</h3>
    <pre data-edit-text="code" style="background:#1e1e1e; color:#d4d4d4; padding:1rem; border-radius:8px; overflow:auto">
      <code>{{ block.code || '' }}</code>
    </pre>
  </div>

  <!-- Empty -->
  <div v-else-if="block['@type'] == 'empty'" :data-block-uid="block_uid" class="empty-block" style="min-height:60px"></div>

  <!-- Event Metadata -->
  <div v-else-if="block['@type'] == 'eventMetadata'" :data-block-uid="block_uid" class="event-metadata">
    <dl>
      <div v-if="data.start" class="event-row">
        <dt>When</dt>
        <dd>
          <span data-edit-text="/start">{{ formatDate(data.start, true) }}</span>
          <span v-if="data.end"> – <span data-edit-text="/end">{{ formatDate(data.end, true) }}</span></span>
        </dd>
      </div>
      <div v-if="data.location" class="event-row">
        <dt>Where</dt>
        <dd data-edit-text="/location">{{ data.location }}</dd>
      </div>
      <div v-if="data.event_url" class="event-row">
        <dt>Website</dt>
        <dd><a :href="data.event_url">{{ data.event_url }}</a></dd>
      </div>
      <div v-if="data.contact_name || data.contact_email || data.contact_phone" class="event-row">
        <dt>Contact</dt>
        <dd>
          <span v-if="data.contact_name" data-edit-text="/contact_name">{{ data.contact_name }}</span>
          <span v-if="data.contact_email"> · <a :href="`mailto:${data.contact_email}`">{{ data.contact_email }}</a></span>
          <span v-if="data.contact_phone" data-edit-text="/contact_phone"> · {{ data.contact_phone }}</span>
        </dd>
      </div>
    </dl>
  </div>

  <!-- Social Links -->
  <div v-else-if="block['@type'] == 'socialLinks'" :data-block-uid="block_uid" class="social-links">
    <span>Follow us:</span>
    <a v-for="link in expand(block.links || [], null, '@id')" :key="link['@uid']"
       :data-block-uid="link['@uid']" data-block-add="right"
       :href="link.url" target="_blank" rel="noopener noreferrer"
       data-edit-link="url" :title="getSocialHostname(link.url)"
       v-html="getSocialIcon(link.url)" />
  </div>

  <!-- Default listing item: title + description -->
  <div v-else-if="block['@type'] == 'default'" :data-block-uid="block_uid" class="default-item-block" style="padding:1rem 0; border-bottom:1px solid #e5e5e5">
    <h4><a :href="getUrl(block.href)" data-edit-link="href">{{ block.title }}</a></h4>
    <p v-if="block.description" data-edit-text="description">{{ block.description }}</p>
  </div>

  <!-- Summary listing item: image thumbnail + title + description -->
  <div v-else-if="block['@type'] == 'summary'" :data-block-uid="block_uid" class="summary-item-block" style="padding:1rem 0; border-bottom:1px solid #e5e5e5; display:flex; align-items:flex-start; gap:1rem">
    <template v-if="block.image" v-for="props in [imageProps(block.image)]" :key="props.url">
      <img v-if="props.url" :src="props.url" alt="" data-edit-media="image"
           style="width:128px; height:96px; object-fit:cover; border-radius:4px; flex-shrink:0" />
    </template>
    <div style="flex:1">
      <time v-if="block.date" style="display:block; font-size:0.75rem; font-weight:bold; text-transform:uppercase; margin-bottom:0.25rem">{{ formatDate(block.date) }}</time>
      <h4><a :href="getUrl(block.href)" data-edit-link="href">{{ block.title }}</a></h4>
      <p v-if="block.description" data-edit-text="description">{{ block.description }}</p>
    </div>
  </div>

  <!-- Unknown -->
  <div v-else :data-block-uid="block_uid">
    Unknown block: {{ block['@type'] }}
  </div>
</template>

<script>
import { inject, ref, watch } from 'vue';
import RichText from './richtext.vue';
import { expandTemplatesSync, expandListingBlocks, ploneFetchItems } from '../js/hydra.js';

// Listing block component (async fetcher)
const ListingBlock = {
  name: 'ListingBlock',
  props: {
    id: { type: String, required: true },
    block: { type: Object, required: true },
    data: { type: Object, required: true },
  },
  setup(props) {
    const apiBase = inject('apiBase', '');
    const contextPath = inject('contextPath', '/');
    const items = ref([]);

    async function fetchListing() {
      // Unwrap Vue refs — inject returns refs from useStore which are reactive objects
      const apiUrl = typeof apiBase === 'object' && apiBase?.value !== undefined ? apiBase.value : apiBase;
      const ctxPath = typeof contextPath === 'object' && contextPath?.value !== undefined ? contextPath.value : contextPath;
      if (!apiUrl) return;
      const fetchItems = {
        listing: ploneFetchItems({ apiUrl, contextPath: ctxPath }),
      };
      const result = await expandListingBlocks([props.id], {
        blocks: { [props.id]: props.block },
        fetchItems,
        itemTypeField: 'variation',
      });
      items.value = result.items || [];
    }

    fetchListing();
    watch(() => [props.id, props.block], fetchListing);

    return { items };
  },
  template: `<template v-for="item in items" :key="item['@uid']">
    <Block :block_uid="item['@uid']" :block="item" :data="data" />
  </template>`,
  components: { Block: () => import('./block.vue') },
};

// Social icons SVG map
const SOCIAL_ICONS = {
  'github.com': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  'youtube.com': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  'x.com': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  'twitter.com': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
};
const DEFAULT_LINK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

export default {
  name: 'Block',
  components: {
    RichText,
    ListingBlock,
  },
  props: {
    block_uid: { type: String },
    block: { type: Object, required: true },
    data: { type: Object, required: true },
  },
  setup() {
    const templates = inject('templates', {});
    const templateState = inject('templateState', {});
    const apiBase = inject('apiBase', '');

    const expand = (layout, blocks, idField) =>
      expandTemplatesSync(layout, {
        blocks,
        templateState,
        templates,
        ...(idField && { idField }),
      });

    return { expand, apiBase };
  },
  methods: {
    getUrl(href) {
      if (!href) return '';
      if (Array.isArray(href) && href.length) href = href[0];
      if (href['@id']) {
        try {
          const url = new URL(href['@id']);
          return url.pathname;
        } catch {
          return href['@id'];
        }
      }
      return typeof href === 'string' ? href : '';
    },
    imageProps(block) {
      if (!block) {
        return { url: null, size: 'l', align: 'center' };
      }
      // Unwrap preview_image field
      if (block?.preview_image) {
        block = block.preview_image;
      }
      // Handle array format: [{ download, scales }]
      if (Array.isArray(block) && block.length > 0) {
        block = block[0];
      }
      if (!block) {
        return { url: null, size: 'l', align: 'center' };
      }

      var image_url = null;

      if (typeof block === 'string') {
        // Plain URL string
        image_url = block;
      } else if ('@id' in block && block?.image_scales) {
        // Image content object with scales
        image_url = block['@id'];
      } else if ('@id' in block && block?.hasPreviewImage) {
        // href object with preview image
        image_url = block['@id'];
        if (image_url.startsWith('/') && this.apiBase) {
          image_url = `${this.apiBase}${image_url}`;
        }
        image_url = `${image_url}/@@images/preview_image`;
        return { url: image_url, size: block.size || 'l', align: block.align || 'center' };
      } else if ('@id' in block) {
        // Image reference without scales
        image_url = block['@id'];
      } else if (block?.download) {
        // Direct download URL
        image_url = block.download;
      } else if (block?.url && block['@type'] === 'image') {
        // Image block with url field
        const urlValue = block.url;
        if (typeof urlValue === 'string') {
          image_url = urlValue;
        } else if (urlValue?.image_scales && urlValue?.image_field) {
          // Catalog brain format from listing expansion
          const field = urlValue.image_field;
          const scales = urlValue.image_scales[field];
          if (scales?.[0]?.download) {
            image_url = `${urlValue['@id'] || ''}/${scales[0].download}`;
          }
        } else if (urlValue?.['@id']) {
          image_url = urlValue['@id'];
        }
      } else {
        return { url: null, size: block.size || 'l', align: block.align || 'center' };
      }

      if (!image_url) {
        return { url: null, size: block.size || 'l', align: block.align || 'center' };
      }

      // Prepend apiBase for relative URLs
      if (image_url.startsWith('/') && this.apiBase) {
        image_url = `${this.apiBase}${image_url}`;
      }

      // Handle scale resolution
      if (block?.image_scales && block?.image_field) {
        const field = block.image_field;
        image_url = `${image_url}/${block.image_scales[field][0].download}`;
      } else if (block?.scales) {
        image_url = block.download;
      } else if (block?.url && block?.image_field) {
        image_url = `${image_url}/@@images/${block.image_field}`;
      } else if (block['@type'] === 'image' && !image_url.includes('@@images') && !image_url.includes('@@download') && !image_url.includes('@@display-file') && !image_url.startsWith('data:')) {
        // Image block without scale info
        image_url = `${image_url}/@@images/image`;
      }

      return {
        url: image_url,
        size: block.size || 'l',
        align: block.align || 'center',
      };
    },
    getImageUrl(value) {
      if (!value) return '';
      const props = this.imageProps(value);
      return props.url || '';
    },
    getTeaserTitle(block) {
      const hrefObj = block.href?.[0];
      const hrefObjHasContentData = hrefObj?.title !== undefined;
      const useBlockData = block.overwrite || !hrefObjHasContentData;
      if (useBlockData) {
        return block.title || hrefObj?.title || '';
      }
      return hrefObj?.title || '';
    },
    getTeaserDescription(block) {
      const hrefObj = block.href?.[0];
      const hrefObjHasContentData = hrefObj?.title !== undefined;
      const useBlockData = block.overwrite || !hrefObjHasContentData;
      if (useBlockData) {
        return block.description || hrefObj?.description || '';
      }
      return hrefObj?.description || '';
    },
    highlightGradient(colorClass) {
      const gradients = {
        'highlight-custom-color-1': 'linear-gradient(to right, #1e3a8a, #2563eb)',
        'highlight-custom-color-2': 'linear-gradient(to right, #065f46, #059669)',
        'highlight-custom-color-3': 'linear-gradient(to right, #581c87, #9333ea)',
        'highlight-custom-color-4': 'linear-gradient(to right, #78350f, #d97706)',
        'highlight-custom-color-5': 'linear-gradient(to right, #881337, #e11d48)',
      };
      return gradients[colorClass] || gradients['highlight-custom-color-1'];
    },
    formatDate(dateStr, showTime) {
      if (!dateStr) return '';
      const opts = { year: 'numeric', month: 'long', day: 'numeric' };
      if (showTime) {
        opts.hour = '2-digit';
        opts.minute = '2-digit';
      }
      return new Date(dateStr).toLocaleDateString(undefined, opts);
    },
    getYouTubeId(url) {
      if (!url) return null;
      const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
      return m ? m[1] : null;
    },
    getSocialHostname(url) {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return 'Link';
      }
    },
    getSocialIcon(url) {
      const hostname = this.getSocialHostname(url);
      return SOCIAL_ICONS[hostname] || DEFAULT_LINK_SVG;
    },
  },
};
</script>
