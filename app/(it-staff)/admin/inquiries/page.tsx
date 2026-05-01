import Link from "next/link";
import { InquiryFilterBar } from "@/components/inquiries/InquiryFilterBar";
import { StatusSelect } from "@/components/inquiries/StatusSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/authz";
import { CATEGORY_LABELS } from "@/lib/inquiries/labels";
import { listInquiries } from "@/lib/inquiries/repository";
import type { Status } from "@/lib/inquiries/types";

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

  // 詳細ページへのリンクに現在の検索条件を query string として持ち回す
  // （要件 7.6: 戻り導線で検索条件再現）
  const detailQueryParams = new URLSearchParams();
  if (params.keyword) {
    detailQueryParams.set("keyword", params.keyword);
  }
  if (params.status) {
    detailQueryParams.set("status", params.status);
  }
  if (params.sort) {
    detailQueryParams.set("sort", params.sort);
  }
  const detailQs = detailQueryParams.toString();
  const detailQuerySuffix = detailQs ? `?${detailQs}` : "";

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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/inquiries/${inquiry.id}${detailQuerySuffix}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {inquiry.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {CATEGORY_LABELS[inquiry.category]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusSelect
                      inquiryId={inquiry.id}
                      currentStatus={inquiry.status}
                    />
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
