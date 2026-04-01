"use client";

import { useState } from "react";
import { Tag, Pencil, Check, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { QueryState } from "@/components/common/QueryState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useCustomerPrices, useSetCustomerPrice } from "@/lib/api/hooks/use-pricing";

interface CustomerPricingSectionProps {
  customerId: string;
}

export function CustomerPricingSection({ customerId }: CustomerPricingSectionProps) {
  const t = useTranslations("customers");
  const locale = useLocale();
  const { handleApiError, showSuccess } = useErrorHandler();

  const pricesQuery = useCustomerPrices(customerId);
  const setPrice = useSetCustomerPrice(customerId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleEdit = (productId: string, currentPrice: string) => {
    setEditingId(productId);
    setEditValue(parseFloat(currentPrice).toString());
  };

  const handleSave = async (productId: string) => {
    const price = parseFloat(editValue);
    if (isNaN(price) || price < 0) return;

    try {
      await setPrice.mutateAsync({ productId, price });
      showSuccess(t("pricing.messages.updateSuccess"));
      setEditingId(null);
    } catch (error) {
      handleApiError(error, t("pricing.messages.updateError"));
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <Tag size={18} className="text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("pricing.title")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("pricing.subtitle")}</p>
        </div>
      </div>

      <div className="mt-5">
        <QueryState
          isLoading={pricesQuery.isLoading}
          isError={pricesQuery.isError}
          errorMessage={pricesQuery.error?.message}
          isEmpty={!pricesQuery.isLoading && (pricesQuery.data?.length ?? 0) === 0}
          emptyTitle={t("pricing.empty.title")}
          emptyDescription={t("pricing.empty.description")}
        >
          {pricesQuery.data && pricesQuery.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 text-start text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("pricing.table.product")}
                    </th>
                    <th className="pb-3 text-start text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("pricing.table.sku")}
                    </th>
                    <th className="pb-3 text-start text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("pricing.table.price")}
                    </th>
                    <th className="pb-3 text-start text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("pricing.table.updatedAt")}
                    </th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {pricesQuery.data.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400">
                        {item.sku ?? "-"}
                      </td>
                      <td className="py-3">
                        {editingId === item.productId ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-28 rounded-lg border border-blue-400 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none dark:bg-gray-800 dark:text-white"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatter.format(parseFloat(item.price))}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400">
                        {new Date(item.updatedAt).toLocaleDateString(locale)}
                      </td>
                      <td className="py-3">
                        {editingId === item.productId ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSave(item.productId)}
                              disabled={setPrice.isPending}
                              className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(item.productId, item.price)}
                            className="rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </div>
    </section>
  );
}
