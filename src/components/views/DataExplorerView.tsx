import React, { useState } from 'react';
import { ExplorerColumn, ExplorerDataset, NavScreen, SchemaNode } from '../../types';

interface DataExplorerViewProps {
  onNavigate: (screen: NavScreen) => void;
  schemas: SchemaNode[];
  datasets: ExplorerDataset[];
  columns: ExplorerColumn[];
  onOpenDataset: (datasetId: string) => void;
  // BUG FIX (this task): Data Sources' "View Datasets" used to navigate to
  // Dataset Overview with nothing selected. Routes here instead, scoped to just
  // this data source's schemas, via App.tsx state — not a URL param.
  dataSourceFilter: { id: string; name: string } | null;
  onClearDataSourceFilter: () => void;
}

export const DataExplorerView: React.FC<DataExplorerViewProps> = ({
  onNavigate,
  schemas,
  datasets,
  columns,
  onOpenDataset,
  dataSourceFilter,
  onClearDataSourceFilter,
}) => {
  const visibleSchemas = dataSourceFilter
    ? schemas.filter((s) => s.dataSourceId === dataSourceFilter.id)
    : schemas;

  const [expandedSchemas, setExpandedSchemas] = useState<string[]>([schemas[0]?.id].filter(Boolean));
  const [expandedDatasets, setExpandedDatasets] = useState<string[]>([]);
  const [showInactiveConnections, setShowInactiveConnections] = useState(false);

  const toggleSchema = (id: string) => {
    setExpandedSchemas((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleDataset = (id: string) => {
    setExpandedDatasets((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const inactiveConnectionCount = datasets.filter((d) => d.connectionInactive).length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
            Discovered Structure
          </span>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Data Explorer
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
            Browse every schema, dataset, and column Discovery has found. Datasets or columns no
            longer present at the source stay listed here, muted, rather than disappearing.
          </p>
        </div>

        {inactiveConnectionCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={showInactiveConnections}
              onChange={(e) => setShowInactiveConnections(e.target.checked)}
              className="cursor-pointer"
            />
            Show datasets with inactive connections ({inactiveConnectionCount})
          </label>
        )}
      </div>

      {dataSourceFilter && (
        <div className="flex items-center gap-2 -mt-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant">
            <span className="material-symbols-outlined text-sm">filter_alt</span>
            Filtered to: {dataSourceFilter.name}
            <button
              type="button"
              onClick={onClearDataSourceFilter}
              className="material-symbols-outlined text-sm text-outline hover:text-on-surface cursor-pointer"
              title="Clear filter"
            >
              close
            </button>
          </span>
        </div>
      )}

      {/* Schema Tree */}
      <div className="space-y-4">
        {visibleSchemas.length === 0 && dataSourceFilter && (
          <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
            No schemas discovered yet for "{dataSourceFilter.name}". Run a sync from Data Sources
            once a connection is configured.
          </div>
        )}
        {visibleSchemas.map((schema) => {
          // Computed from the dataset list itself (grouped by schemaId) rather than
          // assumed from the schema's own connection — a schema with SOME but not
          // ALL of its datasets on an inactive connection must still show, with only
          // the affected rows flagged; only an ALL-inactive schema hides entirely.
          const allSchemaDatasets = datasets.filter((d) => d.schemaId === schema.id);
          const hasInactiveConnectionDataset = allSchemaDatasets.some((d) => d.connectionInactive);
          const schemaDatasets = allSchemaDatasets.filter(
            (d) => showInactiveConnections || !d.connectionInactive
          );

          // Toggle-off hides a schema entirely only when it actually had datasets
          // and every one of them got filtered out (all tied to inactive
          // connections) — an already-empty schema (0 datasets discovered) is left
          // alone, that's a pre-existing, unrelated state.
          if (!showInactiveConnections && allSchemaDatasets.length > 0 && schemaDatasets.length === 0) {
            return null;
          }

          const isSchemaOpen = expandedSchemas.includes(schema.id);

          return (
            <div
              key={schema.id}
              className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden"
            >
              {/* Schema Row */}
              <button
                type="button"
                onClick={() => toggleSchema(schema.id)}
                className="w-full flex items-center justify-between gap-3 p-5 text-left cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-lg text-outline transition-transform ${
                      isSchemaOpen ? 'rotate-90' : ''
                    }`}
                  >
                    chevron_right
                  </span>
                  <span className="w-9 h-9 rounded-md bg-surface-container-high text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">folder_open</span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-editorial font-bold text-base text-on-surface">
                        {schema.name}
                      </h3>
                      {hasInactiveConnectionDataset && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed shrink-0"
                          title="At least one dataset in this schema has an inactive connection. Informational only — every action below still works normally."
                        >
                          Connection Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-outline">
                      {schema.datasetCount} dataset{schema.datasetCount === 1 ? '' : 's'} discovered
                    </p>
                  </div>
                </div>
              </button>

              {/* Datasets */}
              {isSchemaOpen && (
                <div className="border-t border-surface-container divide-y divide-surface-container">
                  {schemaDatasets.map((dataset) => {
                    const datasetColumns = columns.filter((c) => c.datasetId === dataset.id);
                    const isDatasetOpen = expandedDatasets.includes(dataset.id);

                    return (
                      <div key={dataset.id} className={!dataset.isActive ? 'opacity-60' : ''}>
                        <div className="flex items-center justify-between gap-3 pl-12 pr-5 py-3.5 hover:bg-surface-container-low transition-colors">
                          <button
                            type="button"
                            onClick={() => toggleDataset(dataset.id)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <span
                              className={`material-symbols-outlined text-base text-outline transition-transform shrink-0 ${
                                isDatasetOpen ? 'rotate-90' : ''
                              }`}
                            >
                              chevron_right
                            </span>
                            <span className="material-symbols-outlined text-base text-on-surface-variant shrink-0">
                              table_chart
                            </span>
                            <span className="text-sm font-semibold text-on-surface truncate font-mono">
                              {dataset.name}
                            </span>
                            {!dataset.isActive && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-outline shrink-0">
                                Inactive
                              </span>
                            )}
                            {dataset.connectionInactive && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed shrink-0"
                                title="This dataset's underlying connection has been deactivated. Informational only — every action below still works normally."
                              >
                                Connection Inactive
                              </span>
                            )}
                            <span className="text-[11px] text-outline shrink-0">
                              {dataset.columnCount} cols &bull; ~{dataset.rowCountEstimate.toLocaleString()} rows
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => dataset.isActive && onOpenDataset(dataset.id)}
                            disabled={!dataset.isActive}
                            title={
                              dataset.isActive
                                ? 'Open dataset overview'
                                : 'No longer found at the source — cannot be opened'
                            }
                            className="text-xs font-semibold text-primary hover:underline cursor-pointer disabled:text-outline disabled:no-underline disabled:cursor-not-allowed shrink-0"
                          >
                            Open Dataset
                          </button>
                        </div>

                        {/* Columns */}
                        {isDatasetOpen && (
                          <div className="pl-20 pr-5 pb-4 space-y-1.5">
                            {datasetColumns.length === 0 ? (
                              <p className="text-xs text-outline py-2">No columns discovered yet.</p>
                            ) : (
                              datasetColumns.map((col) => (
                                <div
                                  key={col.id}
                                  className={`flex items-center gap-2.5 py-1.5 text-xs ${
                                    !col.isActive ? 'opacity-60' : ''
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-sm text-outline">
                                    {col.isPrimaryKey ? 'key' : 'view_column'}
                                  </span>
                                  <span className="font-mono font-semibold text-on-surface">
                                    {col.name}
                                  </span>
                                  <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant">
                                    {col.dataType}
                                  </span>
                                  {!col.isNullable && (
                                    <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">
                                      Not Null
                                    </span>
                                  )}
                                  {!col.isActive && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-outline">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
