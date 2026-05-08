function DescriptionBlock({ block, content }) {
  return (
    <p data-block-uid={block['@uid']} data-edit-text="/description" className="description">
      {content.description}
    </p>
  );
}
