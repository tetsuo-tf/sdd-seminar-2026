# Research & Design Decisions

## Summary

- **Feature**: `it-inquiry-list`
- **Discovery Scope**: New Feature（greenfield）+ Complex Integration（Better Auth / Prisma / SQLite を Next.js 16 App Router 上に新規導入）
- **Key Findings**:
  - Better Auth `>= 1.6.5`（推奨 `1.6.9` 以上を pin）が Next.js 16 / React 19 と互換、CVE-2026-41427 への対処済み（brief.md viability check 済み）。
  - 2 ロール（employee / it-staff）の認可は Better Auth Admin プラグインを導入せず、`additionalFields` で `role` カラムを手動拡張する最小構成が Fit。Admin プラグインは複雑なロール階層・招待・追加 API を伴うため、本スペックの 2 ロール固定要件には過剰。
  - 「自分の問合せ一覧」と「全件一覧」は同一クエリ（任意 ownerId / status / keyword / sort）の特殊化。リポジトリ層で 1 関数に集約し、ビュー側で適用するフィルタを切り替える方針が一般化として妥当。

## Research Log

### Better Auth on Next.js 16 App Router

- **Context**: Next.js 16 / React 19 環境で email + password 認証 + 2 ロールを最小構成で実現できるか確認。
- **Sources Consulted**:
  - brief.md（viability check 済みの記述: Better Auth `>= 1.6.5`、推奨 `1.6.9` 以上、MIT License、Next.js 16 互換、`prismaAdapter(prisma, { provider: "sqlite" })` 公式サポート）。
  - Better Auth 公式ドキュメント `emailAndPassword.enabled`, `emailAndPassword.password.minLength`, `emailAndPassword.requireEmailVerification` の各オプション。
  - Better Auth `additionalFields` API（User テーブルへの追加カラム宣言と型推論）。
- **Findings**:
  - `auth.ts` で `betterAuth({ database: prismaAdapter(prisma, { provider: "sqlite" }), emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8 }, user: { additionalFields: { role: { type: "string", required: true, defaultValue: "employee", input: false } } } })` の最小構成で本スペック要件を充足。
  - `app/api/auth/[...all]/route.ts` で `toNextJsHandler(auth)` をエクスポートする標準形を採用。
  - サーバ側のセッション取得は `auth.api.getSession({ headers: await headers() })` を Server Component / Server Action / Middleware から共通利用可能。
  - クライアント側は `createAuthClient()`（`lib/auth-client.ts`）の `signIn`, `signUp`, `signOut` を React コンポーネントから呼ぶ標準パターンを採用（本スペックでは Server Action 主体のため最小限の利用）。
- **Implications**:
  - 認証スキーマは Better Auth が自動生成する `User`, `Session`, `Account`, `Verification` 4 テーブル + `User.role` 拡張カラムのみで成立。アプリ側の独自認証実装は不要。
  - `input: false` を `role` フィールドに付与することで、サインアップ API から外部値で role を上書きできない（権限昇格防止）。

### Prisma + SQLite 構成と Server Components 互換性

- **Context**: Prisma クライアントを Server Components / Server Actions / Middleware から安全に共有できるか、SQLite で同時アクセス制約が問題にならないか確認。
- **Sources Consulted**:
  - Prisma 公式ドキュメント: Next.js + dev サーバ HMR 対応の singleton パターン（`globalThis.prisma`）。
  - SQLite WAL モードの仕様（読取り並列・書込み直列）と Better Auth の同期 I/O 特性。
  - brief.md: 社内・少人数利用想定であり同時書込み制約は問題なし。
- **Findings**:
  - `lib/prisma.ts` で `globalThis.__prisma__` キャッシュによる singleton 化が dev での HMR でのコネクション枯渇を防ぐ標準解。
  - SQLite は WAL モード前提で読取り並列性は十分。書込み直列でも本スペックの想定同時書込み（数件/分）に対して制約にならない。
  - Middleware は Edge ランタイムで動作し Prisma を直接利用できないため、セッション存在判定だけは Cookie 名による軽量チェック（Better Auth の cookie プレフィックス）で行い、ロール判定は各ルート層（Server Component / Layout）で行う。
- **Implications**:
  - DB アクセスを伴う認可（ロール判定・所有者チェック）は必ず Node ランタイム側で実施。Edge ミドルウェアは「未ログイン → /login へリダイレクト」までを担当する。
  - Prisma Migration は `prisma migrate dev` で SQLite ファイルを生成（パスは `prisma/dev.db`、`.env` の `DATABASE_URL=file:./dev.db`）。

### 一覧クエリの一般化（generalization）

- **Context**: 社員向け「自分の問合せ一覧」と情シス向け「全件一覧 + 検索/フィルタ/ソート」を別実装にするか、共通化するか。
- **Findings**:
  - 両ビューはともに `Inquiry` を対象とした検索クエリで、社員ビューは `ownerId = sessionUserId` を強制適用、情シスビューは `ownerId` 制約なし + キーワード/ステータス/ソートが UI 経由で指定される、という違いのみ。
  - リポジトリ関数 `listInquiries(criteria: InquiryListCriteria)` を 1 つ用意し、`criteria.ownerId` / `criteria.status` / `criteria.keyword` / `criteria.sort` を全て optional として受け取る形で集約可能。
- **Implications**:
  - 一覧ロジックの重複を避け、後続の拡張（例: フィルタ追加）を 1 箇所で吸収できる。
  - 認可（社員は他者の ownerId を指定できない）はリポジトリではなく呼び出し側の Server Component / Server Action で強制する責務分離とする。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| App Router + Server Actions + Repository（採用） | Server Components で読み取り、Server Actions で書込み、`lib/inquiries/repository.ts` に Prisma 呼び出しを集約 | Next.js 16 / React 19 標準パターン。型安全、ボイラープレート最小、SSR で初期表示が速い | Repository を「サービス層」として育てない規律が必要 | brief で示された方針と一致 |
| Route Handlers（API Routes）中心 | `app/api/...` で REST 風エンドポイントを作り fetch する | 外部クライアント拡張が容易 | Server Actions に対し型・CSRF・リダイレクトの面で冗長。本スペックに外部 API 露出要件なし | 不採用 |
| Better Auth Admin プラグイン採用 | 役割管理を専用プラグインで実装 | ロール階層・招待・管理 API が揃う | 2 ロール固定の最小構成に対し過剰機能・追加マイグレーション・学習コスト | 不採用、`additionalFields` で代替 |

## Design Decisions

### Decision: 認証ライブラリ — Better Auth `>= 1.6.9` を採用

- **Context**: email + password、2 ロール、メール検証なしという最小要件を満たす認証基盤を選定。
- **Alternatives Considered**:
  1. Auth.js（NextAuth）: Credentials provider のセッション管理が Better Auth に比べ DX で劣り、role 拡張に独自 callbacks を要する。
  2. 自前実装（bcrypt + iron-session）: セッション管理・CSRF・パスワード再ハッシュ等を自実装する負債。
- **Selected Approach**: Better Auth `>= 1.6.5`（推奨 `1.6.9` 以上を pin）+ `prismaAdapter(prisma, { provider: "sqlite" })` + `additionalFields.role`。
- **Rationale**: 公式 Prisma/SQLite サポート、Next.js 16 互換、CVE-2026-41427 対処済み、必要なロール拡張が `additionalFields` のみで完結。
- **Trade-offs**: Better Auth のメジャーバージョンアップ時に追従が必要（マイグレーション計画は steering 側に集約予定）。
- **Follow-up**: `package.json` に `"better-auth": "^1.6.9"` を pin、`@better-fetch/fetch` を peer dependency 確認。

### Decision: ロールモデル — `additionalFields.role`（手動カラム拡張）

- **Context**: 2 ロール（`employee`, `it-staff`）の認可を最小コストで実現。
- **Alternatives Considered**:
  1. Better Auth Admin プラグイン: ロール階層・招待・管理 API を含むが本スペックでは過剰。
  2. 別テーブル `UserRole`: 1 ユーザ複数ロールを許容する将来拡張に向くが、本スペックは 1 ユーザ 1 ロール固定。
- **Selected Approach**: `User.role: string`（`"employee" | "it-staff"`）を `additionalFields` で宣言し、`input: false`、`defaultValue: "employee"`、`required: true` を付与。
- **Rationale**: 最小スキーマ、サインアップ経路からの権限昇格を遮断、TypeScript 型推論に乗る。
- **Trade-offs**: 将来 1 ユーザ複数ロールが要求された場合は別テーブル化のリファクタリングが必要 → Revalidation Triggers に明記。
- **Follow-up**: `it-staff` ユーザの初期投入は seed スクリプト（または運用手順での DB 直接更新）で行う。本スペックではサインアップ画面からは `employee` のみが作成される。

### Decision: ステータス・カテゴリ表現 — TS Union 型 + Prisma `String` カラム

- **Context**: SQLite は ENUM をサポートしないため、固定値集合をどう型安全に扱うか。
- **Alternatives Considered**:
  1. Prisma `enum`: SQLite では未サポート。
  2. 別テーブル `Category`, `Status`: 集合が動的に変わらない本要件には過剰。
- **Selected Approach**: TypeScript 側に `STATUS_VALUES = ["open", "in_progress", "done"] as const` と `CATEGORY_VALUES = [...] as const` を定義し、`Status = (typeof STATUS_VALUES)[number]` を導出。Prisma 側は `String` カラム + アプリ層検証で固定値集合を強制。
- **Rationale**: 型安全と SQLite 互換を両立、UI 表示用ラベル（日本語）と DB 値（英字）を分離して i18n 余地を残す。
- **Trade-offs**: DB 制約（CHECK）を持たないため、アプリ層と Zod スキーマで二重検証が必要。
- **Follow-up**: ラベル定義は `lib/inquiries/labels.ts` に集中させ、UI からのみ参照する。

### Decision: 検索・フィルタ条件の永続化先 — URL 検索パラメータ

- **Context**: 検索/フィルタ/ソート状態をリロード・別タブで再現する要件（5.7）。
- **Selected Approach**: URL の `searchParams`（`?keyword=...&status=...&sort=...`）に集約し、Server Component が直接 props で受け取る。クライアント側 state は持たない。
- **Rationale**: ブックマーク・共有・ブラウザ履歴と整合、Server Components の SSR 即時描画と相性が良い。
- **Trade-offs**: フィルタ操作のたびにナビゲーションが発生する（`router.replace`）。本スペックの想定操作頻度では問題なし。

### Decision: フォーム検証 — Zod を採用

- **Context**: サインアップ・ログイン・問合せ登録の入力検証を一貫した方法で行いたい。
- **Selected Approach**: Zod スキーマを `lib/validation.ts` に定義し、Server Actions の入口で `safeParse` する。エラーは `useActionState` 互換の構造化形式（`{ fieldErrors, formError }`）でクライアントに返す。
- **Rationale**: 軽量、TS 推論、Better Auth も内部で Zod を使用しており依存重複が少ない。
- **Trade-offs**: クライアント側でのリアルタイム検証は本スペックでは省略（送信時検証のみ）。要件は満たすが将来 UX 改善余地。

## Risks & Mitigations

- **Better Auth のメジャー追従コスト** — `package.json` で `^1.6.9` 範囲 pin、changelog 監視を運用ルールへ。
- **SQLite ファイル破損・バックアップ欠如** — `prisma/dev.db` は開発前提。本番運用に進める段階で Postgres 切替プランを別スペックで立てる旨を Out of Boundary に明記。
- **Edge Middleware で Prisma 利用不可** — Cookie 存在のみで未ログイン判定し、ロール判定は Node 側 Layout で実施。Middleware と Layout で 2 段ガードを行う規律を File Structure Plan に固定化。
- **CSRF / セッション固定** — Better Auth が標準で CSRF/Cookie SameSite 対策を提供。アプリ側で独自 fetch を行う場合は `credentials: "include"` 必須。本スペックは Server Actions 中心のため影響範囲は小。
- **権限昇格** — `role` フィールドに `input: false` を設定し、サインアップ経路から外部値が入らないことをコードレビューで担保。

## References

- brief.md（`.kiro/specs/it-inquiry-list/brief.md`）— viability check の根拠と Approach 3 採択経緯
- requirements.md（同ディレクトリ）— 要件 ID と境界
- Better Auth 公式: emailAndPassword 設定、`additionalFields`、`prismaAdapter` を本設計の根拠として参照
- Prisma 公式: Next.js + dev サーバの singleton パターン

---

# Gap Analysis (Requirement 7 追加 — 2026-04-30)

## Summary

- **Trigger**: it-staff からのクレーム（一覧で本文を確認できない）に基づき、Requirement 7「情シス担当向け問合せ詳細表示」を新規追加し、Req 2 / 4 / 5 / 6 を関連更新。
- **Scope of Gap**: 既存実装は `tasks-generated` フェーズで全 18 タスクが `[x]` 完了状態。今回の差分は **詳細ページ UI 追加** と **既存一覧・Action の小規模拡張** に限定される。
- **Highlight**: データ層（`findInquiryById`）と認可ヘルパ（`requireRole("it-staff")`）、ステータス更新 Action はすべて既存資産で要件 7.x をカバー可能。新規実装は 1 ページ + 1 リンク追加 + revalidate パス追加 が中心。
- **Recommendation**: **Option A（既存コンポーネント拡張）** を推奨。労力 S（1〜3 日）、リスク Low。

## Current State Investigation（既存資産の棚卸し）

### 再利用可能な既存資産

| 資産 | パス | 要件 7 への寄与 |
|------|------|----------------|
| `findInquiryById` | `lib/inquiries/repository.ts:52-69` | 詳細データ取得（Req 7.2、7.7） |
| `updateInquiryStatusAction` / `updateInquiryStatusSimple` | `app/(it-staff)/admin/inquiries/actions.ts:9-70` | 詳細画面からのステータス更新（Req 7.4、7.5）。既存の認可・Zod・revalidate を継承 |
| `requireRole("it-staff")` | `lib/authz.ts:25-33` | 詳細ページ Server Component の認可（Req 2.3） |
| `StatusBadge` | `components/inquiries/StatusBadge.tsx` | 現在ステータスの可視化（Req 7.2） |
| `StatusSelect` | `components/inquiries/StatusSelect.tsx` | 詳細画面のステータス変更 UI（Req 7.4）。`updateInquiryStatusSimple` を `router.refresh` 付きで呼ぶ既存パターンをそのまま使える |
| `CATEGORY_LABELS` / `STATUS_LABELS` | `lib/inquiries/labels.ts` | 表示ラベル（Req 7.2） |
| `EmptyState` | `components/ui/EmptyState.tsx` | 不在 ID 時の表示（Req 7.7） |
| 全件一覧 Page | `app/(it-staff)/admin/inquiries/page.tsx` | 行クリックの起点（Req 7.1）。`searchParams` を持ち回す導線の供給源（Req 7.6） |
| `(it-staff)/layout.tsx` ロールガード | 同上ディレクトリ | 配下 `[id]/page.tsx` に自動継承される（Req 2.3） |
| `(employee)/layout.tsx` ロールガード | `app/(employee)/layout.tsx` | employee の `/admin/...` 直アクセスは現行 middleware + layout 構成でカバー済み（Req 4.5） |

### 既存パターン上の制約

- **Server Component 主導**: 詳細ページも `async` Server Component で実装し、`searchParams` か `params` から `id` を受け取る Next.js 15+ 標準（`Promise<{ id: string }>`）に従う必要あり。`page.tsx` の例（一覧画面）が既に `Promise<...>` 形式なので踏襲。
- **Tailwind v4 ユーティリティ直書き**（structure.md 規約）: 詳細レイアウトもユーティリティで構築する。`dark:` 不可。
- **Server Action から `redirect` を使う際は try-catch 範囲外**（既存 `actions.ts` の慣行）: 詳細ページ側でステータス変更後にリロードしたい場合、`router.refresh()` を使う既存 `StatusSelect` パターンを流用するのが最小コスト。
- **`server-only` 規律**: 詳細ページから直接 `repository` を呼ぶ際は、Layout / Page が Server Component であることを保つ（`"use client"` を絶対に付けない）。
- **Bun + Biome の `check:fix`** をコミット前に必ず通す（CLAUDE.md / tech.md 規約）。

## Requirements Feasibility Analysis（要件 7 と既存ギャップ）

| 要件 | 必要な技術要素 | 既存資産で充足？ | 不足 / Gap |
|------|----------------|-----------------|-----------|
| 7.1 一覧の各行に詳細遷移導線 | 一覧 page の各行に `<Link>` を追加。`searchParams` を query string として詳細へ持ち回し | 一覧 page 既存。`StatusSelect` のセル位置とイベント分離（行クリック ≠ セレクト操作）の検討 | **Modify**: `app/(it-staff)/admin/inquiries/page.tsx`（行ラッピング または タイトル列をリンク化） |
| 7.2 詳細画面に全項目表示 | `findInquiryById` + Server Component で表示 | データ層完備、ラベルも完備 | **New**: `app/(it-staff)/admin/inquiries/[id]/page.tsx`（新規 Page） |
| 7.3 本文の改行保持表示 | `whitespace-pre-wrap` Tailwind ユーティリティで段落 div ラップ | Tailwind v4 採用済 | **New**: 詳細 Page 内で `<div className="whitespace-pre-wrap break-words">{body}</div>` |
| 7.4 詳細画面でのステータス変更 | `StatusSelect` を再利用 | 完成済 | **Reuse**: 既存 `StatusSelect` を詳細 Page に配置 |
| 7.5 変更後の永続化と通知・表示更新 | `updateInquiryStatusAction` + `revalidatePath("/admin/inquiries/[id]")` 追加 | Action 既存。`revalidatePath` は `/admin/inquiries` と `/inquiries` のみ revalidate 対象 | **Modify**: `actions.ts` の `revalidatePath` リストに詳細パスを追加（または `revalidatePath('/admin/inquiries', 'layout')` で配下一括 revalidate） |
| 7.6 一覧へ戻る導線 + 検索条件復元 | 詳細 URL に元の `searchParams` を query string で運び、戻りリンクで復元 | URL 駆動の状態管理は既存（5.7） | **New**: 一覧側でリンク生成時に `?keyword=...&status=...&sort=...` を付与、詳細側で同 query を `<Link href="/admin/inquiries?...">` に組み立て |
| 7.7 ID 不在/不正時の拒否表示 | `findInquiryById` の `null` 戻り判定 → Next.js `notFound()` または `EmptyState` 表示 | `findInquiryById` 既存 | **New**: 詳細 Page 内で `null` 分岐。Next.js 標準の `notFound()` を呼ぶか、`EmptyState` で「対象の問合せが見つかりません」表示 + 一覧へ戻る導線を出すか設計フェーズで確定 |
| 2.2 employee の詳細画面アクセス拒否 | `(employee)/layout.tsx` 配下に詳細 URL は存在しない構造 + middleware の `/admin/*` 保護 | 既存。`(it-staff)/layout.tsx` のロールガードが `[id]/page.tsx` に継承される | **Verify**: middleware.ts / (it-staff) layout のロール判定が `/admin/inquiries/[id]` も網羅することをテストで確認 |
| 4.5 employee の任意詳細 URL 直アクセス拒否 | 既存 ロールガードで自動的に拒否（employee は `(it-staff)/layout` を通過できない） | 既存ガードで網羅 | **Verify**: 動作確認のみ |
| 6.3 ステータス更新の発火点拡大 | 既存 Action は呼び出し場所を問わず同じ動作 | Action 既存 | **No Change**: Action 自体の変更不要 |
| 6.4 変更が複数画面で反映 | `revalidatePath` を `/admin/inquiries`, `/inquiries`, `/admin/inquiries/[id]` 3 箇所に発火 | 2 箇所まで実装済 | **Modify**: `actions.ts` で詳細パスを追加 revalidate（または `'layout'` モードで一括） |

### Research Needed（設計フェーズで詰める論点）

1. **戻り導線の URL 構築方法**:
   - 案 A: 一覧の Link 生成時に詳細 URL を `?return=${encodeURIComponent(currentSearch)}` で渡す（汎用、ブックマーク可能）
   - 案 B: 一覧の Link を `/admin/inquiries/{id}?keyword=...&status=...&sort=...` 形式で組み立て、詳細側で同 query を抽出して戻りリンクへ反映（既存の URL 駆動と一貫）
   - **推奨**: 案 B（既存パターンとの一貫性）。設計フェーズでフラット化方針を確定。

2. **ID 不在時の挙動**:
   - 案 A: Next.js `notFound()` → `not-found.tsx` で 404 表示
   - 案 B: 詳細 Page 内で `EmptyState` レンダ + 一覧へ戻る導線（要件 7.7 の「対象の問合せが見つからない旨を伝える表示と一覧へ戻る導線を表示」に文言レベルで近い）
   - **推奨**: 案 B（要件文言に直結）。`not-found.tsx` を作るほどでもなく、既存 `EmptyState` で吸収可能。

3. **行クリックの操作衝突**:
   - 各行に `<Link>` をかけ、ステータス変更セルだけ `<Link>` の外に出して `e.stopPropagation()` 不要にする構造が安全。詳細遷移は「タイトル列をリンク化」が最も衝突を招かない。
   - **推奨**: タイトル列のみリンク化。タイトル全体クリックでは詳細へ遷移、ステータス列はそのまま inline 操作。

4. **revalidatePath の戦略**:
   - 個別パス列挙（現行）: `/admin/inquiries`、`/inquiries`、`/admin/inquiries/[id]`
   - レイアウト一括: `revalidatePath('/admin/inquiries', 'layout')` で配下全部
   - **推奨**: `revalidatePath('/admin/inquiries', 'layout')` + 既存 `/inquiries` の併用。詳細パスを追加するたびに actions.ts を更新する手間を回避。

## Implementation Approach Options

### Option A: 既存コンポーネント拡張（推奨）

**When to consider**: 詳細ページが既存 IT 担当ルートグループの自然な追加で、データ層・認可・ステータス更新がすべて既存資産で賄える本ケースに最適。

- **対象ファイル**:
  - **新規**: `app/(it-staff)/admin/inquiries/[id]/page.tsx`（詳細 Page、Server Component）
  - **修正**: `app/(it-staff)/admin/inquiries/page.tsx`（タイトル列を `<Link>` 化、searchParams を保持）
  - **修正**: `app/(it-staff)/admin/inquiries/actions.ts`（revalidate 戦略を `layout` モードに切替、または詳細パス追加）
- **新規コンポーネント**: なし（既存の `StatusBadge`、`StatusSelect`、`CATEGORY_LABELS`、`EmptyState` を全部再利用）
- **互換性**: 既存 API（`updateInquiryStatusAction` / `findInquiryById`）の signature 変更なし。employee 側影響ゼロ。

**Trade-offs**:
- ✅ 新規ファイル 1 個・既存ファイル軽微修正のみ。労力最小
- ✅ 既存パターン（URL 駆動、Server Component）に完全整合
- ✅ ロール認可は (it-staff)/layout.tsx に集約済みで自動継承
- ❌ 一覧 page にリンク追加するとテーブルの DOM 構造が若干複雑化（`<Link>` を `<td>` 内に挟む）

**Effort**: S（1〜3 日）/ **Risk**: Low

### Option B: 新規 detail コンポーネント作成

**When to consider**: 詳細表示ロジックが大規模になり presentational コンポーネントとして括り出す価値がある場合。本ケースでは過剰。

- **追加**: `components/inquiries/InquiryDetailCard.tsx`（presentational 表示、props で受け取る）+ Page から使用
- **メリット**: 単体テストが書きやすい
- **デメリット**: 表示要素 6〜7 項目程度なので、Page から直接 JSX 書くのと比べて行数削減効果が薄い。`components/inquiries/` 規約上は配置可能だが、過剰分割

**Effort**: S（2〜3 日）/ **Risk**: Low

### Option C: ハイブリッド（小さな display + Page 直書きの混在）

**When to consider**: 詳細ページに今後 SLA・履歴・コメントなどの拡張が入ることが確実な場合の段階的構築。

- 本スペックは **Out of Boundary** で SLA / 履歴 / コメントを明示除外しているため、将来拡張前提の構成は不要。

**Effort**: M（3〜5 日）/ **Risk**: Low（ただし設計過剰）

## Implementation Complexity & Risk

### Effort Estimation

| Tier | 適用条件 | 本ケース判定 |
|------|----------|------------|
| **S（1〜3 日）** | 既存パターン踏襲、最小依存追加、UI 1 画面追加 | ✅ **該当**: 新規ファイル 1、既存ファイル小修正、新規依存なし |
| M（3〜7 日） | 新パターン導入、複数統合 | 該当しない |
| L（1〜2 週間） | 大規模機能、複数統合 | 該当しない |
| XL（2 週間〜） | アーキ変更、未知技術 | 該当しない |

### Risk Assessment

| Risk Level | 適用条件 | 本ケース判定 |
|-----------|----------|------------|
| **Low** | 既存パターン拡張、既知技術、明確スコープ、最小統合 | ✅ **該当**: 全て満たす |
| Medium | ガイダンス付き新パターン、管理可能な統合 | — |
| High | 未知技術、複雑統合、アーキ変更 | — |

**主要リスク要因**:
- ❌ DB スキーマ変更: なし（`Inquiry` テーブル既存のまま）
- ❌ 新規依存追加: なし
- ⚠️ 一覧 page の DOM 構造変更による既存 `StatusSelect` の操作衝突: 設計フェーズで「タイトル列のみリンク化」方針を確定すれば回避可能
- ⚠️ employee の詳細 URL 直アクセスの再検証: 既存の (it-staff)/layout ガードで自動拒否されるはずだが、middleware.ts のパターンマッチが `/admin/inquiries/[id]` を網羅していることを実装後に必ずテストで確認

## Recommendations for Design Phase

### Preferred Approach

**Option A（既存コンポーネント拡張）** を推奨。理由:
- 新規ファイル最小（詳細 Page 1 つ）
- 全ての要件 7.x が既存資産（findInquiryById / StatusSelect / requireRole）で賄える
- employee 側に一切影響しない（Boundary Context の "out of scope: 社員向け詳細画面" を自然に満たす）

### Key Design Decisions to Confirm in `/kiro-spec-design`

1. **戻り導線の URL 設計**: 案 B（query string をそのまま詳細 URL に持ち回し）を既存 5.7 パターンと整合させて確定
2. **ID 不在時の表示形態**: `EmptyState` ベース（要件 7.7 文言に直結）か Next.js `notFound()` か
3. **行クリックの衝突回避**: タイトル列のみリンク化に確定
4. **revalidatePath 戦略**: `revalidatePath('/admin/inquiries', 'layout')` で詳細追加時のメンテ負担を下げる

### Carry-forward Research Items

- Next.js 16 の `notFound()` と `not-found.tsx` の挙動が App Router の Route Group 配下で期待通り動くか念のため一次資料確認（過去に Next.js 13 系で挙動が変わった経緯あり）。本番影響度は低いため、設計フェーズで案 B（EmptyState）を採用する場合は不要。

### Files to Touch（実装段階の見取り図）

```
追加:
  app/(it-staff)/admin/inquiries/[id]/page.tsx      # 新規（詳細 Server Component）
  app/(it-staff)/admin/inquiries/[id]/page.test.tsx # 新規（コロケーションテスト、structure.md 規約）

修正:
  app/(it-staff)/admin/inquiries/page.tsx           # タイトル列 <Link> 化 + searchParams 持ち回し
  app/(it-staff)/admin/inquiries/actions.ts         # revalidatePath を 'layout' モードに切替

任意（推奨）:
  components/inquiries/InquiryList.tsx              # 既に未使用なら削除候補（現在の page.tsx は table 直書き）
```

> 注: 既存 `tasks.md` は全タスク `[x]` 完了状態のため、要件 7 の追加実装タスクは `/kiro-spec-tasks` で再生成し、追加分のみを `[ ]` で並べる方針が自然。
