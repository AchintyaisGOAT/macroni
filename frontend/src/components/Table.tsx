import type { CSSProperties, Key, ReactNode } from "react";

export interface TableColumn<T> {
  header: ReactNode;
  render: (row: T) => ReactNode;
  cellStyle?: CSSProperties;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => Key;
}

// The one <table> shape - muted uppercase-ish header row, gridline row
// separators, consistent cell padding - shared by every holdings/watchlist/
// stocks table in the app. Previously each page hand-rolled an identical
// copy of this markup around its own row data.
export function Table<T>({ columns, rows, rowKey }: TableProps<T>) {
  return (
    <table style={{ fontSize: 13, width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 12 }}>
          {columns.map((c, i) => (
            <th key={i} style={{ paddingBottom: 6, fontWeight: 400 }}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)} style={{ borderTop: "1px solid var(--gridline)", verticalAlign: "top" }}>
            {columns.map((c, i) => (
              <td key={i} style={{ padding: "8px 0", ...c.cellStyle }}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
