function TableBlock({ block }) {
  const rows = block.table?.rows || [];
  return (
    <div data-block-uid={block['@uid']}>
      <table>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} data-block-uid={row.key}>
              {row.cells.map(cell => (
                <td key={cell.key} data-block-uid={cell.key} data-edit-text="value">
                  {(cell.value || []).map((node, i) => (
                    <SlateNode key={i} node={node} />
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
