"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardBarChartProps {
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
  valueFormatter?: (value: number) => string;
}

export function DashboardBarChart({ categories, series, valueFormatter }: DashboardBarChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: 320,
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#1D4ED8", "#0F766E", "#D97706"],
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "44%",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#64748B", fontSize: "12px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: ["#64748B"], fontSize: "12px" },
        formatter: (value) => (valueFormatter ? valueFormatter(value) : `${value}`),
      },
    },
    grid: {
      borderColor: "#DBE4F0",
      strokeDashArray: 4,
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: { colors: "#475569" },
    },
    tooltip: {
      y: {
        formatter: (value) => (valueFormatter ? valueFormatter(value) : `${value}`),
      },
    },
  };

  return <ReactApexChart options={options} series={series} type="bar" height={320} />;
}
