import type { InquiryWithOwner } from "@/lib/inquiries/types";
import { StatusBadge } from "./StatusBadge";
import { CATEGORY_LABELS } from "@/lib/inquiries/labels";

interface InquiryListProps {
  inquiries: InquiryWithOwner[];
  showOwner?: boolean;
}

export function InquiryList({
  inquiries,
  showOwner = false,
}: InquiryListProps) {
  if (inquiries.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
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
            {showOwner && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録者
              </th>
            )}
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
                <StatusBadge status={inquiry.status} />
              </td>
              {showOwner && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inquiry.owner.name}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(inquiry.createdAt).toLocaleString("ja-JP")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
