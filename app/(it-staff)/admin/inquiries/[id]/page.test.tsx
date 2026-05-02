import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/inquiries/labels";
import type { InquiryWithOwner } from "@/lib/inquiries/types";
import Page from "./page";

const findInquiryByIdMock = vi.fn();
const requireRoleMock = vi.fn();
const updateInquiryStatusSimpleMock = vi.fn();

vi.mock("@/lib/inquiries/repository", () => ({
  findInquiryById: (...args: unknown[]) => findInquiryByIdMock(...args),
}));

vi.mock("@/lib/authz", () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock("@/app/(it-staff)/admin/inquiries/actions", () => ({
  updateInquiryStatusSimple: (...args: unknown[]) =>
    updateInquiryStatusSimpleMock(...args),
}));

// next/navigation の useRouter を AppRouterContext 不在のテスト環境向けにスタブ化
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const stubUser: SessionUser = {
  id: "it-staff-1",
  email: "it-staff@example.com",
  name: "情シス担当",
  role: "it-staff",
};

const fixedCreatedAt = new Date("2026-04-15T10:30:00.000Z");

const sampleInquiry: InquiryWithOwner = {
  id: "test-id-1",
  ownerId: "owner-1",
  title: "テスト問合せ",
  category: "hardware",
  body: "1行目\n2行目\n3行目",
  status: "open",
  createdAt: fixedCreatedAt,
  updatedAt: fixedCreatedAt,
  owner: {
    id: "owner-1",
    name: "山田太郎",
    email: "yamada@example.com",
  },
};

describe("ITStaffInquiryDetailPage", () => {
  beforeEach(() => {
    findInquiryByIdMock.mockReset();
    requireRoleMock.mockReset();
    updateInquiryStatusSimpleMock.mockReset();
    requireRoleMock.mockResolvedValue(stubUser);
  });

  afterEach(() => {
    cleanup();
  });

  describe("有効な inquiry が見つかった場合", () => {
    beforeEach(() => {
      findInquiryByIdMock.mockResolvedValue(sampleInquiry);
    });

    it("タイトル / カテゴリ / 本文 / 登録者 / 登録日時 / ステータスバッジ / StatusSelect を描画する", async () => {
      const params = Promise.resolve({ id: "test-id-1" });
      const searchParams = Promise.resolve({
        keyword: "テスト",
        status: "open",
        sort: "createdAt_desc",
      });

      render(await Page({ params, searchParams }));

      // Requirement 7.2: 全項目表示
      expect(screen.getByText("テスト問合せ")).toBeInTheDocument();
      expect(screen.getByText(CATEGORY_LABELS.hardware)).toBeInTheDocument();
      expect(screen.getByText("山田太郎")).toBeInTheDocument();

      // Requirement 7.4: 詳細画面にステータスバッジ表示
      // (StatusBadge と StatusSelect 両方に "受付済" が出るので getAllByText で確認)
      const statusOpenLabels = screen.getAllByText(STATUS_LABELS.open);
      expect(statusOpenLabels.length).toBeGreaterThan(0);

      // 登録日時: ja-JP 整形
      const expectedDate = new Date(fixedCreatedAt).toLocaleString("ja-JP");
      expect(screen.getByText(expectedDate)).toBeInTheDocument();

      // findInquiryById が正しい id で呼ばれている
      expect(findInquiryByIdMock).toHaveBeenCalledWith("test-id-1");

      // requireRole("it-staff") が呼ばれている (二重防御)
      expect(requireRoleMock).toHaveBeenCalledWith("it-staff");
    });

    it("本文を改行保持で表示する (whitespace-pre-wrap クラス + 改行を含むテキスト)", async () => {
      // Requirement 7.3: 本文の改行保持
      const params = Promise.resolve({ id: "test-id-1" });
      const searchParams = Promise.resolve({});

      const { container } = render(await Page({ params, searchParams }));

      // 改行保持を担保する CSS クラスが付与された div を取得
      const bodyEl = container.querySelector(".whitespace-pre-wrap");
      expect(bodyEl).not.toBeNull();
      // 改行コードを含む生のテキスト (textContent) で改行が保持されている
      expect(bodyEl?.textContent).toBe("1行目\n2行目\n3行目");
      // break-words クラスも併用されている (design.md の指定)
      expect(bodyEl?.className).toContain("whitespace-pre-wrap");
      expect(bodyEl?.className).toContain("break-words");

      // 一部の行テキストも確認 (空白正規化された getByText で部分マッチ)
      expect(screen.getByText(/1行目/)).toBeInTheDocument();
    });

    it("StatusSelect (select 要素) が描画され、3つのステータス選択肢を持つ", async () => {
      // Requirement 7.4: ステータス変更可能
      const params = Promise.resolve({ id: "test-id-1" });
      const searchParams = Promise.resolve({});

      const { container } = render(await Page({ params, searchParams }));

      const select = container.querySelector("select");
      expect(select).not.toBeNull();
      expect(select?.value).toBe("open");

      const options = select?.querySelectorAll("option") ?? [];
      expect(options.length).toBe(3);
      const optionValues = Array.from(options).map((o) => o.value);
      expect(optionValues).toEqual(["open", "in_progress", "done"]);
    });

    it("戻りリンクが searchParams (keyword/status/sort) を保持した URL を href に設定する", async () => {
      // Requirement 7.6: 戻り導線で検索条件再現
      const params = Promise.resolve({ id: "test-id-1" });
      const searchParams = Promise.resolve({
        keyword: "テスト",
        status: "open",
        sort: "createdAt_desc",
      });

      const { container } = render(await Page({ params, searchParams }));

      const expectedQs = new URLSearchParams({
        keyword: "テスト",
        status: "open",
        sort: "createdAt_desc",
      }).toString();
      const expectedHref = `/admin/inquiries?${expectedQs}`;

      const backLinks = container.querySelectorAll(`a[href="${expectedHref}"]`);
      expect(backLinks.length).toBeGreaterThan(0);
      // 「一覧に戻る」テキストの導線である
      const backLinkText = Array.from(backLinks)
        .map((a) => a.textContent)
        .join("");
      expect(backLinkText).toContain("一覧に戻る");
    });

    it("searchParams が空の場合、戻りリンクの href にクエリ文字列が付かない", async () => {
      const params = Promise.resolve({ id: "test-id-1" });
      const searchParams = Promise.resolve({});

      const { container } = render(await Page({ params, searchParams }));

      const backLinks = container.querySelectorAll(
        'a[href="/admin/inquiries"]',
      );
      expect(backLinks.length).toBeGreaterThan(0);
    });
  });

  describe("認可境界", () => {
    // 設計上の前提:
    //   - Edge ミドルウェア (proxy.ts) が cookie 不在時に /login へリダイレクト (E2E は Playwright で別途検証)
    //   - (it-staff)/layout.tsx の requireRole("it-staff") が一次防御
    //   - 詳細ページ自身の requireRole("it-staff") が二重防御
    // ここでは Vitest 環境で検証可能な「ページ自身の二重防御」を確認する。
    // requireRole が throw した場合、ページの描画 (Promise) が reject されることを保証する。

    it("employee ロールでアクセスした場合、ページ描画が FORBIDDEN で reject される (Requirement 2.2 / 2.4 / 4.5)", async () => {
      // requireRole("it-staff") に対して employee セッションを渡したときの挙動を再現
      requireRoleMock.mockReset();
      requireRoleMock.mockRejectedValue(new Error("FORBIDDEN"));

      const params = Promise.resolve({ id: "test-id-1" });
      const searchParams = Promise.resolve({});

      await expect(Page({ params, searchParams })).rejects.toThrow("FORBIDDEN");

      // ページが requireRole("it-staff") を呼んだことを検証 (二重防御の存在確認)
      expect(requireRoleMock).toHaveBeenCalledWith("it-staff");
      // ガード失敗後はリポジトリにアクセスしない
      expect(findInquiryByIdMock).not.toHaveBeenCalled();
    });

    it("未ログインでアクセスした場合、ページ描画が UNAUTHORIZED で reject される (Requirement 2.2 / 2.4 / 4.5)", async () => {
      // requireUser がセッション不在で throw する状況を再現
      requireRoleMock.mockReset();
      requireRoleMock.mockRejectedValue(new Error("UNAUTHORIZED"));

      const params = Promise.resolve({ id: "test-id-1" });
      const searchParams = Promise.resolve({});

      await expect(Page({ params, searchParams })).rejects.toThrow(
        "UNAUTHORIZED",
      );

      expect(requireRoleMock).toHaveBeenCalledWith("it-staff");
      expect(findInquiryByIdMock).not.toHaveBeenCalled();
    });
  });

  describe("inquiry が見つからない場合", () => {
    beforeEach(() => {
      findInquiryByIdMock.mockResolvedValue(null);
    });

    it("EmptyState (「対象の問合せが見つかりません」) と一覧戻り導線を描画する", async () => {
      // Requirement 7.7: ID 不在/不正時の EmptyState 表示
      const params = Promise.resolve({ id: "nonexistent-id" });
      const searchParams = Promise.resolve({});

      const { container } = render(await Page({ params, searchParams }));

      expect(
        screen.getByText("対象の問合せが見つかりません"),
      ).toBeInTheDocument();

      // 戻り導線 (searchParams 空のためクエリ無し)
      const backLinks = container.querySelectorAll(
        'a[href="/admin/inquiries"]',
      );
      expect(backLinks.length).toBeGreaterThan(0);
      expect(backLinks[0].textContent).toContain("一覧に戻る");

      // 通常表示の要素 (タイトル等) は描画されないこと
      expect(screen.queryByText("テスト問合せ")).not.toBeInTheDocument();
      expect(
        screen.queryByText(CATEGORY_LABELS.hardware),
      ).not.toBeInTheDocument();
      expect(container.querySelector("select")).toBeNull();
    });

    it("searchParams を持つ場合、EmptyState の戻り導線にもクエリを保持する", async () => {
      const params = Promise.resolve({ id: "nonexistent-id" });
      const searchParams = Promise.resolve({
        keyword: "abc",
        status: "in_progress",
      });

      const { container } = render(await Page({ params, searchParams }));

      const expectedQs = new URLSearchParams({
        keyword: "abc",
        status: "in_progress",
      }).toString();
      const backLinks = container.querySelectorAll(
        `a[href="/admin/inquiries?${expectedQs}"]`,
      );
      expect(backLinks.length).toBeGreaterThan(0);
    });
  });
});
