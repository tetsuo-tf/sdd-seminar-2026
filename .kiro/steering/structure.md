# Project Structure

## Organization Philosophy

**Route Groups によるロール別の境界 + ドメイン別の `lib/` / `components/`**。

- ルーティング側は **Next.js App Router の Route Groups（`(group)`）でロール別に分離**し、グループの `layout.tsx` で認可チェックを行う
- ドメインロジックは **`lib/` 配下にロール非依存で配置**し、UI から切り離す
- UI コンポーネントは **`components/<domain>/` または `components/ui/`** に置き、ページから直接 import する

新しい機能を追加するときは、まず「ロール（誰が見るか）」と「ドメイン（何を扱うか）」を決め、それぞれ既存の Route Group / `lib/` ドメインに収まらないか検討する。

## Directory Patterns

### Auth & Role-scoped Routes

**Location**: `app/(auth)/`, `app/(employee)/`, `app/(it-staff)/`
**Purpose**: ロール別 UI とその認可境界。グループ直下の `layout.tsx` で `requireRole` を呼び、未ログイン → `/login`、権限不足 → `/login` にリダイレクトする。
**Example**: `app/(employee)/layout.tsx` で `requireRole("employee")`、配下の `inquiries/page.tsx` は社員ロール前提で書ける。

### Server Actions（コロケーション）

**Location**: `app/<route>/actions.ts`
**Purpose**: そのルートに閉じた書込み操作。ファイル先頭で `"use server"`、戻り値は必ず `ActionState<T>` 形。バリデーションは `lib/validation.ts` の zod スキーマを通す。
**Example**: `app/(employee)/inquiries/actions.ts` の `createInquiryAction` が `inquirySchema.safeParse → requireRole → createInquiry → revalidatePath → redirect` の流れを踏む。

### Domain Logic (`lib/<domain>/`)

**Location**: `lib/inquiries/`, `lib/auth.ts`, `lib/authz.ts`, `lib/validation.ts`, `lib/prisma.ts`
**Purpose**: サーバ側のドメインロジック・横断ユーティリティ。Prisma 直叩きはここでのみ許可し、ページ / Action はリポジトリ関数を呼ぶ。
**Example**: `lib/inquiries/repository.ts`（永続化）、`lib/inquiries/types.ts`（ドメイン型）、`lib/inquiries/labels.ts`（日本語ラベル）。サーバ専用モジュールは先頭で `import "server-only"`。

### UI Components

**Location**: `components/<domain>/` and `components/ui/`
**Purpose**:
- `components/<domain>/`: ドメインに紐づく組み立て済みコンポーネント（例: `inquiries/InquiryForm.tsx`、`auth/AuthForm.tsx`）
- `components/ui/`: ドメイン非依存のプリミティブ（`Button`、`EmptyState`、`FieldError` など）。ビジネスロジックを持たない。

### Auth API Route

**Location**: `app/api/auth/[...all]/route.ts`
**Purpose**: Better Auth のハンドラを Catch-all で公開する単一の入口。ここ以外で auth エンドポイントを増やさない。

### Database

**Location**: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/dev.db`
**Purpose**: SQLite スキーマと開発用 DB。Prisma クライアントは `lib/prisma.ts` の単一インスタンス経由でのみ参照。

## Naming Conventions

- **ファイル**:
  - ページ / レイアウト: Next.js 規約（`page.tsx`, `layout.tsx`）
  - Server Actions: `actions.ts`
  - コンポーネント: PascalCase（例: `InquiryList.tsx`, `StatusBadge.tsx`）
  - ライブラリ: kebab / lower case（例: `auth-client.ts`, `repository.ts`）
- **コンポーネント**: PascalCase、named export を基本とする
- **関数**:
  - Server Action: `<verb><Entity>Action`（例: `createInquiryAction`）
  - リポジトリ: `<verb><Entity>` / `find<Entity>By<Key>` / `list<Entity>`
  - 認可: `require<X>` / `assert<X>`
- **型**: PascalCase、ドメイン型は `lib/<domain>/types.ts` に集約
- **定数 / リテラル集合**: `SCREAMING_SNAKE_CASE`（例: `STATUS_VALUES`, `CATEGORY_LABELS`）

## Import Organization

```typescript
// 1) サーバ専用宣言（必要な場合のみ、最上部）
import "server-only";

// 2) Node / Next / React など外部
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// 3) サードパーティ
import { z } from "zod";

// 4) プロジェクト内（@/ エイリアス）
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

// 5) 同一ディレクトリ
import { STATUS_LABELS } from "./labels";
```

**Path Alias**:
- `@/` → プロジェクトルート（`tsconfig.json` の `paths` で定義）。**プロジェクト内参照は基本的に `@/` を使い**、相対 import は同一ディレクトリ内に限定。

並び替えは Biome の organize-imports に任せ、手動で整えない。

## Code Organization Principles

- **境界の方向**: `app/`（UI / Action） → `lib/<domain>/`（ドメイン） → `lib/prisma.ts`（永続化）。逆方向の依存は禁止（`lib/` 内から `app/` を import しない）。
- **認可は層の入口で**: ページは `layout.tsx`、Server Action は関数の冒頭で `requireRole` を呼ぶ。リポジトリ層では認可を行わない（呼び出し側責務）。
- **所有者チェックは明示**: 自分のリソースのみ操作する画面でも、`assertOwner` を省略しない。
- **CSR / SSR の境界**: `"use client"` は対象ファイル全体に波及するため、Client 化が必要な部品だけを切り出して import する。ページ全体を Client 化しない。
- **スタイル**: Tailwind v4 のユーティリティを直接使う。`dark:*` バリアントは使わない（ライト固定方針）。再利用したいスタイルは `components/ui/` のコンポーネントとして括り出す。

---

_新ファイルが既存パターン（Route Group / `lib/<domain>/` / `components/<domain>/` のいずれか）に収まるならこの steering の更新は不要。新しい層やパターンを導入する場合のみ追記する。_
