export default function Table({ columns, rows, emptyText = 'No records found.' }) {
  if (!rows?.length) {
    return <div className="empty-state"><div className="empty-state-icon">—</div><strong>{emptyText}</strong><span>Try adjusting your filters or add a new record.</span></div>
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || JSON.stringify(row)}>
              {columns.map((column) => (
                <td key={column.key} data-label={column.title}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
