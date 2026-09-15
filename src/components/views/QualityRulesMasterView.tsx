import React, { useMemo, useState } from 'react';
import { DatasetWorkflowMasterPage } from '../dataset-workflow/DatasetWorkflowMasterPage';
import { DatasetWorkflowFilters, WorkflowFilterOption } from '../dataset-workflow/DatasetWorkflowFilters';
import { DatasetWorkflowTable, WorkflowTableColumn } from '../dataset-workflow/DatasetWorkflowTable';
import { WorkflowStatusBadge, WorkflowStatusTone } from '../dataset-workflow/WorkflowStatusBadge';
import { EmptyWorkflowState } from '../dataset-workflow/EmptyWorkflowState';
import { WorkflowSummaryItem } from '../dataset-workflow/WorkflowSummaryCards';

export type RulesMasterStatus = 'NO_RULES' | 'PENDING_REVIEW' | 'NEEDS_RULES' | 'CONFIGURED';

export interface RulesMasterRow {
  datasetId: string;
  datasetName: string;
  connectionName: string;
  schemaName: string;
  appliedRulesCount: number;
  activeRulesCount: number;
  pendingCount: number;
  lastUpdatedLabel: string | null;
  status: RulesMasterStatus;
}

interface QualityRulesMasterViewProps {
  rows: RulesMasterRow[];
  loading: boolean;
  error: string | null;
  onOpenDataset: (datasetId: string) => void;
}

const STATUS_LABEL: Record<RulesMasterStatus, string> = {
  NO_RULES: 'No Rules',
  PENDING_REVIEW: 'Pending Review',
  NEEDS_RULES: 'Needs Rules',
  CONFIGURED: 'Configured',
};

const STATUS_TONE: Record<RulesMasterStatus, WorkflowStatusTone> = {
  NO_RULES: 'neutral',
  PENDING_REVIEW: 'warning',
  NEEDS_RULES: 'danger',
  CONFIGURED: 'success',
};

export const QualityRulesMasterView: React.FC<QualityRulesMasterViewProps> = ({
  rows,
  loading,
  error,
  onOpenDataset,
}) => {
  const [search, setSearch] = useState('');
  const [connectionValue, setConnectionValue] = useState('ALL');
  const [statusValue, setStatusValue] = useState('ALL');

  const connectionOptions: WorkflowFilterOption[] = useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.connectionName))).sort();
    return names.map((n) => ({ value: n, label: n }));
  }, [rows]);

  const statusOptions: WorkflowFilterOption[] = (Object.keys(STATUS_LABEL) as RulesMasterStatus[]).map((s) => ({
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
    { label: 'Configured', value: rows.filter((r) => r.status === 'CONFIGURED').length, tone: 'success' },
    { label: 'Pending Review', value: rows.filter((r) => r.pendingCount > 0).length, tone: 'warning' },
    { label: 'No Rules', value: rows.filter((r) => r.status === 'NO_RULES').length, tone: 'neutral' },
  ];

  const columns: WorkflowTableColumn<RulesMasterRow>[] = [
    { key: 'dataset', label: 'Dataset', render: (r) => <span className="font-semibold text-on-surface">{r.datasetName}</span> },
    { key: 'connection', label: 'Connection', render: (r) => r.connectionName, hideBelow: 'md' },
    { key: 'schema', label: 'Schema', render: (r) => <span className="font-mono text-xs text-on-surface-variant">{r.schemaName}</span>, hideBelow: 'lg' },
    { key: 'applied', label: 'Applied Rules', align: 'right', render: (r) => r.appliedRulesCount.toLocaleString() },
    { key: 'active', label: 'Active Rules', align: 'right', render: (r) => r.activeRulesCount.toLocaleString(), hideBelow: 'sm' },
    {
      key: 'pending',
      label: 'Pending / Suggested',
      align: 'right',
      render: (r) => (r.pendingCount > 0 ? <span className="font-semibold text-on-tertiary-fixed-variant">{r.pendingCount}</span> : r.pendingCount),
      hideBelow: 'lg',
    },
    { key: 'updated', label: 'Last Updated', render: (r) => r.lastUpdatedLabel ?? '—', hideBelow: 'xl' },
    { key: 'status', label: 'Status', render: (r) => <WorkflowStatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
  ];

  return (
    <DatasetWorkflowMasterPage
      title="Data Quality Rules"
      subtitle="See which datasets have rules configured, then drill in to review, assign, or suggest more."
      summary={summary}
      loading={loading}
      loadingLabel="Loading rule assignments…"
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
        <EmptyWorkflowState icon="rule" title="No datasets available" description="No datasets are visible yet." />
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
