import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPinned,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
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
  OfficerGuidancePayload,
} from "@/features/careCases/types";

import "@/features/careCases/careCases.css";


function readableLabel(value: string | null): string {
  if (!value) {
    return "Crop-health condition";
  }

  const withoutCrop = value.includes("___")
    ? value.split("___")[1] ?? value
    : value;

  return withoutCrop
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


export default function OfficerCareCasesPage() {
  const queryClient = useQueryClient();

  const casesQuery = useQuery({
    queryKey: ["officer", "care-cases"],
    queryFn: careCaseApi.officerCases,
  });

  const guidanceMutation = useMutation({
    mutationFn: ({
      caseId,
      payload,
    }: {
      caseId: string;
      payload: OfficerGuidancePayload;
    }) => careCaseApi.officerGuidance(caseId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["officer", "care-cases"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["officer", "summary"],
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
    }) => careCaseApi.officerResolve(caseId, note),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["officer", "care-cases"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["officer", "summary"],
        }),
      ]);
    },
  });

  const cases = casesQuery.data ?? [];
  const active = cases.filter((item) => item.status !== "resolved");
  const escalated = cases.filter((item) => item.status === "escalated");

  return (
    <div className="page">
      <PageHeader
        eyebrow="CARE QUEUE"
        title="Farmer follow-up cases"
        description="Review active crop-care journeys inside your assigned service area, add guidance, and prioritize worsening cases."
      />

      <section className="metrics care-case-metrics">
        <article>
          <ClipboardList />
          <span>Assigned-area cases</span>
          <strong>{cases.length}</strong>
          <small>Includes resolved history</small>
        </article>

        <article>
          <Clock3 />
          <span>Active monitoring</span>
          <strong>{active.length}</strong>
          <small>Need continued follow-up</small>
        </article>

        <article>
          <ShieldAlert />
          <span>Escalated</span>
          <strong>{escalated.length}</strong>
          <small>Worsening or uncertain</small>
        </article>
      </section>

      {casesQuery.isLoading && (
        <section className="panel empty">
          <div className="spinner" />
          <p>Loading care cases...</p>
        </section>
      )}

      {casesQuery.isError && (
        <section className="panel empty">
          <ClipboardList size={36} />
          <h2>Care cases could not be loaded</h2>
          <p>Verify your service area and backend connection.</p>
        </section>
      )}

      {!casesQuery.isLoading
        && !casesQuery.isError
        && cases.length === 0
        && (
          <section className="panel empty">
            <ClipboardList size={36} />
            <h2>No care cases in your area</h2>
            <p>Farmer cases will appear here when they need follow-up.</p>
          </section>
        )}

      <div className="care-case-list">
        {cases.map((careCase) => (
          <OfficerCareCaseCard
            key={careCase.id}
            careCase={careCase}
            guidancePending={
              guidanceMutation.isPending
              && guidanceMutation.variables?.caseId === careCase.id
            }
            resolvePending={
              resolveMutation.isPending
              && resolveMutation.variables?.caseId === careCase.id
            }
            onGuidance={(payload) => {
              guidanceMutation.mutate({
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


function OfficerCareCaseCard({
  careCase,
  guidancePending,
  resolvePending,
  onGuidance,
  onResolve,
}: {
  careCase: CareCase;
  guidancePending: boolean;
  resolvePending: boolean;
  onGuidance: (payload: OfficerGuidancePayload) => void;
  onResolve: (note?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [followUpHours, setFollowUpHours] = useState("24");
  const [escalate, setEscalate] = useState(careCase.status === "escalated");
  const [showGuidance, setShowGuidance] = useState(false);

  const resolved = careCase.status === "resolved";

  return (
    <article className={`panel care-case-card care-case-card--${careCase.status}`}>
      <div className="care-case-head">
        <div>
          <div className="care-case-kicker">
            <span className={`care-case-status care-case-status--${careCase.status}`}>
              {careCase.status}
            </span>
            <span className={`care-case-priority care-case-priority--${careCase.priority}`}>
              {careCase.priority} priority
            </span>
          </div>

          <h2>{readableLabel(careCase.current_label)}</h2>

          <div className="care-case-meta-line">
            <span>
              <UserRound size={14} />
              {careCase.farmer_name}
            </span>
            <span>
              <MapPinned size={14} />
              {[careCase.district, careCase.state]
                .filter(Boolean)
                .join(", ") || "Location not set"}
            </span>
          </div>

          <p>
            {careCase.field_name} · {careCase.farm_name} · {careCase.crop_name}
          </p>
        </div>

        <div className="care-case-confidence">
          <strong>
            {careCase.current_confidence == null
              ? "—"
              : `${Math.round(careCase.current_confidence * 100)}%`}
          </strong>
          <span>latest confidence</span>
        </div>
      </div>

      <div className="care-case-officer-summary">
        <div>
          <span>Latest farmer trend</span>
          <strong>{careCase.trend}</strong>
        </div>
        <div>
          <span>Next review</span>
          <strong>
            {careCase.next_follow_up_at
              ? new Date(careCase.next_follow_up_at).toLocaleString()
              : "No follow-up scheduled"}
          </strong>
        </div>
        <div>
          <span>Farmer contact</span>
          <strong>{careCase.farmer_email}</strong>
        </div>
      </div>

      {careCase.updates.length > 0 && (
        <details className="care-case-timeline">
          <summary>
            Case history · {careCase.updates.length} updates
          </summary>
          <div className="care-case-timeline-list">
            {[...careCase.updates]
              .reverse()
              .map((update) => (
                <div key={update.id} className="care-case-timeline-item">
                  <span />
                  <div>
                    <strong>{update.actor_name ?? "CropGuard"}</strong>
                    <small>{new Date(update.created_at).toLocaleString()}</small>
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
            onClick={() => setShowGuidance((value) => !value)}
          >
            Add officer guidance
          </button>

          <button
            type="button"
            className="button secondary"
            disabled={resolvePending}
            onClick={() => onResolve("Officer confirmed this crop-care case can be closed.")}
          >
            <CheckCircle2 size={16} />
            Resolve case
          </button>
        </div>
      )}

      {showGuidance && !resolved && (
        <form
          className="management-form care-case-follow-up-form"
          onSubmit={(event) => {
            event.preventDefault();

            onGuidance({
              note,
              follow_up_hours: Number(followUpHours),
              escalate,
            });
          }}
        >
          <label>
            Guidance to farmer
            <textarea
              required
              minLength={2}
              maxLength={2500}
              value={note}
              placeholder="Add practical monitoring or care guidance for this farmer."
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          <div className="care-case-form-grid">
            <label>
              Follow-up interval
              <select
                value={followUpHours}
                onChange={(event) => setFollowUpHours(event.target.value)}
              >
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">7 days</option>
              </select>
            </label>

            <label className="care-case-checkbox">
              <input
                type="checkbox"
                checked={escalate}
                onChange={(event) => setEscalate(event.target.checked)}
              />
              <span>
                Keep this case escalated for priority review
              </span>
            </label>
          </div>

          <div className="care-case-form-actions">
            <button
              type="submit"
              className="button primary"
              disabled={guidancePending || !note.trim()}
            >
              {guidancePending ? "Saving guidance..." : "Send guidance"}
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => setShowGuidance(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
