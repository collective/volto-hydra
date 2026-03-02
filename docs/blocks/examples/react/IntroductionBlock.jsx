function IntroductionBlock({ block, content }) {
  return (
    <div data-block-uid={block['@uid']} className="introduction-block">
      <h1 data-edit-text="/title">{content.title}</h1>
      {content.description && <p data-edit-text="/description" className="description">{content.description}</p>}
    </div>
  );
}
