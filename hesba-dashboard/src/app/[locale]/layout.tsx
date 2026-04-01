import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { setRequestLocale, getMessages } from "next-intl/server";
import { AuthProvider } from "@/lib/auth";
import { getUserData } from "@/lib/auth/server";
import type { UserRole } from "@/lib/auth/permission-evaluator";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  const messages = await getMessages();

  // Get user data for AuthProvider (server-side)
  const userData = await getUserData();
  const normalizeRole = (role?: string | null): UserRole => {
    if (role === "OWNER" || role === "STAFF" || role === "SUPER_ADMIN") {
      return role;
    }
    return "STAFF";
  };

  // Determine direction based on locale
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div dir={dir} className={locale === "ar" ? "font-arabic" : ""}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthProvider
          initialUser={userData ? {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: normalizeRole(userData.role),
            avatar: userData.avatar,
            permissions: userData.permissions ?? null,
          } : null}
          initialTenant={userData?.tenant || null}
        >
          {children}
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  );
}
