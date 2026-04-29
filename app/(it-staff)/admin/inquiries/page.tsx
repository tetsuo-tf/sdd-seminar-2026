import { InquiryFilterBar } from "@/components/inquiries/InquiryFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/authz";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/inquiries/labels";
import { listInquiries } from "@/lib/inquiries/repository";
import type { Status } from "@/lib/inquiries/types";
import { STATUS_VALUES } from "@/lib/inquiries/types";
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイトル
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {inquiry.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {CATEGORY_LABELS[inquiry.category]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <form action={updateInquiryStatusSimple}>
                      <input
                        type="hidden"
                        name="inquiryId"
                        value={inquiry.id}
                      />
                      <select
                        name="nextStatus"
                        defaultValue={inquiry.status}
                        className="px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </form>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {inquiry.owner.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inquiry.createdAt).toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
