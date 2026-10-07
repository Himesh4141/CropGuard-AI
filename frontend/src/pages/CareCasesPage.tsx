import {
  Camera,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MessageSquareText,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useEffect,
  useState,
} from "react";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  careCaseApi,
} from "@/features/careCases/api/careCaseApi";

import type {
  CareCase,
  CareCaseTrend,
  FarmerFollowUpPayload,
} from "@/features/careCases/types";

import {
  syncCareCaseReminders,
} from "@/services/nativeNotifications";

import "@/features/careCases/careCases.css";


function readableLabel(
  value: string | null,
): string {
  if (!value) {
    return "Crop-health condition";
  }

  const withoutCrop = value.includes("___")
    ? value.split("___")[1] ?? value
    : value;

  return withoutCrop
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}


function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "No follow-up scheduled";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}


export default function CareCasesPage() {
  const queryClient = useQueryClient();

  const casesQuery = useQuery({
    queryKey: ["care-cases", "farmer"],
    queryFn: careCaseApi.farmerCases,
  });

  const followUpMutation = useMutation({
    mutationFn: ({
      caseId,
      payload,
    }: {
      caseId: string;
      payload: FarmerFollowUpPayload;
    }) => careCaseApi.farmerFollowUp(
      caseId,
      payload,
    ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["care-cases", "farmer"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["diagnoses"],
        }),
      ]);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({
      caseId,
      note,
    }: {
      caseId: string;
      note?: string;
    }) => careCaseApi.farmerResolve(
      caseId,
      note,
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["care-cases", "farmer"],
      });
    },
  });

  useEffect(() => {
    if (casesQuery.data) {
      void syncCareCaseReminders(
        casesQuery.data,
      );
    }
  }, [
    casesQuery.data,
  ]);

  const cases = casesQuery.data ?? [];

  const activeCases = cases.filter(
    (item) => item.status !== "resolved",
  );

  const escalatedCases = cases.filter(
    (item) => item.status === "escalated",
  );

  const improvingCases = cases.filter(
    (item) => item.trend === "improving",
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="CROP CARE"
        title="Care cases"
        description="Keep each crop-health issue under follow-up until it improves, is reviewed by an officer when needed, and is finally resolved."
      />

      <section className="metrics care-case-metrics">
        <article>
          <HeartPulse />
          <span>Active cases</span>
          <strong>{activeCases.length}</strong>
          <small>Still being monitored</small>
        </article>

        <article>
          <ShieldAlert />
          <span>Escalated</span>
          <strong>{escalatedCases.length}</strong>
          <small>Visible to your area officer</small>
        </article>

        <article>
          <TrendingUp />
          <span>Improving</span>
          <strong>{improvingCases.length}</strong>
          <small>Latest farmer status</small>
        </article>

        <article>
          <CheckCircle2 />
          <span>Resolved</span>
          <strong>
            {cases.length - activeCases.length}
          </strong>
          <small>Closed care journeys</small>
        </article>
      </section>

      {casesQuery.isLoading && (
        <section className="panel empty">
          <div className="spinner" />
          <p>Loading crop-care cases...</p>
        </section>
      )}

      {casesQuery.isError && (
        <section className="panel empty">
          <HeartPulse size={36} />
          <h2>Care cases could not be loaded</h2>
          <p>Check your connection and try again.</p>
        </section>
      )}

      {!casesQuery.isLoading
        && !casesQuery.isError
        && cases.length === 0
        && (
          <section className="panel empty">
            <HeartPulse size={36} />
            <h2>No active crop-care cases</h2>
            <p>
              When a disease screening finds a condition that needs monitoring,
              CropGuard will create a care case automatically.
            </p>
          </section>
        )}

      <div className="care-case-list">
        {cases.map((careCase) => (
          <FarmerCareCaseCard
            key={careCase.id}
            careCase={careCase}
            followUpPending={
              followUpMutation.isPending
              && followUpMutation.variables?.caseId === careCase.id
            }
            resolvePending={
              resolveMutation.isPending
              && resolveMutation.variables?.caseId === careCase.id
            }
            onFollowUp={(payload) => {
              followUpMutation.mutate({
                caseId: careCase.id,
                payload,
              });
            }}
            onResolve={(note) => {
              resolveMutation.mutate({
                caseId: careCase.id,
                note,
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}


function FarmerCareCaseCard({
  careCase,
  followUpPending,
  resolvePending,
  onFollowUp,
  onResolve,
}: {
  careCase: CareCase;
  followUpPending: boolean;
  resolvePending: boolean;
  onFollowUp: (payload: FarmerFollowUpPayload) => void;
  onResolve: (note?: string) => void;
}) {
  const [trend, setTrend] = useState<Exclude<CareCaseTrend, "new">>("same");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const resolved = careCase.status === "resolved";
  const confidence = careCase.current_confidence == null
    ? null
    : Math.round(careCase.current_confidence * 100);

  return (
    <article className={`panel care-case-card care-case-card--${careCase.status}`}>
      <div className="care-case-head">
        <div>
          <div className="care-case-kicker">
            <span className={`care-case-status care-case-status--${careCase.status}`}>
              {careCase.status.replaceAll("_", " ")}
            </span>
            <span className={`care-case-priority care-case-priority--${careCase.priority}`}>
              {careCase.priority} priority
            </span>
          </div>

          <h2>{readableLabel(careCase.current_label)}</h2>

          <p>
            {careCase.field_name} · {careCase.farm_name} · {careCase.crop_name}
          </p>
        </div>

        <div className="care-case-confidence">
          <strong>
            {confidence == null ? "—" : `${confidence}%`}
          </strong>
          <span>latest confidence</span>
        </div>
      </div>

      <div className="care-case-follow-up-banner">
        <Clock3 size={17} />
        <div>
          <strong>
            {resolved
              ? "Case resolved"
              : "Next follow-up"}
          </strong>
          <span>
            {resolved
              ? formatDate(careCase.resolved_at)
              : formatDate(careCase.next_follow_up_at)}
          </span>
        </div>
      </div>

      <div className="care-plan-grid">
        <CarePlanSection
          title="Do now"
          items={careCase.action_plan.immediate_actions}
        />

        <CarePlanSection
          title="Monitor for"
          items={careCase.action_plan.monitor_for}
        />

        <CarePlanSection
          title="Prevention"
          items={careCase.action_plan.prevention}
        />

        <CarePlanSection
          title="Escalate if"
          items={careCase.action_plan.escalation_triggers}
          danger
        />
      </div>

      {careCase.updates.length > 0 && (
        <details className="care-case-timeline">
          <summary>
            <MessageSquareText size={16} />
            Case timeline · {careCase.updates.length} updates
          </summary>

          <div className="care-case-timeline-list">
            {[...careCase.updates]
              .reverse()
              .map((update) => (
                <div key={update.id} className="care-case-timeline-item">
                  <span />
                  <div>
                    <strong>
                      {update.actor_name
                        ?? (update.event_type === "system" ? "CropGuard" : "Care team")}
                    </strong>
                    <small>
                      {new Date(update.created_at).toLocaleString()}
                    </small>
                    {update.note && <p>{update.note}</p>}
                    {update.recommendation && (
                      <p className="care-case-recommendation">
                        {update.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </details>
      )}

      {!resolved && (
        <div className="care-case-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => setShowFollowUp((value) => !value)}
          >
            <Camera size={16} />
            Add follow-up
          </button>

          <button
            type="button"
            className="button secondary"
            disabled={resolvePending}
            onClick={() => onResolve("Farmer confirmed the crop-health issue is resolved.")}
          >
            <CheckCircle2 size={16} />
            Mark resolved
          </button>
        </div>
      )}

      {showFollowUp && !resolved && (
        <form
          className="management-form care-case-follow-up-form"
          onSubmit={(event) => {
            event.preventDefault();
            onFollowUp({
              trend,
              note,
              file,
            });
          }}
        >
          <div className="care-case-trend-picker">
            <button
              type="button"
              className={trend === "improving" ? "active" : undefined}
              onClick={() => setTrend("improving")}
            >
              <TrendingUp size={17} />
              Improving
            </button>

            <button
              type="button"
              className={trend === "same" ? "active" : undefined}
              onClick={() => setTrend("same")}
            >
              <HeartPulse size={17} />
              Same
            </button>

            <button
              type="button"
              className={trend === "worsening" ? "active danger" : "danger"}
              onClick={() => setTrend("worsening")}
            >
              <TrendingDown size={17} />
              Worse
            </button>
          </div>

          <label>
            What changed?
            <textarea
              value={note}
              maxLength={1500}
              placeholder="Example: More leaves are affected, or the spots have stopped spreading."
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <label>
            Follow-up photo (optional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="care-case-form-actions">
            <button
              type="submit"
              className="button primary"
              disabled={followUpPending}
            >
              {followUpPending ? "Updating case..." : "Save follow-up"}
            </button>

            <button
              type="button"
              className="button ghost"
              onClick={() => setShowFollowUp(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
}


function CarePlanSection({
  title,
  items,
  danger = false,
}: {
  title: string;
  items: string[];
  danger?: boolean;
}) {
  return (
    <section className={danger ? "care-plan-section care-plan-section--danger" : "care-plan-section"}>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
