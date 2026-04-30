import Link from "next/link";
import { StatusBadge } from "@/components/inquiries/StatusBadge";
import { StatusSelect } from "@/components/inquiries/StatusSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/authz";
import { CATEGORY_LABELS } from "@/lib/inquiries/labels";
import { findInquiryById } from "@/lib/inquiries/repository";

export default async function ITStaffInquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ keyword?: string; status?: string; sort?: string }>;
}) {
  await requireRole("it-staff");

  const { id } = await params;
  const sp = await searchParams;

  const queryParams = new URLSearchParams();
  if (sp.keyword) {
    queryParams.set("keyword", sp.keyword);
  }
  if (sp.status) {
    queryParams.set("status", sp.status);
  }
  if (sp.sort) {
    queryParams.set("sort", sp.sort);
  }
  const qs = queryParams.toString();
  const backHref = `/admin/inquiries${qs ? `?${qs}` : ""}`;

  const inquiry = await findInquiryById(id);

  if (!inquiry) {
    return (
      <EmptyState
        title="対象の問合せが見つかりません"
        action={
          <Link
            href={backHref}
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            一覧に戻る
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{inquiry.title}</h2>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              カテゴリ
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {CATEGORY_LABELS[inquiry.category]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </dt>
            <dd className="mt-1 flex items-center gap-3">
              <StatusBadge status={inquiry.status} />
              <StatusSelect
                inquiryId={inquiry.id}
                currentStatus={inquiry.status}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              登録者
            </dt>
            <dd className="mt-1 text-sm text-gray-900">{inquiry.owner.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              登録日時
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(inquiry.createdAt).toLocaleString("ja-JP")}
            </dd>
          </div>
        </dl>

        <div>
          <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            本文
          </dt>
          <div className="whitespace-pre-wrap break-words text-sm text-gray-900">
            {inquiry.body}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href={backHref}
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          一覧に戻る
        </Link>
      </div>
    </div>
  );
}
