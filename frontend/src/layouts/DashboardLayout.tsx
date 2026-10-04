import { Outlet } from "react-router-dom";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { Navbar } from "@/components/navigation/Navbar";
import { Sidebar } from "@/components/navigation/Sidebar";
export function DashboardLayout(){ return <div className="dashboard-shell"><Sidebar/><div className="dashboard-main"><Navbar/><main><Outlet/></main></div><MobileNavigation/></div>; }
