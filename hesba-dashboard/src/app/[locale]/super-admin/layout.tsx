"use client";

import DashboardLayout from "@/layout/DashboardLayout";
import { superAdminNavigation } from "@/config/navigation-items";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout
      navigation={superAdminNavigation}
      basePathPrefix="/super-admin"
    >
      {children}
    </DashboardLayout>
  );
}
