import React, { useMemo, useState } from 'react';
import { DatasetStagingStatus } from '../../types';
import { DATASET_STATUS_META } from '../../data/datasetStagingWorkflow';
import { DatasetStatusBadge } from './DatasetStatusBadge';
import { Select } from '../ui/Select';

export interface ExplorerDatasetItem {
  id: string;
  name: string;
  status?: DatasetStagingStatus;
}

export interface ExplorerConnectionGroup {
  id: string;
  name: string;
  datasets: ExplorerDatasetItem[];
}

interface ConnectionDatasetExplorerProps {
  connections: ExplorerConnectionGroup[];
  selectedDatasetId: string | null;
  onSelectDataset: (datasetId: string, connectionId: string) => void;
  loading?: boolean;
  errorMessage?: string | null;
  emptyMessage?: string;
  /** Show a status filter dropdown — omit for explorers with no per-dataset status. */
  showStatusFilter?: boolean;
  className?: string;
}

/**
 * Reusable "Connection > expandable datasets" left explorer. Built for the
 * Staging & Publish dataset-centric redesign but intentionally generic (no
 * staging-specific props) so Validation, Data Quality Rules, Review &
 * Corrections, and Approval Center can reuse it later.
 */
export const ConnectionDatasetExplorer: React.FC<ConnectionDatasetExplorerProps> = ({
  connections,
  selectedDatasetId,
  onSelectDataset,
  loading = false,
  errorMessage = null,
  emptyMessage = 'No datasets found.',
  showStatusFilter = false,
  className = '',
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DatasetStagingStatus | 'ALL'>('ALL');
  const [collapsedConnectionIds, setCollapsedConnectionIds] = useState<Set<string>>(new Set());

  const availableStatuses = useMemo(() => {
    const set = new Set<DatasetStagingStatus>();
    connections.forEach((c) => c.datasets.forEach((d) => d.status && set.add(d.status)));
    return Array.from(set);
  }, [connections]);

  const filteredConnections = useMemo(() => {
    const term = search.trim().toLowerCase();
    return connections
      .map((conn) => ({
        ...conn,
        datasets: conn.datasets.filter((d) => {
          const matchesSearch = term === '' || d.name.toLowerCase().includes(term);
          const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
          return matchesSearch && matchesStatus;
        }),
      }))
      .filter((conn) => conn.datasets.length > 0);
  }, [connections, search, statusFilter]);

  const isFiltering = search.trim() !== '' || statusFilter !== 'ALL';

  const toggleConnection = (connectionId: string) => {
    setCollapsedConnectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(connectionId)) next.delete(connectionId);
      else next.add(connectionId);
      return next;
    });
  };

  return (
    <div className={`flex flex-col min-h-0 overflow-hidden bg-white border border-outline-variant rounded-lg shadow-ambient ${className}`}>
      <div className="p-3 border-b border-outline-variant space-y-2 shrink-0">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets…"
            aria-label="Search datasets"
            className="w-full bg-surface-container-low border border-outline-variant rounded-md pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
          />
        </div>
        {showStatusFilter && availableStatuses.length > 0 && (
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as DatasetStagingStatus | 'ALL')}
            options={[
              { value: 'ALL', label: 'All statuses' },
              ...availableStatuses.map((s) => ({ value: s, label: DATASET_STATUS_META[s].label })),
            ]}
            aria-label="Filter by status"
            size="sm"
            fullWidth
          />
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-surface-container">
        {loading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 bg-surface-container rounded animate-pulse" />
            ))}
          </div>
        ) : errorMessage ? (
          <p className="p-4 text-xs text-error">{errorMessage}</p>
        ) : filteredConnections.length === 0 ? (
          <p className="p-4 text-xs text-outline italic">{isFiltering ? 'No datasets match your search.' : emptyMessage}</p>
        ) : (
          filteredConnections.map((conn) => {
            const isCollapsed = collapsedConnectionIds.has(conn.id) && !isFiltering;
            return (
              <div key={conn.id}>
                <button
                  type="button"
                  onClick={() => toggleConnection(conn.id)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base text-outline shrink-0">
                    {isCollapsed ? 'chevron_right' : 'expand_more'}
                  </span>
                  <span className="material-symbols-outlined text-base text-outline shrink-0">database</span>
                  <span className="text-xs font-bold text-on-surface truncate flex-1">{conn.name}</span>
                  <span className="text-[10px] font-semibold text-outline shrink-0">{conn.datasets.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="pb-1">
                    {conn.datasets.map((d) => {
                      const isSelected = d.id === selectedDatasetId;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => onSelectDataset(d.id, conn.id)}
                          aria-current={isSelected}
                          className={`w-full flex items-center gap-2 pl-9 pr-3 py-2 text-left transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary-fixed/40 border-l-2 border-primary' : 'hover:bg-surface-container-low border-l-2 border-transparent'
                          }`}
                        >
                          <span className={`text-xs truncate flex-1 ${isSelected ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>
                            {d.name}
                          </span>
                          {d.status && <DatasetStatusBadge status={d.status} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
