"use client";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthState, useAuthActions } from "@/stores";
import { useTranslations } from "next-intl";

// Validation schema is intentionally strict to fail fast on malformed input.
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("auth");
  const router = useRouter();

  const { isLoading } = useAuthState();
  const { login } = useAuthActions();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const demoAccounts = [
    {
      label: "Super Admin",
      shortLabel: "Super Admin",
      email: "superadmin@daftar.com",
      password: "superadmin123",
      cardClass: "bg-slate-50 dark:bg-slate-900/30",
      titleClass: "text-slate-700 dark:text-slate-200",
    },
    {
      label: "Owner - Company 1",
      shortLabel: "Owner 1",
      email: "owner@daftar.com",
      password: "owner123",
      cardClass: "bg-blue-light-50 dark:bg-blue-light-900/20",
      titleClass: "text-blue-light-700 dark:text-blue-light-300",
    },
    {
      label: "Owner - Company 2",
      shortLabel: "Owner 2",
      email: "owner2@daftar.com",
      password: "owner123",
      cardClass: "bg-blue-light-25 dark:bg-primary/12",
      titleClass: "text-primary dark:text-primary",
    },
    {
      label: "Staff - Company 1",
      shortLabel: "Staff 1",
      email: "staff1@daftar.com",
      password: "owner123",
      cardClass: "bg-success-50 dark:bg-success-900/20",
      titleClass: "text-success-700 dark:text-success-300",
    },
  ] as const;

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      const result = await login(data.email, data.password);
      if (result.success && result.data) {
        // Client-side navigation keeps routing consistent without mutating window during render.
        router.replace("/");
        router.refresh();
        return;
      }

      setError(result.error || t("loginError"));
    } catch (err) {
      console.error("Login error:", err);
      setError(t("loginError"));
    }
  };

  const quickSignIn = async (email: string, password: string) => {
    await onSubmit({ email, password });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto w-full max-w-lg shrink-0 px-1 pt-3 sm:px-2 sm:pt-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-slate-300 dark:hover:text-white"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center px-1 sm:px-2">
        <div className="min-h-0 rounded-[24px] border border-white/70 bg-white/88 p-4 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/84 sm:p-6 lg:p-7">
          <div className="mb-4 sm:mb-5">
            <span className="mb-2 inline-flex rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary dark:bg-primary/12 dark:text-primary-active">
              Secure workspace access
            </span>
            <h1 className="mb-1 text-title-sm font-semibold tracking-tight text-text-primary dark:text-white sm:text-title-md">
              {t("welcomeBack")}
            </h1>
            <p className="text-sm text-text-secondary dark:text-slate-300">
              {t("signInDescription")}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <Label>
                  {t("email")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  placeholder={t("emailPlaceholder")}
                  type="email"
                  {...register("email")}
                  error={!!errors.email}
                  dir="ltr"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label>
                  {t("password")} <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    {...register("password")}
                    error={!!errors.password}
                    dir="ltr"
                  />
                  <span
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-error-500">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={rememberMe} onChange={setRememberMe} />
                  <span className="block text-theme-sm font-normal text-text-secondary dark:text-slate-300">
                    {t("rememberMe")}
                  </span>
                </div>
                <Link href="/reset-password" className="text-sm text-text-brand hover:text-primary-hover">
                  {t("forgotPassword")}
                </Link>
              </div>

              {error && (
                <div className="rounded-lg bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                  {error}
                </div>
              )}

              {process.env.NODE_ENV === "development" && (
                <div className="rounded-xl border border-border-light bg-surface-tertiary/70 p-3 dark:border-border-strong dark:bg-surface-tertiary/40">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted dark:text-slate-400">
                      {t("devAccounts")}
                    </p>
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/12 dark:text-primary-active">
                      {t("devOnly")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {demoAccounts.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        disabled={isLoading}
                        className={`group min-w-0 rounded-xl border border-border-light/80 px-3 py-2 text-left shadow-theme-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-theme-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-strong/70 ${account.cardClass}`}
                        onClick={() => void quickSignIn(account.email, account.password)}
                        aria-label={`${t("quickSignIn")} ${account.label}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className={`truncate text-xs font-semibold ${account.titleClass}`}>{account.shortLabel}</div>
                          <span className="shrink-0 text-[10px] font-medium text-text-muted transition-colors group-hover:text-primary dark:text-slate-400 dark:group-hover:text-primary-active">
                            {t("quickSignIn")}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-text-secondary dark:text-slate-300">
                          {account.email}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-sm transition hover:bg-primary-hover hover:shadow-theme-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t("signingIn")}
                    </span>
                  ) : (
                    t("signInButton")
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-4">
            <p className="text-center text-sm font-normal text-text-secondary dark:text-slate-300 sm:text-start">
              {t("dontHaveAccount")}{" "}
              <Link href="/signup" className="text-text-brand hover:text-primary-hover">
                {t("createBusiness")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
