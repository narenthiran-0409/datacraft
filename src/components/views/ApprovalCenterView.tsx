import React, { useState } from 'react';
import { ApprovalRequestItem } from '../../types';

interface ApprovalCenterViewProps {
  request: ApprovalRequestItem;
  canDecide: boolean;
  isPending: boolean;
  actionError: string | null;
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
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

/**
 * The Approval Center decision experience for a single approval request —
 * unchanged behavior from before the master/detail redesign, just extracted
 * out of what used to be a combined list+detail screen so the new
 * ApprovalCenterMasterView (the full-width dataset list) can drill into
 * exactly this, one request at a time, via a real navigation step instead of
 * an in-page selection.
 */
export const ApprovalCenterView: React.FC<ApprovalCenterViewProps> = ({
  request,
  canDecide,
  isPending,
  actionError,
  onApprove,
  onReject,
}) => {
  const [comment, setComment] = useState('');
  const isDecidable = canDecide && (request.status === 'PENDING' || request.status === 'PARTIALLY_APPROVED');

  const handleApprove = () => {
    onApprove(request.id, comment.trim());
    setComment('');
  };

  const handleReject = () => {
    onReject(request.id, comment.trim());
    setComment('');
  };

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 pb-10 space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 space-y-5">
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${STATUS_STYLES[request.status]}`}>
            {STATUS_LABEL[request.status]}
          </span>
          <h3 className="font-editorial font-bold text-xl text-on-surface mt-2">{request.reviewRunName}</h3>
          <p className="text-xs text-on-surface-variant mt-1">{request.datasetName}</p>
        </div>

        <div className="space-y-2 text-xs border-t border-b border-surface-container py-4">
          <div className="flex items-center justify-between">
            <span className="text-outline">Requested by</span>
            <span className="font-semibold text-on-surface">{request.requestedBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-outline">Requested</span>
            <span className="font-semibold text-on-surface">{request.requestedAt}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-outline">Affected issues</span>
            <span className="font-semibold text-on-surface">{request.affectedIssueCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-outline">Affected records</span>
            <span className="font-semibold text-on-surface">{request.affectedRecordCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-outline">Decided / Remaining</span>
            <span className="font-semibold text-on-surface">
              {request.decidedCount} / {request.remainingCount}
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
            <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider">Comment (optional)</label>
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
        ) : request.status === 'PENDING' || request.status === 'PARTIALLY_APPROVED' ? (
          <div className="p-3 rounded-md text-xs flex items-start gap-2 bg-surface-container-low text-on-surface-variant">
            <span className="material-symbols-outlined text-base mt-0.5 text-outline">lock</span>
            <span>
              You have read-only access here — approving or rejecting requires the approval.decide permission.
              Having review.edit does not grant this.
            </span>
          </div>
        ) : (
          <div
            className={`p-3 rounded-md text-xs flex items-start gap-2 ${
              request.status === 'APPROVED' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-error-container text-on-error-container'
            }`}
          >
            <span className="material-symbols-outlined text-base mt-0.5">
              {request.status === 'APPROVED' ? 'check_circle' : 'cancel'}
            </span>
            <span>
              This request has already been {STATUS_LABEL[request.status].toLowerCase()} and is now a terminal
              decision.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
