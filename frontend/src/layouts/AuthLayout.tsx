import {
  CloudSun,
  Leaf,
  Microscope,
  ShieldCheck,
} from "lucide-react";
import { Link, Outlet } from "react-router-dom";

import { routes } from "@/config/routes";

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <Link className="brand" to={routes.home}>
          <span className="brand-icon">
            <Leaf size={20} />
          </span>
          <div>
            <strong>CropGuard</strong>
            <small>AI</small>
          </div>
        </Link>

        <div className="auth-visual-copy">
          <span className="eyebrow">SMART AGRICULTURE</span>
          <h1>
            Detect earlier.
            <br />
            Respond smarter.
          </h1>
          <p>
            Crop-health intelligence for farmers and agricultural extension
            teams, connected through one secure platform.
          </p>

          <div className="auth-benefits">
            <span>
              <Microscope size={16} />
              AI-assisted tomato disease screening
            </span>
            <span>
              <CloudSun size={16} />
              Live weather and five-day field outlook
            </span>
            <span>
              <ShieldCheck size={16} />
              Secure role-based monitoring workflows
            </span>
          </div>
        </div>
      </section>

      <section className="auth-content">
        <Outlet />
      </section>
    </main>
  );
}
