import React from 'react';

export interface WorkflowTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Hide this column below the given breakpoint (Tailwind responsive table-cell display). */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

interface DatasetWorkflowTableProps<T> {
  columns: WorkflowTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

const ALIGN_CLASS: Record<NonNullable<WorkflowTableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const HIDE_BELOW_CLASS: Record<NonNullable<WorkflowTableColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

/**
 * Generic full-width master list table shared by every dataset-workflow
 * master screen. Each module supplies its own column definitions/cell
 * renderers — this component only owns the shared shell: header row, row
 * hover/focus, the drill-down chevron, keyboard activation (Enter/Space),
 * and horizontal scroll for narrow viewports (rather than squeezing 8+
 * columns unreadably small).
 */
export function DatasetWorkflowTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyMessage = 'No results match your filters.',
}: DatasetWorkflowTableProps<T>) {
  return (
    <div className="bg-white border border-outline-variant rounded-lg shadow-ambient overflow-x-auto">
      <table className="min-w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-outline bg-surface-container-low border-b border-outline-variant whitespace-nowrap ${
                  ALIGN_CLASS[col.align ?? 'left']
                } ${col.hideBelow ? HIDE_BELOW_CLASS[col.hideBelow] : ''}`}
              >
                {col.label}
              </th>
            ))}
            {onRowClick && (
              <th className="px-3 py-3 bg-surface-container-low border-b border-outline-variant w-8" aria-hidden="true" />
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onRowClick ? 1 : 0)} className="px-4 py-10 text-center text-sm text-outline italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = getRowKey(row);
              const clickable = !!onRowClick;
              return (
                <tr
                  key={key}
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? 'button' : undefined}
                  onClick={clickable ? () => onRowClick!(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick!(row);
                          }
                        }
                      : undefined
                  }
                  className={
                    clickable
                      ? 'cursor-pointer hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none transition-colors'
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 border-b border-surface-container align-middle ${ALIGN_CLASS[col.align ?? 'left']} ${
                        col.hideBelow ? HIDE_BELOW_CLASS[col.hideBelow] : ''
                      } ${col.className ?? ''}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  {clickable && (
                    <td className="px-3 py-3 border-b border-surface-container text-outline">
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
