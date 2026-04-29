# Technology Stack

## Architecture

Next.js 16 App Router によるフルスタック構成。**Server Components + Server Actions** をデフォルトとし、Client Component は本当にインタラクティブ性が必要な箇所だけに限定する。データ取得は Server Component から `lib/` 下のリポジトリ層を直接呼ぶ。書込みは Server Actions 経由で `revalidatePath` → `redirect` の流れに乗せる。

## Core Technologies

- **Language**: TypeScript 5（strict mode、`paths: { "@/*": ["./*"] }`）
- **Framework**: Next.js 16.2.4 / React 19.2.4（App Router、`react-jsx`）
- **Runtime / Package Manager**: Bun（`mise.toml` で固定）
- **Styling**: Tailwind CSS v4（`@import "tailwindcss"` 形式、設定は `app/globals.css` の `@theme inline`）
- **Auth**: Better Auth `>= 1.6.9`（email + password、`nextCookies` プラグイン、`requireEmailVerification: false`）
- **Database**: Prisma + SQLite（`prismaAdapter` 経由、開発 DB は `prisma/dev.db`）
- **Validation**: Zod（フォーム入力・Server Action 引数の境界で必ず通す）
- **Lint / Format**: Biome 2.2（formatter + linter + organize-imports、indent 2 spaces）
- **Testing**: Vitest 4 + Testing Library（React / user-event / jest-dom）+ happy-dom（`vitest.config.ts`、`vitest.setup.ts`）

## Key Libraries

業務上の判断に影響するもののみ列挙：

- **better-auth**: セッションは Cookie ベース、`auth.api.getSession({ headers })` で取得。User 拡張は `additionalFields` で `role` を追加する方式（DB 直接操作はしない）
- **@prisma/client**: SQLite なので `contains` は LIKE 相当。インデックスはスキーマで明示
- **zod**: バリデーションメッセージは日本語固定。`safeParse` の結果から `fieldErrors` を組み立てて `ActionState` に詰める

## Development Standards

### Type Safety

- `strict: true` 前提。`any` は使わず、外部からの未知値は `unknown` で受けて zod で検証
- Prisma の戻り値はドメイン型（`@/lib/inquiries/types.ts`）にキャストして境界を明示

### Server / Client Boundary

- サーバ専用モジュールは先頭で `import "server-only"` を必ず宣言（例: `lib/authz.ts`、`lib/inquiries/repository.ts`、`lib/prisma.ts`）
- Server Action ファイルは先頭で `"use server"` を宣言、ファイル名は `actions.ts`
- Client Component は `"use client"` を宣言。フォームの状態管理が必要な場合は React 19 の `useActionState` パターンを使う

### Validation & Error Surface

- フォーム入力は `lib/validation.ts` の zod スキーマを再利用し、新規スキーマもここに集約
- Server Action は `ActionState<T>`（`idle | error | success`）を返す統一形を維持。エラーは `formError`（フォーム全体）と `fieldErrors`（フィールド単位）に分ける

### AuthN / AuthZ

- 認証チェックは `lib/authz.ts` の `requireUser` / `requireRole(role)` を経由する
- 所有者チェックが必要なリソースは `assertOwner(resource, user)` を必ず通す
- 例外メッセージは `"UNAUTHORIZED"` / `"FORBIDDEN"` の文字列で統一し、呼び出し側で分岐

### Code Quality

- `bun run check:fix`（= `biome check --write`）を **コード変更後に必ず実行**
- import 並び順は Biome の organize-imports に任せる（手で整えない）

### Testing

- ランナーは **Vitest**（`globals: false`、`environment: "happy-dom"`、`include: ["**/*.test.{ts,tsx}"]`）。`@/` エイリアスは `vitest.config.ts` の `resolve.alias` で tsconfig と揃える
- React コンポーネントのテストは `@testing-library/react` + `@testing-library/user-event`、マッチャは `@testing-library/jest-dom/vitest`（`vitest.setup.ts` で一括 import）
- テストファイルは **対象モジュールにコロケーション**（例: `components/ui/Button.tsx` ⇔ `components/ui/Button.test.tsx`）。`__tests__/` ディレクトリは作らない
- 各 `describe` の `afterEach` で `cleanup()` を呼び DOM をリセットする
- アサート文・テスト名は日本語で書いてよい（プロダクト方針と揃える）
- `vi.fn()` / `vi.mock()` で副作用を遮断し、Server Action / Better Auth クライアントなど外界依存はテスト境界でモックする

## Development Environment

### Required Tools

- Bun（`mise.toml` 経由で latest をピン）
- Prisma CLI（`bun run db:migrate` / `bun run db:generate` 経由）

### Common Commands

```bash
# Dev:        bun run dev
# Build:      bun run build
# Lint+Fmt:   bun run check:fix
# Test:       bun run test         # 単発実行
# Test watch: bun run test:watch
# DB migrate: bun run db:migrate
# DB client:  bun run db:generate
```

## Key Technical Decisions

- **Better Auth を採用**（Auth.js ではなく）: Credentials ベース DX と Next.js 16 互換のため。`>= 1.6.9` ピンは CVE-2026-41427 回避目的
- **SQLite 固定**: 社内・少人数利用想定で運用負荷を抑える。並行書込み要件が出るまでは PostgreSQL に移行しない
- **ロールはユーザーテーブルの文字列カラム**: `"employee" | "it-staff"` の 2 値固定。Better Auth Admin プラグインは導入しない
- **Tailwind はライト固定**: `dark:` バリアント / `prefers-color-scheme: dark` メディアクエリは使わない（OS 追従もしない）

---

_「どのライブラリを使うか」ではなく「どこで境界を引くか」を維持するためのファイル。新規ライブラリを加える前に、既存の境界（authz / repository / validation / actions）で済まないかを先に検討すること。_
