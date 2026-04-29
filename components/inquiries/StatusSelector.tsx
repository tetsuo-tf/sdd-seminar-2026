"use client";

import { STATUS_LABELS } from "@/lib/inquiries/labels";
import { STATUS_VALUES, type Status } from "@/lib/inquiries/types";

interface StatusSelectorProps {
  currentStatus: Status;
  inquiryId: string;
  onUpdate?: (inquiryId: string, nextStatus: Status) => void;
  action?: (formData: FormData) => Promise<void>;
}

export function StatusSelector({
  currentStatus,
  inquiryId,
  onUpdate,
  action,
}: StatusSelectorProps) {
  // Server Action mode: form埋め込み
  if (action) {
    return (
      <form action={action}>
        <input type="hidden" name="inquiryId" value={inquiryId} />
        <select
          name="nextStatus"
          defaultValue={currentStatus}
          className="px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </form>
    );
  }

  // Client mode: onChange
  return (
    <select
      value={currentStatus}
      onChange={(e) => onUpdate?.(inquiryId, e.target.value as Status)}
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
