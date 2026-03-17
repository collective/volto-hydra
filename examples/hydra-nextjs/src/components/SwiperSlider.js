"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

export default function SwiperSlider({ slides, apiUrl, imageProps, getUrl }) {
  return (
    <Swiper modules={[Pagination]} pagination={{ clickable: true }} spaceBetween={50}>
      {slides.map((slide) => (
        <SwiperSlide key={slide["@uid"]}>
          <div data-block-uid={slide["@uid"]} data-block-add="right">
            {slide.preview_image ? (
              <img data-edit-media="preview_image" src={imageProps(slide, apiUrl).url || ""} alt="" style={{ width: "100%" }} />
            ) : (
              <div data-edit-media="preview_image" style={{ width: "100%", height: "300px", backgroundColor: "#374151" }} />
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
      ))}
    </Swiper>
  );
}
