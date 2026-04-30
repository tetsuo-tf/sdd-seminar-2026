"use client";

import { useRouter } from "next/navigation";
import { updateInquiryStatusSimple } from "@/app/(it-staff)/admin/inquiries/actions";
import { STATUS_LABELS } from "@/lib/inquiries/labels";
import type { Status } from "@/lib/inquiries/types";
import { STATUS_VALUES } from "@/lib/inquiries/types";

export function StatusSelect({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string;
  currentStatus: Status;
}) {
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const formData = new FormData();
    formData.set("inquiryId", inquiryId);
    formData.set("nextStatus", e.target.value);
    await updateInquiryStatusSimple(formData);
    router.refresh();
  };

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      className="px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {STATUS_VALUES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
