function SlateNode({ node }) {
  if (node.text !== undefined) return <>{node.text}</>;
  const children = (node.children || []).map((c, i) => <SlateNode key={i} node={c} />);
  const Tag = node.type === 'link' ? 'a' : node.type;
  const props = { 'data-node-id': node.nodeId };
  if (node.type === 'link') props.href = node.data?.url;
  return <Tag {...props}>{children}</Tag>;
}
