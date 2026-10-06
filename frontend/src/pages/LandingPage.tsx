import {
  ArrowRight,
  CloudSun,
  Leaf,
  Microscope,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  routes,
} from "@/config/routes";


export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link
          className="brand"
          to={routes.home}
        >
          <span className="brand-icon">
            <Leaf size={20} />
          </span>

          <div>
            <strong>
              CropGuard
            </strong>

            <small>
              AI
            </small>
          </div>
        </Link>

        <div>
          <Link
            className="button ghost"
            to={routes.login}
          >
            Sign in
          </Link>

          <Link
            className="button primary"
            to={routes.register}
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI crop intelligence, built for real field decisions
          </div>

          <h1>
            Grow with
            {" "}
            <span className="gradient-word">
              confidence.
            </span>
          </h1>

          <p>
            One calm workspace for crop-health screening,
            weather-driven disease risk, field monitoring and
            extension support — designed to surface what matters
            before small problems become expensive ones.
          </p>

          <div className="hero-actions">
            <Link
              className="button primary large"
              to={routes.register}
            >
              Start monitoring
              <ArrowRight size={18} />
            </Link>

            <Link
              className="button secondary large"
              to={routes.login}
            >
              Open dashboard
            </Link>
          </div>

          <div className="hero-trust-row">
            <span className="hero-trust-item">
              <ShieldCheck size={15} />
              Secure role-based access
            </span>

            <span className="hero-trust-item">
              <Sparkles size={15} />
              AI-assisted screening
            </span>

            <span className="hero-trust-item">
              <CloudSun size={15} />
              Live weather context
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-orb" />

          <div className="float-chip one">
            <Zap size={18} />
            <div>
              <strong>Early signal</strong>
              <span>Weather risk updated</span>
            </div>
          </div>

          <div className="float-chip two">
            <Microscope size={18} />
            <div>
              <strong>AI ready</strong>
              <span>Tomato screening</span>
            </div>
          </div>

          <article className="health-card">
            <div className="health-head">
              <div>
                <span className="eyebrow">
                  Field pulse
                </span>

                <h2>
                  Tomato Field A
                </h2>
              </div>

              <span className="status-pill">
                Monitoring
              </span>
            </div>

            <div className="health-score">
              <strong>
                84
              </strong>

              <span>
                /100
              </span>

              <div className="health-score-copy">
                <strong>
                  Looking healthy
                </strong>
                <span>
                  Low current pressure
                </span>
              </div>
            </div>

            <div className="health-metrics">
              <div>
                <CloudSun size={18} />
                <strong>
                  Low risk
                </strong>
                <span>
                  Weather pressure
                </span>
              </div>

              <div>
                <Microscope size={18} />
                <strong>
                  AI ready
                </strong>
                <span>
                  Image screening
                </span>
              </div>

              <div>
                <ShieldCheck size={18} />
                <strong>
                  Protected
                </strong>
                <span>
                  Active monitoring
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
