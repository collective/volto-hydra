function SlateNode({ node }) {
  const children = (node.children || []).map((child, i) => (
    <SlateNode key={i} node={child} />
  ));

  switch (node.type) {
    case 'p':         return <p>{children}</p>;
    case 'h1':        return <h1>{children}</h1>;
    case 'h2':        return <h2>{children}</h2>;
    case 'h3':        return <h3>{children}</h3>;
    case 'blockquote': return <blockquote>{children}</blockquote>;
    case 'ul':        return <ul>{children}</ul>;
    case 'ol':        return <ol>{children}</ol>;
    case 'li':        return <li>{children}</li>;
    case 'link':      return <a href={node.data?.url}>{children}</a>;
    case 'strong':    return <strong>{children}</strong>;
    case 'em':        return <em>{children}</em>;
    case 'del':       return <del>{children}</del>;
    case 'u':         return <u>{children}</u>;
    case 'code':      return <code>{children}</code>;
    default:
      // Leaf text node
      if (node.text !== undefined) return <>{node.text}</>;
      return <span>{children}</span>;
  }
}
