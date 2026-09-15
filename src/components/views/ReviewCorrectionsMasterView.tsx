import React, { useMemo, useState } from 'react';
import { ReviewRun } from '../../types';
import { DatasetWorkflowMasterPage } from '../dataset-workflow/DatasetWorkflowMasterPage';
import { DatasetWorkflowFilters, WorkflowFilterOption } from '../dataset-workflow/DatasetWorkflowFilters';
import { DatasetWorkflowTable, WorkflowTableColumn } from '../dataset-workflow/DatasetWorkflowTable';
import { WorkflowStatusBadge, WorkflowStatusTone } from '../dataset-workflow/WorkflowStatusBadge';
import { EmptyWorkflowState } from '../dataset-workflow/EmptyWorkflowState';
import { WorkflowSummaryItem } from '../dataset-workflow/WorkflowSummaryCards';

export type ReviewMasterStatus = ReviewRun['status'] | 'NO_REVIEW';

export interface ReviewMasterRow {
  datasetId: string;
  datasetName: string;
  connectionName: string;
  schemaName: string;
  reviewRunId: string | null;
  qualityScorePct: number | null;
  issuesCount: number;
  resolvedCount: number;
  remainingCount: number;
  suggestionsReadyCount: number;
  status: ReviewMasterStatus;
  updatedLabel: string | null;
}

interface ReviewCorrectionsMasterViewProps {
  rows: ReviewMasterRow[];
  loading: boolean;
  error: string | null;
  onOpenDataset: (datasetId: string) => void;
}

const STATUS_LABEL: Record<ReviewMasterStatus, string> = {
  NO_REVIEW: 'No Review',
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  READY_FOR_APPROVAL: 'Ready for Approval',
  ARCHIVED: 'Archived',
};

const STATUS_TONE: Record<ReviewMasterStatus, WorkflowStatusTone> = {
  NO_REVIEW: 'neutral',
  DRAFT: 'neutral',
  IN_REVIEW: 'info',
  READY_FOR_APPROVAL: 'success',
  ARCHIVED: 'neutral',
};

export const ReviewCorrectionsMasterView: React.FC<ReviewCorrectionsMasterViewProps> = ({
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

  const statusOptions: WorkflowFilterOption[] = (['DRAFT', 'IN_REVIEW', 'READY_FOR_APPROVAL', 'ARCHIVED'] as ReviewMasterStatus[]).map(
    (s) => ({ value: s, label: STATUS_LABEL[s] })
  );

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
    { label: 'Open Issues', value: rows.reduce((sum, r) => sum + r.remainingCount, 0), tone: 'warning' },
    { label: 'Resolved', value: rows.reduce((sum, r) => sum + r.resolvedCount, 0), tone: 'success' },
    { label: 'Ready for Approval', value: rows.filter((r) => r.status === 'READY_FOR_APPROVAL').length, tone: 'info' },
  ];

  const columns: WorkflowTableColumn<ReviewMasterRow>[] = [
    { key: 'dataset', label: 'Dataset', render: (r) => <span className="font-semibold text-on-surface">{r.datasetName}</span> },
    { key: 'connection', label: 'Connection', render: (r) => r.connectionName, hideBelow: 'md' },
    {
      key: 'validation',
      label: 'Validation',
      align: 'right',
      render: (r) => (r.qualityScorePct != null ? `${r.qualityScorePct}%` : <span className="text-outline">—</span>),
      hideBelow: 'lg',
    },
    { key: 'issues', label: 'Issues', align: 'right', render: (r) => r.issuesCount.toLocaleString() },
    { key: 'resolved', label: 'Resolved', align: 'right', render: (r) => r.resolvedCount.toLocaleString(), hideBelow: 'sm' },
    { key: 'remaining', label: 'Remaining', align: 'right', render: (r) => r.remainingCount.toLocaleString(), hideBelow: 'md' },
    { key: 'suggestions', label: 'Suggestions', align: 'right', render: (r) => r.suggestionsReadyCount.toLocaleString(), hideBelow: 'xl' },
    { key: 'status', label: 'Review Status', render: (r) => <WorkflowStatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
    { key: 'updated', label: 'Updated', render: (r) => r.updatedLabel ?? '—', hideBelow: 'lg' },
  ];

  return (
    <DatasetWorkflowMasterPage
      title="Review & Corrections"
      subtitle="Decide which datasets need attention, then drill in to accept, edit, reject, or skip each suggestion."
      summary={summary}
      loading={loading}
      loadingLabel="Loading reviews…"
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
        <EmptyWorkflowState icon="fact_check" title="No issues waiting for review" description="No datasets have review activity yet." />
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
