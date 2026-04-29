import Link from "next/link";
import { InquiryList } from "@/components/inquiries/InquiryList";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/authz";
import { listInquiries } from "@/lib/inquiries/repository";

export default async function EmployeeInquiriesPage() {
  const user = await requireUser();

  const inquiries = await listInquiries({
    ownerId: user.id,
    sort: "createdAt_desc",
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">自分の問合せ一覧</h2>
        <Link href="/inquiries/new">
          <Button>新規問合せ</Button>
        </Link>
      </div>

      {inquiries.length === 0 ? (
        <EmptyState
          title="問合せがありません"
          description="まだ問合せを登録していません"
          action={
            <Link href="/inquiries/new">
              <Button>問合せを登録する</Button>
            </Link>
          }
        />
      ) : (
        <InquiryList inquiries={inquiries} />
      )}
    </div>
  );
}
