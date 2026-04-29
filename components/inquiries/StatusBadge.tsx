import { STATUS_LABELS } from "@/lib/inquiries/labels";
import type { Status } from "@/lib/inquiries/types";

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<Status, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    done: "bg-green-100 text-green-800",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
