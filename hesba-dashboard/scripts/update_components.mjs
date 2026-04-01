import fs from 'fs';

const dataTablePath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/components/ui/data-table/DataTable.tsx';
let dataTableContent = fs.readFileSync(dataTablePath, 'utf-8');

const dtT1 = `<div className="overflow-hidden rounded-3xl border border-border-light/90 bg-white/92 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/90">`;
const dtR1 = `<div className="overflow-hidden rounded-xl border border-border-light bg-surface-secondary shadow-theme-xs dark:border-border-strong dark:bg-surface-secondary">`;
dataTableContent = dataTableContent.replace(dtT1, dtR1);

const dtT2 = `className={\`border-b border-border-light bg-surface-tertiary/80 \${`;
const dtR2 = `className={\`border-b border-border-strong bg-surface-tertiary \${`;
dataTableContent = dataTableContent.replace(dtT2, dtR2);

const dtT3 = `                      \${hoverable ? 'hover:bg-surface-tertiary/75' : ''}
                      \${striped && index % 2 === 1 ? 'bg-surface/35' : ''}`;
const dtR3 = `                      \${hoverable ? 'hover:bg-surface-tertiary/50 dark:hover:bg-surface-tertiary' : ''}
                      \${striped && index % 2 === 1 ? 'bg-surface-tertiary/30' : ''}`;
dataTableContent = dataTableContent.replace(dtT3, dtR3);

fs.writeFileSync(dataTablePath, dataTableContent, 'utf-8');
console.log("Updated DataTable.tsx");

const paginationPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/components/ui/data-table/DataTablePagination.tsx';
let paginationContent = fs.readFileSync(paginationPath, 'utf-8');

const pgT1 = `className="flex items-center gap-1 rounded-2xl border border-border-light/90 bg-white/75 px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:bg-white/[0.03]"`;
const pgR1 = `className="flex items-center gap-1 rounded-xl border border-border-light bg-surface-secondary px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-strong dark:bg-surface-secondary dark:hover:bg-surface-tertiary"`;
paginationContent = paginationContent.replaceAll(pgT1, pgR1);

const pgT2 = `className={\`rounded-2xl px-3 py-1.5 text-sm transition-colors \${`;
const pgR2 = `className={\`rounded-xl px-3 py-1.5 text-sm transition-colors \${`;
paginationContent = paginationContent.replaceAll(pgT2, pgR2);

fs.writeFileSync(paginationPath, paginationContent, 'utf-8');
console.log("Updated DataTablePagination.tsx");

const cardPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/components/common/ComponentCard.tsx';
let cardContent = fs.readFileSync(cardPath, 'utf-8');

const cardT1 = `className={\`rounded-3xl border border-border-light/90 bg-white/92 shadow-theme-sm backdrop-blur-sm dark:border-white/8 dark:bg-surface-secondary/88 \${className}\`}`;
const cardR1 = `className={\`rounded-xl border border-border-light bg-surface-secondary shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary \${className}\`}`;
cardContent = cardContent.replace(cardT1, cardR1);

const cardT2 = `<div className="border-t border-border-light/80 p-4 dark:border-white/8 sm:p-6">`;
const cardR2 = `<div className="border-t border-border-light p-4 dark:border-border-strong sm:p-6">`;
cardContent = cardContent.replace(cardT2, cardR2);

fs.writeFileSync(cardPath, cardContent, 'utf-8');
console.log("Updated ComponentCard.tsx");
