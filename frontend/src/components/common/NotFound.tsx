import { Link } from "react-router-dom";
import { routes } from "@/config/routes";
export function NotFound() { return <main className="center-screen"><div className="panel"><span className="eyebrow">404</span><h1>Page not found</h1><Link className="button primary" to={routes.home}>Return home</Link></div></main>; }
