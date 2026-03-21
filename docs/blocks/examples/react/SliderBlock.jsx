import { getImageUrl } from './utils.js';

function SliderBlock({ block }) {
  const [current, setCurrent] = useState(0);
  const slides = block.slides || [];

  return (
    <div data-block-uid={block['@uid']} className="slider-block">
      {slides.map((slide, i) => (
        <div
          key={slide['@id']}
          data-block-uid={slide['@id']}
          className="slide"
          style={{ display: i === current ? 'block' : 'none' }}
        >
          {slide.preview_image && (
            <img
              data-edit-media="preview_image"
              src={getImageUrl(slide.preview_image)}
              alt=""
            />
          )}
          <span data-edit-text="head_title">{slide.head_title}</span>
          <h2 data-edit-text="title">{slide.title}</h2>
          <p data-edit-text="description">{slide.description}</p>
          <button data-edit-text="buttonText">{slide.buttonText}</button>
        </div>
      ))}
      <div className="slider-dots">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={i === current ? 'active' : ''} />
        ))}
      </div>
    </div>
  );
}
