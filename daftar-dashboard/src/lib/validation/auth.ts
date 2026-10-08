import { z } from "zod";

const PHONE_REGEX = /^[+]?[0-9]{8,20}$/;
const PASSWORD_STRONG_REGEX = /^(?=.*[A-Z])(?=.*\d).+$/;

type Translator = (key: string) => string;

/**
 * Shared signup schema aligned with backend validation contract.
 * This schema is intentionally strict to reduce avoidable backend 400 responses.
 */
export function createRegisterBusinessSchema(t: Translator) {
  return z
    .object({
      companyName: z
        .string()
        .trim()
        .min(2, t("companyNameTooShort"))
        .max(200, t("companyNameTooLong")),
      fullName: z
        .string()
        .trim()
        .min(2, t("fullNameTooShort"))
        .max(100, t("fullNameTooLong")),
      email: z.string().trim().email(t("invalidEmail")),
      phone: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || PHONE_REGEX.test(value), t("phoneInvalid")),
      password: z
        .string()
        .min(8, t("passwordTooShort"))
        .max(50, t("passwordTooLong"))
        .regex(PASSWORD_STRONG_REGEX, t("passwordWeak")),
      confirmPassword: z.string().min(1, t("confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordsDoNotMatch"),
    });
}

export type RegisterBusinessFormValues = z.infer<
  ReturnType<typeof createRegisterBusinessSchema>
>;

export function getPasswordValidationState(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

