export default function CodeExampleBlock({ block }) {
  const tabs = block.tabs || [];
  const [activeTab, setActiveTab] = useState(0);

  if (tabs.length === 0) return <div data-block-uid={block['@uid']} />;

  return (
    <div data-block-uid={block['@uid']} className="code-example" data-block-container='{"add":"horizontal"}'>
      {tabs.length > 1 && (
        <div data-tab-bar style={{ display: 'flex', background: '#1f2937', borderBottom: '1px solid #374151' }}>
          {tabs.map((tab, i) => (
            <button key={tab['@id']} data-block-uid={tab['@id']} data-linkable-allow
              onClick={() => setActiveTab(i)}
              style={{
                padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
                border: 'none', cursor: 'pointer',
                background: activeTab === i ? '#111827' : 'transparent',
                color: activeTab === i ? '#fff' : '#9ca3af',
                borderBottom: activeTab === i ? '2px solid #60a5fa' : '2px solid transparent',
              }}>
              <span data-edit-text="label">{tab.label || tab.language || `Tab ${i + 1}`}</span>
            </button>
          ))}
        </div>
      )}
      {tabs.map((tab, i) => (
        <div key={tab['@id']} data-block-uid={tab['@id']} data-block-add="right"
          style={{ display: activeTab === i ? 'block' : 'none' }}>
          <pre data-edit-text="code" style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: tabs.length > 1 ? 0 : '8px', overflow: 'auto', fontSize: '0.875rem', margin: 0, whiteSpace: 'pre-wrap' }}>
            <code className={tab.language ? `language-${tab.language}` : undefined}>
              {tab.code || ''}
            </code>
          </pre>
        </div>
      ))}
    </div>
  );
}
