"use client";

import Badge from "@/components/ui/badge/Badge";
import { getSubscriptionStatusColor, type SubscriptionStatus } from "../utils/platform-format";

export function PlatformStatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge color={getSubscriptionStatusColor(status)} size="sm">
      {status}
    </Badge>
  );
}

