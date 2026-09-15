import React from 'react';
import { Select } from '../ui/Select';

export interface WorkflowFilterOption {
  value: string;
  label: string;
}

interface DatasetWorkflowFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  connectionOptions: WorkflowFilterOption[];
  connectionValue: string;
  onConnectionChange: (value: string) => void;
  statusOptions: WorkflowFilterOption[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  /** Additional module-specific filter controls, rendered after Status. */
  extra?: React.ReactNode;
}

/**
 * Consistent search + connection + status filter bar shared by every
 * master screen. All filtering here is client-side over data already
 * loaded — no server-side filtering endpoint is invented for this.
 */
export const DatasetWorkflowFilters: React.FC<DatasetWorkflowFiltersProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search datasets…',
  connectionOptions,
  connectionValue,
  onConnectionChange,
  statusOptions,
  statusValue,
  onStatusChange,
  extra,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
    <div className="relative flex-1 min-w-[220px]">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
        search
      </span>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="w-full bg-white border border-outline-variant rounded-md pl-10 pr-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary transition-colors"
      />
    </div>

    <Select
      value={connectionValue}
      onChange={onConnectionChange}
      options={[{ value: 'ALL', label: 'All Connections' }, ...connectionOptions]}
      aria-label="Filter by connection"
      size="sm"
      className="w-44 shrink-0"
    />

    <Select
      value={statusValue}
      onChange={onStatusChange}
      options={[{ value: 'ALL', label: 'All Statuses' }, ...statusOptions]}
      aria-label="Filter by status"
      size="sm"
      className="w-44 shrink-0"
    />

    {extra}
  </div>
);
