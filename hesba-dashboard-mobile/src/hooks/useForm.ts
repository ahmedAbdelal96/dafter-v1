import { useState, useCallback } from "react";

type Validator<T> = (value: T) => string | undefined;

type FieldConfig<T> = {
  [K in keyof T]: {
    initialValue: T[K];
    validate?: Validator<T[K]>;
  };
};

type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Lightweight form state manager — no external lib needed for simple forms.
 *
 * Supports per-field validation, touched state, and a `handleSubmit` wrapper
 * that validates all fields before calling your submit handler.
 *
 * For complex forms (dynamic fields, arrays, etc.) use react-hook-form.
 *
 * @example
 *   const { values, errors, touched, setField, handleSubmit } = useForm({
 *     email: { initialValue: '', validate: validateEmail },
 *     password: { initialValue: '', validate: (v) => v.length < 8 ? 'Too short' : undefined },
 *   });
 *
 *   <ZInput
 *     value={values.email}
 *     onChangeText={(v) => setField('email', v)}
 *     error={touched.email ? errors.email : undefined}
 *   />
 *
 *   <ZButton onPress={handleSubmit(onLogin)}>Sign in</ZButton>
 */
export function useForm<T extends Record<string, unknown>>(
  config: FieldConfig<T>,
) {
  type Keys = keyof T;

  const initialValues = Object.fromEntries(
    Object.entries(config).map(([k, v]) => [k, v.initialValue]),
  ) as T;

  const validators = Object.fromEntries(
    Object.entries(config)
      .filter(([, v]) => v.validate)
      .map(([k, v]) => [k, v.validate]),
  ) as Partial<Record<Keys, Validator<T[Keys]>>>;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<Keys, boolean>>>({});

  const setField = useCallback(
    <K extends Keys>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      // Re-validate on change if field was already touched
      setTouched((prev) => {
        if (!prev[field]) return prev;
        const validate = validators[field];
        if (validate) {
          const error = validate(value as T[Keys]);
          setErrors((e) => ({ ...e, [field]: error }));
        }
        return prev;
      });
    },
    [validators],
  );

  const touchField = useCallback(
    <K extends Keys>(field: K) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const validate = validators[field];
      if (validate) {
        const error = validate(values[field] as T[Keys]);
        setErrors((e) => ({ ...e, [field]: error }));
      }
    },
    [validators, values],
  );

  /** Run all validators. Returns true if the form is valid. */
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors<T> = {};
    let valid = true;
    for (const key of Object.keys(validators) as Keys[]) {
      const fn = validators[key];
      if (fn) {
        const error = fn(values[key] as T[Keys]);
        if (error) {
          newErrors[key] = error;
          valid = false;
        }
      }
    }
    setErrors(newErrors);
    // Mark all validated fields as touched
    setTouched(
      Object.fromEntries(
        Object.keys(validators).map((k) => [k, true]),
      ) as Partial<Record<Keys, boolean>>,
    );
    return valid;
  }, [validators, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Returns an onPress handler that:
   * 1. Validates all fields
   * 2. Calls the provided async `onValid` function only if validation passes
   */
  const handleSubmit = useCallback(
    (onValid: (values: T) => Promise<void> | void) => async () => {
      if (validate()) {
        await onValid(values);
      }
    },
    [validate, values],
  );

  return {
    values,
    errors,
    touched,
    setField,
    touchField,
    validate,
    reset,
    handleSubmit,
  };
}
