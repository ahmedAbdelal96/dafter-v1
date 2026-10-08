import React from "react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export default function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Module scaffold is ready. Connect this page to API endpoints and business UI next.
      </div>
    </section>
  );
}