import React from 'react';

interface WorkflowBreadcrumbProps {
  moduleLabel: string;
  itemLabel: string;
  onBack: () => void;
}

/**
 * Consistent "← Module" back action + "Module / Item" breadcrumb, shown
 * above every detail screen reached by drilling into a master list. Kept as
 * a thin bar above the existing detail component rather than folded into
 * it, so proven detail screens don't need their own internal header rewritten.
 */
export const WorkflowBreadcrumb: React.FC<WorkflowBreadcrumbProps> = ({ moduleLabel, itemLabel, onBack }) => (
  <div className="px-6 md:px-10 pt-6 pb-2 flex items-center gap-2 text-xs font-sans">
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
    >
      <span className="material-symbols-outlined text-base">arrow_back</span>
      {moduleLabel}
    </button>
    <span className="text-outline">/</span>
    <span className="font-semibold text-on-surface truncate">{itemLabel}</span>
  </div>
);
