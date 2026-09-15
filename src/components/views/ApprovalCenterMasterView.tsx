import React, { useMemo, useState } from 'react';
import { DatasetWorkflowMasterPage } from '../dataset-workflow/DatasetWorkflowMasterPage';
import { DatasetWorkflowFilters, WorkflowFilterOption } from '../dataset-workflow/DatasetWorkflowFilters';
import { DatasetWorkflowTable, WorkflowTableColumn } from '../dataset-workflow/DatasetWorkflowTable';
import { WorkflowStatusBadge, WorkflowStatusTone } from '../dataset-workflow/WorkflowStatusBadge';
import { EmptyWorkflowState } from '../dataset-workflow/EmptyWorkflowState';
import { WorkflowSummaryItem } from '../dataset-workflow/WorkflowSummaryCards';

export type ApprovalMasterStatus = 'PENDING' | 'PARTIALLY_APPROVED' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';

export interface ApprovalMasterRow {
  datasetId: string;
  datasetName: string;
  connectionName: string;
  schemaName: string;
  approvalRequestId: string | null;
  changesCount: number;
  recordsAffected: number;
  submittedLabel: string | null;
  status: ApprovalMasterStatus;
  updatedLabel: string | null;
  /** True when the dataset's current review is READY_FOR_APPROVAL but has not yet been submitted as an ApprovalRequest — a real, distinct backend state, never collapsed into "Pending". */
  reviewReadyNotSubmitted: boolean;
}

interface ApprovalCenterMasterViewProps {
  rows: ApprovalMasterRow[];
  loading: boolean;
  error: string | null;
  onOpenApproval: (datasetId: string) => void;
}

const STATUS_LABEL: Record<ApprovalMasterStatus, string> = {
  PENDING: 'Pending',
  PARTIALLY_APPROVED: 'Partially Approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NOT_SUBMITTED: 'Not Submitted',
};

const STATUS_TONE: Record<ApprovalMasterStatus, WorkflowStatusTone> = {
  PENDING: 'warning',
  PARTIALLY_APPROVED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  NOT_SUBMITTED: 'neutral',
};

export const ApprovalCenterMasterView: React.FC<ApprovalCenterMasterViewProps> = ({
  rows,
  loading,
  error,
  onOpenApproval,
}) => {
  const [search, setSearch] = useState('');
  const [connectionValue, setConnectionValue] = useState('ALL');
  const [statusValue, setStatusValue] = useState('ALL');

  const connectionOptions: WorkflowFilterOption[] = useMemo(() => {
    const names = Array.from(new Set(rows.map((r) => r.connectionName))).sort();
    return names.map((n) => ({ value: n, label: n }));
  }, [rows]);

  const statusOptions: WorkflowFilterOption[] = (Object.keys(STATUS_LABEL) as ApprovalMasterStatus[]).map((s) => ({
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
    { label: 'Pending', value: rows.filter((r) => r.status === 'PENDING' || r.status === 'PARTIALLY_APPROVED').length, tone: 'warning' },
    { label: 'Approved', value: rows.filter((r) => r.status === 'APPROVED').length, tone: 'success' },
    { label: 'Rejected', value: rows.filter((r) => r.status === 'REJECTED').length, tone: 'danger' },
  ];

  const columns: WorkflowTableColumn<ApprovalMasterRow>[] = [
    { key: 'dataset', label: 'Dataset', render: (r) => <span className="font-semibold text-on-surface">{r.datasetName}</span> },
    { key: 'connection', label: 'Connection', render: (r) => r.connectionName, hideBelow: 'md' },
    { key: 'changes', label: 'Changes', align: 'right', render: (r) => r.changesCount.toLocaleString(), hideBelow: 'sm' },
    { key: 'records', label: 'Records Affected', align: 'right', render: (r) => r.recordsAffected.toLocaleString(), hideBelow: 'lg' },
    { key: 'submitted', label: 'Submitted', render: (r) => r.submittedLabel ?? '—', hideBelow: 'lg' },
    {
      key: 'status',
      label: 'Approval Status',
      render: (r) =>
        r.reviewReadyNotSubmitted ? (
          <WorkflowStatusBadge label="Ready for Approval (not submitted)" tone="neutral" />
        ) : (
          <WorkflowStatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />
        ),
    },
    { key: 'updated', label: 'Updated', render: (r) => r.updatedLabel ?? '—', hideBelow: 'xl' },
  ];

  return (
    <DatasetWorkflowMasterPage
      title="Approval Center"
      subtitle="Sign off on review runs that have been submitted for approval, dataset by dataset."
      summary={summary}
      loading={loading}
      loadingLabel="Loading approval requests…"
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
        <EmptyWorkflowState icon="verified" title="No approvals waiting" description="Nothing has been submitted for approval yet." />
      ) : (
        <DatasetWorkflowTable
          columns={columns}
          rows={filteredRows}
          getRowKey={(r) => r.datasetId}
          onRowClick={(r) => r.approvalRequestId && onOpenApproval(r.datasetId)}
          emptyMessage="No datasets match your filters."
        />
      )}
    </DatasetWorkflowMasterPage>
  );
};
