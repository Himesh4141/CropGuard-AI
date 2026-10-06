import {
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { adminApi } from "@/features/admin/api/adminApi";
import { useAuthStore } from "@/features/auth/store";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.users,
  });

  const mutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.setUserActive(userId, isActive),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "summary"] }),
      ]);
    },
  });

  const users = usersQuery.data ?? [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="Platform users"
        description="Review CropGuard accounts and enable or disable access without deleting historical data."
      />

      {usersQuery.isLoading ? (
        <section className="panel empty">
          <div className="spinner" />
          <p>Loading users...</p>
        </section>
      ) : null}

      {usersQuery.isError ? (
        <section className="panel empty">
          <Users size={36} />
          <h2>Users could not be loaded</h2>
        </section>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError ? (
        <div className="admin-users-list">
          {users.map((user) => {
            const isSelf = currentUser?.id === user.id;

            return (
              <article key={user.id} className="panel admin-user-row">
                <div>
                  <strong>{user.full_name}</strong>
                  <p>{user.email}</p>
                </div>

                <div>
                  <div className="admin-user-meta-label">Role</div>
                  <div className="admin-user-meta-value">
                    {user.role.replaceAll("_", " ")}
                  </div>
                </div>

                <div>
                  <div className="admin-user-meta-label">Activity</div>
                  <div className="admin-user-activity">
                    {user.farm_count} farms · {user.field_count} fields ·{" "}
                    {user.diagnosis_count} diagnoses
                  </div>
                </div>

                <button
                  type="button"
                  className="button secondary"
                  disabled={mutation.isPending || (isSelf && user.is_active)}
                  onClick={() =>
                    mutation.mutate({
                      userId: user.id,
                      isActive: !user.is_active,
                    })
                  }
                >
                  {user.is_active ? (
                    <>
                      <UserRoundX size={16} />
                      Disable
                    </>
                  ) : (
                    <>
                      <UserRoundCheck size={16} />
                      Enable
                    </>
                  )}
                </button>
              </article>
            );
          })}

          {users.length === 0 ? (
            <section className="panel empty">
              <ShieldCheck size={36} />
              <h2>No users found</h2>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
