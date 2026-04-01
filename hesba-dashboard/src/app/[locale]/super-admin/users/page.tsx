import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "platformUsers" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function SuperAdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  redirect(`/${locale}/super-admin/platform-users`);
}
