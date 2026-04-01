import fs from 'fs';

const sidebarPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/layout/DynamicSidebar.tsx';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

const t1 = `    <aside
      className={\`fixed top-0 mt-16 flex h-screen flex-col px-5 text-gray-900 transition-all duration-300 ease-in-out \${isRTL ? "right-0 border-l" : "left-0 border-r"} z-50 border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(246,250,255,0.96)_48%,rgba(238,244,252,0.99)_100%)] shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(7,16,29,0.99)_0%,rgba(10,20,38,0.98)_56%,rgba(14,27,49,0.99)_100%)] lg:mt-0
        \${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        \${isMobileOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}
        \${isRTL ? "lg:-translate-x-0" : "lg:translate-x-0"}\`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >`;
const r1 = `    <aside
      className={\`fixed top-0 mt-16 flex h-screen flex-col px-5 text-text-primary transition-all duration-300 ease-in-out \${isRTL ? "right-0 border-l" : "left-0 border-r"} z-50 border-border-light bg-surface shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary lg:mt-0
        \${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        \${isMobileOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}
        \${isRTL ? "lg:-translate-x-0" : "lg:translate-x-0"}\`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >`;
sidebarContent = sidebarContent.replace(t1, r1);

const t2 = `                <h2
                  className={\`mb-4 flex text-[11px] font-semibold uppercase tracking-[0.22em] leading-[20px] text-slate-400 dark:text-slate-500 \${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }\`}
                >`;
const r2 = `                <h2
                  className={\`mb-4 flex text-[11px] font-medium uppercase tracking-[0.1em] leading-[20px] text-text-muted \${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }\`}
                >`;
// replace ALL instances
sidebarContent = sidebarContent.replaceAll(t2, r2);

fs.writeFileSync(sidebarPath, sidebarContent, 'utf-8');
console.log("Updated DynamicSidebar.tsx");

const headerPath = 'D:/Web/full-projects/daftar-v1/dafter-dashboard/src/layout/AppHeader.tsx';
let headerContent = fs.readFileSync(headerPath, 'utf-8');

const t3 = `    <header className="sticky top-0 z-99999 flex w-full border-b border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(248,251,255,0.76)_100%)] backdrop-blur-xl dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(7,16,29,0.84)_0%,rgba(10,20,38,0.82)_100%)]">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-white/70 px-3 py-3 dark:border-white/8 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="z-99999 items-center justify-center rounded-2xl border border-border-light/80 bg-white/85 text-text-secondary shadow-theme-xs dark:border-white/8 dark:bg-white/[0.04] dark:text-slate-300 lg:flex lg:h-11 lg:w-11"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"`;
const r3 = `    <header className="sticky top-0 z-99999 flex w-full border-b border-border-light bg-surface/80 backdrop-blur-md dark:border-border-strong dark:bg-surface-secondary/80">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-border-light px-3 py-3 dark:border-border-strong sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="z-99999 items-center justify-center rounded-xl border border-border-light bg-surface-secondary text-text-secondary shadow-theme-xs dark:border-border-strong dark:bg-surface-tertiary dark:text-text-primary lg:flex lg:h-11 lg:w-11"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"`;
headerContent = headerContent.replace(t3, r3);

const t4 = `                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search customers, invoices, ledgers..."
                  className="dark:bg-dark-900 h-11 w-full rounded-2xl border border-border-light/80 bg-white/78 py-2.5 pl-12 pr-14 text-sm text-text-primary shadow-theme-xs placeholder:text-text-muted focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-white/8 dark:bg-white/[0.04] dark:text-white/90 dark:placeholder:text-slate-500 xl:w-[430px]"
                />`;
const r4 = `                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search customers, invoices, ledgers..."
                  className="h-11 w-full rounded-xl border border-border-light bg-surface-secondary py-2.5 pl-12 pr-14 text-sm text-text-primary shadow-theme-xs placeholder:text-text-muted focus:border-border-focus focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-border-strong dark:bg-surface-tertiary dark:text-text-primary dark:placeholder:text-text-muted xl:w-[430px]"
                />`;
headerContent = headerContent.replace(t4, r4);

fs.writeFileSync(headerPath, headerContent, 'utf-8');
console.log("Updated AppHeader.tsx");
