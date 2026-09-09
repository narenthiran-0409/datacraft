import React, { useState } from 'react';
import { NavScreen, PlatformRole, User } from '../../types';

interface UserManagementViewProps {
  onNavigate: (screen: NavScreen) => void;
  users: User[];
  onCreateUser: (input: { name: string; email: string; company: string; platformRole: PlatformRole }) => void;
  onEditUser: (id: string, updates: { name: string; email: string; company: string; platformRole: PlatformRole }) => void;
  onResetPassword: (id: string) => void;
}

const ROLE_OPTIONS: PlatformRole[] = ['administrator', 'analyst', 'reviewer', 'approver', 'publisher'];

const ROLE_LABEL: Record<PlatformRole, string> = {
  administrator: 'Administrator',
  analyst: 'Analyst',
  reviewer: 'Reviewer',
  approver: 'Approver',
  publisher: 'Publisher',
};

const ROLE_ICON: Record<PlatformRole, string> = {
  administrator: 'shield_person',
  analyst: 'query_stats',
  reviewer: 'fact_check',
  approver: 'verified',
  publisher: 'cloud_upload',
};

// Five genuinely distinct treatments, not a reuse of the 3-state
// healthy/warning/critical status palette.
const ROLE_STYLES: Record<PlatformRole, string> = {
  administrator: 'bg-primary text-on-primary',
  approver: 'bg-primary-fixed text-on-primary-fixed',
  reviewer: 'bg-tertiary-fixed text-on-tertiary-fixed',
  analyst: 'bg-secondary-fixed text-on-secondary-fixed',
  publisher: 'bg-deep-navy text-on-deep-navy',
};

const STATUS_DOT: Record<User['accountStatus'], string> = {
  active: 'bg-primary',
  invited: 'bg-secondary',
  disabled: 'bg-outline',
};

const STATUS_LABEL: Record<User['accountStatus'], string> = {
  active: 'Active',
  invited: 'Invited',
  disabled: 'Disabled',
};

interface FormState {
  name: string;
  email: string;
  company: string;
  platformRole: PlatformRole;
}

const EMPTY_FORM: FormState = { name: '', email: '', company: '', platformRole: 'analyst' };

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  onCreateUser,
  onEditUser,
  onResetPassword,
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingUserId(null);
    setModalMode('create');
  };

  const openEdit = (user: User) => {
    setForm({ name: user.name, email: user.email, company: user.company, platformRole: user.platformRole });
    setEditingUserId(user.id);
    setModalMode('edit');
  };

  const closeModal = () => setModalMode(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    if (modalMode === 'edit' && editingUserId) {
      onEditUser(editingUserId, form);
    } else {
      onCreateUser(form);
    }
    closeModal();
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Workspace Administration
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-error-container text-on-error-container">
              <span className="material-symbols-outlined text-xs">lock</span>
              Admin Only
            </span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            User &amp; Role Management
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
            This area is intended for administrators. There's no real session or permission
            system in place yet, so access isn't actually restricted here — this badge is a
            placeholder for that gate.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>Invite User</span>
        </button>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
        <div className="divide-y divide-surface-container">
          {users.map((user) => (
            <div key={user.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                  <p className="text-xs text-outline truncate">{user.email}</p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 w-fit ${ROLE_STYLES[user.platformRole]}`}
              >
                <span className="material-symbols-outlined text-xs">{ROLE_ICON[user.platformRole]}</span>
                {ROLE_LABEL[user.platformRole]}
              </span>

              <span className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant shrink-0 w-24">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[user.accountStatus]}`} />
                {STATUS_LABEL[user.accountStatus]}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onResetPassword(user.id)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => openEdit(user)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create / Edit Modal — matches the Guided Rule Creator modal structure */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-lg w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-surface-container-high text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">
                    {modalMode === 'edit' ? 'edit' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-on-surface">
                    {modalMode === 'edit' ? 'Edit User' : 'Invite User'}
                  </h3>
                  <p className="text-xs text-outline">
                    {modalMode === 'edit'
                      ? "Update this user's profile and platform role."
                      : 'Add a new user to this workspace.'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-outline hover:text-on-surface rounded transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Priya Nair"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. priya.nair@company.com"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Company
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="e.g. DataCraft Enterprise"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Platform Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, platformRole: role }))}
                      className={`p-2.5 rounded-md border text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                        form.platformRole === role
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {ROLE_LABEL[role]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-surface-container flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-md border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient"
                >
                  {modalMode === 'edit' ? 'Save Changes' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
