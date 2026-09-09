import React, { useState } from 'react';
import { NavScreen } from '../../types';
import { RuleAssignmentResponse, RuleResponse } from '../../api/client';

interface QualityRulesViewProps {
  onNavigate: (screen: NavScreen) => void;
  rules: RuleResponse[];
  ruleAssignments: RuleAssignmentResponse[];
  /** rule.id -> the set of rule_version_ids that belong to it, for matching assignments. */
  ruleVersionIdsByRuleId: Record<string, string[]>;
  canManageRules: boolean;
  canManageAssignments: boolean;
  onOpenRuleCreator: () => void;
  onToggleRule: (id: string) => void;
  onOpenAssignmentForm: (ruleId: string) => void;
  onDisableAssignment: (assignmentId: string) => void;
  onOpenVersionForm: (ruleId: string) => void;
  actionError: string | null;
}

const RULE_TYPES = ['COMPLETENESS', 'UNIQUENESS', 'DUPLICATE', 'RANGE', 'PATTERN', 'CROSS_COLUMN'] as const;

export const QualityRulesView: React.FC<QualityRulesViewProps> = ({
  rules,
  ruleAssignments,
  ruleVersionIdsByRuleId,
  canManageRules,
  canManageAssignments,
  onOpenRuleCreator,
  onToggleRule,
  onOpenAssignmentForm,
  onDisableAssignment,
  onOpenVersionForm,
  actionError,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const types = [
    { id: 'all', label: 'All Types', count: rules.length },
    ...RULE_TYPES.map((t) => ({ id: t, label: t, count: rules.filter((r) => r.rule_type === t).length })),
  ];

  const filteredRules = rules.filter((r) => {
    const matchesType = selectedType === 'all' || r.rule_type === selectedType;
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

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
            Define validation constraints and assign them to datasets.
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

      {/* Type Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all border cursor-pointer ${
                selectedType === t.id
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedType === t.id ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-md pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
          No rules found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRules.map((rule) => {
            const isActive = rule.status === 'ACTIVE';
            const isExpanded = expandedRuleId === rule.id;
            const versionIds = new Set(ruleVersionIdsByRuleId[rule.id] ?? []);
            const assignments = ruleAssignments.filter((a) => versionIds.has(a.rule_version_id));

            return (
              <div
                key={rule.id}
                className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient flex flex-col justify-between group transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl">rule</span>
                      </div>
                      <div>
                        <h4 className="font-editorial font-bold text-lg text-on-surface">{rule.name}</h4>
                        <span className="inline-block text-[10px] font-semibold text-secondary uppercase tracking-wider">
                          {rule.rule_type}
                          {rule.category ? ` • ${rule.category}` : ''}
                        </span>
                      </div>
                    </div>

                    {canManageRules && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-outline">{isActive ? 'Active' : rule.status}</span>
                        <button
                          type="button"
                          onClick={() => onToggleRule(rule.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isActive ? 'bg-primary' : 'bg-outline-variant'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {rule.description && (
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-4 font-sans">{rule.description}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-surface-container flex items-center justify-between text-xs text-outline">
                  <span>Created {new Date(rule.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    {canManageRules && (
                      <button
                        type="button"
                        onClick={() => onOpenVersionForm(rule.id)}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        New Version
                      </button>
                    )}
                    {canManageAssignments && (
                      <button
                        type="button"
                        onClick={() => onOpenAssignmentForm(rule.id)}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Assign
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                      className="text-xs font-semibold text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      {isExpanded ? 'Hide assignments' : 'Assignments'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-surface-container space-y-2">
                    {assignments.length === 0 ? (
                      <p className="text-[11px] text-outline italic">No assignments for this rule.</p>
                    ) : (
                      assignments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-2 bg-surface-container-low rounded px-2.5 py-1.5 text-[11px]"
                        >
                          <span className="text-on-surface-variant">
                            {a.assignment_scope} • dataset {a.dataset_id.slice(0, 8)} •{' '}
                            {a.is_enabled ? 'enabled' : 'disabled'}
                          </span>
                          {canManageAssignments && a.is_enabled && (
                            <button
                              type="button"
                              onClick={() => onDisableAssignment(a.id)}
                              className="text-error font-semibold hover:underline cursor-pointer shrink-0"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
