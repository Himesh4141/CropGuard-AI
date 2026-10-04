import {
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  adminApi,
} from "@/features/admin/api/adminApi";

import {
  useAuthStore,
} from "@/features/auth/store";


export default function AdminUsersPage() {
  const queryClient =
    useQueryClient();

  const currentUser =
    useAuthStore(
      (state) =>
        state.user,
    );

  const usersQuery =
    useQuery({
      queryKey: [
        "admin",
        "users",
      ],
      queryFn:
        adminApi.users,
    });

  const mutation =
    useMutation({
      mutationFn: ({
        userId,
        isActive,
      }: {
        userId: string;
        isActive: boolean;
      }) =>
        adminApi.setUserActive(
          userId,
          isActive,
        ),

      onSuccess:
        async () => {
          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey: [
                  "admin",
                  "users",
                ],
              }),
            queryClient
              .invalidateQueries({
                queryKey: [
                  "admin",
                  "summary",
                ],
              }),
          ]);
        },
    });

  const users =
    usersQuery.data ?? [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="Platform users"
        description="Review CropGuard accounts and enable or disable access without deleting historical data."
      />

      {usersQuery.isLoading && (
        <section className="panel empty">
          <div className="spinner" />
          <p>
            Loading users...
          </p>
        </section>
      )}

      {usersQuery.isError && (
        <section className="panel empty">
          <Users size={36} />
          <h2>
            Users could not be loaded
          </h2>
        </section>
      )}

      {!usersQuery.isLoading
        && !usersQuery.isError
        && (
          <div
            style={{
              display:
                "grid",
              gap:
                "12px",
            }}
          >
            {users.map(
              (user) => {
                const isSelf =
                  currentUser?.id
                  === user.id;

                return (
                  <article
                    key={user.id}
                    className="panel"
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "minmax(220px, 1.4fr) minmax(170px, .8fr) minmax(180px, .9fr) auto",
                      gap:
                        "18px",
                      alignItems:
                        "center",
                    }}
                  >
                    <div>
                      <strong>
                        {user.full_name}
                      </strong>

                      <p
                        style={{
                          margin:
                            "6px 0 0",
                          color:
                            "var(--muted)",
                        }}
                      >
                        {user.email}
                      </p>
                    </div>

                    <div>
                      <small
                        style={{
                          color:
                            "var(--muted2)",
                        }}
                      >
                        ROLE
                      </small>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {user.role
                          .replaceAll(
                            "_",
                            " ",
                          )}
                      </div>
                    </div>

                    <div>
                      <small
                        style={{
                          color:
                            "var(--muted2)",
                        }}
                      >
                        ACTIVITY
                      </small>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "var(--muted)",
                          fontSize:
                            "12px",
                        }}
                      >
                        {user.farm_count} farms ·{" "}
                        {user.field_count} fields ·{" "}
                        {user.diagnosis_count} diagnoses
                      </div>
                    </div>

                    <button
                      type="button"
                      className="button secondary"
                      disabled={
                        mutation.isPending
                        || (
                          isSelf
                          && user.is_active
                        )
                      }
                      onClick={() =>
                        mutation.mutate({
                          userId:
                            user.id,
                          isActive:
                            !user.is_active,
                        })
                      }
                    >
                      {user.is_active
                        ? (
                          <>
                            <UserRoundX
                              size={16}
                            />
                            Disable
                          </>
                        )
                        : (
                          <>
                            <UserRoundCheck
                              size={16}
                            />
                            Enable
                          </>
                        )}
                    </button>
                  </article>
                );
              },
            )}

            {users.length === 0 && (
              <section className="panel empty">
                <ShieldCheck
                  size={36}
                />
                <h2>
                  No users found
                </h2>
              </section>
            )}
          </div>
        )}
    </div>
  );
}
