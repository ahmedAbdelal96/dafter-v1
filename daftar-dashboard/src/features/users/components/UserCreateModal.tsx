"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import {
  createStaffUserSchema,
  type CreateStaffUserFormValues,
  DEFAULT_STAFF_PERMISSIONS,
} from "../utils/user-schemas";
import { UserPermissionsFields } from "./UserPermissionsFields";

interface UserCreateModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: CreateStaffUserFormValues) => Promise<void>;
}

export function UserCreateModal({ open, loading, onClose, onSubmit }: UserCreateModalProps) {
  const t = useTranslations("users");

  const form = useForm<CreateStaffUserFormValues>({
    resolver: zodResolver(createStaffUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
      ...DEFAULT_STAFF_PERMISSIONS,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      fullName: "",
      email: "",
      password: "",
      phone: "",
      ...DEFAULT_STAFF_PERMISSIONS,
    });
  }, [open, form]);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-3xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("modal.createTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modal.createDescription")}</p>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="user-full-name">{t("form.fullName")}</Label>
          <Input id="user-full-name" {...form.register("fullName")} error={Boolean(form.formState.errors.fullName)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="user-email">{t("form.email")}</Label>
            <Input id="user-email" type="email" dir="ltr" {...form.register("email")} error={Boolean(form.formState.errors.email)} />
          </div>
          <div>
            <Label htmlFor="user-phone">{t("form.phone")}</Label>
            <Input id="user-phone" dir="ltr" {...form.register("phone")} />
          </div>
        </div>

        <div>
          <Label htmlFor="user-password">{t("form.password")}</Label>
          <Input id="user-password" type="password" dir="ltr" {...form.register("password")} error={Boolean(form.formState.errors.password)} />
          <p className="mt-1 text-xs text-gray-500">{t("form.passwordHint")}</p>
        </div>

        <UserPermissionsFields
          values={{
            manageUsers: Boolean(form.watch("manageUsers")),
            viewParties: Boolean(form.watch("viewParties")),
            manageParties: Boolean(form.watch("manageParties")),
            viewLedger: Boolean(form.watch("viewLedger")),
            manageLedger: Boolean(form.watch("manageLedger")),
            viewReports: Boolean(form.watch("viewReports")),
          }}
          onChange={(key, value) =>
            form.setValue(
              key as keyof CreateStaffUserFormValues,
              value as CreateStaffUserFormValues[keyof CreateStaffUserFormValues],
            )
          }
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="danger" onClick={onClose} disabled={loading}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t("actions.saving") : t("actions.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

