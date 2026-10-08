/**
 * validators.ts — Pure input validation helpers
 *
 * All functions return an error message string on failure, or `undefined` on
 * success. This matches the signature expected by `useForm`'s `validate` option
 * as well as most form libraries (react-hook-form validate, Formik, etc.).
 *
 * @example
 *   const { values, errors } = useForm({
 *     email: { initialValue: '', validate: validateEmail },
 *     phone: { initialValue: '', validate: validatePhone },
 *   });
 */

// ─── Email ────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "البريد الإلكتروني مطلوب";
  if (!EMAIL_RE.test(value.trim())) return "صيغة البريد الإلكتروني غير صحيحة";
  return undefined;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export function validatePassword(value: string): string | undefined {
  if (!value) return "كلمة المرور مطلوبة";
  if (value.length < 8) return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
  return undefined;
}

export function validatePasswordConfirm(
  value: string,
  original: string,
): string | undefined {
  if (!value) return "تأكيد كلمة المرور مطلوب";
  if (value !== original) return "كلمتا المرور غير متطابقتين";
  return undefined;
}

// ─── Phone ────────────────────────────────────────────────────────────────────

// Accepts Egyptian / Saudi / general formats — adjust regex as needed
const PHONE_RE = /^[+\d\s\-()]{7,20}$/;

export function validatePhone(value: string): string | undefined {
  if (!value.trim()) return "رقم الهاتف مطلوب";
  if (!PHONE_RE.test(value.trim())) return "رقم الهاتف غير صحيح";
  return undefined;
}

// ─── Required ─────────────────────────────────────────────────────────────────

export function validateRequired(
  value: string | null | undefined,
  fieldName = "هذا الحقل",
): string | undefined {
  if (!value || !String(value).trim()) return `${fieldName} مطلوب`;
  return undefined;
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

export function validatePositiveNumber(value: string): string | undefined {
  const n = parseFloat(value);
  if (isNaN(n)) return "يجب إدخال رقم صحيح";
  if (n <= 0) return "يجب أن يكون الرقم أكبر من صفر";
  return undefined;
}

export function validateNonNegativeNumber(value: string): string | undefined {
  const n = parseFloat(value);
  if (isNaN(n)) return "يجب إدخال رقم صحيح";
  if (n < 0) return "لا يمكن أن يكون الرقم سالباً";
  return undefined;
}

// ─── Date ─────────────────────────────────────────────────────────────────────

export function validateDate(value: string): string | undefined {
  if (!value) return "التاريخ مطلوب";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "صيغة التاريخ غير صحيحة";
  return undefined;
}

export function validateFutureDate(value: string): string | undefined {
  const base = validateDate(value);
  if (base) return base;
  if (new Date(value) <= new Date()) return "يجب أن يكون التاريخ في المستقبل";
  return undefined;
}

// ─── Text length ──────────────────────────────────────────────────────────────

export function validateMinLength(
  value: string,
  min: number,
): string | undefined {
  if (value.trim().length < min) return `يجب ألا يقل عن ${min} أحرف`;
  return undefined;
}

export function validateMaxLength(
  value: string,
  max: number,
): string | undefined {
  if (value.trim().length > max) return `يجب ألا يزيد عن ${max} حرفاً`;
  return undefined;
}
