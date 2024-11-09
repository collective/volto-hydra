export default function imageProps(block) {
    // https://demo.plone.org/images/penguin1.jpg/@@images/image-32-cecef57e6c78570023eb042501b45dc2.jpeg
    // https://hydra-api.pretagov.com/images/penguin1.jpg/++api++/@@images/image-1800-31be5b7f53648238b68cae0a3ec45dec.jpeg
    if (!block) {
        return {
            url: null
        }
    }
    if (block?.preview_image) {
        block = block.preview_image
    }
    var image_url = null;
    if (!block) {
        return {
            url: null
        }
    } else if (block?.url) {
        image_url = block.url
    } else if (block?.download) {
        image_url = block.download
    } else if ('@id' in block) {
        image_url = block['@id'];
    }
    if (!image_url) {
      return {}
    } 
    image_url = image_url.startsWith("/") ? `https://hydra-api.pretagov.com${image_url}`: image_url;
    var srcset = "";
    var width = block.width;
    const field = block?.image_field ? block.image_field : 'image';

    if (block?.image_scales) {
      srcset = Object.keys(block.image_scales[field][0].scales).map((name) => {
          const scale = block.image_scales[field][0].scales[name];
          return `${image_url}/${scale.download} w${scale.width}`;
      }).join(", ");
      //image_url = image_url +  "/@@images/image";
      image_url = `${image_url}/${block.image_scales[field][0].download}`;
      //width = block.images_scales[field][0].scales[block.styles["size:noprefix"]].width;

    } else if (image_url.startsWith("https://hydra-api.pretagov.com")) {
        image_url = `${image_url}/@@images/${field}`
    }

    const size = block.size;
    const align = block.align;
    return {
      url: image_url,
      size: size,
      align: align,
      srcset: srcset,
      bg: `bg-[url('${image_url}')]`,
      width: block
    }
};