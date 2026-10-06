import {
  CloudSun,
  Leaf,
  Microscope,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
  Outlet,
} from "react-router-dom";

import {
  routes,
} from "@/config/routes";


export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-visual">
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

        <div className="auth-story">
          <span className="eyebrow">
            Crop intelligence
          </span>

          <h1>
            See the field
            {" "}
            <span>
              sooner.
            </span>
          </h1>

          <p>
            Disease screening, environmental risk and field activity
            come together in one focused workspace for faster crop-health
            decisions.
          </p>

          <div className="auth-preview">
            <div className="auth-preview-item">
              <Microscope size={18} />
              <div>
                <strong>
                  AI screening
                </strong>
                <span>
                  Tomato leaf analysis
                </span>
              </div>
            </div>

            <div className="auth-preview-item">
              <CloudSun size={18} />
              <div>
                <strong>
                  Live context
                </strong>
                <span>
                  Weather + risk
                </span>
              </div>
            </div>

            <div className="auth-preview-item">
              <ShieldCheck size={18} />
              <div>
                <strong>
                  Role-aware
                </strong>
                <span>
                  Farmer to admin
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-content">
        <Outlet />
      </section>
    </main>
  );
}
