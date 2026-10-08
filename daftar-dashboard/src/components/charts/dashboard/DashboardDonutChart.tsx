"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardDonutChartProps {
  labels: string[];
  series: number[];
  valueFormatter?: (value: number) => string;
}

export function DashboardDonutChart({ labels, series, valueFormatter }: DashboardDonutChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "donut",
      height: 320,
      fontFamily: "Outfit, sans-serif",
    },
    labels,
    colors: ["#1D4ED8", "#0F766E", "#D97706", "#DC2626"],
    legend: {
      position: "bottom",
      labels: { colors: "#475569" },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      colors: ["#FFFFFF"],
      width: 4,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value) => (valueFormatter ? valueFormatter(value) : `${value}`),
      },
    },
  };

  return <ReactApexChart options={options} series={series} type="donut" height={320} />;
}
