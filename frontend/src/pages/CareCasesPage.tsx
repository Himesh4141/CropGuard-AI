import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { localizeCondition } from "@/i18n/diagnosis";
import { screenText as tr, hasScreenTranslation } from "@/i18n/screenText";
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
  const lang = useCropGuardLanguage();
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
        eyebrow={tr("CROP CARE", lang)}
        title={tr("Care cases", lang)}
        description={tr("Keep each crop-health issue under follow-up until it improves, is reviewed by an officer when needed, and is finally resolved.", lang)}
      />

      <section className="metrics care-case-metrics">
        <article>
          <HeartPulse />
          <span>{tr("Active cases", lang)}</span>
          <strong>{activeCases.length}</strong>
          <small>{tr("Still being monitored", lang)}</small>
        </article>

        <article>
          <ShieldAlert />
          <span>{tr("Escalated", lang)}</span>
          <strong>{escalatedCases.length}</strong>
          <small>{tr("Visible to your area officer", lang)}</small>
        </article>

        <article>
          <TrendingUp />
          <span>{tr("Improving", lang)}</span>
          <strong>{improvingCases.length}</strong>
          <small>{tr("Latest farmer status", lang)}</small>
        </article>

        <article>
          <CheckCircle2 />
          <span>{tr("Resolved", lang)}</span>
          <strong>
            {cases.length - activeCases.length}
          </strong>
          <small>{tr("Closed care journeys", lang)}</small>
        </article>
      </section>

      {casesQuery.isLoading && (
        <section className="panel empty">
          <div className="spinner" />
          <p>{tr("Loading crop-care cases...", lang)}</p>
        </section>
      )}

      {casesQuery.isError && (
        <section className="panel empty">
          <HeartPulse size={36} />
          <h2>{tr("Care cases could not be loaded", lang)}</h2>
          <p>{tr("Check your connection and try again.", lang)}</p>
        </section>
      )}

      {!casesQuery.isLoading
        && !casesQuery.isError
        && cases.length === 0
        && (
          <section className="panel empty">
            <HeartPulse size={36} />
            <h2>{tr("No active crop-care cases", lang)}</h2>
            <p>
              {tr("When a disease screening finds a condition that needs monitoring, CropGuard will create a care case automatically.", lang)}
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
  const lang = useCropGuardLanguage();
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
              {tr(careCase.status, lang)}
            </span>
            {!resolved && <span className={`care-case-priority care-case-priority--${careCase.priority}`}>
              {tr(careCase.priority, lang)} {tr("priority", lang)}
            </span>}
          </div>

          <h2>{careCase.current_label ? localizeCondition(careCase.current_label, lang).value : tr("Crop-health condition", lang)}</h2>

          <p>
            {careCase.field_name} · {careCase.farm_name} · {careCase.crop_name}
          </p>
        </div>

        <div className="care-case-confidence">
          <strong>
            {confidence == null ? "—" : `${confidence}%`}
          </strong>
          <span>{tr("latest confidence", lang)}</span>
        </div>
      </div>

      <div className="care-case-follow-up-banner">
        <Clock3 size={17} />
        <div>
          <strong>
            {resolved
              ? tr("Case resolved", lang)
              : tr("Next follow-up", lang)}
          </strong>
          <span>
            {resolved
              ? tr(formatDate(careCase.resolved_at), lang)
              : tr(formatDate(careCase.next_follow_up_at), lang)}
          </span>
        </div>
      </div>

      <div className="care-plan-grid">
        <CarePlanSection
          title={tr("Do now", lang)}
          items={careCase.action_plan.immediate_actions}
        />

        <CarePlanSection
          title={tr("Monitor for", lang)}
          items={careCase.action_plan.monitor_for}
        />

        <CarePlanSection
          title={tr("Prevention", lang)}
          items={careCase.action_plan.prevention}
        />

        <CarePlanSection
          title={tr("Escalate if", lang)}
          items={careCase.action_plan.escalation_triggers}
          danger
        />
      </div>

      {careCase.updates.length > 0 && (
        <details className="care-case-timeline">
          <summary>
            <MessageSquareText size={16} />
            {tr("Case timeline", lang)} · {careCase.updates.length} {tr("updates", lang)}
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
                        ?? (update.event_type === "system" ? "CropGuard" : tr("Care team", lang))}
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
            {tr("Add follow-up", lang)}
          </button>

          <button
            type="button"
            className="button secondary"
            disabled={resolvePending}
            onClick={() => onResolve("Farmer confirmed the crop-health issue is resolved.")}
          >
            <CheckCircle2 size={16} />
            {tr("Mark resolved", lang)}
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
              {tr("Improving", lang)}
            </button>

            <button
              type="button"
              className={trend === "same" ? "active" : undefined}
              onClick={() => setTrend("same")}
            >
              <HeartPulse size={17} />
              {tr("Same", lang)}
            </button>

            <button
              type="button"
              className={trend === "worsening" ? "active danger" : "danger"}
              onClick={() => setTrend("worsening")}
            >
              <TrendingDown size={17} />
              {tr("Worse", lang)}
            </button>
          </div>

          <label>
            {tr("What changed?", lang)}
            <textarea
              value={note}
              maxLength={1500}
              placeholder={tr("Example: More leaves are affected, or the spots have stopped spreading.", lang)}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <label>
            {tr("Follow-up photo (optional)", lang)}
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
              {followUpPending ? tr("Updating case...", lang) : tr("Save follow-up", lang)}
            </button>

            <button
              type="button"
              className="button ghost"
              onClick={() => setShowFollowUp(false)}
            >
              {tr("Cancel", lang)}
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
  const lang = useCropGuardLanguage();
  const hasUntranslated = lang !== "en" && items.some(item => !hasScreenTranslation(item, lang));
  return (
    <section className={danger ? "care-plan-section care-plan-section--danger" : "care-plan-section"}>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{tr(item, lang)}</li>
        ))}
      </ul>
      {hasUntranslated && <small role="note">{tr("English advisory — translation not reviewed", lang)}</small>}
    </section>
  );
}
