function TitleBlock({ block, content }) {
  return (
    <h1 data-block-uid={block['@uid']} data-edit-text="/title">
      {content.title}
    </h1>
  );
}
