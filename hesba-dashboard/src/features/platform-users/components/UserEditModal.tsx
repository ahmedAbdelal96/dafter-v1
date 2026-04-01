"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import type { CompanyUser } from "@/lib/api/types/platform";
import { updateUserSchema, type UpdateUserFormValues } from "../utils/user-schemas";

interface UserEditModalProps {
  open: boolean;
  user: CompanyUser | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: UpdateUserFormValues) => Promise<void>;
}

export function UserEditModal({ open, user, loading, onClose, onSubmit }: UserEditModalProps) {
  const t = useTranslations("platformUsers");

  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    form.reset({
      fullName: user.fullName || "",
      phone: user.phone || "",
    });
  }, [user, form]);

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-2xl p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("modal.editTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("modal.editDescription")}</p>

      {!user && loading ? (
        <div className="py-8 text-sm text-gray-500">{t("actions.loading")}</div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="edit-platform-user-full-name">{t("form.fullName")}</Label>
            <Input id="edit-platform-user-full-name" {...form.register("fullName")} error={Boolean(form.formState.errors.fullName)} />
          </div>

          <div>
            <Label htmlFor="edit-platform-user-phone">{t("form.phone")}</Label>
            <Input id="edit-platform-user-phone" dir="ltr" {...form.register("phone")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="danger" onClick={onClose} disabled={loading}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("actions.saving") : t("actions.save")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
