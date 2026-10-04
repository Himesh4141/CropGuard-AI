import { Leaf } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { routes } from "@/config/routes";
export function AuthLayout(){ return <main className="auth-layout"><section className="auth-visual"><Link className="brand" to={routes.home}><span className="brand-icon"><Leaf size={20}/></span><div><strong>CropGuard</strong><small>AI</small></div></Link><div><span className="eyebrow">SMART AGRICULTURE</span><h1>Detect earlier.<br/>Respond smarter.</h1><p>Crop-health intelligence for farmers and agricultural extension teams.</p></div></section><section className="auth-content"><Outlet/></section></main>; }
