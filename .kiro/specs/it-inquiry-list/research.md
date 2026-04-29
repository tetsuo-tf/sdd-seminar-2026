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
