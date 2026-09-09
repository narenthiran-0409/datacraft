import React, { useState } from 'react';
import { DataRow, NavScreen } from '../../types';
import { INITIAL_DATA_ROWS } from '../../data/mockData';

interface DatasetPreviewViewProps {
  onNavigate: (screen: NavScreen) => void;
}

export const DatasetPreviewView: React.FC<DatasetPreviewViewProps> = ({
  onNavigate,
}) => {
  const [rows, setRows] = useState<DataRow[]>(INITIAL_DATA_ROWS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Suspended'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter rows
  const filteredRows = rows.filter((r) => {
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesSearch =
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = ['Customer Name', 'Email', 'Join Date', 'Status', 'Location', 'Revenue'];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...filteredRows.map((r) =>
          [
            `"${r.customerName}"`,
            `"${r.email}"`,
            `"${r.joinDate}"`,
            `"${r.status}"`,
            `"${r.location}"`,
            `"${r.revenue || '$0'}"`,
          ].join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_data_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
            <button
              onClick={() => onNavigate('dataset-overview')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              Customer Data
            </button>
            <span>/</span>
            <span className="text-on-surface font-bold">Table Preview</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Customer Records Preview
          </h1>
          <p className="text-xs text-outline mt-1 font-sans">
            Displaying sample partition from <code className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-on-surface">users_master</code> (12,418 total rows)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('review-corrections')}
            className="flex items-center gap-2 bg-secondary-fixed hover:bg-secondary-fixed-dim text-secondary px-4 py-2.5 rounded-md font-medium text-xs border border-secondary/20 transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">warning</span>
            <span>Review 14 Format Issues</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="inline-flex bg-surface-container-low p-1 rounded-md border border-outline-variant shadow-2xs self-start">
          {(['All', 'Active', 'Pending', 'Suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by name, email, city..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-md pl-9 pr-3 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Customer Name</th>
                <th className="py-3.5 px-5">Email Address</th>
                <th className="py-3.5 px-5">Join Date</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Location</th>
                <th className="py-3.5 px-5">Revenue</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-outline">
                    No customer records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-surface-container-low/60 transition-colors ${
                      row.hasEmailError ? 'bg-error-container/40' : ''
                    }`}
                  >
                    {/* Customer Name */}
                    <td className="py-4 px-5 font-semibold text-on-surface">
                      {row.customerName}
                    </td>

                    {/* Email Address (with highlighted error if malformed) */}
                    <td className="py-4 px-5">
                      {row.hasEmailError ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-error-container text-on-error-container px-2 py-0.5 rounded border border-on-error-container/30 font-bold">
                            {row.email}
                          </span>
                          <span
                            className="material-symbols-outlined text-on-error-container text-base cursor-help"
                            title={row.emailErrorMessage || 'Invalid email format'}
                          >
                            error
                          </span>
                          <button
                            onClick={() => onNavigate('review-corrections')}
                            className="text-[11px] font-bold text-secondary underline hover:text-on-error-container cursor-pointer"
                          >
                            Fix
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-on-surface-variant">{row.email}</span>
                      )}
                    </td>

                    {/* Join Date */}
                    <td className="py-4 px-5 text-outline">{row.joinDate}</td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          row.status === 'Active'
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : row.status === 'Pending'
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : 'bg-surface-container text-on-surface-variant border border-outline-variant'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            row.status === 'Active'
                              ? 'bg-primary'
                              : row.status === 'Pending'
                              ? 'bg-secondary'
                              : 'bg-outline'
                          }`}
                        />
                        <span>{row.status}</span>
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-5 text-on-surface-variant">{row.location}</td>

                    {/* Revenue */}
                    <td className="py-4 px-5 font-semibold text-on-surface">
                      {row.revenue || '$0'}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleCopyEmail(row.email, row.id)}
                        className="p-1.5 text-outline hover:text-primary hover:bg-surface-container-low rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Copy email"
                      >
                        <span className="material-symbols-outlined text-base">
                          {copiedId === row.id ? 'check' : 'content_copy'}
                        </span>
                        {copiedId === row.id && (
                          <span className="text-[10px] text-primary font-medium">Copied</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="p-4 bg-surface border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-outline">
          <span>
            Showing <strong className="text-on-surface">{filteredRows.length}</strong> of{' '}
            <strong className="text-on-surface">12,418</strong> records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1.5 rounded border border-outline-variant bg-white hover:bg-surface-container-low disabled:opacity-50 text-on-surface font-medium cursor-pointer"
            >
              Previous
            </button>
            <button className="px-3 py-1.5 rounded bg-primary text-white font-bold cursor-pointer">
              1
            </button>
            <button className="px-3 py-1.5 rounded border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface cursor-pointer">
              2
            </button>
            <button className="px-3 py-1.5 rounded border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface cursor-pointer">
              3
            </button>
            <span className="px-1">...</span>
            <button className="px-3 py-1.5 rounded border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface cursor-pointer">
              124
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1.5 rounded border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
