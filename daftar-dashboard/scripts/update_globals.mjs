import fs from 'fs';

const globalsPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/app/globals.css';
let content = fs.readFileSync(globalsPath, 'utf-8');

const lightModeTarget = `:root {
  --primary: #1F7A5A;
  --primary-hover: #16624A;
  --primary-active: #145742;
  --primary-light: #E8F5EF;
  --primary-light-hover: #DCEEE5;
  --accent-support: #2563EB;
  --accent-support-soft: #EAF2FF;

  --text-primary: #111827;
  --text-secondary: #475467;
  --text-muted: #667085;
  --text-brand: #111827;

  --surface: #F8FAFC;             /* App background */
  --surface-secondary: #FFFFFF;   /* Cards */
  --surface-tertiary: #F2F4F7;    /* Sub-surfaces */

  --border-light: #EAECF0;
  --border-strong: #D0D5DD;
  --border-focus: #1F7A5A;

  --ring-focus: rgba(31, 122, 90, 0.16);

  --finance-income: #1F7A5A;
  --finance-income-soft: #E8F5EF;
  --finance-expense: #D97706;
  --finance-expense-soft: #FFF4E5;
  --finance-risk: #DC2626;
  --finance-risk-soft: #FEECEC;
  --finance-neutral: #2563EB;
  --finance-neutral-soft: #EAF2FF;
}`;

const lightModeReplacement = `:root {
  --primary: #1F7A5A;
  --primary-hover: #16624A;
  --primary-active: #145742;
  --primary-light: #E8F5EF;
  --primary-light-hover: #DCEEE5;
  --accent-support: #2563EB;
  --accent-support-soft: #EAF2FF;

  --text-primary: #111827;
  --text-secondary: #475467;
  --text-muted: #667085;
  --text-brand: #111827;

  --surface: #F8FAFC;             /* App background */
  --surface-secondary: #FFFFFF;   /* Cards */
  --surface-tertiary: #F2F4F7;    /* Sub-surfaces */

  --border-light: #EAECF0;
  --border-strong: #D0D5DD;
  --border-focus: #1F7A5A;

  --ring-focus: rgba(31, 122, 90, 0.12); /* Softer ring */

  --finance-income: #1F7A5A;
  --finance-income-soft: #E8F5EF;
  --finance-expense: #D97706;
  --finance-expense-soft: #FFF4E5;
  --finance-risk: #DC2626;
  --finance-risk-soft: #FEECEC;
  --finance-neutral: #2563EB;
  --finance-neutral-soft: #EAF2FF;
}`;

const darkModeTarget = `.dark {
  --primary: #33A074;
  --primary-hover: #42B987;
  --primary-active: #52C998;
  --primary-light: #183127;
  --primary-light-hover: #1D3B2F;
  --accent-support: #60A5FA;
  --accent-support-soft: #17253A;

  --text-primary: #F5F7FA;
  --text-secondary: #D0D5DD;
  --text-muted: #98A2B3;
  --text-brand: #F5F7FA;

  --surface: #0F1720;
  --surface-secondary: #151F2B;
  --surface-tertiary: #1B2633;

  --border-light: #223042;
  --border-strong: #2B3A4D;
  --border-focus: #33A074;

  --ring-focus: rgba(51, 160, 116, 0.22);

  --finance-income: #33A074;
  --finance-income-soft: #183127;
  --finance-expense: #F59E0B;
  --finance-expense-soft: #312411;
  --finance-risk: #EF4444;
  --finance-risk-soft: #2D1717;
  --finance-neutral: #60A5FA;
  --finance-neutral-soft: #17253A;
}`;

const darkModeReplacement = `.dark {
  --primary: #1F7A5A; /* Keep brand accent distinct but subtle in dark mode */
  --primary-hover: #16624A;
  --primary-active: #145742;
  --primary-light: #15261F;
  --primary-light-hover: #1A3027;
  --accent-support: #60A5FA;
  --accent-support-soft: #17253A;

  --text-primary: #F5F7FA;
  --text-secondary: #D0D5DD;
  --text-muted: #98A2B3;
  --text-brand: #F5F7FA;

  --surface: #0F1720;
  --surface-secondary: #151F2B; /* Lighter than bg */
  --surface-tertiary: #1B2633;

  --border-light: #223042;
  --border-strong: #2B3A4D;
  --border-focus: #288f6c;

  --ring-focus: rgba(31, 122, 90, 0.15); /* Softer ring */

  --finance-income: #33A074;
  --finance-income-soft: #183127;
  --finance-expense: #F59E0B;
  --finance-expense-soft: #312411;
  --finance-risk: #EF4444;
  --finance-risk-soft: #2D1717;
  --finance-neutral: #60A5FA;
  --finance-neutral-soft: #17253A;
}`;

content = content.replace(lightModeTarget, lightModeReplacement);
content = content.replace(darkModeTarget, darkModeReplacement);

fs.writeFileSync(globalsPath, content, 'utf-8');
console.log("Updated globals.css");
