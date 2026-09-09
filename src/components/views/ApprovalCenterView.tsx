import React, { useState } from 'react';
import { ApprovalRequestItem, NavScreen } from '../../types';

interface ApprovalCenterViewProps {
  onNavigate: (screen: NavScreen) => void;
  approvalQueue: ApprovalRequestItem[];
  canDecide: boolean;
  pendingId: string | null;
  actionError: string | null;
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
  onSelect: (id: string) => void;
}

const STATUS_STYLES: Record<ApprovalRequestItem['status'], string> = {
  PENDING: 'bg-secondary-fixed text-on-secondary-fixed',
  APPROVED: 'bg-primary-fixed text-on-primary-fixed',
  REJECTED: 'bg-error-container text-on-error-container',
  PARTIALLY_APPROVED: 'bg-tertiary-fixed text-on-tertiary-fixed',
};

const STATUS_LABEL: Record<ApprovalRequestItem['status'], string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PARTIALLY_APPROVED: 'Partially Approved',
};

export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({
  onNavigate,
  approvalQueue,
  canDecide,
  pendingId,
  actionError,
  onApprove,
  onReject,
  onSelect,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    approvalQueue.find((r) => r.status === 'PENDING' || r.status === 'PARTIALLY_APPROVED')?.id ??
      approvalQueue[0]?.id ??
      null
  );
  const [comment, setComment] = useState('');

  const selected = approvalQueue.find((r) => r.id === selectedId) ?? null;
  const isDecidable = canDecide && (selected?.status === 'PENDING' || selected?.status === 'PARTIALLY_APPROVED');
  const isPending = !!selected && pendingId === selected.id;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
    setComment('');
  };

  const handleApprove = () => {
    if (!selected) return;
    onApprove(selected.id, comment.trim());
    setComment('');
  };

  const handleReject = () => {
    if (!selected) return;
    onReject(selected.id, comment.trim());
    setComment('');
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
          <button
            onClick={() => onNavigate('review-corrections')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Review &amp; Corrections
          </button>
          <span>/</span>
          <span className="text-on-surface font-bold">Approval Center</span>
        </div>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          Approval Center
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
          Sign off on review runs that have already been fully decided and submitted. This is a
          separate, later step from Review &amp; Corrections — nothing appears here until a run
          has been explicitly submitted for approval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Request List */}
        <div className="lg:col-span-2 space-y-4">
          {approvalQueue.length === 0 ? (
            <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
              No submitted review runs are awaiting approval right now.
            </div>
          ) : (
            approvalQueue.map((req) => {
              const isSelected = req.id === selectedId;
              return (
                <button
                  key={req.id}
                  onClick={() => handleSelect(req.id)}
                  className={`w-full text-left bg-white rounded-lg p-6 border shadow-ambient transition-all cursor-pointer ${
                    isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-outline-variant hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-editorial font-bold text-lg text-on-surface">
                        {req.reviewRunName}
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">{req.datasetName}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant">
                    Requested by <strong className="text-on-surface">{req.requestedBy}</strong> &bull; {req.requestedAt}
                  </p>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-container text-xs text-outline">
                    <span>{req.affectedIssueCount} issues &bull; {req.affectedRecordCount} records</span>
                    <span className="ml-auto font-semibold text-on-surface">
                      {req.decidedCount} of {req.affectedIssueCount} decided
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${req.affectedIssueCount ? (req.decidedCount / req.affectedIssueCount) * 100 : 0}%` }}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 sticky top-6 space-y-5">
          {!selected ? (
            <p className="text-xs text-on-surface-variant">Select a request to review its details.</p>
          ) : (
            <>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
                <h3 className="font-editorial font-bold text-xl text-on-surface mt-2">
                  {selected.reviewRunName}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">{selected.datasetName}</p>
              </div>

              <div className="space-y-2 text-xs border-t border-b border-surface-container py-4">
                <div className="flex items-center justify-between">
                  <span className="text-outline">Requested by</span>
                  <span className="font-semibold text-on-surface">{selected.requestedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-outline">Requested</span>
                  <span className="font-semibold text-on-surface">{selected.requestedAt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-outline">Affected issues</span>
                  <span className="font-semibold text-on-surface">{selected.affectedIssueCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-outline">Affected records</span>
                  <span className="font-semibold text-on-surface">{selected.affectedRecordCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-outline">Decided / Remaining</span>
                  <span className="font-semibold text-on-surface">
                    {selected.decidedCount} / {selected.remainingCount}
                  </span>
                </div>
              </div>

              {actionError && (
                <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-xs text-error">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{actionError}</span>
                </div>
              )}

              {isDecidable ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider">
                    Comment (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add context for this decision..."
                    className="w-full bg-surface-container-low border border-outline-variant rounded-md p-3 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isPending}
                      className="flex-1 px-4 py-2.5 rounded-md text-xs font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isPending}
                      className="flex-1 px-4 py-2.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary-container text-on-primary transition-colors cursor-pointer shadow-ambient disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? 'Submitting…' : 'Approve'}
                    </button>
                  </div>
                </div>
              ) : selected.status === 'PENDING' || selected.status === 'PARTIALLY_APPROVED' ? (
                <div className="p-3 rounded-md text-xs flex items-start gap-2 bg-surface-container-low text-on-surface-variant">
                  <span className="material-symbols-outlined text-base mt-0.5 text-outline">lock</span>
                  <span>
                    You have read-only access here — approving or rejecting requires the
                    approval.decide permission. Having review.edit does not grant this.
                  </span>
                </div>
              ) : (
                <div
                  className={`p-3 rounded-md text-xs flex items-start gap-2 ${
                    selected.status === 'APPROVED'
                      ? 'bg-primary-fixed text-on-primary-fixed'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-base mt-0.5">
                    {selected.status === 'APPROVED' ? 'check_circle' : 'cancel'}
                  </span>
                  <span>
                    This request has already been {STATUS_LABEL[selected.status].toLowerCase()} and is now
                    a terminal decision.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
