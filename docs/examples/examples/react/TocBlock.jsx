function TocBlock({ block, content }) {
  const entries = [];
  if (content?.blocks && content?.blocks_layout?.items) {
    for (const id of content.blocks_layout.items) {
      const b = content.blocks[id];
      if (!b) continue;
      if (b['@type'] === 'heading' && b.heading) {
        entries.push({ id, level: parseInt((b.tag || 'h2').slice(1)), text: b.heading });
      } else if (b['@type'] === 'slate' && b.value?.[0]?.type?.match(/^h[1-6]$/)) {
        const level = parseInt(b.value[0].type.slice(1));
        const text = b.plaintext || b.value[0].children?.map(c => c.text).join('') || '';
        if (text.trim()) entries.push({ id, level, text });
      }
    }
  }

  return (
    <nav data-block-uid={block['@uid']} className="toc-block">
      {entries.length > 0 ? (
        <ul>
          {entries.map(e => (
            <li key={e.id} style={{ marginLeft: `${(e.level - 2) * 1.5}em` }}>
              <a href={`#${e.id}`}>{e.text}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Table of Contents</p>
      )}
    </nav>
  );
}
