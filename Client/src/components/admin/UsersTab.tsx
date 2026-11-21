import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, RefreshCw, Search, X } from "lucide-react";
import { getAdminUsers, resetAdminUserPassword, updateAdminUserRole, updateAdminUserStatus } from "../../api";
import { User, UserRole } from "../../api/types";
import { Field, Modal, Spinner } from "../ui";
import { DataState, formatDate, Notify, notifyError, Pager, SectionHeader, useDebouncedValue } from "./shared";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  TEAM_MEMBER: "Team member",
  ADMIN: "Administrator",
  WRITER: "Research writer",
};

const userId = (u: Pick<User, "id" | "_id">) => u.id || (u._id as string);

/** Cryptographically random password: 14 chars with upper, lower, digit and symbol. */
const generatePassword = (length = 14): string => {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*?-"];
  const all = sets.join("");
  const rand = (max: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  };
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

const ResetPasswordModal: React.FC<{ user: User; notify: Notify; onClose: () => void }> = ({ user, notify, onClose }) => {
  const [password, setPassword] = useState("");
  const tooShort = password.length > 0 && password.length < 8;

  const mutation = useMutation({
    mutationFn: () => resetAdminUserPassword(userId(user), password),
    onSuccess: () => {
      notify("success", `Password reset for ${user.email}. Share the new password with the user securely.`);
      onClose();
    },
    onError: notifyError(notify, "The password could not be reset."),
  });

  return (
    <Modal
      open
      onClose={() => !mutation.isPending && onClose()}
      title="Reset password"
      subtitle={`${user.firstName} ${user.lastName || ""} · ${user.email}`}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" form="reset-password-form" className="btn-primary btn-sm" disabled={mutation.isPending || password.length < 8}>
            {mutation.isPending && <Spinner className="h-3.5 w-3.5" />} Reset password
          </button>
        </>
      }
    >
      <form
        id="reset-password-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (password.length >= 8) mutation.mutate();
        }}
      >
        <Field label="New password" required help="At least 8 characters." error={tooShort ? "Password must be at least 8 characters." : undefined}>
          {(id, describedBy) => (
            <div className="flex gap-2">
              <input
                id={id}
                aria-describedby={describedBy}
                type="text"
                required
                minLength={8}
                autoComplete="new-password"
                spellCheck={false}
                className={`input font-mono ${tooShort ? "input-error" : ""}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={() => setPassword(generatePassword())}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Generate
              </button>
            </div>
          )}
        </Field>
        <p className="muted">The user's existing sessions may remain active until they sign out.</p>
      </form>
    </Modal>
  );
};

export const UsersTab: React.FC<{ currentUser: User | null; notify: Notify }> = ({ currentUser, notify }) => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [resetUser, setResetUser] = useState<User | null>(null);

  useEffect(() => setPage(1), [search, roleFilter, statusFilter]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-users", search, roleFilter, statusFilter, page],
    queryFn: () =>
      getAdminUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const users = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const myId = currentUser ? userId(currentUser) : undefined;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAdminUserStatus(id, status),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      notify("success", `${u?.email || "User"} is now ${u?.status === "ACTIVE" ? "active" : "suspended"}.`);
    },
    onError: notifyError(notify, "The user's status could not be changed."),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateAdminUserRole(id, role),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      notify("success", `Role updated${u?.role ? ` to ${ROLE_LABELS[u.role]}` : ""}.`);
    },
    onError: notifyError(notify, "The user's role could not be changed."),
  });

  const filtersActive = Boolean(search || roleFilter || statusFilter);

  return (
    <div className="space-y-5">
      <SectionHeader title="Users" description="Customer and staff accounts. Change roles, suspend access or reset passwords." />

      <div className="card grid grid-cols-1 gap-3 p-3 sm:grid-cols-[1fr_auto_auto] sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search users"
            placeholder="Search name, email or institution"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input pl-9 pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-navy-900"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select aria-label="Filter by role" className="input sm:w-44" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select aria-label="Filter by status" className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={users.length === 0}
        emptyTitle="No users found"
        emptyMessage={filtersActive ? "Try a different search term or filter." : undefined}
      >
        <div className={`table-wrap ${isFetching ? "opacity-70" : ""}`} aria-busy={isFetching}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Institution</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const id = userId(u);
                const isSelf = id === myId;
                return (
                  <tr key={id}>
                    <td className="max-w-[240px]">
                      <span className="block break-words font-medium text-navy-900">
                        {u.firstName} {u.lastName}
                        {isSelf && <span className="badge-navy ml-2 text-[10px]">You</span>}
                      </span>
                      <span className="block break-all text-xs text-slate-500">{u.email}</span>
                    </td>
                    <td className="max-w-[200px] break-words text-slate-600">{u.institution || u.department || "—"}</td>
                    <td>
                      {isSelf ? (
                        <span className="badge-navy">{ROLE_LABELS[u.role]}</span>
                      ) : (
                        <select
                          aria-label={`Role for ${u.email}`}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                          value={u.role}
                          disabled={roleMutation.isPending}
                          onChange={(e) => {
                            const role = e.target.value as UserRole;
                            if (window.confirm(`Change ${u.email} from ${ROLE_LABELS[u.role]} to ${ROLE_LABELS[role]}?`)) {
                              roleMutation.mutate({ id, role });
                            }
                          }}
                        >
                          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {u.status === "ACTIVE" ? (
                        <span className="badge-success">Active</span>
                      ) : u.status === "SUSPENDED" ? (
                        <span className="badge-danger">Suspended</span>
                      ) : (
                        <span className="badge-neutral">Inactive</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setResetUser(u)} aria-label={`Reset password for ${u.email}`}>
                          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden xl:inline">Reset password</span>
                        </button>
                        {!isSelf &&
                          (u.status === "ACTIVE" ? (
                            <button
                              type="button"
                              className="btn-danger-outline btn-sm"
                              disabled={statusMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Suspend ${u.email}? They will no longer be able to sign in.`)) {
                                  statusMutation.mutate({ id, status: "SUSPENDED" });
                                }
                              }}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id, status: "ACTIVE" })}
                            >
                              Activate
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      <Pager page={page} totalPages={totalPages} total={total} noun="user" onPageChange={setPage} disabled={isFetching} />

      {resetUser && <ResetPasswordModal user={resetUser} notify={notify} onClose={() => setResetUser(null)} />}
    </div>
  );
};
