import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh max-h-dvh overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_45%,#e7eef7_100%)] p-3 dark:bg-[linear-gradient(180deg,#07101d_0%,#0a1422_55%,#0b1526_100%)] sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.10),transparent_18%)]" />
      <div className="relative flex h-full min-h-0 max-h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/55 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-white/8 dark:bg-white/[0.03] sm:rounded-[32px] lg:flex-row">
        {children}
        
        {/* Right Side - Branding */}
        <div className="relative hidden h-full min-h-0 w-full overflow-hidden lg:grid lg:w-1/2 lg:items-center">
          {/* Background Pattern / Gradient */}
          <div className="absolute inset-0 z-0 bg-[linear-gradient(145deg,#071425_0%,#0b2038_46%,#12376b_100%)]" />
          
          {/* Decorative Circle (Optional aesthetic touch) */}
          <div className="absolute -right-24 -top-24 z-0 h-96 w-96 rounded-full bg-blue-400/18 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 z-0 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" />
          <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)]" />

          <div className="relative z-10 flex flex-col items-center justify-center p-12">
            <Link href="/" className="mb-8 inline-flex items-center gap-3 transition-transform hover:scale-105" aria-label="dafter Logo">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-xl font-bold text-[#0b2038] shadow-lg shadow-black/10">
                D
              </span>
              <span className="font-outfit text-3xl font-semibold tracking-tight text-white">
                dafter
              </span>
            </Link>
            
            <div className="max-w-md text-center">
              <span className="mb-4 inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Multi-tenant accounting
              </span>
              <h2 className="mb-4 font-outfit text-3xl font-bold text-white">
                Built for merchants, teams, and growing companies
              </h2>
              <p className="text-lg leading-relaxed text-slate-300">
                Control invoices, receivables, expenses, installments, and financial follow-up from one structured workspace.
              </p>
              <div className="mt-8 grid gap-3 text-left">
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">
                  Clear financial signals for balances, overdue amounts, and collections
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">
                  Separate company space with role-based access and operational reports
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
