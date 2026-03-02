function TocBlock({ block }) {
  // Table of Contents renders a placeholder.
  // A real implementation scans sibling blocks for headings.
  return (
    <nav data-block-uid={block['@uid']} className="toc-block">
      <ul>
        <li>Table of Contents (generated from page headings)</li>
      </ul>
    </nav>
  );
}
