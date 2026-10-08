/**
 * i18n Configuration — Dafter Mobile Dashboard
 *
 * Uses i18next + react-i18next (industry standard for React Native).
 *
 * Namespaces mirror the web dashboard's i18n structure for team consistency.
 * All translation files are bundled synchronously — no async loading,
 * no flash of untranslated text, no Suspense complexity.
 *
 * Arabic is the default locale (RTL). English is the fallback.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ── Arabic translations ────────────────────────────────────────────────────
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arProfile from './locales/ar/profile.json';
import arDashboard from './locales/ar/dashboard.json';
import arCustomers from './locales/ar/customers.json';
import arSuppliers from './locales/ar/suppliers.json';
import arEmployees from './locales/ar/employees.json';
import arLedger from './locales/ar/ledger.json';
import arExpenses from './locales/ar/expenses.json';
import arProducts from './locales/ar/products.json';
import arInvoices from './locales/ar/invoices.json';
import arDeferredSales from './locales/ar/deferredSales.json';
import arInstallments from './locales/ar/installments.json';
import arReports from './locales/ar/reports.json';
import arNotifications from './locales/ar/notifications.json';
import arSettings from './locales/ar/settings.json';
import arUsers from './locales/ar/users.json';
import arSubscriptions from './locales/ar/subscriptions.json';
import arPlatform from './locales/ar/platform.json';
import arCompanySettings from './locales/ar/companySettings.json';

// ── English translations ───────────────────────────────────────────────────
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enProfile from './locales/en/profile.json';
import enDashboard from './locales/en/dashboard.json';
import enCustomers from './locales/en/customers.json';
import enSuppliers from './locales/en/suppliers.json';
import enEmployees from './locales/en/employees.json';
import enLedger from './locales/en/ledger.json';
import enExpenses from './locales/en/expenses.json';
import enProducts from './locales/en/products.json';
import enInvoices from './locales/en/invoices.json';
import enDeferredSales from './locales/en/deferredSales.json';
import enInstallments from './locales/en/installments.json';
import enReports from './locales/en/reports.json';
import enNotifications from './locales/en/notifications.json';
import enSettings from './locales/en/settings.json';
import enUsers from './locales/en/users.json';
import enSubscriptions from './locales/en/subscriptions.json';
import enPlatform from './locales/en/platform.json';
import enCompanySettings from './locales/en/companySettings.json';

// ── Namespace type ─────────────────────────────────────────────────────────
// Used with useTranslation() for type-safe namespace references.

export type I18nNamespace =
  | 'common'
  | 'auth'
  | 'profile'
  | 'dashboard'
  | 'customers'
  | 'suppliers'
  | 'employees'
  | 'ledger'
  | 'expenses'
  | 'products'
  | 'invoices'
  | 'deferredSales'
  | 'installments'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'users'
  | 'subscriptions'
  | 'platform'
  | 'companySettings';

// __DEV__ is a React Native global
declare const __DEV__: boolean;

// ── Bootstrap ──────────────────────────────────────────────────────────────

i18n.use(initReactI18next).init({
  lng: 'ar',
  fallbackLng: 'en',

  defaultNS: 'common',
  ns: [
    'common',
    'auth',
    'profile',
    'dashboard',
    'customers',
    'suppliers',
    'employees',
    'ledger',
    'expenses',
    'products',
    'invoices',
    'deferredSales',
    'installments',
    'reports',
    'notifications',
    'settings',
    'users',
    'subscriptions',
    'platform',
    'companySettings',
  ],

  resources: {
    ar: {
      common: arCommon,
      auth: arAuth,
      profile: arProfile,
      dashboard: arDashboard,
      customers: arCustomers,
      suppliers: arSuppliers,
      employees: arEmployees,
      ledger: arLedger,
      expenses: arExpenses,
      products: arProducts,
      invoices: arInvoices,
      deferredSales: arDeferredSales,
      installments: arInstallments,
      reports: arReports,
      notifications: arNotifications,
      settings: arSettings,
      users: arUsers,
      subscriptions: arSubscriptions,
      platform: arPlatform,
      companySettings: arCompanySettings,
    },
    en: {
      common: enCommon,
      auth: enAuth,
      profile: enProfile,
      dashboard: enDashboard,
      customers: enCustomers,
      suppliers: enSuppliers,
      employees: enEmployees,
      ledger: enLedger,
      expenses: enExpenses,
      products: enProducts,
      invoices: enInvoices,
      deferredSales: enDeferredSales,
      installments: enInstallments,
      reports: enReports,
      notifications: enNotifications,
      settings: enSettings,
      users: enUsers,
      subscriptions: enSubscriptions,
      platform: enPlatform,
      companySettings: enCompanySettings,
    },
  },

  interpolation: {
    // React Native handles XSS sanitization — escaping is unnecessary
    escapeValue: false,
  },

  react: {
    // Synchronous init means Suspense is not needed
    useSuspense: false,
  },
});

// Development-only missing key warnings
if (__DEV__) {
  i18n.on('missingKey', (lngs, namespace, key) => {
    console.warn(
      `[i18n] Missing translation: ${String(lngs)}/${namespace}/${key}`,
    );
  });
}

export default i18n;
