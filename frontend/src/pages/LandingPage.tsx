import {
  ArrowRight,
  CheckCircle2,
  CloudSun,
  Leaf,
  Microscope,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { routes } from "@/config/routes";

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="brand" to={routes.home}>
          <span className="brand-icon">
            <Leaf size={20} />
          </span>
          <div>
            <strong>CropGuard</strong>
            <small>AI</small>
          </div>
        </Link>

        <div className="landing-nav-actions">
          <Link className="button secondary" to={routes.login}>
            Sign in
          </Link>
          <Link className="button primary" to={routes.register}>
            Get started
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">AI-POWERED CROP HEALTH</span>
          <h1>See crop risk earlier. Act with confidence.</h1>
          <p>
            CropGuard brings disease screening, live weather intelligence and
            field-level alerts into one focused workspace for farmers and
            extension teams.
          </p>

          <div className="hero-actions">
            <Link className="button primary large" to={routes.register}>
              Start monitoring
              <ArrowRight size={18} />
            </Link>
            <Link className="button secondary large" to={routes.login}>
              Open dashboard
            </Link>
          </div>

          <div className="hero-trust" aria-label="Platform capabilities">
            <span>
              <CheckCircle2 size={15} />
              Tomato disease screening
            </span>
            <span>
              <CheckCircle2 size={15} />
              Live weather risk
            </span>
            <span>
              <CheckCircle2 size={15} />
              Role-based workflows
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-label="CropGuard field health preview">
          <article className="health-card">
            <div className="health-head">
              <div>
                <span className="eyebrow">FIELD HEALTH</span>
                <h2>Tomato Field A</h2>
              </div>
              <span className="status-pill">Monitoring</span>
            </div>

            <div className="health-score-wrap">
              <div className="health-score">
                <strong>84</strong>
                <span>/100</span>
              </div>
              <div className="health-ring-copy">
                <strong>Healthy operating range</strong>
                <span>
                  Weather and disease signals are being evaluated continuously.
                </span>
              </div>
            </div>

            <div className="health-metrics">
              <div>
                <CloudSun size={19} />
                <strong>Moderate</strong>
                <span>Disease pressure</span>
              </div>
              <div>
                <Microscope size={19} />
                <strong>AI ready</strong>
                <span>Leaf screening</span>
              </div>
              <div>
                <ShieldCheck size={19} />
                <strong>Protected</strong>
                <span>Alert monitoring</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-feature-strip" aria-label="CropGuard features">
        <article className="landing-feature">
          <Microscope size={21} />
          <strong>Screen crop images</strong>
          <span>
            Run trained ONNX inference for supported tomato disease patterns.
          </span>
        </article>
        <article className="landing-feature">
          <Radar size={21} />
          <strong>Understand field risk</strong>
          <span>
            Combine crop context with current conditions and a five-day forecast.
          </span>
        </article>
        <article className="landing-feature">
          <Sparkles size={21} />
          <strong>Focus the response</strong>
          <span>
            Surface meaningful alerts to farmers, officers and administrators.
          </span>
        </article>
      </section>
    </main>
  );
}
