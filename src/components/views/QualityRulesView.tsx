import React, { useMemo, useState } from 'react';
import { NavScreen } from '../../types';
import { DatasetResponse, RuleAssignmentResponse, RuleResponse } from '../../api/client';
import { Select } from '../ui/Select';

interface QualityRulesViewProps {
  onNavigate: (screen: NavScreen) => void;
  /** Real dataset list (id + name), fetched independently of ruleAssignments —
   * RuleAssignment only carries dataset_id, never a name. */
  datasets: DatasetResponse[];
  rules: RuleResponse[];
  ruleAssignments: RuleAssignmentResponse[];
  /** rule.id -> the set of rule_version_ids that belong to it, for matching assignments. */
  ruleVersionIdsByRuleId: Record<string, string[]>;
  canManageRules: boolean;
  canManageAssignments: boolean;
  onOpenRuleCreator: () => void;
  onOpenAssignmentForm: (ruleId: string, datasetId?: string) => void;
  onDisableAssignment: (assignmentId: string) => void;
  onOpenVersionForm: (ruleId: string) => void;
  onOpenDatasetOverview: (datasetId: string) => void;
  actionError: string | null;
  /**
   * Master/detail redesign: when provided, this screen is being reached as a
   * drill-down from QualityRulesMasterView's full-width dataset list for one
   * specific dataset — the left dataset picker is hidden (the master list is
   * now the picker) and the applied-rules panel below renders full width for
   * exactly this dataset, without changing any of its existing rule logic.
   */
  focusDatasetId?: string;
}

const ORIGIN_STYLES: Record<string, string> = {
  BUILT_IN: 'bg-surface-container text-on-surface-variant',
  CUSTOM: 'bg-surface-container text-on-surface-variant',
  PATTERN_DETECTED: 'bg-secondary-fixed text-on-secondary-fixed',
  AI_RECOMMENDED: 'bg-secondary-fixed text-on-secondary-fixed',
};

export const QualityRulesView: React.FC<QualityRulesViewProps> = ({
  onNavigate: _onNavigate,
  datasets,
  rules,
  ruleAssignments,
  ruleVersionIdsByRuleId,
  canManageRules,
  canManageAssignments,
  onOpenRuleCreator,
  onOpenAssignmentForm,
  onDisableAssignment,
  onOpenVersionForm,
  onOpenDatasetOverview,
  actionError,
  focusDatasetId,
}) => {
  const [datasetSearch, setDatasetSearch] = useState('');
  const [internalSelectedDatasetId, setInternalSelectedDatasetId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  // "Assign another existing rule" picker — fires the moment a rule is
  // chosen (same as the old native <select>'s onChange-then-reset), so it
  // never holds a lingering "selected" value afterward.
  const [assignPickerValue, setAssignPickerValue] = useState('');
  const selectedDatasetId = focusDatasetId ?? internalSelectedDatasetId;
  const setSelectedDatasetId = setInternalSelectedDatasetId;

  // rule_version_id -> owning rule, so an assignment (which only carries
  // rule_version_id) can be resolved back to a real rule name/type/origin/status.
  const ruleByVersionId = useMemo(() => {
    const map = new Map<string, RuleResponse>();
    rules.forEach((rule) => {
      (ruleVersionIdsByRuleId[rule.id] ?? []).forEach((versionId) => map.set(versionId, rule));
    });
    return map;
  }, [rules, ruleVersionIdsByRuleId]);

  // Source of truth for "which rules apply to this dataset" is
  // RuleAssignment.dataset_id — never rule name/type matching, and never a
  // client-side re-derivation of dataset membership from anything else.
  const assignmentCountByDataset = useMemo(() => {
    const counts = new Map<string, number>();
    ruleAssignments.forEach((a) => {
      counts.set(a.dataset_id, (counts.get(a.dataset_id) ?? 0) + 1);
    });
    return counts;
  }, [ruleAssignments]);

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(datasetSearch.toLowerCase())
  );

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId) ?? null;

  // Every assignment whose dataset_id matches the selection, resolved to its
  // real rule — this IS the "rules applied to this dataset" list; nothing
  // here is filtered by rule name/type.
  const datasetAssignments = selectedDatasetId
    ? ruleAssignments
        .filter((a) => a.dataset_id === selectedDatasetId)
        .map((a) => ({ assignment: a, rule: ruleByVersionId.get(a.rule_version_id) ?? null }))
    : [];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
            Quality Automation & Rules Engine
          </span>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Data Quality Rules
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans">
            Select a dataset to see only the rules applied to it.
          </p>
        </div>

        {canManageRules && (
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenRuleCreator}
              className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Create Rule</span>
            </button>
          </div>
        )}
      </div>

      {!canManageRules && (
        <div className="bg-surface-container-low rounded-md border border-outline-variant p-3.5 flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-base text-outline">lock</span>
          Rule creation and editing require the rules.manage permission (administrator-only).
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Dataset-first layout: pick a dataset on the left, see only its
          applied rules on the right. No cross-dataset rule leakage — the
          right panel only ever renders `datasetAssignments`, which is
          filtered strictly by RuleAssignment.dataset_id === selectedDatasetId. */}
      <div className={focusDatasetId ? '' : 'grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6'}>
        {/* Dataset picker — hidden when reached as a master/detail drill-down
            (focusDatasetId set): QualityRulesMasterView's full-width dataset
            list is the picker in that case. */}
        {!focusDatasetId && (
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden flex flex-col max-h-[70vh]">
            <div className="p-3 border-b border-outline-variant">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base">
                  search
                </span>
                <input
                  type="text"
                  value={datasetSearch}
                  onChange={(e) => setDatasetSearch(e.target.value)}
                  placeholder="Search datasets..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div className="overflow-y-auto divide-y divide-surface-container">
              {filteredDatasets.length === 0 ? (
                <p className="p-4 text-xs text-outline italic">No datasets found.</p>
              ) : (
                filteredDatasets.map((d) => {
                  const count = assignmentCountByDataset.get(d.id) ?? 0;
                  const isSelected = d.id === selectedDatasetId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDatasetId(d.id)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary-fixed/40' : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                        {d.name}
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          count > 0 ? 'bg-primary text-white' : 'bg-surface-container text-outline'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Applied rules for the selected dataset */}
        <div className="space-y-4">
          {!selectedDataset ? (
            <div className="bg-white rounded-lg border border-outline-variant p-10 text-center text-sm text-on-surface-variant">
              {focusDatasetId ? 'Loading this dataset…' : 'Select a dataset on the left to see the rules applied to it.'}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-editorial text-xl font-bold text-on-surface">{selectedDataset.name}</h2>
                  <p className="text-xs text-outline mt-0.5">
                    {datasetAssignments.length} rule{datasetAssignments.length === 1 ? '' : 's'} applied
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDatasetOverview(selectedDataset.id)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
                >
                  Open Dataset Overview &rarr;
                </button>
              </div>

              {datasetAssignments.length === 0 ? (
                <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
                  No rules are assigned to "{selectedDataset.name}" yet. Go to its Dataset Overview to
                  analyze &amp; suggest rules, or assign existing ones.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {datasetAssignments.map(({ assignment, rule }) => {
                    const isExpanded = expandedRuleId === assignment.id;
                    return (
                      <div
                        key={assignment.id}
                        className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-md bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-lg">rule</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-editorial font-bold text-base text-on-surface truncate">
                                {rule?.name ?? '(rule not found)'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                  {rule?.rule_type ?? assignment.assignment_scope}
                                </span>
                                {rule && (
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                      ORIGIN_STYLES[rule.origin] ?? 'bg-surface-container text-outline'
                                    }`}
                                  >
                                    {rule.origin}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                assignment.is_enabled
                                  ? 'bg-primary-fixed text-on-primary-fixed'
                                  : 'bg-surface-container text-outline'
                              }`}
                            >
                              {assignment.is_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            {rule && (
                              <span className="text-[10px] font-semibold text-outline">{rule.status}</span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                          <span className="text-outline">
                            Scope: {assignment.assignment_scope}
                            {assignment.column_id ? ' • single column' : ''}
                          </span>
                          <div className="flex items-center gap-3">
                            {rule && canManageRules && (
                              <button
                                type="button"
                                onClick={() => onOpenVersionForm(rule.id)}
                                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                              >
                                New Version
                              </button>
                            )}
                            {canManageAssignments && assignment.is_enabled && (
                              <button
                                type="button"
                                onClick={() => onDisableAssignment(assignment.id)}
                                className="text-xs font-semibold text-error hover:underline cursor-pointer"
                              >
                                Disable
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedRuleId(isExpanded ? null : assignment.id)}
                              className="text-xs font-semibold text-on-surface-variant hover:text-on-surface cursor-pointer"
                            >
                              {isExpanded ? 'Hide details' : 'Details'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-surface-container space-y-1.5 text-[11px] text-on-surface-variant">
                            <p>Assignment ID: {assignment.id}</p>
                            <p>Rule Assignment column: {assignment.column_id ?? '—'}</p>
                            {rule?.description && <p>Description: {rule.description}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {canManageAssignments && rules.length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Assign another existing rule to "{selectedDataset.name}"
                  </label>
                  <Select
                    value={assignPickerValue}
                    onChange={(v) => {
                      if (v) {
                        onOpenAssignmentForm(v, selectedDataset.id);
                        setAssignPickerValue('');
                      }
                    }}
                    options={rules
                      .filter((r) => r.status !== 'PENDING_REVIEW')
                      .map((r) => ({ value: r.id, label: `${r.name} (${r.rule_type})` }))}
                    placeholder="Select a rule to assign…"
                    aria-label={`Assign another existing rule to ${selectedDataset.name}`}
                    className="w-full sm:w-80"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
