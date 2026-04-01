"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useSidebar } from "@/stores";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDownIcon } from "../icons/index";
import { NavigationConfig, NavItem } from "@/config/navigation-items";

interface DynamicSidebarProps {
  navigation: NavigationConfig;
  basePathPrefix?: string;
  showAccessNote?: boolean;
  accessNoteVariant?: "role" | "plan" | "mixed" | null;
}

/**
 * Dynamic Sidebar Component
 * Sidebar ديناميكي يستقبل محتوى القوائم كـ props
 */
const DynamicSidebar: React.FC<DynamicSidebarProps> = ({ 
  navigation,
  basePathPrefix = "",
  showAccessNote = false,
  accessNoteVariant = "mixed",
}) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("navigation");
  const isRTL = locale === "ar";
  const accessNoteKey = accessNoteVariant ?? "mixed";

  // Remove locale prefix from pathname for matching
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Submenu state
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "accounting" | "settings";
    index: number;
  } | null>(null);

  // Check if path is active
  const isActive = useCallback(
    (path: string) => {
      const fullPath = basePathPrefix + path;
      if (fullPath === "/") {
        return pathWithoutLocale === fullPath;
      }
      return pathWithoutLocale.startsWith(fullPath);
    },
    [pathWithoutLocale, basePathPrefix]
  );

  // Toggle submenu
  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "accounting" | "settings"
  ) => {
    if (openSubmenu?.type === menuType && openSubmenu?.index === index) {
      setOpenSubmenu(null);
    } else {
      setOpenSubmenu({ type: menuType, index });
    }
  };

  // Auto-open submenu if active path
  useEffect(() => {
    const checkActiveSubmenu = () => {
      // Check main items
      navigation.main.forEach((nav, index) => {
        if (nav.subItems?.some((sub) => isActive(sub.path))) {
          setOpenSubmenu({ type: "main", index });
        }
      });

      // Check accounting items
      navigation.accounting.forEach((nav, index) => {
        if (nav.subItems?.some((sub) => isActive(sub.path))) {
          setOpenSubmenu({ type: "accounting", index });
        }
      });

      // Check settings items
      navigation.settings.forEach((nav, index) => {
        if (nav.subItems?.some((sub) => isActive(sub.path))) {
          setOpenSubmenu({ type: "settings", index });
        }
      });
    };

    checkActiveSubmenu();
  }, [pathname, isActive, navigation]);

  // Render menu items
  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "accounting" | "settings",
    namespace: string
  ) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => (
        <li key={nav.key}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{t(`${namespace}.${nav.key}`)}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`${isRTL ? "mr-auto" : "ml-auto"} w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-text-brand"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={basePathPrefix + nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{t(`${namespace}.${nav.key}`)}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "600px"
                    : "0px",
              }}
            >
              <ul className={`mt-2 space-y-1 ${isRTL ? "mr-9" : "ml-9"}`}>
                {nav.subItems.map((subItem) => (
                  <li key={subItem.key}>
                    <Link
                      href={basePathPrefix + subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {t(`${namespace}.${subItem.key}`)}
                      <span className={`flex items-center gap-1 ${isRTL ? "mr-auto" : "ml-auto"}`}>
                        {subItem.new && (
                          <span
                            className={`${isRTL ? "mr-auto" : "ml-auto"} ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`${isRTL ? "mr-auto" : "ml-auto"} ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 mt-16 flex h-screen flex-col px-5 text-gray-900 transition-all duration-300 ease-in-out ${isRTL ? "right-0 border-l" : "left-0 border-r"} z-50 border-border-light bg-white shadow-theme-sm dark:border-border-strong dark:bg-surface-secondary lg:mt-0
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}
        ${isRTL ? "lg:-translate-x-0" : "lg:translate-x-0"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href={basePathPrefix + "/"}>
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {/* القائمة الرئيسية */}
            {navigation.main.length > 0 && (
              <div>
                <h2
                  className={`mb-4 flex text-[11px] font-semibold uppercase tracking-[0.22em] leading-[20px] text-slate-400 dark:text-slate-500 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    t("main.menu", { defaultValue: "القائمة" })
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center">•••</span>
                  )}
                </h2>
                {renderMenuItems(navigation.main, "main", "main")}
              </div>
            )}

            {/* المحاسبة والتقارير */}
            {navigation.accounting.length > 0 && (
              <div className="">
                <h2
                  className={`mb-4 flex text-[11px] font-semibold uppercase tracking-[0.22em] leading-[20px] text-slate-400 dark:text-slate-500 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    t("accounting.title")
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center">•••</span>
                  )}
                </h2>
                {renderMenuItems(navigation.accounting, "accounting", "accounting")}
              </div>
            )}

            {/* الإعدادات */}
            {navigation.settings.length > 0 && (
              <div className="">
                <h2
                  className={`mb-4 flex text-[11px] font-semibold uppercase tracking-[0.22em] leading-[20px] text-slate-400 dark:text-slate-500 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    t("settings.title")
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center">•••</span>
                  )}
                </h2>
                {renderMenuItems(navigation.settings, "settings", "settings")}
              </div>
            )}
          </div>
        </nav>
        {showAccessNote && (isExpanded || isHovered || isMobileOpen) ? (
          <div className="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold">{t(`accessNote.${accessNoteKey}.title`)}</p>
            <p className="mt-1 text-amber-800 dark:text-amber-200">
              {t(`accessNote.${accessNoteKey}.description`)}
            </p>
            <p className="mt-2 text-amber-700 dark:text-amber-300">
              {t(`accessNote.${accessNoteKey}.hint`)}
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
};

export default DynamicSidebar;
