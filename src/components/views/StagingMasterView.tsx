import React, { useMemo, useState } from 'react';
import { DatasetStagingStatus } from '../../types';
import { DatasetWorkflowMasterPage } from '../dataset-workflow/DatasetWorkflowMasterPage';
import { DatasetWorkflowFilters, WorkflowFilterOption } from '../dataset-workflow/DatasetWorkflowFilters';
import { DatasetWorkflowTable, WorkflowTableColumn } from '../dataset-workflow/DatasetWorkflowTable';
import { DatasetStatusBadge } from '../dataset-workflow/DatasetStatusBadge';
import { EmptyWorkflowState } from '../dataset-workflow/EmptyWorkflowState';
import { WorkflowSummaryItem } from '../dataset-workflow/WorkflowSummaryCards';
import { DATASET_STATUS_META } from '../../data/datasetStagingWorkflow';

export interface StagingMasterRow {
  datasetId: string;
  datasetName: string;
  connectionName: string;
  schemaName: string;
  approvedChangesCount: number;
  rowsAffected: number;
  status: DatasetStagingStatus;
  lastStagedLabel: string | null;
}

interface StagingMasterViewProps {
  rows: StagingMasterRow[];
  loading: boolean;
  error: string | null;
  onOpenDataset: (datasetId: string) => void;
}

export const StagingMasterView: React.FC<StagingMasterViewProps> = ({ rows, loading, error, onOpenDataset }) => {
  const [search, setSearch] = useState('');
  const [connectionValue, setConnectionValue] = useState('ALL');
  const [statusValue, setStatusValue] = useState('ALL');

  const connectionOptions: WorkflowFilterOption[] = useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.connectionName))).sort();
    return names.map((n) => ({ value: n, label: n }));
  }, [rows]);

  const statusOptions: WorkflowFilterOption[] = (Object.keys(DATASET_STATUS_META) as DatasetStagingStatus[]).map((s) => ({
    value: s,
    label: DATASET_STATUS_META[s].label,
  }));

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        term === '' ||
        r.datasetName.toLowerCase().includes(term) ||
        r.schemaName.toLowerCase().includes(term) ||
        r.connectionName.toLowerCase().includes(term);
      const matchesConnection = connectionValue === 'ALL' || r.connectionName === connectionValue;
      const matchesStatus = statusValue === 'ALL' || r.status === statusValue;
      return matchesSearch && matchesConnection && matchesStatus;
    });
  }, [rows, search, connectionValue, statusValue]);

  const summary: WorkflowSummaryItem[] = [
    { label: 'Ready to Stage', value: rows.filter((r) => r.status === 'READY_TO_STAGE').length, tone: 'success' },
    { label: 'Staged', value: rows.filter((r) => r.status === 'STAGED').length, tone: 'info' },
    { label: 'Failed', value: rows.filter((r) => r.status === 'FAILED').length, tone: 'danger' },
  ];

  const columns: WorkflowTableColumn<StagingMasterRow>[] = [
    { key: 'dataset', label: 'Dataset', render: (r) => <span className="font-semibold text-on-surface">{r.datasetName}</span> },
    { key: 'connection', label: 'Connection', render: (r) => r.connectionName, hideBelow: 'md' },
    { key: 'schema', label: 'Schema', render: (r) => <span className="font-mono text-xs text-on-surface-variant">{r.schemaName}</span>, hideBelow: 'lg' },
    { key: 'approved', label: 'Approved Changes', align: 'right', render: (r) => r.approvedChangesCount.toLocaleString(), hideBelow: 'sm' },
    { key: 'affected', label: 'Rows Affected', align: 'right', render: (r) => r.rowsAffected.toLocaleString(), hideBelow: 'lg' },
    { key: 'status', label: 'Staging Status', render: (r) => <DatasetStatusBadge status={r.status} /> },
    { key: 'lastStaged', label: 'Last Staged', render: (r) => r.lastStagedLabel ?? '—', hideBelow: 'xl' },
  ];

  return (
    <DatasetWorkflowMasterPage
      title="Staging & Publish"
      subtitle="See which datasets have approved changes ready to stage, then drill in to preview and stage them."
      summary={summary}
      loading={loading}
      loadingLabel="Loading staging readiness…"
      error={error}
      filters={
        <DatasetWorkflowFilters
          search={search}
          onSearchChange={setSearch}
          connectionOptions={connectionOptions}
          connectionValue={connectionValue}
          onConnectionChange={setConnectionValue}
          statusOptions={statusOptions}
          statusValue={statusValue}
          onStatusChange={setStatusValue}
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyWorkflowState icon="cloud_upload" title="No approved changes ready to stage" description="No datasets have approved corrections yet." />
      ) : (
        <DatasetWorkflowTable
          columns={columns}
          rows={filteredRows}
          getRowKey={(r) => r.datasetId}
          onRowClick={(r) => onOpenDataset(r.datasetId)}
          emptyMessage="No datasets match your filters."
        />
      )}
    </DatasetWorkflowMasterPage>
  );
};
