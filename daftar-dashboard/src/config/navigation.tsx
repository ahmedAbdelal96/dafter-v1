/**
 * dafter Dashboard - Navigation Configuration
 * تكوين قائمة التنقل للمؤسسة
 */

import React from "react";
import {
  GridIcon,
  CalenderIcon,
  UserCircleIcon,
  ListIcon,
  TableIcon,
  PieChartIcon,
  BoxCubeIcon,
  PlugInIcon,
} from "@/icons";

// Branding/Business Icons
export const Icons = {
  Dashboard: () => <GridIcon />,
  Calendar: () => <CalenderIcon />,
  Users: () => <UserCircleIcon />,
  Services: () => <ListIcon />,
  Clients: () => <TableIcon />,
  Reports: () => <PieChartIcon />,
  Settings: () => <BoxCubeIcon />,
  Auth: () => <PlugInIcon />,
  // أيقونات SVG مخصصة
  Booking: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Money: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Staff: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  Gear: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Building: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
};

export type NavItem = {
  name: string;
  nameAr: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { 
    name: string; 
    nameAr: string;
    path: string; 
    pro?: boolean; 
    new?: boolean;
  }[];
};

/**
 * القائمة الرئيسية - Main Navigation
 */
export const mainNavItems: NavItem[] = [
  {
    icon: <Icons.Dashboard />,
    name: "Dashboard",
    nameAr: "لوحة التحكم",
    path: "/",
  },
];

/**
 * قائمة المحاسبة والتقارير - Accounting & Reports
 */
export const accountingNavItems: NavItem[] = [
  {
    icon: <Icons.Money />,
    name: "Accounting",
    nameAr: "المحاسبة",
    subItems: [
      { name: "Invoices", nameAr: "الفواتير", path: "/accounting/invoices" },
      { name: "Expenses", nameAr: "المصروفات", path: "/accounting/expenses" },
      { name: "Daily Close", nameAr: "إقفال اليوم", path: "/accounting/daily-close" },
    ],
  },
];

/**
 * قائمة الإعدادات - Settings
 */
export const settingsNavItems: NavItem[] = [
  {
    icon: <Icons.Bell />,
    name: "Notifications",
    nameAr: "الإشعارات",
    path: "/notifications",
  },
  {
    icon: <Icons.Gear />,
    name: "Settings",
    nameAr: "الإعدادات",
    subItems: [
      { name: "General", nameAr: "عام", path: "/settings" },
      { name: "Notifications", nameAr: "الإشعارات", path: "/settings/notifications" },
    ],
  },
  {
    icon: <Icons.Users />,
    name: "Profile",
    nameAr: "الملف الشخصي",
    path: "/profile",
  },
];

/**
 * كل عناصر التنقل - All navigation items for search
 */
export const allNavItems = [
  ...mainNavItems,
  ...accountingNavItems,
  ...settingsNavItems,
];
