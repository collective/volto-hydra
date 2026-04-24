function IntroductionBlock({ block }) {
  return (
    <div data-block-uid={block['@uid']} className="introduction-block">
      <div className="introduction-body" data-edit-text="value">
        {(block.value || []).map((node, i) => (
          <SlateNode key={i} node={node} />
        ))}
      </div>
    </div>
  );
}
