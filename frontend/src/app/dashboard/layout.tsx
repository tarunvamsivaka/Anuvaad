"use client";

import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import "./layout.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardSidebar>{children}</DashboardSidebar>
    </WorkspaceProvider>
  );
}
