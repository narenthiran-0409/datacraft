import React from 'react';

interface EmptyWorkflowStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Shared empty/non-ready state card for every master and detail workflow
 * screen — used instead of showing a bare empty table or a blank panel with
 * no explanation.
 */
export const EmptyWorkflowState: React.FC<EmptyWorkflowStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="bg-white rounded-lg border border-outline-variant p-10 text-center space-y-3">
    <span className="material-symbols-outlined text-3xl text-outline">{icon}</span>
    <h3 className="font-editorial font-bold text-lg text-on-surface">{title}</h3>
    <p className="text-xs text-on-surface-variant max-w-md mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-colors cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
