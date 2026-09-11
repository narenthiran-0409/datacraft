import React, { useState } from 'react';
import { NavScreen } from '../../types';
import { DatasetPreviewResponse } from '../../api/client';

interface DatasetPreviewViewProps {
  onNavigate: (screen: NavScreen) => void;
  datasetName?: string;
  connectionInactive?: boolean;
  // Real live preview (this task) — GET /datasets/{id}/preview, gated
  // data_preview.read. Fetched in App.tsx; this component only renders it.
  canViewPreview: boolean;
  preview: DatasetPreviewResponse | null;
  previewLoading: boolean;
  previewError: string | null;
}

export const DatasetPreviewView: React.FC<DatasetPreviewViewProps> = ({
  onNavigate,
  datasetName,
  connectionInactive = false,
  canViewPreview,
  preview,
  previewLoading,
  previewError,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const columns = preview?.columns ?? [];
  const rows = preview?.rows ?? [];

  const filteredRows = searchTerm
    ? rows.filter((row) =>
        columns.some((col) => String(row[col] ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : rows;

  const handleExportCSV = () => {
    if (!preview) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        columns.map((c) => `"${c}"`).join(','),
        ...filteredRows.map((row) => columns.map((c) => `"${String(row[c] ?? '')}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${preview.table_name}_preview_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
            <button
              onClick={() => onNavigate('dataset-overview')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {datasetName ?? 'Dataset'}
            </button>
            <span>/</span>
            <span className="text-on-surface font-bold">Table Preview</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
              {datasetName ?? 'Dataset'} Preview
            </h1>
            {connectionInactive && (
              <span
                className="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                title="This dataset's underlying connection has been deactivated. Informational only — preview still works normally."
              >
                Connection Inactive
              </span>
            )}
          </div>
          {preview && !connectionInactive && (
            <p className="text-xs text-outline mt-1 font-sans">
              Live read from <code className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-on-surface">{preview.schema_name}.{preview.table_name}</code>
              {preview.capped_to_max && ' — capped to the server-enforced maximum row count'}.
            </p>
          )}
        </div>

        {!connectionInactive && canViewPreview && preview && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {connectionInactive ? (
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md w-full bg-white rounded-lg border border-outline-variant shadow-ambient p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">cable</span>
            </div>
            <h3 className="font-editorial text-xl font-bold text-on-surface">
              Connection Inactive
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
              The connection this dataset was discovered through has been deactivated, so a
              preview isn't shown here. Reactivate the connection from Data Sources to preview
              this dataset again.
            </p>
            <button
              onClick={() => onNavigate('data-sources')}
              className="mt-5 px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-md text-xs font-semibold transition-colors shadow-ambient cursor-pointer"
            >
              Go to Data Sources
            </button>
          </div>
        </div>
      ) : !canViewPreview ? (
        <div className="bg-surface-container-low rounded-md border border-outline-variant p-6 flex items-center gap-3 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-xl text-outline">lock</span>
          You need the data_preview.read permission to preview live rows from this dataset.
        </div>
      ) : previewLoading ? (
        <div className="bg-white rounded-lg border border-outline-variant p-12 text-center text-sm text-outline">
          Loading a live sample from the source database…
        </div>
      ) : previewError ? (
        <div className="bg-error-container border border-outline-variant rounded-lg p-4 text-sm text-on-error-container">
          {previewError}
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter across all columns..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-md pl-9 pr-3 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
            />
          </div>

          {/* Main Table Card */}
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
            {/* Fixed-height, scrollable in both directions — ~15 rows visible before
                vertical scroll kicks in (15 rows * ~2.5rem row height + header), rather
                than growing to fit however many rows/columns come back. The sticky
                header is applied per-<th> (not on <thead> itself) for cross-browser
                reliability inside a scrolling <table>. */}
            <div className="overflow-auto max-h-[40rem]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant uppercase tracking-wider font-semibold">
                    {columns.map((col) => (
                      <th key={col} className="sticky top-0 z-10 bg-surface-container-low py-3.5 px-5 font-mono">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {columns.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-outline">
                        No columns found for this dataset's table.
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-8 text-center text-outline">
                        {rows.length === 0 ? 'This table has no rows yet.' : 'No rows match your filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low/60 transition-colors">
                        {columns.map((col) => (
                          <td key={col} className="py-3 px-5 font-mono text-on-surface-variant whitespace-nowrap">
                            {row[col] === null || row[col] === undefined ? (
                              <span className="italic text-outline">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 bg-surface border-t border-surface-container flex items-center justify-between gap-3 text-xs text-outline">
              <span>
                Showing <strong className="text-on-surface">{filteredRows.length}</strong> of{' '}
                <strong className="text-on-surface">{preview?.row_count ?? 0}</strong> rows returned
                {preview && ` (requested ${preview.requested_row_count})`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
