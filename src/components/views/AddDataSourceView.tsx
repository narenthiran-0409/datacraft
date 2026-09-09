import React, { useState } from 'react';

export interface NewDataSourceInput {
  name: string;
  type: 'database' | 'api' | 'file';
  typeLabel: string;
  host: string;
}

interface AddDataSourceViewProps {
  onBack: () => void;
  onComplete: (source: NewDataSourceInput) => void;
}

type Category = 'database' | 'api' | 'file';

const DB_PROVIDERS = [
  { id: 'postgresql', label: 'PostgreSQL', icon: 'database', defaultPort: '5432' },
  { id: 'mysql', label: 'MySQL', icon: 'database', defaultPort: '3306' },
  { id: 'snowflake', label: 'Snowflake', icon: 'ac_unit', defaultPort: '443' },
  { id: 'bigquery', label: 'BigQuery', icon: 'hub', defaultPort: '443' },
  { id: 'redshift', label: 'Redshift', icon: 'water', defaultPort: '5439' },
  { id: 'mongodb', label: 'MongoDB', icon: 'data_object', defaultPort: '27017' },
];

const CATEGORIES: { id: Category; label: string; icon: string; description: string }[] = [
  { id: 'database', label: 'Database', icon: 'database', description: 'PostgreSQL, MySQL, Snowflake, BigQuery, and more.' },
  { id: 'api', label: 'API / Webhook', icon: 'cloud', description: 'REST or GraphQL endpoints, custom webhooks.' },
  { id: 'file', label: 'File Upload', icon: 'description', description: 'S3, Parquet, CSV, or manual file uploads.' },
];

const STEPS = [
  { id: 1, label: 'Select Type' },
  { id: 2, label: 'Connection Details' },
  { id: 3, label: 'Test & Save' },
];

export const AddDataSourceView: React.FC<AddDataSourceViewProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<Category>('database');
  const [dbProvider, setDbProvider] = useState(DB_PROVIDERS[0]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testAttempts, setTestAttempts] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(1);

  const [connectionName, setConnectionName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(DB_PROVIDERS[0].defaultPort);
  const [dbName, setDbName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [filePath, setFilePath] = useState('');

  const categoryMeta = CATEGORIES.find((c) => c.id === category)!;

  const canContinueFromDetails =
    connectionName.trim().length > 0 &&
    (category === 'database'
      ? host.trim().length > 0 && dbName.trim().length > 0
      : category === 'api'
      ? apiEndpoint.trim().length > 0
      : filePath.trim().length > 0);

  const goToStep = (target: number) => {
    if (target <= maxStepReached) {
      setStep(target);
    }
  };

  const handleSelectProvider = (provider: (typeof DB_PROVIDERS)[number]) => {
    setDbProvider(provider);
    setPort(provider.defaultPort);
  };

  const handleContinueFromType = () => {
    setStep(2);
    setMaxStepReached((m) => Math.max(m, 2));
  };

  const handleTestConnection = () => {
    setTestStatus('testing');
    setTestAttempts((n) => n + 1);
    // Mock network round-trip: fails occasionally on the first try to
    // exercise the error/retry state, always succeeds after that.
    const willFail = testAttempts === 0 && Math.random() < 0.25;
    setTimeout(() => {
      setTestStatus(willFail ? 'error' : 'success');
    }, 1200);
  };

  const handleContinueFromDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
    setMaxStepReached((m) => Math.max(m, 3));
    setTestStatus('idle');
    setTestAttempts(0);
  };

  const handleFinish = () => {
    const resolvedHost =
      category === 'database'
        ? `${host || 'localhost'}:${port}`
        : category === 'api'
        ? apiEndpoint || 'connected.datacraft.internal'
        : filePath || 'connected.datacraft.internal';

    onComplete({
      name: connectionName.trim(),
      type: category,
      typeLabel:
        category === 'database'
          ? dbProvider.label
          : category === 'api'
          ? 'REST / GraphQL API'
          : 'S3 / File Bucket',
      host: resolvedHost,
    });
  };

  return (
    <div className="min-h-screen w-full bg-surface font-sans text-on-surface">
      {/* Top Bar */}
      <header className="w-full bg-surface border-b border-outline-variant/60 px-6 md:px-10 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          <span>Back to Data Sources</span>
        </button>
        <span className="font-editorial text-xl font-extrabold text-primary tracking-tight">
          DataCraft
        </span>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        {/* Stepper */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, idx) => {
            const isComplete = step > s.id;
            const isCurrent = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => goToStep(s.id)}
                  disabled={s.id > maxStepReached}
                  className={`flex items-center gap-3 shrink-0 ${
                    s.id <= maxStepReached && s.id !== step ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                      isComplete || isCurrent
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-outline'
                    }`}
                  >
                    {isComplete ? (
                      <span className="material-symbols-outlined text-lg">check</span>
                    ) : (
                      s.id
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold leading-tight ${
                      isComplete || isCurrent ? 'text-on-surface' : 'text-outline'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-4 transition-colors ${
                      step > s.id ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight mb-2">
          {step === 1
            ? 'Connect a New Data Source'
            : category === 'database'
            ? 'Connect a Database'
            : category === 'api'
            ? 'Connect an API'
            : 'Connect a File Source'}
        </h1>
        <p className="text-sm text-on-surface-variant mb-8 max-w-2xl">
          {step === 1
            ? 'Choose the kind of source you want to bring into DataCraft.'
            : step === 2
            ? 'Provide your database credentials to start exploring and validating your data.'
            : 'Verify the connection works, then save it to start monitoring quality.'}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Card */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-ambient p-6 md:p-8">
            {/* Step 1: Select Type */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
                        category === c.id
                          ? 'bg-primary text-on-primary border-primary shadow-xs'
                          : 'bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl block mb-2">
                        {c.icon}
                      </span>
                      <span className="block text-sm font-bold mb-1">{c.label}</span>
                      <span
                        className={`block text-xs leading-relaxed ${
                          category === c.id ? 'text-on-primary/80' : 'text-on-surface-variant'
                        }`}
                      >
                        {c.description}
                      </span>
                    </button>
                  ))}
                </div>

                {category === 'database' && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-2 uppercase tracking-wider">
                      Choose a provider
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DB_PROVIDERS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProvider(p)}
                          className={`flex items-center gap-2 p-3 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                            dbProvider.id === p.id
                              ? 'bg-primary-fixed border-primary text-on-primary-fixed'
                              : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-surface-container flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-xs font-semibold text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueFromType}
                    className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-colors cursor-pointer shadow-ambient"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Connection Details */}
            {step === 2 && (
              <form onSubmit={handleContinueFromDetails} className="space-y-5">
                {testStatus !== 'idle' && (
                  <div
                    className={`p-3.5 rounded-md flex items-start gap-2.5 text-xs ${
                      testStatus === 'success'
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : testStatus === 'error'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-lg mt-0.5 ${
                        testStatus === 'testing' ? 'animate-spin' : ''
                      }`}
                    >
                      {testStatus === 'testing'
                        ? 'sync'
                        : testStatus === 'success'
                        ? 'check_circle'
                        : 'error'}
                    </span>
                    <span className="font-medium leading-relaxed">
                      {testStatus === 'testing' && 'Testing connection...'}
                      {testStatus === 'success' &&
                        `Connection successful — DataCraft was able to reach "${host || connectionName}".`}
                      {testStatus === 'error' &&
                        'Could not reach the host. Double-check the address, port, and credentials, then retry.'}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                    Connection Name
                  </label>
                  <input
                    type="text"
                    required
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                    placeholder="e.g., Main Warehouse"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                  />
                </div>

                {category === 'database' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                        Database Type
                      </label>
                      <div className="w-full flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5">
                        <span className="flex items-center gap-2 text-sm text-on-surface font-medium">
                          <span className="material-symbols-outlined text-lg text-primary">
                            {dbProvider.icon}
                          </span>
                          {dbProvider.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                          Host / Server Address
                        </label>
                        <input
                          type="text"
                          required
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          placeholder="localhost or cluster.xyz.com"
                          className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                        />
                      </div>
                      <div className="sm:w-28">
                        <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                          Port
                        </label>
                        <input
                          type="text"
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                        Database Name
                      </label>
                      <input
                        type="text"
                        required
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        placeholder="postgres"
                        className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                          Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="admin"
                          className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 pr-10 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-surface-container">
                      <button
                        type="button"
                        onClick={() => setAdvancedOpen((v) => !v)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface py-3 cursor-pointer"
                      >
                        <span
                          className={`material-symbols-outlined text-lg transition-transform ${
                            advancedOpen ? 'rotate-180' : ''
                          }`}
                        >
                          expand_more
                        </span>
                        Advanced Options (SSL, SSH Tunnel)
                      </button>
                      {advancedOpen && (
                        <div className="pb-2 space-y-3">
                          <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                            <input type="checkbox" className="accent-primary w-4 h-4" />
                            Require SSL connection
                          </label>
                          <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                            <input type="checkbox" className="accent-primary w-4 h-4" />
                            Connect via SSH tunnel
                          </label>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {category === 'api' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                        Endpoint URL
                      </label>
                      <input
                        type="text"
                        required
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="https://api.example.com/v1/records"
                        className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                        API Key (optional)
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk_live_..."
                        className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                      />
                    </div>
                  </>
                )}

                {category === 'file' && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1.5 uppercase tracking-wider">
                      Bucket / File Path
                    </label>
                    <input
                      type="text"
                      required
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                      placeholder="s3://my-bucket/exports/"
                      className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-surface-container flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing' || !canContinueFromDetails}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-outline-variant text-on-surface text-xs font-semibold hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span
                      className={`material-symbols-outlined text-base ${
                        testStatus === 'testing' ? 'animate-spin' : ''
                      }`}
                    >
                      {testStatus === 'testing' ? 'sync' : 'bolt'}
                    </span>
                    {testStatus === 'testing'
                      ? 'Testing...'
                      : testStatus === 'error'
                      ? 'Retry Test'
                      : 'Test Connection'}
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onBack}
                      className="text-xs font-semibold text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!canContinueFromDetails}
                      className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Step 3: Test & Save */}
            {step === 3 && (
              <div className="space-y-6">
                <div
                  className={`p-5 rounded-md flex items-start gap-3 ${
                    testStatus === 'success'
                      ? 'bg-primary-fixed text-on-primary-fixed'
                      : testStatus === 'error'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl mt-0.5 ${
                      testStatus === 'testing' ? 'animate-spin' : ''
                    }`}
                  >
                    {testStatus === 'testing'
                      ? 'sync'
                      : testStatus === 'success'
                      ? 'check_circle'
                      : testStatus === 'error'
                      ? 'error'
                      : 'bolt'}
                  </span>
                  <div>
                    <p className="text-sm font-bold">
                      {testStatus === 'idle' && 'Ready to test your connection'}
                      {testStatus === 'testing' && 'Testing connection...'}
                      {testStatus === 'success' && 'Connection successful'}
                      {testStatus === 'error' && 'Connection failed'}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {testStatus === 'idle' &&
                        `Run a quick check against "${connectionName || 'your source'}" before saving it to DataCraft.`}
                      {testStatus === 'testing' && 'Reaching out to the endpoint and verifying credentials.'}
                      {testStatus === 'success' &&
                        `DataCraft was able to reach "${connectionName || 'your source'}" and authenticate successfully.`}
                      {testStatus === 'error' &&
                        'Could not reach the host. Double-check the address, port, and credentials, then retry.'}
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-md border border-outline-variant p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-outline">Connection Name</span>
                    <span className="font-semibold text-on-surface">{connectionName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-outline">Type</span>
                    <span className="font-semibold text-on-surface">{categoryMeta.label}</span>
                  </div>
                  {category === 'database' && (
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Host</span>
                      <span className="font-semibold text-on-surface font-mono">{host || '—'}:{port}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-surface-container flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-outline-variant text-on-surface text-xs font-semibold hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <span className={`material-symbols-outlined text-base ${testStatus === 'testing' ? 'animate-spin' : ''}`}>
                      {testStatus === 'testing' ? 'sync' : 'bolt'}
                    </span>
                    {testStatus === 'testing'
                      ? 'Testing...'
                      : testStatus === 'error'
                      ? 'Retry Test'
                      : testStatus === 'success'
                      ? 'Test Again'
                      : 'Test Connection'}
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs font-semibold text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleFinish}
                      disabled={testStatus !== 'success'}
                      title={testStatus !== 'success' ? 'Test the connection successfully before saving' : undefined}
                      className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Data Source
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Need Help Sidebar */}
          <div className="bg-surface-container-low rounded-lg border border-outline-variant p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary">help</span>
              <h3 className="font-editorial font-bold text-lg text-on-surface">Need Help?</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Finding your database credentials varies by provider. Here are some quick tips:
            </p>

            <div className="space-y-3">
              <div className="border-l-2 border-primary pl-3">
                <p className="text-xs font-bold text-on-surface">AWS RDS</p>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                  Check the "Connectivity &amp; security" tab in your RDS console for the endpoint (host).
                </p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <p className="text-xs font-bold text-on-surface">Heroku</p>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                  Use <code className="font-mono bg-surface-container px-1 py-0.5 rounded text-[11px]">heroku pg:credentials:url</code> in your CLI to view full connection details.
                </p>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <p className="text-xs font-bold text-on-surface">Security Group</p>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-0.5">
                  Ensure DataCraft's IP addresses are whitelisted in your database firewall settings.
                </p>
              </div>
            </div>

            <a
              href="#docs"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Read full documentation
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
