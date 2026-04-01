import fs from 'fs';

let btnPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/components/ui/button/Button.tsx';
let btnContent = fs.readFileSync(btnPath, 'utf8');

const targetOutline = `"bg-white/92 text-text-primary ring-1 ring-inset ring-border-light shadow-theme-xs hover:bg-white hover:ring-border-strong dark:bg-surface-secondary dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/[0.06]"`;
const repOutline = `"bg-surface-secondary text-text-primary ring-1 ring-inset ring-border-light shadow-theme-xs hover:bg-surface hover:ring-border-strong dark:bg-surface-secondary dark:text-text-primary dark:ring-border-strong dark:hover:bg-surface-tertiary"`;
btnContent = btnContent.replace(targetOutline, repOutline);

const targetSecondary = `"bg-surface-tertiary text-text-primary hover:bg-border-light dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.1] disabled:opacity-50"`;
const repSecondary = `"bg-surface-tertiary text-text-primary hover:bg-border-light dark:bg-surface-tertiary dark:text-text-primary dark:hover:bg-border-strong disabled:opacity-50"`;
btnContent = btnContent.replace(targetSecondary, repSecondary);

const targetGhost = `"bg-transparent text-text-secondary hover:bg-white/70 hover:text-text-primary dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white disabled:opacity-50"`;
const repGhost = `"bg-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary dark:text-text-secondary dark:hover:bg-surface-tertiary dark:hover:text-text-primary disabled:opacity-50"`;
btnContent = btnContent.replace(targetGhost, repGhost);
fs.writeFileSync(btnPath, btnContent, 'utf8');
console.log('Updated Button.tsx');

let selectPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/components/form/Select.tsx';
let selectContent = fs.readFileSync(selectPath, 'utf8');

const selectTarget1 = `      className={\`h-11 w-full appearance-none rounded-lg border border-gray-300  px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 \${
        selectedValue
          ? "text-gray-800 dark:text-white/90"
          : "text-gray-400 dark:text-gray-400"
      } \${className}\`}`;
const selectRep1 = `      className={\`h-11 w-full appearance-none rounded-xl border border-border-light px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-text-muted focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-border-strong dark:bg-surface-secondary dark:text-text-primary dark:placeholder:text-text-muted \${
        selectedValue
          ? "text-text-primary dark:text-text-primary"
          : "text-text-muted dark:text-text-muted"
      } \${className}\`}`;
selectContent = selectContent.replace(selectTarget1, selectRep1);
selectContent = selectContent.replaceAll('text-gray-700 dark:bg-gray-900 dark:text-gray-400', 'text-text-primary dark:bg-surface-secondary dark:text-text-secondary');
fs.writeFileSync(selectPath, selectContent, 'utf8');
console.log('Updated Select.tsx');

let inputPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/components/form/input/InputField.tsx';
let inputContent = fs.readFileSync(inputPath, 'utf8');

const inputTarget1 = `let inputClasses = \`h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 \${className}\`;`;
const inputRep1 = `let inputClasses = \`h-11 w-full rounded-xl border border-border-light px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-text-muted focus:outline-hidden focus:ring-3 dark:border-border-strong dark:bg-surface-secondary dark:text-text-primary dark:placeholder:text-text-muted \${className}\`;`;
inputContent = inputContent.replace(inputTarget1, inputRep1);

const inputTarget2 = `    if (disabled) {
      inputClasses += \` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700\`;
    } else if (error) {
      inputClasses += \` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10  dark:text-error-400 dark:border-error-500\`;
    } else if (success) {
      inputClasses += \` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300  dark:text-success-400 dark:border-success-500\`;
    } else {
      inputClasses += \` bg-transparent text-gray-800 border-gray-300 focus:border-border-focus focus:ring-3 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90\`;
    }`;
const inputRep2 = `    if (disabled) {
      inputClasses += \` text-text-muted border-border-light cursor-not-allowed dark:bg-surface-tertiary dark:text-text-muted dark:border-border-strong\`;
    } else if (error) {
      inputClasses += \` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10 dark:text-error-400 dark:border-error-500\`;
    } else if (success) {
      inputClasses += \` text-success-600 border-success-400 focus:ring-success-500/10 focus:border-success-300 dark:text-success-400 dark:border-success-500\`;
    } else {
      inputClasses += \` bg-transparent text-text-primary focus:border-border-focus focus:ring-3 focus:ring-primary/10\`;
    }`;
inputContent = inputContent.replace(inputTarget2, inputRep2);
fs.writeFileSync(inputPath, inputContent, 'utf8');
console.log('Updated InputField.tsx');
