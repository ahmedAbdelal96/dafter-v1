"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface SeriesItem {
  name: string;
  data: number[];
}

interface DashboardAreaChartProps {
  categories: string[];
  series: SeriesItem[];
  valueFormatter?: (value: number) => string;
}

export function DashboardAreaChart({
  categories,
  series,
  valueFormatter,
}: DashboardAreaChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "area",
      height: 320,
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
      zoom: { enabled: false },
    },
    colors: ["#1D4ED8", "#0F766E", "#D97706"],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.22,
        opacityTo: 0.03,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: "#DBE4F0",
      strokeDashArray: 4,
    },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      hover: { size: 6 },
    },
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
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: { colors: "#475569" },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) => (valueFormatter ? valueFormatter(value) : `${value}`),
      },
    },
  };

  return <ReactApexChart options={options} series={series} type="area" height={320} />;
}
