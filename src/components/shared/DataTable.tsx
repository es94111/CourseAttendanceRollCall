interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
}

export function DataTable<T extends { id: string | number }>({
  rows,
  columns
}: {
  rows: T[]
  columns: Column<T>[]
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
