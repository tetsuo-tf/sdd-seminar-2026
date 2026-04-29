import { InquiryForm } from "@/components/inquiries/InquiryForm";
import { createInquiryAction } from "../actions";

export default function NewInquiryPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">新規問合せ登録</h2>
      <InquiryForm action={createInquiryAction} />
    </div>
  );
}
