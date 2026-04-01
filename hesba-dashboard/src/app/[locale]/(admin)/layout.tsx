"use client";

import DashboardLayout from "@/layout/DashboardLayout";
import { adminNavigation } from "@/config/navigation-items";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout 
      navigation={adminNavigation}
      basePathPrefix=""
    >
      {children}
    </DashboardLayout>
  );
}
