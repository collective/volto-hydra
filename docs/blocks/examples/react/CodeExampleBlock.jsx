export default function CodeExampleBlock({ block }) {
  const code = block.code || '';
  const language = block.language || '';

  return (
    <div data-block-uid={block['@uid']} className="code-example">
      {block.title && <h3 data-edit-text="title">{block.title}</h3>}
      <pre data-edit-text="code" style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.875rem' }}>
        <code className={language ? `language-${language}` : undefined}>
          {code}
        </code>
      </pre>
    </div>
  );
}
