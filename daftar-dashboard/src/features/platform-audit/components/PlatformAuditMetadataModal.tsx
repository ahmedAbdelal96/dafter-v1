"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import type { PlatformAuditLogRecord } from "@/lib/api/services/platform-audit";

interface PlatformAuditMetadataModalProps {
  open: boolean;
  log: PlatformAuditLogRecord | null;
  onClose: () => void;
}

function stringifyMetadata(metadata: Record<string, unknown>) {
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "{}";
  }
}

export function PlatformAuditMetadataModal({
  open,
  log,
  onClose,
}: PlatformAuditMetadataModalProps) {
  const t = useTranslations("platformAudit.metadataModal");

  const payloadText = useMemo(
    () => stringifyMetadata(log?.metadata ?? {}),
    [log?.metadata],
  );

  return (
    <Modal isOpen={open} onClose={onClose} className="mx-4 max-w-3xl p-6 sm:mx-auto">
      <div className="space-y-4 pe-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
            {t("eyebrow")}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h3>
          {log ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {t("description", {
                action: log.action,
                entityType: log.entityType,
              })}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-950">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-gray-800 dark:text-gray-100">
            {payloadText}
          </pre>
        </div>

        <div className="flex justify-end">
          <Button variant="danger" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

