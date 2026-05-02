/**
 * 統合フロー検証テスト (タスク 20.1) — Page レンダ統合部分
 *
 * 「一覧 → 詳細 → 戻り」の URL round-trip 等価性と、詳細ページの
 * 全項目描画経路を、Vitest + Testing Library で end-to-end に近い形で
 * 固定化する。Action レイヤの revalidate 範囲検証は責務分離のため
 * 別ファイル `actions.test.ts` で扱う (mock 戦略が異なるため)。
 *
 * 各単体テスト (page.test.tsx / [id]/page.test.tsx) で個別シナリオは
 * 既にカバー済みのため、本ファイルは「単体間で跨る不変条件」のみを
 * 重点的に検証する:
 *   - 一覧タイトルリンクで生成された URL の searchParams を、詳細ページの
 *     戻りリンクが完全に同等に再現できること (round-trip 等価性, 要件 7.6)
 *   - 詳細ページが有効 inquiry に対してエンドツーエンドで全項目 + 戻り導線 +
 *     StatusSelect を出力する経路全体が壊れていないこと (要件 7.2〜7.5)
 *   - 不在 id 経路 (要件 7.7) を end-to-end で再確認
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { CATEGORY_LABELS } from "@/lib/inquiries/labels";
import type { InquiryWithOwner } from "@/lib/inquiries/types";
import DetailPage from "./[id]/page";
import ListPage from "./page";

// ----- Mocks -----------------------------------------------------------------

const listInquiriesMock = vi.fn();
const findInquiryByIdMock = vi.fn();
const requireRoleMock = vi.fn();
const updateInquiryStatusSimpleMock = vi.fn();

vi.mock("@/lib/inquiries/repository", () => ({
  listInquiries: (...args: unknown[]) => listInquiriesMock(...args),
  findInquiryById: (...args: unknown[]) => findInquiryByIdMock(...args),
}));

vi.mock("@/lib/authz", () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

// StatusSelect が import する Server Action を、レンダ時の副作用を避けるためスタブ化
vi.mock("@/app/(it-staff)/admin/inquiries/actions", () => ({
  updateInquiryStatusSimple: (...args: unknown[]) =>
    updateInquiryStatusSimpleMock(...args),
}));

// next/navigation の useRouter / useSearchParams を AppRouterContext 不在環境向けにスタブ化
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

// ----- Fixtures --------------------------------------------------------------

const stubItStaff: SessionUser = {
  id: "it-staff-1",
  email: "it-staff@example.com",
  name: "情シス担当",
  role: "it-staff",
};

const fixedCreatedAt = new Date("2026-04-15T10:30:00.000Z");

const inquiryFixture: InquiryWithOwner = {
  id: "id-vpn",
  ownerId: "u2",
  title: "VPN 接続エラー",
  category: "network",
  body: "VPN に繋がりません\n何度試しても同じです\nご対応お願いします",
  status: "in_progress",
  createdAt: fixedCreatedAt,
  updatedAt: fixedCreatedAt,
  owner: {
    id: "u2",
    name: "佐藤花子",
    email: "sato@example.com",
  },
};

// ----- Tests -----------------------------------------------------------------

describe("IT Staff Detail Flow 統合 (タスク 20.1, page render)", () => {
  beforeEach(() => {
    listInquiriesMock.mockReset();
    findInquiryByIdMock.mockReset();
    requireRoleMock.mockReset();
    updateInquiryStatusSimpleMock.mockReset();
    requireRoleMock.mockResolvedValue(stubItStaff);
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * シナリオ 1 + 4 横断:
   * 一覧で生成されたタイトルリンク URL に詳細ページが遷移し、その詳細画面の
   * 戻りリンクが元の searchParams を完全に再現することを round-trip で検証する。
   * これにより「一覧 → 詳細 → 一覧 (フィルタ復元)」の状態保持を機械的に保証する。
   */
  it("一覧→詳細→戻り の URL round-trip で keyword/status/sort が完全保持される", async () => {
    listInquiriesMock.mockResolvedValue([inquiryFixture]);
    findInquiryByIdMock.mockResolvedValue(inquiryFixture);

    const originalSearchParams = {
      keyword: "VPN",
      status: "in_progress",
      sort: "createdAt_asc",
    };

    // --- 一覧側 ---
    const listResult = render(
      await ListPage({ searchParams: Promise.resolve(originalSearchParams) }),
    );

    const titleLink = listResult.container.querySelector<HTMLAnchorElement>(
      `a[href^="/admin/inquiries/${inquiryFixture.id}"]`,
    );
    expect(titleLink).not.toBeNull();

    const titleHref = titleLink?.getAttribute("href") ?? "";
    const [titlePath, titleQs] = titleHref.split("?");
    expect(titlePath).toBe(`/admin/inquiries/${inquiryFixture.id}`);
    const titleParsed = new URLSearchParams(titleQs);
    expect(titleParsed.get("keyword")).toBe(originalSearchParams.keyword);
    expect(titleParsed.get("status")).toBe(originalSearchParams.status);
    expect(titleParsed.get("sort")).toBe(originalSearchParams.sort);

    listResult.unmount();

    // --- 詳細側: 一覧で生成された URL のクエリをそのまま渡してレンダ ---
    // (Next.js は /admin/inquiries/{id}?... アクセス時、詳細ページに同等の
    //  searchParams を流し込む。本テストはその仕様を直接シミュレートする)
    const detailSearchParams = Object.fromEntries(titleParsed.entries());

    const detailResult = render(
      await DetailPage({
        params: Promise.resolve({ id: inquiryFixture.id }),
        searchParams: Promise.resolve(detailSearchParams),
      }),
    );

    const expectedBackQs = new URLSearchParams(originalSearchParams).toString();
    const expectedBackHref = `/admin/inquiries?${expectedBackQs}`;

    const backLinks =
      detailResult.container.querySelectorAll<HTMLAnchorElement>(
        `a[href="${expectedBackHref}"]`,
      );
    expect(backLinks.length).toBeGreaterThan(0);

    // 戻りリンクの href から再構成した検索条件が、最初の検索条件と完全一致する
    const backHref = backLinks[0].getAttribute("href") ?? "";
    const [backPath, backQs] = backHref.split("?");
    expect(backPath).toBe("/admin/inquiries");
    const backParsed = new URLSearchParams(backQs);
    expect(backParsed.get("keyword")).toBe(originalSearchParams.keyword);
    expect(backParsed.get("status")).toBe(originalSearchParams.status);
    expect(backParsed.get("sort")).toBe(originalSearchParams.sort);
  });

  /**
   * シナリオ 1〜3 横断 end-to-end レンダ:
   * 詳細ページが有効な inquiry に対し、タイトル/カテゴリ/本文(改行保持)/
   * 登録者/登録日時/StatusSelect/戻り導線まで、ページ全体が壊れずに
   * 描画される経路を確認する (回帰防護)。
   */
  it("有効な id で詳細ページが全項目 + StatusSelect + 戻り導線を描画する", async () => {
    findInquiryByIdMock.mockResolvedValue(inquiryFixture);

    const { container } = render(
      await DetailPage({
        params: Promise.resolve({ id: inquiryFixture.id }),
        searchParams: Promise.resolve({ keyword: "VPN" }),
      }),
    );

    // タイトル
    expect(container.querySelector("h2")?.textContent).toBe(
      inquiryFixture.title,
    );

    // カテゴリ日本語ラベル
    expect(container.textContent).toContain(
      CATEGORY_LABELS[inquiryFixture.category],
    );

    // 本文 (改行保持: whitespace-pre-wrap + 生の \n を保持)
    const bodyEl = container.querySelector(".whitespace-pre-wrap");
    expect(bodyEl).not.toBeNull();
    expect(bodyEl?.textContent).toBe(inquiryFixture.body);
    expect(bodyEl?.textContent).toContain("\n");

    // 登録者
    expect(container.textContent).toContain(inquiryFixture.owner.name);

    // 登録日時 (ja-JP 整形)
    const expectedDate = new Date(fixedCreatedAt).toLocaleString("ja-JP");
    expect(container.textContent).toContain(expectedDate);

    // StatusSelect (現在ステータス in_progress を defaultValue で表示)
    const select = container.querySelector("select");
    expect(select).not.toBeNull();
    expect(select?.value).toBe(inquiryFixture.status);

    // 戻り導線 (keyword のみ保持)
    const backLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/admin/inquiries?keyword=VPN"]',
    );
    expect(backLink).not.toBeNull();
    expect(backLink?.textContent).toContain("一覧に戻る");

    // findInquiryById が正しい id で呼ばれている
    expect(findInquiryByIdMock).toHaveBeenCalledWith(inquiryFixture.id);
  });

  /**
   * シナリオ 5 (回帰):
   * 不在 id を URL 直入力した想定で、EmptyState と一覧戻り導線が
   * 描画されることを確認する。詳細ページの null 分岐が壊れていない保証。
   */
  it("不在 id では EmptyState と一覧戻り導線を描画する (URL 直入力ケース)", async () => {
    findInquiryByIdMock.mockResolvedValue(null);

    const { container } = render(
      await DetailPage({
        params: Promise.resolve({ id: "nonexistent" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(container.textContent).toContain("対象の問合せが見つかりません");
    const backLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/admin/inquiries"]',
    );
    expect(backLink).not.toBeNull();
    expect(backLink?.textContent).toContain("一覧に戻る");

    // 通常表示が出ていない
    expect(container.querySelector("select")).toBeNull();
  });
});
