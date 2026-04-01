/**
 * Navigation items based on role
 */

import { Icons } from "@/config/navigation";
import React from "react";
import {
  hasPermissionFromBackend,
  type StaffPermissionsMap,
  type UserRole,
} from "@/lib/auth/permission-evaluator";

export type NavItem = {
  key: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { key: string; path: string; pro?: boolean; new?: boolean }[];
};

export type NavigationConfig = {
  main: NavItem[];
  accounting: NavItem[];
  settings: NavItem[];
};

type NavigationSection = keyof NavigationConfig;

const NAV_FEATURE_REQUIREMENTS: Partial<
  Record<NavigationSection, Partial<Record<string, string>>>
> = {
  main: {
    dashboard: "module.dashboard.read",
    customers: "module.customers.read",
    suppliers: "module.suppliers.read",
    employees: "module.employees.read",
    products: "module.products.read",
  },
  accounting: {
    invoices: "module.invoices.read",
    deferredSales: "module.deferred_sales.read",
    installments: "module.installments.read",
    expenses: "module.expenses.read",
    ledger: "module.ledger.read",
    reports: "module.reports.read",
    payments: "module.ledger.read",
    // Payroll stays tied to employees access.
    payroll: "module.employees.read",
  },
};

const NAV_PERMISSION_REQUIREMENTS: Partial<
  Record<NavigationSection, Partial<Record<string, string>>>
> = {
  main: {
    dashboard: "invoices:view",
    customers: "customers:view",
    suppliers: "suppliers:view",
    employees: "employees:view",
    products: "products:view",
  },
  accounting: {
    invoices: "invoices:view",
    deferredSales: "deferredSales:view",
    installments: "installments:view",
    expenses: "expenses:view",
    ledger: "ledger:view",
    reports: "reports:view",
    payments: "ledger:create",
    payroll: "ledger:view",
  },
  settings: {
    users: "users:view",
    notifications: "notifications:view",
    subscription: "users:view",
    profile: "users:view",
  },
};

export const adminNavigation: NavigationConfig = {
  main: [
    { key: "dashboard", icon: <Icons.Dashboard />, path: "/dashboard" },
    { key: "customers", icon: <Icons.Users />, path: "/customers" },
    { key: "suppliers", icon: <Icons.Building />, path: "/suppliers" },
    { key: "employees", icon: <Icons.Staff />, path: "/employees" },
    { key: "products", icon: <Icons.Services />, path: "/products" },
  ],
  accounting: [
    {
      key: "sales",
      icon: <Icons.Money />,
      subItems: [
        { key: "invoices", path: "/invoices" },
        { key: "deferredSales", path: "/deferred-sales" },
        { key: "installments", path: "/installments" },
      ],
    },
    {
      key: "finance",
      icon: <Icons.Reports />,
      subItems: [
        { key: "expenses", path: "/expenses" },
        { key: "payments", path: "/payments" },
        { key: "ledger", path: "/ledger" },
        { key: "payroll", path: "/employees/payroll" },
        { key: "reports", path: "/reports" },
      ],
    },
  ],
  settings: [
    { key: "users", icon: <Icons.Users />, path: "/users" },
    { key: "notifications", icon: <Icons.Bell />, path: "/notifications" },
    { key: "subscription", icon: <Icons.CreditCard />, path: "/settings/subscription" },
    { key: "profile", icon: <Icons.Settings />, path: "/settings/profile" },
  ],
};

export const superAdminNavigation: NavigationConfig = {
  main: [
    { key: "dashboard", icon: <Icons.Dashboard />, path: "/dashboard" },
    { key: "tenants", icon: <Icons.Building />, path: "/tenants" },
    { key: "subscriptions", icon: <Icons.CreditCard />, path: "/subscriptions" },
    { key: "plans", icon: <Icons.Services />, path: "/plans" },
    { key: "platformUsers", icon: <Icons.Users />, path: "/platform-users" },
    { key: "auditLogs", icon: <Icons.Reports />, path: "/audit-logs" },
  ],
  accounting: [],
  settings: [{ key: "platformSettings", icon: <Icons.Gear />, path: "/settings" }],
};

export function getNavigationByRole(
  role: "OWNER" | "STAFF" | "SUPER_ADMIN"
): NavigationConfig {
  switch (role) {
    case "SUPER_ADMIN":
      return superAdminNavigation;
    case "OWNER":
    case "STAFF":
    default:
      return adminNavigation;
  }
}

function hasFeature(
  features: Set<string>,
  section: NavigationSection,
  key: string,
): boolean {
  const requiredFeature = NAV_FEATURE_REQUIREMENTS[section]?.[key];
  if (!requiredFeature) {
    return true;
  }
  return features.has(requiredFeature);
}

function hasPermission(
  role: UserRole,
  staffPermissions: StaffPermissionsMap | null | undefined,
  section: NavigationSection,
  key: string,
): boolean {
  const requiredPermission = NAV_PERMISSION_REQUIREMENTS[section]?.[key];
  if (!requiredPermission) {
    return true;
  }
  return hasPermissionFromBackend(role, staffPermissions, requiredPermission);
}

export function filterNavigationByFeatures(
  navigation: NavigationConfig,
  features: string[] | null | undefined,
): NavigationConfig {
  if (!features || features.length === 0) {
    return navigation;
  }

  const featureSet = new Set(features);

  const filterSection = (section: NavigationSection): NavItem[] =>
    navigation[section]
      .map((item) => {
        if (item.subItems?.length) {
          const filteredSubItems = item.subItems.filter((subItem) =>
            hasFeature(featureSet, section, subItem.key),
          );

          return filteredSubItems.length > 0
            ? { ...item, subItems: filteredSubItems }
            : null;
        }

        return hasFeature(featureSet, section, item.key) ? item : null;
      })
      .filter((item): item is NavItem => Boolean(item));

  return {
    main: filterSection("main"),
    accounting: filterSection("accounting"),
    settings: filterSection("settings"),
  };
}

export function filterNavigationByRole(
  navigation: NavigationConfig,
  role: UserRole | null | undefined,
  staffPermissions?: StaffPermissionsMap | null,
): NavigationConfig {
  if (!role || role === "SUPER_ADMIN") {
    return navigation;
  }

  const filterSection = (section: NavigationSection): NavItem[] =>
    navigation[section]
      .map((item) => {
        if (item.subItems?.length) {
          const filteredSubItems = item.subItems.filter((subItem) =>
            hasPermission(role, staffPermissions, section, subItem.key),
          );

          return filteredSubItems.length > 0
            ? { ...item, subItems: filteredSubItems }
            : null;
        }

        return hasPermission(role, staffPermissions, section, item.key) ? item : null;
      })
      .filter((item): item is NavItem => Boolean(item));

  return {
    main: filterSection("main"),
    accounting: filterSection("accounting"),
    settings: filterSection("settings"),
  };
}
