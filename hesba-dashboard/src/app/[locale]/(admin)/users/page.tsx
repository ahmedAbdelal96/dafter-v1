import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UsersPageClient } from "@/features/users/components/UsersPageClient";
import { requirePermission } from "@/lib/auth/guards";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "users" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function UsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, "users:view", `/${locale}/users`);

  return <UsersPageClient />;
}

