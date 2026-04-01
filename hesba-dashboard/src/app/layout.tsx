import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { ThemeHydration } from "@/components/providers/ThemeHydration";
import type { Metadata } from "next";

// خط Cairo للعربي
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
});

// خط Inter للإنجليزي
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "زينة بيوتي سنتر | لوحة التحكم",
    template: "%s | زينة",
  },
  description: "نظام إدارة صالونات التجميل - زينة بيوتي سنتر",
  keywords: ["صالون", "تجميل", "حجوزات", "إدارة", "بيوتي سنتر"],
  icons: {
    icon: "/images/logo/logo-icon.svg",
    shortcut: "/images/logo/logo-icon.svg",
    apple: "/images/logo/logo-icon.svg",
  },
};

type Props = {
  children: React.ReactNode;
  params?: Promise<{ locale?: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  // Get locale from params or default to 'ar'
  const resolvedParams = params ? await params : {};
  const locale = resolvedParams.locale || "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${locale === "ar" ? cairo.className : inter.className} ${cairo.variable} ${inter.variable} dark:bg-gray-900 antialiased`}
      >
        <QueryProvider>
          <ThemeHydration />
          {children}
          <ToastProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
