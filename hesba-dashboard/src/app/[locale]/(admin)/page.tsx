import { redirect } from "next/navigation";
import { getDefaultRouteByRole, isKnownRole } from "@/config/route-access";
import { getSession } from "@/lib/auth/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminRootRedirectPage({ params }: Props) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/signin`);
  }

  const role = session.user.role;
  const destination = isKnownRole(role) ? getDefaultRouteByRole(role) : "/dashboard";

  redirect(`/${locale}${destination}`);
}
