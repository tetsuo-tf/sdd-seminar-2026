import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
import type { InquiryWithOwner } from "@/lib/inquiries/types";
import Page from "./page";

const listInquiriesMock = vi.fn();
const requireRoleMock = vi.fn();
const updateInquiryStatusSimpleMock = vi.fn();

vi.mock("@/lib/inquiries/repository", () => ({
  listInquiries: (...args: unknown[]) => listInquiriesMock(...args),
}));

vi.mock("@/lib/authz", () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock("@/app/(it-staff)/admin/inquiries/actions", () => ({
  updateInquiryStatusSimple: (...args: unknown[]) =>
    updateInquiryStatusSimpleMock(...args),
}));

// next/navigation の useRouter / useSearchParams を AppRouterContext 不在の
// テスト環境向けにスタブ化 (StatusSelect / InquiryFilterBar が使用)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const stubUser: SessionUser = {
  id: "it-staff-1",
  email: "it-staff@example.com",
  name: "情シス担当",
  role: "it-staff",
};

const fixedCreatedAt = new Date("2026-04-15T10:30:00.000Z");

const sampleInquiries: InquiryWithOwner[] = [
  {
    id: "id-1",
    ownerId: "u1",
    title: "プリンタが動かない",
    category: "hardware",
    body: "印刷ボタンを押しても反応しません",
    status: "open",
    createdAt: fixedCreatedAt,
    updatedAt: fixedCreatedAt,
    owner: {
      id: "u1",
      name: "山田太郎",
      email: "yamada@example.com",
    },
  },
  {
    id: "id-2",
    ownerId: "u2",
    title: "VPN 接続エラー",
    category: "network",
    status: "in_progress",
    body: "VPN に繋がりません",
    createdAt: fixedCreatedAt,
    updatedAt: fixedCreatedAt,
    owner: {
      id: "u2",
      name: "佐藤花子",
      email: "sato@example.com",
    },
  },
];

describe("ITStaffInquiriesPage 一覧タイトル列リンク", () => {
  beforeEach(() => {
    listInquiriesMock.mockReset();
    requireRoleMock.mockReset();
    updateInquiryStatusSimpleMock.mockReset();
    requireRoleMock.mockResolvedValue(stubUser);
    listInquiriesMock.mockResolvedValue(sampleInquiries);
  });

  afterEach(() => {
    cleanup();
  });

  it("各行のタイトル列が <a> 要素として詳細ページへリンクされる (searchParams 空: クエリ無し href)", async () => {
    // Requirement 7.1: 一覧の各行に詳細遷移導線
    const searchParams = Promise.resolve({});

    const { container } = render(await Page({ searchParams }));

    for (const inquiry of sampleInquiries) {
      const link = container.querySelector<HTMLAnchorElement>(
        `a[href="/admin/inquiries/${inquiry.id}"]`,
      );
      expect(link).not.toBeNull();
      expect(link?.textContent).toBe(inquiry.title);
    }
  });

  it("searchParams に keyword のみ指定された場合、href に keyword のみ付与される", async () => {
    // Requirement 7.6: 戻り導線で検索条件再現 (一覧→詳細リンクが検索条件を保持)
    const searchParams = Promise.resolve({ keyword: "プリンタ" });

    const { container } = render(await Page({ searchParams }));

    const link = container.querySelector<HTMLAnchorElement>(
      'a[href^="/admin/inquiries/id-1"]',
    );
    expect(link).not.toBeNull();

    const href = link?.getAttribute("href") ?? "";
    const [pathname, qs] = href.split("?");
    expect(pathname).toBe("/admin/inquiries/id-1");

    const parsed = new URLSearchParams(qs);
    expect(parsed.get("keyword")).toBe("プリンタ");
    expect(parsed.get("status")).toBeNull();
    expect(parsed.get("sort")).toBeNull();
  });

  it("searchParams に keyword + status + sort 全項目が指定された場合、href に 3 項目すべてが含まれる", async () => {
    // Requirement 7.6: 戻り導線で検索条件再現 (フル指定)
    const searchParams = Promise.resolve({
      keyword: "VPN",
      status: "in_progress",
      sort: "createdAt_asc",
    });

    const { container } = render(await Page({ searchParams }));

    const link = container.querySelector<HTMLAnchorElement>(
      'a[href^="/admin/inquiries/id-2"]',
    );
    expect(link).not.toBeNull();

    const href = link?.getAttribute("href") ?? "";
    const [pathname, qs] = href.split("?");
    expect(pathname).toBe("/admin/inquiries/id-2");

    // URL エンコード差異を避けるため URLSearchParams でパースして検証
    const parsed = new URLSearchParams(qs);
    expect(parsed.get("keyword")).toBe("VPN");
    expect(parsed.get("status")).toBe("in_progress");
    expect(parsed.get("sort")).toBe("createdAt_asc");
  });

  it("StatusSelect セルがタイトルリンク <a> の外 (独立 <td>) に配置されている", async () => {
    // design.md: StatusSelect セル独立性 (リンク内に select を入れ子にしない)
    const searchParams = Promise.resolve({});

    const { container } = render(await Page({ searchParams }));

    // タイトル列の <a> 要素を取得
    const titleLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/admin/inquiries/id-1"]',
    );
    expect(titleLink).not.toBeNull();

    // タイトルリンクの内側に <select> が存在しないこと
    expect(titleLink?.querySelector("select")).toBeNull();

    // 同じ <tr> 内に <select> が存在すること (別 <td> に配置されている証拠)
    const row = titleLink?.closest("tr");
    expect(row).not.toBeNull();
    const selectInRow = row?.querySelector("select");
    expect(selectInRow).not.toBeNull();
    // StatusSelect は currentStatus を defaultValue に持つので "open" になっている
    expect(selectInRow?.value).toBe("open");

    // <select> が <a> の兄弟 <td> に属している (ancestor が <a> ではない)
    expect(selectInRow?.closest("a")).toBeNull();
  });
});
