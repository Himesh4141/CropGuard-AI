import { useMemo, useState } from "react";
import { MapPinned, Radar, ShieldCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { adminApi } from "@/features/admin/api/adminApi";
import type { OfficerServiceAreaPayload } from "@/features/admin/types";

const HYDERABAD = {
  state: "Telangana",
  district: "Hyderabad",
  latitude: "17.3850",
  longitude: "78.4867",
  radius: "50",
};

export default function AdminLocationsPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
  const locationsQuery = useQuery({ queryKey: ["admin", "locations"], queryFn: adminApi.locations });

  const officers = useMemo(
    () => (usersQuery.data ?? []).filter((user) => user.role === "extension_officer" && user.is_active),
    [usersQuery.data],
  );

  const [officerId, setOfficerId] = useState("");
  const [state, setState] = useState(HYDERABAD.state);
  const [district, setDistrict] = useState(HYDERABAD.district);
  const [latitude, setLatitude] = useState(HYDERABAD.latitude);
  const [longitude, setLongitude] = useState(HYDERABAD.longitude);
  const [radius, setRadius] = useState(HYDERABAD.radius);
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OfficerServiceAreaPayload }) =>
      adminApi.setOfficerServiceArea(id, payload),
    onSuccess: async () => {
      setMessage("Officer service area updated.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "locations"] }),
      ]);
    },
  });

  const applyArea = () => {
    if (!officerId) {
      setMessage("Select an extension officer first.");
      return;
    }
    mutation.mutate({
      id: officerId,
      payload: {
        state: state.trim() || null,
        district: district.trim() || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        coverage_radius_km: Number(radius) || 50,
      },
    });
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="LOCATION CONTROL"
        title="Service areas"
        description="Admins have global visibility. Extension officers only see farmer data inside their assigned district or nearby coverage radius."
      />

      <section className="two-col">
        <article className="panel">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <Radar size={20} />
            <h2 style={{ margin: 0 }}>Assign officer coverage</h2>
          </div>

          <div className="management-form" style={{ display: "grid", gap: 14 }}>
            <label>
              <span>Extension officer</span>
              <select value={officerId} onChange={(event) => setOfficerId(event.target.value)}>
                <option value="">Select officer</option>
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.full_name} · {officer.email}
                  </option>
                ))}
              </select>
            </label>

            <div className="management-form-grid">
              <label><span>State</span><input value={state} onChange={(e) => setState(e.target.value)} /></label>
              <label><span>District</span><input value={district} onChange={(e) => setDistrict(e.target.value)} /></label>
              <label><span>Base latitude</span><input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></label>
              <label><span>Base longitude</span><input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></label>
              <label><span>Coverage radius (km)</span><input type="number" min="1" max="300" value={radius} onChange={(e) => setRadius(e.target.value)} /></label>
            </div>

            {message && <p style={{ margin: 0, color: "var(--muted)" }}>{message}</p>}
            {mutation.isError && <div className="error-box">Service area could not be updated.</div>}

            <button type="button" className="button primary" onClick={applyArea} disabled={mutation.isPending}>
              <MapPinned size={17} />
              {mutation.isPending ? "Saving…" : "Save service area"}
            </button>
          </div>
        </article>

        <article className="panel">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <ShieldCheck size={20} />
            <h2 style={{ margin: 0 }}>Access rule</h2>
          </div>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Farmers remain private to their own accounts. Officers receive only farms matching their assigned district/state or falling inside their geographic radius. Admin access remains global across all locations.
          </p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <MapPinned size={20} />
          <h2 style={{ margin: 0 }}>CropGuard locations</h2>
        </div>

        {locationsQuery.isLoading && <div className="empty"><div className="spinner" /><p>Loading location network…</p></div>}
        {locationsQuery.isError && <div className="empty"><p>Location data could not be loaded.</p></div>}

        <div style={{ display: "grid", gap: 12 }}>
          {(locationsQuery.data ?? []).map((location) => (
            <article
              key={`${location.country}-${location.state}-${location.district}`}
              style={{ border: "1px solid var(--border)", borderRadius: 16, padding: 16, display: "grid", gap: 10 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <strong>{location.district}</strong>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{location.state} · {location.country}</div>
                </div>
                <small style={{ color: "var(--muted)" }}>{location.assigned_officers} assigned officer(s)</small>
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "var(--muted)", fontSize: 13 }}>
                <span>{location.farmers} farmers</span>
                <span>{location.farms} farms</span>
                <span>{location.fields} fields</span>
                <span>{location.diagnoses} diagnoses</span>
                <span>{location.high_risk_fields} high-risk</span>
                <span>{location.open_care_cases} open care cases</span>
                <span>{location.escalated_care_cases} escalated</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
