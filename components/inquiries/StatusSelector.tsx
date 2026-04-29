"use client";

import { STATUS_LABELS } from "@/lib/inquiries/labels";
import { STATUS_VALUES } from "@/lib/inquiries/types";

interface StatusSelectorProps {
  currentStatus: string;
  inquiryId: string;
  onUpdate: (inquiryId: string, nextStatus: string) => void;
}

export function StatusSelector({
  currentStatus,
  inquiryId,
  onUpdate,
}: StatusSelectorProps) {
  return (
    <select
      value={currentStatus}
      onChange={(e) => onUpdate(inquiryId, e.target.value)}
      className="px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {STATUS_VALUES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
