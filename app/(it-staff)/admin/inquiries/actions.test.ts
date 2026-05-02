/**
 * 統合フロー検証テスト (タスク 20.1) — Action revalidate 部分
 *
 * 詳細画面でのステータス変更が、戻った一覧および社員側の一覧に反映されることを
 * Action レイヤの `revalidatePath` 呼び出しを通じて機械的に保証する。
 *
 * 関連シナリオ:
 *   - シナリオ 3: 詳細画面でステータス変更 → 表示更新 (要件 7.5)
 *   - シナリオ 4: 戻った一覧にもステータス変更が反映される (要件 6.4)
 *
 * `revalidatePath("/admin/inquiries", "layout")` は配下の `[id]` 詳細ページを
 * 含めて invalidate するため、要件 6.4 と 7.5 を 1 行で満たしている (design.md
 * Components and Interfaces > Server Actions の Implementation Notes 参照)。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { updateInquiryStatusAction } from "./actions";

const updateInquiryStatusMock = vi.fn();
const requireRoleMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/inquiries/repository", () => ({
  updateInquiryStatus: (...args: unknown[]) => updateInquiryStatusMock(...args),
}));

vi.mock("@/lib/authz", () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

// validation.ts は zod に依存しているが、vitest + happy-dom 環境下では
// `"use server"` ファイルから zod ESM の名前空間オブジェクト `z` の解決が
// 不安定になる事象がある。Action のテストでは validation.ts の振る舞い
// (statusUpdateSchema による検証) のみを最小限で再現するスタブで置換する。
vi.mock("@/lib/validation", () => {
  const STATUS_VALUES = ["open", "in_progress", "done"];
  type Parsed = {
    success: boolean;
    data?: { inquiryId: string; nextStatus: string };
    error?: { errors: Array<{ path: string[]; message: string }> };
  };
  const safeParse = (input: {
    inquiryId: string;
    nextStatus: string;
  }): Parsed => {
    const errors: Array<{ path: string[]; message: string }> = [];
    if (!input.inquiryId || input.inquiryId.length === 0) {
      errors.push({ path: ["inquiryId"], message: "問合せIDが必要です" });
    }
    if (!STATUS_VALUES.includes(input.nextStatus)) {
      errors.push({
        path: ["nextStatus"],
        message: "有効なステータスを選択してください",
      });
    }
    if (errors.length > 0) {
      return { success: false, error: { errors } };
    }
    return { success: true, data: input };
  };
  return {
    statusUpdateSchema: { safeParse },
  };
});

const stubItStaff: SessionUser = {
  id: "it-staff-1",
  email: "it-staff@example.com",
  name: "情シス担当",
  role: "it-staff",
};

describe("updateInquiryStatusAction revalidate 範囲 (タスク 20.1, 要件 6.4 / 7.5)", () => {
  beforeEach(() => {
    updateInquiryStatusMock.mockReset();
    requireRoleMock.mockReset();
    revalidatePathMock.mockReset();
    requireRoleMock.mockResolvedValue(stubItStaff);
    updateInquiryStatusMock.mockResolvedValue({
      id: "id-vpn",
      ownerId: "u2",
      title: "VPN 接続エラー",
      category: "network",
      body: "...",
      status: "done",
      createdAt: new Date("2026-04-15T10:30:00.000Z"),
      updatedAt: new Date("2026-04-15T10:30:00.000Z"),
    });
  });

  it("成功時に /admin/inquiries(layout) と /inquiries の両方を revalidate する", async () => {
    const formData = new FormData();
    formData.set("inquiryId", "id-vpn");
    formData.set("nextStatus", "done");

    const result = await updateInquiryStatusAction(
      { status: "idle" },
      formData,
    );

    expect(result.status).toBe("success");

    // 認可と更新が実行されている
    expect(requireRoleMock).toHaveBeenCalledWith("it-staff");
    expect(updateInquiryStatusMock).toHaveBeenCalledWith("id-vpn", "done");

    // 要件 6.4 / 7.5: 詳細経路 (layout 配下) と社員側の双方を revalidate する
    // /admin/inquiries は "layout" モードで配下の [id] 詳細も invalidate
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/admin/inquiries",
      "layout",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/inquiries");
    // 余計な path を invalidate していない (cache 効果の保全)
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
  });

  it("検証エラー時 (空の inquiryId) は revalidate しない", async () => {
    const formData = new FormData();
    formData.set("inquiryId", "");
    formData.set("nextStatus", "done");

    const result = await updateInquiryStatusAction(
      { status: "idle" },
      formData,
    );

    expect(result.status).toBe("error");
    expect(updateInquiryStatusMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
