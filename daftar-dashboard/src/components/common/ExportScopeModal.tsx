"use client";

import { useMemo, useState } from "react";
import DatePicker from "@/components/form/date-picker";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";

export interface ExportScope {
  dateFrom?: string;
  dateTo?: string;
  maxRecords?: number;
}

interface ExportScopeModalLabels {
  title: string;
  description: string;
  fromDate?: string;
  toDate?: string;
  maxRecords: string;
  maxRecordsHint: string;
  reset: string;
  cancel: string;
  confirm: string;
}

interface ExportScopeModalProps {
  open: boolean;
  loading?: boolean;
  showDateRange?: boolean;
  labels: ExportScopeModalLabels;
  initialScope?: ExportScope;
  onClose: () => void;
  onConfirm: (scope: ExportScope) => void;
}

export function ExportScopeModal({
  open,
  loading = false,
  showDateRange = true,
  labels,
  initialScope,
  onClose,
  onConfirm,
}: ExportScopeModalProps) {
  // Keep local draft overrides only. When undefined, we read from initialScope.
  // This avoids setState-in-effect and still resets correctly on close/reset.
  const [dateFromDraft, setDateFromDraft] = useState<string | undefined>(undefined);
  const [dateToDraft, setDateToDraft] = useState<string | undefined>(undefined);
  const [maxRecordsDraft, setMaxRecordsDraft] = useState<string | undefined>(undefined);

  const dateFrom = dateFromDraft ?? initialScope?.dateFrom ?? "";
  const dateTo = dateToDraft ?? initialScope?.dateTo ?? "";
  const maxRecords =
    maxRecordsDraft ?? (initialScope?.maxRecords ? String(initialScope.maxRecords) : "");

  const maxRecordsError = useMemo(() => {
    if (!maxRecords) return "";
    const parsed = Number(maxRecords);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return labels.maxRecordsHint;
    }
    return "";
  }, [labels.maxRecordsHint, maxRecords]);

  const dateRangeError = useMemo(() => {
    if (!showDateRange) return "";
    if (!dateFrom || !dateTo) return "";
    if (dateFrom <= dateTo) return "";
    return `${labels.fromDate ?? "from"} <= ${labels.toDate ?? "to"}`;
  }, [dateFrom, dateTo, labels.fromDate, labels.toDate, showDateRange]);

  const canSubmit = !maxRecordsError && !dateRangeError;

  const handleConfirm = () => {
    if (!canSubmit) return;

    const parsedMax = Number(maxRecords);
    onConfirm({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      maxRecords: maxRecords && Number.isFinite(parsedMax) ? parsedMax : undefined,
    });
  };

  const handleReset = () => {
    setDateFromDraft("");
    setDateToDraft("");
    setMaxRecordsDraft("");
  };

  const handleClose = () => {
    setDateFromDraft(undefined);
    setDateToDraft(undefined);
    setMaxRecordsDraft(undefined);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} className="max-w-xl p-6 sm:p-7">
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{labels.title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{labels.description}</p>
        </div>

        {showDateRange && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <DatePicker
                id="export-date-from"
                label={labels.fromDate}
                placeholder={labels.fromDate}
                defaultDate={dateFrom || undefined}
                onChange={(_, date) => setDateFromDraft(date || "")}
                options={{ allowInput: true }}
              />
            </div>
            <div>
              <DatePicker
                id="export-date-to"
                label={labels.toDate}
                placeholder={labels.toDate}
                defaultDate={dateTo || undefined}
                onChange={(_, date) => setDateToDraft(date || "")}
                options={{ allowInput: true }}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="export-max-records">{labels.maxRecords}</Label>
          <Input
            id="export-max-records"
            type="number"
            min={1}
            placeholder="1000"
            value={maxRecords}
            onChange={(event) => setMaxRecordsDraft(event.target.value)}
            error={Boolean(maxRecordsError)}
            hint={maxRecordsError || labels.maxRecordsHint}
          />
        </div>

        {dateRangeError && (
          <p className="text-sm font-medium text-error-600 dark:text-error-400">{dateRangeError}</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            {labels.reset}
          </Button>
          <Button variant="danger" onClick={handleClose}>
            {labels.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || loading}>
            {labels.confirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

