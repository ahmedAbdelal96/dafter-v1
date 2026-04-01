"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import {
  createRegisterBusinessSchema,
  getPasswordValidationState,
  type RegisterBusinessFormValues,
} from "@/lib/validation/auth";
import {
  extractBackendMessages,
  mapRegisterBackendErrors,
  type RegisterFieldName,
} from "@/lib/errors/backend-error";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthState, useAuthActions } from "@/stores";
import { useTranslations } from "next-intl";

function normalizeServerFieldMessage(message: string, fallback: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("should not exist") ||
    normalized.includes("unexpected") ||
    normalized.includes("invalid payload")
  ) {
    return fallback;
  }

  return message;
}

export default function RegisterBusinessForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const t = useTranslations("auth");
  const router = useRouter();

  const { isLoading } = useAuthState();
  const { register: registerBusiness } = useAuthActions();

  const registerSchema = useMemo(() => createRegisterBusinessSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RegisterBusinessFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      companyName: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password", "");
  const passwordValidation = getPasswordValidationState(passwordValue);

  const clearServerFeedback = (field?: RegisterFieldName) => {
    if (field) {
      clearErrors(field);
    }

    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  const onSubmit = async (data: RegisterBusinessFormValues) => {
    setFormErrors([]);

    try {
      const result = await registerBusiness({
        companyName: data.companyName.trim(),
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || undefined,
        password: data.password,
      });

      if (result.success) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const fallbackMessage =
        typeof result.error === "string" && result.error.trim().length > 0
          ? result.error
          : t("registrationError");

      const backendMessages = extractBackendMessages(result.error);
      const mapped = mapRegisterBackendErrors(
        backendMessages.length > 0 ? backendMessages : [fallbackMessage],
      );

      const mappedEntries = Object.entries(mapped.fieldErrors) as Array<
        [RegisterFieldName, string]
      >;

      for (const [field, message] of mappedEntries) {
        setError(field, {
          type: "server",
          message: normalizeServerFieldMessage(message, fallbackMessage),
        });
      }

      if (mapped.formErrors.length > 0) {
        setFormErrors(mapped.formErrors);
      } else if (mappedEntries.length === 0) {
        setFormErrors([fallbackMessage]);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setFormErrors([t("registrationError")]);
    }
  };

  const submitDisabled = isLoading || isSubmitting || !isValid;

  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto no-scrollbar lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md pt-6 sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-text-secondary transition-colors hover:text-text-primary dark:text-slate-300 dark:hover:text-white"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-7 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/84 sm:p-8">
          <div className="mb-5 sm:mb-8">
            <span className="mb-3 inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:bg-primary/12 dark:text-primary-active">
              Start your company space
            </span>
            <h1 className="mb-2 text-title-sm font-semibold tracking-tight text-text-primary dark:text-white/90 sm:text-title-md">
              {t("registerBusiness")}
            </h1>
            <p className="text-sm text-text-secondary dark:text-slate-300">
              {t("registerBusinessDescription")}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">
              <div>
                <Label>
                  {t("companyName")}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("companyNamePlaceholder")}
                  {...register("companyName", {
                    onChange: () => clearServerFeedback("companyName"),
                  })}
                  error={!!errors.companyName}
                />
                {errors.companyName && (
                  <p className="mt-1 text-sm text-error-500">{errors.companyName.message}</p>
                )}
              </div>

              <div>
                <Label>
                  {t("fullName")}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("fullNamePlaceholder")}
                  {...register("fullName", {
                    onChange: () => clearServerFeedback("fullName"),
                  })}
                  error={!!errors.fullName}
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-error-500">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Label>
                  {t("email")}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  {...register("email", {
                    onChange: () => clearServerFeedback("email"),
                  })}
                  error={!!errors.email}
                  dir="ltr"
                />
                {errors.email && <p className="mt-1 text-sm text-error-500">{errors.email.message}</p>}
              </div>

              <div>
                <Label>{t("phone")}</Label>
                <Input
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  {...register("phone", {
                    onChange: () => clearServerFeedback("phone"),
                  })}
                  error={!!errors.phone}
                  dir="ltr"
                />
                {errors.phone && <p className="mt-1 text-sm text-error-500">{errors.phone.message}</p>}
              </div>

              <div>
                <Label>
                  {t("password")}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder={t("passwordPlaceholder")}
                    type={showPassword ? "text" : "password"}
                    {...register("password", {
                      onChange: () => clearServerFeedback("password"),
                    })}
                    error={!!errors.password}
                    dir="ltr"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
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
                <div className="mt-2 space-y-1 text-xs text-text-muted dark:text-slate-400">
                  <p>{t("passwordRuleHint")}</p>
                  <p className={passwordValidation.minLength ? "text-success-600 dark:text-success-300" : undefined}>
                    {passwordValidation.minLength ? "?" : "•"} {t("passwordRuleMinLength")}
                  </p>
                  <p className={passwordValidation.hasUppercase ? "text-success-600 dark:text-success-300" : undefined}>
                    {passwordValidation.hasUppercase ? "?" : "•"} {t("passwordRuleUppercase")}
                  </p>
                  <p className={passwordValidation.hasNumber ? "text-success-600 dark:text-success-300" : undefined}>
                    {passwordValidation.hasNumber ? "?" : "•"} {t("passwordRuleNumber")}
                  </p>
                </div>
              </div>

              <div>
                <Label>
                  {t("confirmPassword")}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder={t("confirmPasswordPlaceholder")}
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword", {
                      onChange: () => clearServerFeedback("confirmPassword"),
                    })}
                    error={!!errors.confirmPassword}
                    dir="ltr"
                  />
                  <span
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              {formErrors.length > 0 && (
                <div className="rounded-2xl bg-error-50 p-3 text-sm text-error-500 dark:bg-error-500/10">
                  {formErrors.map((message, index) => (
                    <p key={`${message}-${index}`}>{message}</p>
                  ))}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-theme-sm transition hover:bg-primary-hover hover:shadow-theme-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading || isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {t("registering")}
                    </span>
                  ) : (
                    t("registerBusinessButton")
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-center text-sm font-normal text-text-secondary dark:text-slate-300 sm:text-start">
              {t("alreadyHaveAccount")}{" "}
              <Link href="/signin" className="text-text-brand hover:text-primary-hover">
                {t("signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
