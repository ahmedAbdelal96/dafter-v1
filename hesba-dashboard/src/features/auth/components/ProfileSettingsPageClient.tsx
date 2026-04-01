"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCurrentUser, useUpdateProfile, useChangePassword } from "@/lib/api/hooks/use-auth";
import { QueryState } from "@/components/common/QueryState";
import type { ChangePasswordRequest } from "@/lib/api/types";

export function ProfileSettingsPageClient() {
  const t = useTranslations("profile");

  const userQuery = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const user = userQuery.data;

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sync form with loaded user
  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim());
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(false);
    setProfileError(null);
    try {
      await updateProfile.mutateAsync({ fullName: fullName.trim() || undefined, phone: phone.trim() || undefined });
      setProfileSuccess(true);
    } catch {
      setProfileError(t("messages.errorUpdate"));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError(t("messages.passwordMismatch"));
      return;
    }
    try {
      const payload: ChangePasswordRequest = { currentPassword, newPassword };
      await changePassword.mutateAsync(payload);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError(t("messages.errorPasswordChange"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("page.title")}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("page.subtitle")}</p>
      </section>

      <QueryState
        isLoading={userQuery.isLoading}
        isError={userQuery.isError}
        errorMessage={userQuery.error?.message}
      >
        {user && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Account info (read-only) */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t("page.accountSection")}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("page.email")}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("page.role")}</span>
                  <span className="inline-flex items-center rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                    {user.role}
                  </span>
                </div>
                {user.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t("page.phone")}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{user.phone}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Edit profile form */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t("page.editSection")}
              </h2>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("page.fullName")}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder={t("page.fullNamePlaceholder")}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("page.phone")}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder={t("page.phonePlaceholder")}
                  />
                </div>

                {profileSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400">{t("messages.successUpdate")}</p>
                )}
                {profileError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
                )}

                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {updateProfile.isPending ? t("page.saving") : t("page.saveProfile")}
                </button>
              </form>
            </section>

            {/* Change password — full width */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {t("page.passwordSection")}
              </h2>
              <form onSubmit={handlePasswordChange} className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("page.currentPassword")}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("page.newPassword")}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("page.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  {passwordSuccess && (
                    <p className="mb-2 text-sm text-green-600 dark:text-green-400">{t("messages.successPasswordChange")}</p>
                  )}
                  {passwordError && (
                    <p className="mb-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={changePassword.isPending}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {changePassword.isPending ? t("page.saving") : t("page.changePassword")}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </QueryState>
    </div>
  );
}
