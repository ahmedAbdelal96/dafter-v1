"use client";

import { useSidebar } from "@/stores";
import AppHeader from "@/layout/AppHeader";
import DynamicSidebar from "@/layout/DynamicSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { useLocale } from "next-intl";
import {
  filterNavigationByFeatures,
  filterNavigationByRole,
  NavigationConfig,
} from "@/config/navigation-items";
import { useAuth } from "@/lib/auth/context";
import { useMyEntitlements } from "@/lib/api/hooks/use-entitlements";
import type { UserRole } from "@/lib/auth/permission-evaluator";

function countNavigationItems(navigation: NavigationConfig): number {
  return (["main", "accounting", "settings"] as const).reduce((total, section) => {
    return total + navigation[section].reduce((sectionTotal, item) => {
      return sectionTotal + (item.subItems?.length ?? 1);
    }, 0);
  }, 0);
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navigation: NavigationConfig;
  basePathPrefix?: string; // e.g., "/super-admin" or ""
}

type AccessNoteVariant = "role" | "plan" | "mixed";

/**
 * Shared Dashboard Layout
 * Layout مشترك يستخدمه كل من Admin و Super Admin
 * 
 * @param navigation - محتوى القوائم الجانبية
 * @param basePathPrefix - البادئة للمسارات (مثلاً "/super-admin")
 */
export default function DashboardLayout({
  children,
  navigation,
  basePathPrefix = "",
}: DashboardLayoutProps) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { user, tenant } = useAuth();
  const userRole = (user?.role ?? null) as UserRole | null;
  const staffPermissions = user?.permissions ?? null;
  const shouldLoadEntitlements = Boolean(tenant?.id && user?.role !== "SUPER_ADMIN");
  const entitlementsQuery = useMyEntitlements(shouldLoadEntitlements);
  const roleFilteredNavigation = React.useMemo(
    () => filterNavigationByRole(navigation, userRole, staffPermissions),
    [navigation, userRole, staffPermissions],
  );
  const navigationWithEntitlements = React.useMemo(
    () => {
      return shouldLoadEntitlements
        ? filterNavigationByFeatures(roleFilteredNavigation, entitlementsQuery.data?.features)
        : roleFilteredNavigation;
    },
    [entitlementsQuery.data?.features, roleFilteredNavigation, shouldLoadEntitlements],
  );
  const showNavigationAccessNote = React.useMemo(() => {
    if (!userRole || userRole === "SUPER_ADMIN") {
      return false;
    }
    return countNavigationItems(navigationWithEntitlements) < countNavigationItems(navigation);
  }, [navigation, navigationWithEntitlements, userRole]);
  const accessNoteVariant = React.useMemo<AccessNoteVariant | null>(() => {
    if (!showNavigationAccessNote) {
      return null;
    }

    const roleRestricted =
      countNavigationItems(roleFilteredNavigation) < countNavigationItems(navigation);
    const planRestricted =
      shouldLoadEntitlements &&
      countNavigationItems(navigationWithEntitlements) < countNavigationItems(roleFilteredNavigation);

    if (roleRestricted && planRestricted) {
      return "mixed";
    }

    if (planRestricted) {
      return "plan";
    }

    return "role";
  }, [navigation, navigationWithEntitlements, roleFilteredNavigation, shouldLoadEntitlements, showNavigationAccessNote]);

  // Dynamic class for main content margin based on sidebar state
  // RTL: use margin-right (mr), LTR: use margin-left (ml)
  const mainContentMargin = isMobileOpen
    ? "mx-0"
    : isExpanded || isHovered
    ? isRTL
      ? "lg:mr-[290px]"
      : "lg:ml-[290px]"
    : isRTL
    ? "lg:mr-[90px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <DynamicSidebar 
        navigation={navigationWithEntitlements}
        basePathPrefix={basePathPrefix}
        showAccessNote={showNavigationAccessNote}
        accessNoteVariant={accessNoteVariant}
      />
      <Backdrop />
      
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        
        {/* Page Content */}
        <div className="mx-auto max-w-(--breakpoint-2xl) px-4 pb-8 pt-5 md:px-6 md:pb-10 md:pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
