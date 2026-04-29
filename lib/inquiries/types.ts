export const STATUS_VALUES = ["open", "in_progress", "done"] as const;
export type Status = (typeof STATUS_VALUES)[number];

export const CATEGORY_VALUES = [
  "hardware",
  "software",
  "account",
  "network",
  "other",
] as const;
export type Category = (typeof CATEGORY_VALUES)[number];

export type Inquiry = {
  id: string;
  ownerId: string;
  title: string;
  category: Category;
  body: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
};

export type InquiryWithOwner = Inquiry & {
  owner: { id: string; name: string; email: string };
};

export type InquirySort = "createdAt_desc" | "createdAt_asc";

export type InquiryListCriteria = {
  ownerId?: string;
  status?: Status;
  keyword?: string;
  sort?: InquirySort;
};
