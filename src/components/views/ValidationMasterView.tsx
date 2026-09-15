import React, { useMemo, useState } from 'react';
import { DatasetWorkflowMasterPage } from '../dataset-workflow/DatasetWorkflowMasterPage';
import { DatasetWorkflowFilters, WorkflowFilterOption } from '../dataset-workflow/DatasetWorkflowFilters';
import { DatasetWorkflowTable, WorkflowTableColumn } from '../dataset-workflow/DatasetWorkflowTable';
import { WorkflowStatusBadge, WorkflowStatusTone } from '../dataset-workflow/WorkflowStatusBadge';
import { EmptyWorkflowState } from '../dataset-workflow/EmptyWorkflowState';
import { WorkflowSummaryItem } from '../dataset-workflow/WorkflowSummaryCards';

export type ValidationMasterStatus = 'NOT_VALIDATED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ValidationMasterRow {
  datasetId: string;
  datasetName: string;
  connectionName: string;
  schemaName: string;
  lastValidationLabel: string | null;
  qualityScorePct: number | null;
  noApplicableRules: boolean;
  failedRows: number;
  rulesEvaluatedCount: number;
  status: ValidationMasterStatus;
  lastRunAt: string | null;
}

interface ValidationMasterViewProps {
  rows: ValidationMasterRow[];
  loading: boolean;
  error: string | null;
  onOpenDataset: (datasetId: string) => void;
}

const STATUS_LABEL: Record<ValidationMasterStatus, string> = {
  NOT_VALIDATED: 'Not Validated',
  QUEUED: 'Queued',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const STATUS_TONE: Record<ValidationMasterStatus, WorkflowStatusTone> = {
  NOT_VALIDATED: 'neutral',
  QUEUED: 'neutral',
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',
};

function qualityScoreTone(pct: number): string {
  if (pct >= 90) return 'text-primary';
  if (pct >= 70) return 'text-on-tertiary-fixed-variant';
  return 'text-error';
}

export const ValidationMasterView: React.FC<ValidationMasterViewProps> = ({ rows, loading, error, onOpenDataset }) => {
  const [search, setSearch] = useState('');
  const [connectionValue, setConnectionValue] = useState('ALL');
  const [statusValue, setStatusValue] = useState('ALL');

  const connectionOptions: WorkflowFilterOption[] = useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.connectionName))).sort();
    return names.map((n) => ({ value: n, label: n }));
  }, [rows]);

  const statusOptions: WorkflowFilterOption[] = (Object.keys(STATUS_LABEL) as ValidationMasterStatus[]).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
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
    { label: 'Datasets', value: rows.length },
    { label: 'Completed', value: rows.filter((r) => r.status === 'COMPLETED').length, tone: 'success' },
    { label: 'Failed', value: rows.filter((r) => r.status === 'FAILED').length, tone: 'danger' },
    { label: 'Not Validated', value: rows.filter((r) => r.status === 'NOT_VALIDATED').length, tone: 'neutral' },
  ];

  const columns: WorkflowTableColumn<ValidationMasterRow>[] = [
    { key: 'dataset', label: 'Dataset', render: (r) => <span className="font-semibold text-on-surface">{r.datasetName}</span> },
    { key: 'connection', label: 'Connection', render: (r) => r.connectionName, hideBelow: 'md' },
    { key: 'schema', label: 'Schema', render: (r) => <span className="font-mono text-xs text-on-surface-variant">{r.schemaName}</span>, hideBelow: 'lg' },
    { key: 'lastValidation', label: 'Last Validation', render: (r) => r.lastValidationLabel ?? '—', hideBelow: 'md' },
    {
      key: 'quality',
      label: 'Quality Score',
      align: 'right',
      render: (r) =>
        r.status !== 'COMPLETED' ? (
          <span className="text-outline">—</span>
        ) : r.noApplicableRules ? (
          <span className="text-outline italic text-xs">N/A</span>
        ) : (
          <span className={`font-editorial font-bold ${r.qualityScorePct != null ? qualityScoreTone(r.qualityScorePct) : 'text-outline'}`}>
            {r.qualityScorePct != null ? `${r.qualityScorePct}%` : '—'}
          </span>
        ),
    },
    { key: 'issues', label: 'Issues', align: 'right', render: (r) => r.failedRows.toLocaleString(), hideBelow: 'sm' },
    { key: 'rules', label: 'Rules Evaluated', align: 'right', render: (r) => r.rulesEvaluatedCount.toLocaleString(), hideBelow: 'lg' },
    { key: 'status', label: 'Status', render: (r) => <WorkflowStatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
    { key: 'lastRun', label: 'Last Run', render: (r) => r.lastRunAt ?? '—', hideBelow: 'xl' },
  ];

  return (
    <DatasetWorkflowMasterPage
      title="Validation"
      subtitle="See validation health across every dataset, then drill in to run or review its checks."
      summary={summary}
      loading={loading}
      loadingLabel="Loading validation status…"
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
        <EmptyWorkflowState
          icon="checklist"
          title="No datasets available"
          description="No datasets are visible yet — check Data Sources, or your metadata.read permission."
        />
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
