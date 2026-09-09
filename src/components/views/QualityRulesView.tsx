import React, { useState } from 'react';
import { QualityRule, NavScreen } from '../../types';

interface QualityRulesViewProps {
  rules: QualityRule[];
  onToggleRule: (id: string) => void;
  onOpenRuleCreator: () => void;
  onNavigate: (screen: NavScreen) => void;
}

export const QualityRulesView: React.FC<QualityRulesViewProps> = ({
  rules,
  onToggleRule,
  onOpenRuleCreator,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; passed: boolean; message: string } | null>(null);

  const categories = [
    { id: 'all', label: 'All Rules', count: rules.length },
    {
      id: 'formatting',
      label: 'Formatting',
      count: rules.filter((r) => r.category === 'formatting').length,
    },
    {
      id: 'uniqueness',
      label: 'Uniqueness',
      count: rules.filter((r) => r.category === 'uniqueness').length,
    },
    {
      id: 'completeness',
      label: 'Completeness',
      count: rules.filter((r) => r.category === 'completeness').length,
    },
    {
      id: 'consistency',
      label: 'Consistency',
      count: rules.filter((r) => r.category === 'consistency').length,
    },
  ];

  const filteredRules = rules.filter((r) => {
    const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleTestRule = (rule: QualityRule, e: React.MouseEvent) => {
    e.stopPropagation();
    setTestingRuleId(rule.id);
    setTestResult(null);

    setTimeout(() => {
      setTestingRuleId(null);
      setTestResult({
        id: rule.id,
        passed: rule.status === 'active',
        message:
          rule.status === 'active'
            ? `Rule passed on 12,404 / 12,418 rows (99.8% compliance in Customer Data).`
            : `Rule evaluated. Found 2,140 rows with missing optional data.`,
      });
    }, 800);
  };

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
            Define, test, and automate validation constraints across incoming data pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenRuleCreator}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Create Rule</span>
          </button>
        </div>
      </div>

      {/* Guided Rule Creator Teaser Card (Screen 5 highlight) */}
      <div className="bg-surface-container-low rounded-lg p-6 border border-outline-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-md bg-surface-container-high text-primary flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-2xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
          </div>
          <div>
            <h3 className="font-editorial font-bold text-lg text-on-surface">
              Guided Rule Creator
            </h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-xl font-sans">
              Create rules using natural language or guided step-by-step assistant. Describe your constraint in plain English and let AI generate SQL regex patterns.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenRuleCreator}
          className="bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md text-xs font-semibold shrink-0 transition-colors shadow-2xs cursor-pointer"
        >
          Try Guided Creator
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all border cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              <span>{c.label}</span>
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === c.id
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-container text-outline'
                }`}
              >
                {c.count}
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

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRules.map((rule) => {
          const isActive = rule.status === 'active';
          const isTesting = testingRuleId === rule.id;
          const hasTestResult = testResult && testResult.id === rule.id;

          return (
            <div
              key={rule.id}
              className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient shadow-ambient-hover flex flex-col justify-between group transition-all"
            >
              <div>
                {/* Header: Icon, Name, Category & Switch Toggle */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">
                        {rule.icon}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-editorial font-bold text-lg text-on-surface">
                        {rule.name}
                      </h4>
                      <span className="inline-block text-[10px] font-semibold text-secondary uppercase tracking-wider">
                        {rule.category}
                      </span>
                    </div>
                  </div>

                  {/* Active / Inactive Switch Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-outline">
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
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
                </div>

                {/* Description */}
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4 font-sans">
                  {rule.description}
                </p>

                {/* Logic preview snippet */}
                {rule.ruleCode && (
                  <div className="bg-surface-container-low p-2.5 rounded-md border border-outline-variant font-mono text-[11px] text-tertiary truncate mb-4">
                    <code>{rule.ruleCode}</code>
                  </div>
                )}

                {/* Test Feedback Notice */}
                {hasTestResult && (
                  <div className="mb-4 p-2.5 bg-primary-fixed border border-transparent rounded-md text-xs text-on-primary-fixed flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-on-primary-fixed mt-0.5">
                      check_circle
                    </span>
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Card Footer: Datasets applied & Test action */}
              <div className="pt-4 border-t border-surface-container flex items-center justify-between text-xs text-outline">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">
                    dataset
                  </span>
                  <span>{rule.appliedDatasetsCount} Datasets using this rule</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => handleTestRule(rule, e)}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded border border-outline-variant hover:bg-surface-container-low text-on-surface font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined text-sm ${
                      isTesting ? 'animate-spin' : ''
                    }`}
                  >
                    {isTesting ? 'sync' : 'science'}
                  </span>
                  <span>{isTesting ? 'Testing...' : 'Test Rule'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
