

export default function imageProps(block, bgStyles=false, imageField='image') {
    const { optimizeImage } = useOptimizeImage()
    const runtimeConfig = useRuntimeConfig()

    // https://demo.plone.org/images/penguin1.jpg/@@images/image-32-cecef57e6c78570023eb042501b45dc2.jpeg
    // https://hydra-api.pretagov.com/images/penguin1.jpg/++api++/@@images/image-1800-31be5b7f53648238b68cae0a3ec45dec.jpeg
    var bg_class = {}
    if (!block) {
        return {
            url: null,
            class: bg_class
        }
    }
    if (block?.preview_image) {
        block = block.preview_image;
    }
    // Handle array format (from Plone API): [{ download: '...', scales: {...} }]
    if (Array.isArray(block) && block.length > 0) {
        block = block[0];
    }
    var image_url = null;
    if (!block) {
        return {
            url: null,
            class: bg_class
        }
    } else if ('@id' in block && block?.image_scales) {
        // It's an image content object
        image_url = block['@id'];
    } else if ('@id' in block && block?.hasPreviewImage) {
        // It's an href object with a preview image (e.g., teaser target)
        // Return early with the constructed URL since we don't have scale info
        image_url = block['@id'];
        image_url = image_url.startsWith("/") ? `${runtimeConfig.public.backendBaseUrl}${image_url}`: image_url;
        image_url = `${image_url}/@@images/preview_image`;
        return {
            url: image_url,
            class: bg_class,
        };
    } else if (block?.download) {
        image_url = block.download;
    }
    else if (block?.url && block['@type'] == "image") {
        // image block with url field - handle both string URLs and catalog brain format
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
            // Simple object with @id
            image_url = urlValue['@id'];
        }
    } else {
        return {
            url:null,
            class: bg_class
        }
    }

    if (!image_url ) {
      return {
        url:null,
        class: bg_class
        }
    } 
    image_url = image_url.startsWith("/") ? `${runtimeConfig.public.backendBaseUrl}${image_url}`: image_url;
    if (runtimeConfig.public.image_alias != '') {
        // in edit mode we are SPA so this won't work
        image_url = image_url.replace(runtimeConfig.public.backendBaseUrl, runtimeConfig.public.image_alias); // nuxt image alias
    }
    var srcset = "";
    var sizes = "";
    var width = block?.width;
    const field = block?.image_field ? block.image_field : null;

    if (block?.image_scales && block?.image_field) {
        const field = block.image_field;
        srcset = Object.keys(block.image_scales[field][0].scales).map((name) => {
            const scale = block.image_scales[field][0].scales[name];
            return `${image_url}/${scale.download} w${scale.width}`;
        }).join(", ");
        sizes = Object.keys(block.image_scales[field][0].scales).map((name) => {
            const scale = block.image_scales[field][0].scales[name];
            return `${name}:${scale.width}px`;
        }).join(" ");
        //image_url = image_url +  "/@@images/image";
        image_url = `${image_url}/${block.image_scales[field][0].download}`;
        //width = block.images_scales[field][0].scales[block.styles["size:noprefix"]].width;
    } else if (block?.scales) {
        srcset = Object.keys(block.scales).map((name) => {
            const scale = block.scales[name];
            return `${image_url}/${scale.download} w${scale.width}`;
        }).join(", ");
        image_url = block.download;
    } 
    else if (block?.url && block?.image_field) {
        // image block with image_field and url
        image_url = `${image_url}/@@images/${block?.image_field}`;
    }
    else if (block['@type'] == "image" && !image_url.includes('@@images')) {
        // image block without scale info - add default image scale
        image_url = `${image_url}/@@images/image`;
    }
    else if (!/\.[a-zA-Z]+$/.test(image_url)) {
        image_url = "";
    }
    // `${['hidden', 'duration-700', 'ease-linear', 'bg-center',  ] + (block?.preview_image? ['bg-cover', imageProps(block.preview_image[0]).bg]:['bg-gray-700', 'bg-blend-multiply', 'bg-no-repeat'])}`
    const size = block.size;
    const align = block.align;
    bg_class = [`background-image: url('${image_url}')`];
    if (bgStyles){
        bg_class = optimizeImage(image_url, {}, true).bgStyles;
    }
    return {
      url: image_url,
      size: size,
      align: align,
      srcset: srcset,
      sizes: sizes,
      class: bg_class,
      width: width,
    //   ...optimizeImage(
    //     image_url,
    //     /* options */
    //     {
    //       placeholder: false, // placeholder image before the actual image is fully loaded.
    //       //placeholder: props.placeholder, // placeholder image before the actual image is fully loaded.
    //     },
    //     true /* return bgStyles */,
    //   ),
  
    }
};


