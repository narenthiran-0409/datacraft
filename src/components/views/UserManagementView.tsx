import React, { useState } from 'react';
import { NavScreen, User } from '../../types';
import { RoleResponse } from '../../api/client';

interface UserManagementViewProps {
  onNavigate: (screen: NavScreen) => void;
  users: User[];
  roles: RoleResponse[];
  canManageUsers: boolean;
  actionPendingId: string | null;
  actionError: string | null;
  isCreating: boolean;
  createError: string | null;
  createdCredential: { email: string; temporaryPassword: string } | null;
  onDismissCredential: () => void;
  onCreateUser: (input: { name: string; email: string; roleId: string | null }) => Promise<boolean>;
  onEditUser: (id: string, updates: { name: string; roleId: string | null }) => Promise<boolean>;
  onDeactivateUser: (id: string) => void;
  onResetPassword: (id: string) => void;
}

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
  roleId: string | null;
}

const EMPTY_FORM: FormState = { name: '', email: '', roleId: null };

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  roles,
  canManageUsers,
  actionPendingId,
  actionError,
  isCreating,
  createError,
  createdCredential,
  onDismissCredential,
  onCreateUser,
  onEditUser,
  onDeactivateUser,
  onResetPassword,
}) => {
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const roleById = new Map(roles.map((r) => [r.id, r]));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingUserId(null);
    setFormError(null);
    setModalMode('create');
  };

  const openEdit = (user: User) => {
    // Single-select going forward, even though the backend allows a user to hold
    // multiple roles — this UI picks (or replaces with) exactly one. If a user
    // already has more than one, all are still shown as badges in the list below.
    const currentRoleId = roles.find((r) => user.roleNames.includes(r.name))?.id ?? null;
    setForm({ name: user.name, email: user.email, roleId: currentRoleId });
    setEditingUserId(user.id);
    setFormError(null);
    setModalMode('edit');
  };

  const closeModal = () => setModalMode(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || (modalMode === 'create' && !form.email.trim())) return;

    const ok =
      modalMode === 'edit' && editingUserId
        ? await onEditUser(editingUserId, { name: form.name, roleId: form.roleId })
        : await onCreateUser({ name: form.name, email: form.email, roleId: form.roleId });

    if (ok) closeModal();
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary block mb-2">
            Workspace Administration
          </span>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            User &amp; Role Management
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
            Real users and roles from the backend. Creating, editing, deactivating, and
            resetting passwords requires the users.manage permission.
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>Invite User</span>
          </button>
        )}
      </div>

      {createdCredential && (
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary-fixed px-4 py-3.5 text-sm text-on-primary-fixed">
          <span className="material-symbols-outlined text-base shrink-0 mt-0.5">key</span>
          <div className="flex-1">
            <p className="font-semibold">Temporary password for {createdCredential.email}</p>
            <p className="font-mono text-xs mt-1 bg-white/40 inline-block px-2 py-1 rounded">
              {createdCredential.temporaryPassword}
            </p>
            <p className="text-[11px] mt-1.5 opacity-90">
              Copy this now — it won't be shown again. The user must reset it on first login.
            </p>
          </div>
          <button
            onClick={onDismissCredential}
            className="p-1 text-on-primary-fixed/70 hover:text-on-primary-fixed rounded transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
        <div className="divide-y divide-surface-container">
          {users.length === 0 && (
            <p className="p-8 text-center text-sm text-on-surface-variant">No users found.</p>
          )}
          {users.map((user) => {
            const isPending = actionPendingId === user.id;
            return (
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

                <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-fit">
                  {user.roleNames.length === 0 ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-outline italic">
                      No role assigned
                    </span>
                  ) : (
                    user.roleNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed"
                      >
                        {name}
                      </span>
                    ))
                  )}
                </div>

                <span className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant shrink-0 w-24">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[user.accountStatus]}`} />
                  {STATUS_LABEL[user.accountStatus]}
                </span>

                {canManageUsers && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onResetPassword(user.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => openEdit(user)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Edit
                    </button>
                    {user.accountStatus !== 'disabled' && (
                      <button
                        onClick={() => onDeactivateUser(user.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-error/30 text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isPending ? 'Working…' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Modal */}
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
                    {modalMode === 'edit' ? "Update this user's name and role." : 'Add a new user to this workspace.'}
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
              {(formError || createError) && (
                <div className="p-3.5 rounded-md flex items-start gap-2.5 text-xs bg-error-container text-on-error-container">
                  <span className="material-symbols-outlined text-lg mt-0.5">error</span>
                  <span className="font-medium leading-relaxed">{formError || createError}</span>
                </div>
              )}

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
                  disabled={modalMode === 'edit'}
                  title={modalMode === 'edit' ? 'Email cannot be changed after a user is created' : undefined}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. priya.nair@company.com"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Role
                </label>
                {roles.length === 0 ? (
                  <p className="text-xs text-outline italic">No roles available.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, roleId: role.id }))}
                        className={`p-2.5 rounded-md border text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                          form.roleId === role.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                        }`}
                        title={role.description ?? undefined}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
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
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50"
                >
                  {isCreating ? 'Working…' : modalMode === 'edit' ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
