"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import Combobox from "@/components/ui/combobox/Combobox";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useCreatePlatformFeatureFlag,
  usePlatformFeatureFlags,
  usePlatformSettings,
  useUpdatePlatformFeatureFlag,
  useUpdatePlatformSettings,
} from "@/lib/api/hooks/use-platform-settings";
import type {
  PlatformFeatureFlag,
  PlatformProrationMode,
  UpdateFeatureFlagRequest,
  UpdatePlatformSettingsRequest,
} from "@/lib/api/services/platform-settings";

type FeatureDraft = {
  enabled: boolean;
  rolloutPercentage: number;
  description: string;
};

const FEATURE_NAME_PATTERN = /^[a-z0-9._-]+$/i;

function clampPercentage(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

const PRORATION_OPTIONS: Array<{ value: PlatformProrationMode; labelKey: string }> = [
  { value: "NONE", labelKey: "proration.none" },
  { value: "IMMEDIATE", labelKey: "proration.immediate" },
  { value: "NEXT_CYCLE", labelKey: "proration.nextCycle" },
];

export function PlatformSettingsPageClient() {
  const t = useTranslations("platformSettings");
  const { showSuccess, showInfo, handleApiError } = useErrorHandler();

  const settingsQuery = usePlatformSettings(true);
  const featureFlagsQuery = usePlatformFeatureFlags(true);

  const updateSettingsMutation = useUpdatePlatformSettings();
  const createFeatureFlagMutation = useCreatePlatformFeatureFlag();
  const updateFeatureFlagMutation = useUpdatePlatformFeatureFlag();

  const [trialDurationDays, setTrialDurationDays] = useState(14);
  const [autoActivateOnSignup, setAutoActivateOnSignup] = useState(true);
  const [requireCompanyPhone, setRequireCompanyPhone] = useState(false);

  const [gracePeriodDays, setGracePeriodDays] = useState(3);
  const [allowPlanDowngrade, setAllowPlanDowngrade] = useState(true);
  const [allowPlanUpgrade, setAllowPlanUpgrade] = useState(true);
  const [enforceSingleActiveSubscription, setEnforceSingleActiveSubscription] = useState(true);
  const [prorationMode, setProrationMode] = useState<PlatformProrationMode>("NEXT_CYCLE");

  const [strictQuotaEnforcement, setStrictQuotaEnforcement] = useState(true);
  const [blockOnExpiredSubscription, setBlockOnExpiredSubscription] = useState(true);
  const [allowReadOnlyDuringGracePeriod, setAllowReadOnlyDuringGracePeriod] = useState(true);

  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagDescription, setNewFlagDescription] = useState("");
  const [newFlagEnabled, setNewFlagEnabled] = useState(false);
  const [newFlagRollout, setNewFlagRollout] = useState(100);

  const [featureDrafts, setFeatureDrafts] = useState<Record<string, FeatureDraft>>({});
  const [savingFeatureName, setSavingFeatureName] = useState<string | null>(null);

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;

    setTrialDurationDays(settings.trialDefaults.durationDays);
    setAutoActivateOnSignup(settings.trialDefaults.autoActivateOnSignup);
    setRequireCompanyPhone(settings.trialDefaults.requireCompanyPhone);

    setGracePeriodDays(settings.subscriptionPolicies.gracePeriodDays);
    setAllowPlanDowngrade(settings.subscriptionPolicies.allowPlanDowngrade);
    setAllowPlanUpgrade(settings.subscriptionPolicies.allowPlanUpgrade);
    setEnforceSingleActiveSubscription(
      settings.subscriptionPolicies.enforceSingleActiveSubscription,
    );
    setProrationMode(settings.subscriptionPolicies.prorationMode);

    setStrictQuotaEnforcement(settings.governanceGuardrails.strictQuotaEnforcement);
    setBlockOnExpiredSubscription(settings.governanceGuardrails.blockOnExpiredSubscription);
    setAllowReadOnlyDuringGracePeriod(
      settings.governanceGuardrails.allowReadOnlyDuringGracePeriod,
    );
  }, [settingsQuery.data]);

  useEffect(() => {
    const flags = featureFlagsQuery.data ?? [];
    const nextDrafts: Record<string, FeatureDraft> = {};

    for (const flag of flags) {
      nextDrafts[flag.name] = {
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage,
        description: flag.description,
      };
    }

    setFeatureDrafts(nextDrafts);
  }, [featureFlagsQuery.data]);

  const prorationOptions = useMemo(
    () =>
      PRORATION_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    [t],
  );

  const isSettingsLoading = settingsQuery.isLoading;
  const isSettingsError = settingsQuery.isError;
  const settingsErrorMessage = settingsQuery.error?.message;

  const hasFeatureFlags = (featureFlagsQuery.data?.length ?? 0) > 0;
  const hasUnsavedSettingsChanges = useMemo(() => {
    const current = settingsQuery.data;
    if (!current) return false;

    return (
      current.trialDefaults.durationDays !== trialDurationDays ||
      current.trialDefaults.autoActivateOnSignup !== autoActivateOnSignup ||
      current.trialDefaults.requireCompanyPhone !== requireCompanyPhone ||
      current.subscriptionPolicies.gracePeriodDays !== gracePeriodDays ||
      current.subscriptionPolicies.allowPlanDowngrade !== allowPlanDowngrade ||
      current.subscriptionPolicies.allowPlanUpgrade !== allowPlanUpgrade ||
      current.subscriptionPolicies.enforceSingleActiveSubscription !==
        enforceSingleActiveSubscription ||
      current.subscriptionPolicies.prorationMode !== prorationMode ||
      current.governanceGuardrails.strictQuotaEnforcement !== strictQuotaEnforcement ||
      current.governanceGuardrails.blockOnExpiredSubscription !==
        blockOnExpiredSubscription ||
      current.governanceGuardrails.allowReadOnlyDuringGracePeriod !==
        allowReadOnlyDuringGracePeriod
    );
  }, [
    settingsQuery.data,
    trialDurationDays,
    autoActivateOnSignup,
    requireCompanyPhone,
    gracePeriodDays,
    allowPlanDowngrade,
    allowPlanUpgrade,
    enforceSingleActiveSubscription,
    prorationMode,
    strictQuotaEnforcement,
    blockOnExpiredSubscription,
    allowReadOnlyDuringGracePeriod,
  ]);

  const handleSaveSettings = async () => {
    const payload: UpdatePlatformSettingsRequest = {
      trialDefaults: {
        durationDays: trialDurationDays,
        autoActivateOnSignup,
        requireCompanyPhone,
      },
      subscriptionPolicies: {
        gracePeriodDays,
        allowPlanDowngrade,
        allowPlanUpgrade,
        enforceSingleActiveSubscription,
        prorationMode,
      },
      governanceGuardrails: {
        strictQuotaEnforcement,
        blockOnExpiredSubscription,
        allowReadOnlyDuringGracePeriod,
      },
    };

    try {
      await updateSettingsMutation.mutateAsync(payload);
      showSuccess(t("messages.settingsSaved"));
    } catch (error) {
      handleApiError(error, t("messages.settingsSaveError"));
    }
  };

  const handleCreateFeatureFlag = async () => {
    if (!newFlagName.trim()) {
      showInfo(t("validation.flagNameRequired"));
      return;
    }

    if (!FEATURE_NAME_PATTERN.test(newFlagName.trim())) {
      showInfo(t("validation.flagNamePattern"));
      return;
    }

    if (!newFlagDescription.trim()) {
      showInfo(t("validation.flagDescriptionRequired"));
      return;
    }

    try {
      await createFeatureFlagMutation.mutateAsync({
        name: newFlagName.trim(),
        description: newFlagDescription.trim(),
        enabled: newFlagEnabled,
        rolloutPercentage: clampPercentage(newFlagRollout),
      });

      setNewFlagName("");
      setNewFlagDescription("");
      setNewFlagEnabled(false);
      setNewFlagRollout(100);
      showSuccess(t("messages.featureCreated"));
    } catch (error) {
      handleApiError(error, t("messages.featureCreateError"));
    }
  };

  const handleResetLocalSettings = () => {
    const settings = settingsQuery.data;
    if (!settings) return;

    setTrialDurationDays(settings.trialDefaults.durationDays);
    setAutoActivateOnSignup(settings.trialDefaults.autoActivateOnSignup);
    setRequireCompanyPhone(settings.trialDefaults.requireCompanyPhone);
    setGracePeriodDays(settings.subscriptionPolicies.gracePeriodDays);
    setAllowPlanDowngrade(settings.subscriptionPolicies.allowPlanDowngrade);
    setAllowPlanUpgrade(settings.subscriptionPolicies.allowPlanUpgrade);
    setEnforceSingleActiveSubscription(
      settings.subscriptionPolicies.enforceSingleActiveSubscription,
    );
    setProrationMode(settings.subscriptionPolicies.prorationMode);
    setStrictQuotaEnforcement(settings.governanceGuardrails.strictQuotaEnforcement);
    setBlockOnExpiredSubscription(settings.governanceGuardrails.blockOnExpiredSubscription);
    setAllowReadOnlyDuringGracePeriod(
      settings.governanceGuardrails.allowReadOnlyDuringGracePeriod,
    );
    showSuccess(t("messages.localReset"));
  };

  const handleSaveFeatureFlag = async (name: string, original?: PlatformFeatureFlag) => {
    const draft = featureDrafts[name];
    if (!draft || !original) return;

    const payload: UpdateFeatureFlagRequest = {
      enabled: draft.enabled,
      rolloutPercentage: draft.enabled ? draft.rolloutPercentage : undefined,
      description: draft.description,
    };

    try {
      setSavingFeatureName(name);
      await updateFeatureFlagMutation.mutateAsync({ name, payload });
      showSuccess(t("messages.featureUpdated", { name }));
    } catch (error) {
      handleApiError(error, t("messages.featureUpdateError"));
    } finally {
      setSavingFeatureName(null);
    }
  };

  const updateFeatureDraft = (name: string, updater: (prev: FeatureDraft) => FeatureDraft) => {
    setFeatureDrafts((prev) => {
      const current = prev[name];
      if (!current) return prev;
      return {
        ...prev,
        [name]: updater(current),
      };
    });
  };

  return (
    <QueryState
      isLoading={isSettingsLoading}
      isError={isSettingsError}
      errorMessage={settingsErrorMessage}
    >
      <div className="space-y-6">
        <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("description")}</p>
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                startIcon={<Save size={16} />}
                onClick={() => void handleSaveSettings()}
                disabled={updateSettingsMutation.isPending || !hasUnsavedSettingsChanges}
              >
                {updateSettingsMutation.isPending ? t("actions.saving") : t("actions.saveSettings")}
              </Button>
              <Button
                variant="outline"
                onClick={handleResetLocalSettings}
                disabled={!hasUnsavedSettingsChanges}
              >
                {t("actions.resetLocal")}
              </Button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("sections.trial.title")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("sections.trial.description")}</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("fields.trialDurationDays")}
              </label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={String(trialDurationDays)}
                onChange={(event) =>
                  setTrialDurationDays(Math.max(1, Number(event.target.value || 1)))
                }
              />
            </div>

            <div className="space-y-3">
              <Checkbox
                checked={autoActivateOnSignup}
                onChange={setAutoActivateOnSignup}
                label={t("fields.autoActivateOnSignup")}
              />
              <Checkbox
                checked={requireCompanyPhone}
                onChange={setRequireCompanyPhone}
                label={t("fields.requireCompanyPhone")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("sections.subscription.title")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("sections.subscription.description")}</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("fields.gracePeriodDays")}
              </label>
              <Input
                type="number"
                min={0}
                max={120}
                value={String(gracePeriodDays)}
                onChange={(event) =>
                  setGracePeriodDays(Math.max(0, Number(event.target.value || 0)))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("fields.prorationMode")}
              </label>
              <Combobox
                value={prorationMode}
                options={prorationOptions}
                searchable={false}
                placeholder={t("fields.prorationMode")}
                onChange={(value) => setProrationMode((value as PlatformProrationMode) ?? "NEXT_CYCLE")}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Checkbox
              checked={allowPlanDowngrade}
              onChange={setAllowPlanDowngrade}
              label={t("fields.allowPlanDowngrade")}
            />
            <Checkbox
              checked={allowPlanUpgrade}
              onChange={setAllowPlanUpgrade}
              label={t("fields.allowPlanUpgrade")}
            />
            <Checkbox
              checked={enforceSingleActiveSubscription}
              onChange={setEnforceSingleActiveSubscription}
              label={t("fields.enforceSingleActiveSubscription")}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("sections.governance.title")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("sections.governance.description")}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Checkbox
              checked={strictQuotaEnforcement}
              onChange={setStrictQuotaEnforcement}
              label={t("fields.strictQuotaEnforcement")}
            />
            <Checkbox
              checked={blockOnExpiredSubscription}
              onChange={setBlockOnExpiredSubscription}
              label={t("fields.blockOnExpiredSubscription")}
            />
            <Checkbox
              checked={allowReadOnlyDuringGracePeriod}
              onChange={setAllowReadOnlyDuringGracePeriod}
              label={t("fields.allowReadOnlyDuringGracePeriod")}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("sections.flags.title")}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("sections.flags.description")}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700 md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("fields.featureName")}
              </label>
              <Input
                value={newFlagName}
                onChange={(event) => setNewFlagName(event.target.value)}
                placeholder={t("placeholders.featureName")}
              />
            </div>

            <div className="md:col-span-5">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("fields.featureDescription")}
              </label>
              <Input
                value={newFlagDescription}
                onChange={(event) => setNewFlagDescription(event.target.value)}
                placeholder={t("placeholders.featureDescription")}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("fields.rolloutPercentage")}
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={String(newFlagRollout)}
                onChange={(event) =>
                  setNewFlagRollout(clampPercentage(Number(event.target.value || 0)))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("fields.enabled")}
              </label>
              <Checkbox checked={newFlagEnabled} onChange={setNewFlagEnabled} />
            </div>

            <div className="md:col-span-12">
              <Button
                variant="outline"
                startIcon={<Plus size={16} />}
                onClick={() => void handleCreateFeatureFlag()}
                disabled={createFeatureFlagMutation.isPending}
              >
                {createFeatureFlagMutation.isPending ? t("actions.creating") : t("actions.createFeature")}
              </Button>
            </div>
          </div>

          {featureFlagsQuery.isLoading ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{t("states.flagsLoading")}</p>
          ) : null}

          {featureFlagsQuery.isError ? (
            <p className="mt-4 text-sm text-error-600 dark:text-error-400">
              {featureFlagsQuery.error?.message || t("states.flagsError")}
            </p>
          ) : null}

          {!featureFlagsQuery.isLoading && !featureFlagsQuery.isError && !hasFeatureFlags ? (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{t("states.flagsEmpty")}</p>
          ) : null}

          {!featureFlagsQuery.isLoading && !featureFlagsQuery.isError && hasFeatureFlags ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2">{t("table.name")}</th>
                    <th className="px-3 py-2">{t("table.description")}</th>
                    <th className="px-3 py-2">{t("table.rollout")}</th>
                    <th className="px-3 py-2">{t("table.enabled")}</th>
                    <th className="px-3 py-2">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(featureFlagsQuery.data ?? []).map((flag) => {
                    const draft = featureDrafts[flag.name];
                    if (!draft) return null;

                    const isSavingCurrent =
                      savingFeatureName === flag.name && updateFeatureFlagMutation.isPending;

                    return (
                      <tr key={flag.name}>
                        <td className="px-3 py-3">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            {flag.name}
                          </code>
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            value={draft.description}
                            onChange={(event) =>
                              updateFeatureDraft(flag.name, (prev) => ({
                                ...prev,
                                description: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 w-40">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            disabled={!draft.enabled}
                            value={String(draft.rolloutPercentage)}
                            onChange={(event) =>
                              updateFeatureDraft(flag.name, (prev) => ({
                                ...prev,
                                rolloutPercentage: clampPercentage(
                                  Number(event.target.value || 0),
                                ),
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 w-36">
                          <Checkbox
                            checked={draft.enabled}
                            onChange={(checked) =>
                              updateFeatureDraft(flag.name, (prev) => ({
                                ...prev,
                                enabled: checked,
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 w-44">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleSaveFeatureFlag(flag.name, flag)}
                            disabled={isSavingCurrent}
                          >
                            {isSavingCurrent ? t("actions.saving") : t("actions.saveFeature")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </QueryState>
  );
}
