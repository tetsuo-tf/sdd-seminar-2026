import { InquiryFilterBar } from "@/components/inquiries/InquiryFilterBar";
import { InquiryList } from "@/components/inquiries/InquiryList";
import { StatusSelector } from "@/components/inquiries/StatusSelector";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/authz";
import { listInquiries } from "@/lib/inquiries/repository";
import type { Status } from "@/lib/inquiries/types";
import { updateInquiryStatusSimple } from "./actions";

export default async function ITStaffInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; status?: string; sort?: string }>;
}) {
  await requireRole("it-staff");

  const params = await searchParams;
  const keyword = params.keyword || "";
  const status = params.status as Status | undefined;
  const sort =
    params.sort === "createdAt_asc" || params.sort === "createdAt_desc"
      ? params.sort
      : "createdAt_desc";

  const inquiries = await listInquiries({
    keyword: keyword || undefined,
    status,
    sort,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">全件一覧</h2>

      <InquiryFilterBar />

      {inquiries.length === 0 ? (
        <EmptyState
          title="問合せがありません"
          description="検索条件に一致する問合せが見つかりません"
          action={
            <a
              href="/admin/inquiries"
              className="text-blue-600 hover:text-blue-700"
            >
              条件をクリア
            </a>
          }
        />
      ) : (
        <InquiryList
          inquiries={inquiries}
          showOwner
          renderStatus={(inquiry) => (
            <StatusSelector
              currentStatus={inquiry.status}
              inquiryId={inquiry.id}
              action={updateInquiryStatusSimple}
            />
          )}
        />
      )}
    </div>
  );
}
