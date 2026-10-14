"use client";

import { usePublicQuotaLimits } from "@/lib/use-public-quota-limits";

export function CurrentQuotaRows() {
  const { data } = usePublicQuotaLimits();

  return (
    <tbody aria-live="polite">
      <tr className="border-b border-border">
        <td className="px-4 py-2.5">Guest</td>
        <td className="px-4 py-2.5">₹0</td>
        <td className="px-4 py-2.5">
          {data ? `Up to ${data.guest_daily_limit}/day` : "Configured daily limit"}
        </td>
      </tr>
      <tr>
        <td className="px-4 py-2.5">Free account</td>
        <td className="px-4 py-2.5">₹0</td>
        <td className="px-4 py-2.5">
          {data ? `Up to ${data.free_daily_limit}/day` : "Configured daily limit"}
        </td>
      </tr>
    </tbody>
  );
}
