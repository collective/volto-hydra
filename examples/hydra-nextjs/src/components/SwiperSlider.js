"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

/**
 * Which field a slide keeps its picture in, by slide type.
 *
 * A slide is a block, and blocks disagree: an `image` block's picture is `url`,
 * a teaser-shaped slide's is `preview_image`. The annotation has to name the
 * field the data actually uses — `data-edit-media` is a claim about where the
 * edit lands, so naming the wrong one leaves the slide silently uneditable
 * (which is exactly what the gallery's image slides did).
 */
const SLIDE_MEDIA_FIELD = { image: "url" };
const mediaFieldOf = (slide) => SLIDE_MEDIA_FIELD[slide?.["@type"]] || "preview_image";

export default function SwiperSlider({ slides, apiUrl, imageProps, getUrl }) {
  return (
    <Swiper modules={[Pagination]} pagination={{ clickable: true }} spaceBetween={50}>
      {slides.map((slide) => {
        const mediaField = mediaFieldOf(slide);
        // Read the field, never the slide as a whole: imageProps falls back to
        // an object's own @id, so handing it a slide with no picture yields the
        // slide's id as an image URL — a src that 404s on every slide.
        const mediaValue = slide[mediaField];
        const mediaUrl = mediaValue ? imageProps(mediaValue, apiUrl).url : null;
        return (
        <SwiperSlide key={slide["@uid"]}>
          <div data-block-uid={slide["@uid"]} data-block-add="right">
            {mediaUrl ? (
              <img data-edit-media={mediaField} src={mediaUrl} alt="" style={{ width: "100%" }} />
            ) : (
              <div data-edit-media={mediaField} style={{ width: "100%", height: "300px", backgroundColor: "#374151" }} />
            )}
            {slide.head_title && <div data-edit-text="head_title">{slide.head_title}</div>}
            {slide.title && <h2 data-edit-text="title">{slide.title}</h2>}
            {slide.description && <p data-edit-text="description">{slide.description}</p>}
            {slide.href ? (
              <a href={getUrl(slide.href, apiUrl)} data-edit-link="href" data-edit-text="buttonText">
                {slide.buttonText || "Read More"}
              </a>
            ) : (
              <a href="#" data-edit-link="href" data-edit-text="buttonText">
                {slide.buttonText || "Read More"}
              </a>
            )}
          </div>
        </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
