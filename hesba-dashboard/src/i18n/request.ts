import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "ar" | "en")) {
    locale = routing.defaultLocale;
  }

  // Load namespace with fallback to English.
  const loadNamespace = async (namespace: string) => {
    try {
      const messageModule = await import(`../../messages/${locale}/${namespace}.json`);
      return messageModule.default;
    } catch {
      const fallback = await import(`../../messages/en/${namespace}.json`);
      return fallback.default;
    }
  };

  const [
    common,
    dashboard,
    platformDashboard,
    platformManagement,
    navigation,
    auth,
    settings,
    customers,
    suppliers,
    employees,
    products,
    expenses,
    invoices,
    deferredSales,
    ledger,
    installments,
    users,
    platformUsers,
    platformAudit,
    platformSettings,
    notifications,
    reports,
    payments,
    entitlements,
    profile,
    platformAnalytics,
  ] = await Promise.all([
    loadNamespace("common"),
    loadNamespace("dashboard"),
    loadNamespace("platform-dashboard"),
    loadNamespace("platform-management"),
    loadNamespace("navigation"),
    loadNamespace("auth"),
    loadNamespace("settings"),
    loadNamespace("customers"),
    loadNamespace("suppliers"),
    loadNamespace("employees"),
    loadNamespace("products"),
    loadNamespace("expenses"),
    loadNamespace("invoices"),
    loadNamespace("deferred-sales"),
    loadNamespace("ledger"),
    loadNamespace("installments"),
    loadNamespace("users"),
    loadNamespace("platform-users"),
    loadNamespace("platform-audit"),
    loadNamespace("platform-settings"),
    loadNamespace("notifications"),
    loadNamespace("reports"),
    loadNamespace("payments"),
    loadNamespace("entitlements"),
    loadNamespace("profile"),
    loadNamespace("platform-analytics"),
  ]);

  return {
    locale,
    messages: {
      common,
      dashboard,
      platformDashboard,
      platformManagement,
      navigation,
      auth,
      settings,
      customers,
      suppliers,
      employees,
      products,
      expenses,
      invoices,
      "deferred-sales": deferredSales,
      ledger,
      installments,
      users,
      platformUsers,
      platformAudit,
      platformSettings,
      notifications,
      reports,
      payments,
      entitlements,
      profile,
      platformAnalytics,
    },
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.warn("[i18n] Missing translation:", {
          key: error.message,
          locale,
        });
      } else {
        console.error("[i18n] Error:", error.message);
      }
    },
    getMessageFallback({ namespace, key, error }) {
      const path = [namespace, key].filter(Boolean).join(".");

      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        return `[${path}]`;
      }

      return `[${path}]`;
    },
  };
});
