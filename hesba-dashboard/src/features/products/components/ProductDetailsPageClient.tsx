"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Badge from "@/components/ui/badge/Badge";
import { QueryState } from "@/components/common/QueryState";
import { useProduct } from "@/lib/api/hooks/use-products";
import { formatMoney } from "../utils/product-format";

interface ProductDetailsPageClientProps {
  productId: string;
}

export function ProductDetailsPageClient({ productId }: ProductDetailsPageClientProps) {
  const t = useTranslations("products");
  const locale = useLocale();

  const productQuery = useProduct(productId, Boolean(productId));
  const product = productQuery.data;

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("details.title")}</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("details.subtitle")}</p>
          </div>

          <Link
            href={`/${locale}/products`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            {t("details.backToList")}
          </Link>
        </div>
      </section>

      <QueryState
        isLoading={productQuery.isLoading}
        isError={productQuery.isError}
        errorMessage={productQuery.error?.message}
        isEmpty={!productQuery.isLoading && !product}
        emptyTitle={t("empty.title")}
        emptyDescription={t("empty.description")}
      >
        {product && (
          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label={t("table.name")} value={product.name} />
              <InfoItem label={t("table.sku")} value={product.sku || "-"} />
              <InfoItem label={t("table.category")} value={product.category || "-"} />
              <InfoItem label={t("table.unit")} value={product.unit || "-"} />
              <InfoItem label={t("table.unitPrice")} value={formatMoney(product.unitPrice, locale)} />
              <InfoItem
                label={t("table.status")}
                value={
                  <Badge color={product.isActive ? "success" : "light"}>
                    {product.isActive ? t("status.active") : t("status.inactive")}
                  </Badge>
                }
              />
              <InfoItem label={t("details.meta.createdBy")} value={product.createdBy?.fullName || "-"} />
              <InfoItem
                label={t("details.meta.createdAt")}
                value={dateFormatter.format(new Date(product.createdAt))}
              />
              <InfoItem
                label={t("details.meta.updatedAt")}
                value={dateFormatter.format(new Date(product.updatedAt))}
              />
            </div>
            <InfoItem label={t("table.description")} value={product.description || "-"} />
          </section>
        )}
      </QueryState>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
