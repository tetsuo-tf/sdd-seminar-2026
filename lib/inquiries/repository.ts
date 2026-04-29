import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  Inquiry,
  InquiryListCriteria,
  InquiryWithOwner,
  Status,
} from "./types";

export async function listInquiries(
  criteria: InquiryListCriteria,
): Promise<InquiryWithOwner[]> {
  const where: Record<string, unknown> = {};

  if (criteria.ownerId) {
    where.ownerId = criteria.ownerId;
  }

  if (criteria.status) {
    where.status = criteria.status;
  }

  if (criteria.keyword?.trim()) {
    where.OR = [
      { title: { contains: criteria.keyword } },
      { body: { contains: criteria.keyword } },
    ];
  }

  const orderBy: Record<string, "asc" | "desc"> =
    criteria.sort === "createdAt_asc"
      ? { createdAt: "asc" }
      : { createdAt: "desc" };

  const inquiries = await prisma.inquiry.findMany({
    where,
    orderBy,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return inquiries as InquiryWithOwner[];
}

export async function findInquiryById(
  id: string,
): Promise<InquiryWithOwner | null> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return inquiry as InquiryWithOwner | null;
}

export async function createInquiry(input: {
  ownerId: string;
  title: string;
  category: string;
  body: string;
}): Promise<Inquiry> {
  const inquiry = await prisma.inquiry.create({
    data: {
      ownerId: input.ownerId,
      title: input.title,
      category: input.category,
      body: input.body,
      status: "open",
    },
  });

  return inquiry as Inquiry;
}

export async function updateInquiryStatus(
  id: string,
  nextStatus: Status,
): Promise<Inquiry> {
  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: { status: nextStatus },
  });

  return inquiry as Inquiry;
}
