# IT 問合せ管理システム

社内向けの **IT 問合せ受付・一覧** アプリケーション。社員はフォームから問合せを登録し、自分の問合せの状態を確認できます。情シス担当は全社の問合せを一覧し、ステータスを更新します。

このリポジトリは **Spec-Driven Development（Kiro 流）** で運用しています。コードを書く前に `.kiro/steering/` と `.kiro/specs/` を読むことから始めてください。

---

## まずはここを読む

| 場所 | 内容 |
|---|---|
| `.kiro/steering/product.md` | プロダクトの目的・スコープ |
| `.kiro/steering/tech.md` | 採用技術と開発標準（**コード変更前に必読**） |
| `.kiro/steering/structure.md` | ディレクトリ規約・命名規則・依存方向 |
| `.kiro/specs/<feature>/` | 個別機能の要件 / 設計 / タスク |
| `CLAUDE.md` | エージェント運用ルール（人間も参考になる） |

`.kiro/steering/` は AI エージェントだけでなく **人間の開発者にとってもプロジェクトの正典** です。記述と実装が乖離していると感じたら、コードを直すか steering を更新するかを必ず判断してください。

---

## 技術スタック概要

| カテゴリ | 採用 |
|---|---|
| 言語 / 型 | TypeScript 5（strict） |
| フレームワーク | Next.js 16.2.4 App Router / React 19.2.4 |
| パッケージ管理 / ランタイム | Bun（`mise.toml` で固定） |
| スタイル | Tailwind CSS v4（**ライト固定**、`dark:` バリアントは使わない） |
| 認証 | Better Auth ≥ 1.6.9（email + password、Cookie セッション） |
| データベース | Prisma + SQLite（`prisma/dev.db`） |
| バリデーション | Zod |
| Lint / Format | Biome 2.2（formatter + linter + organize-imports） |

詳細・設計判断の理由は `.kiro/steering/tech.md` を参照。

---

## 初期セットアップ

### 1. 必要ツール

- [mise](https://mise.jdx.dev/)（推奨）または Bun 直接インストール
- Git

mise を使う場合、リポジトリのルートで自動的に `bun = "latest"` がアクティベートされます。

### 2. 依存インストール

```bash
bun install
```

### 3. 環境変数

`.env.example` をコピーして `.env` を作成し、`BETTER_AUTH_SECRET` を任意の十分長いランダム文字列に置き換えてください。

```bash
cp .env.example .env
# その後 .env を開いて BETTER_AUTH_SECRET を変更
```

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | SQLite ファイルのパス。デフォルトのままでローカル開発可 |
| `BETTER_AUTH_SECRET` | セッション署名に使う秘密鍵。**ローカルでも必ず変更** |
| `BETTER_AUTH_URL` | アプリの公開 URL。ローカルは `http://localhost:3000` |

### 4. データベースのマイグレーション

```bash
bun run db:migrate    # マイグレーション適用
bun run db:generate   # Prisma クライアント生成
```

`prisma/dev.db` がローカルに作成されます。スキーマを変更したら必ず `db:migrate` を再実行してください。

### 5. 開発サーバ起動

```bash
bun run dev
```

[http://localhost:3000](http://localhost:3000) を開き、`/signup` から最初のユーザーを作成してください。

---

## 主要コマンド

```bash
bun run dev            # 開発サーバ
bun run build          # 本番ビルド
bun run start          # 本番サーバ起動

bun run check:fix      # Biome で format + lint + import 並べ替え（コード変更後に必ず実行）
bun run check          # Biome チェックのみ（CI 用）
bun run lint           # lint のみ
bun run format         # format のみ

bun run db:migrate     # Prisma マイグレーション
bun run db:generate    # Prisma クライアント生成
```

> **重要**: コードを変更したら **必ず `bun run check:fix` を実行** してから commit してください（CLAUDE.md / steering での合意事項）。

---

## ロールと初期データ

ユーザーロールは 2 種類：

- `employee`（社員）: 自分の問合せのみ閲覧・登録できる
- `it-staff`（情シス担当）: 全件閲覧・ステータス更新ができる

サインアップしたユーザーはデフォルトで `employee` になります。`it-staff` ユーザーを作るには、SQLite を直接編集してください：

```bash
sqlite3 prisma/dev.db "UPDATE User SET role='it-staff' WHERE email='your@email.example';"
```

> ロール切替の管理 UI は意図的に持っていません（運用想定が小規模のため）。

---

## ディレクトリ早見表

```
app/
  (auth)/              ログイン / サインアップ（未ログイン向け）
  (employee)/          社員向けページ。layout.tsx で requireRole("employee")
  (it-staff)/          情シス向けページ。layout.tsx で requireRole("it-staff")
  api/auth/[...all]/   Better Auth のハンドラ（唯一の auth エンドポイント）
  layout.tsx           ルートレイアウト
  page.tsx             ロールに応じたリダイレクト

components/
  auth/                認証フォーム・ログアウトボタン
  inquiries/           問合せドメインの組み立て済みコンポーネント
  ui/                  ドメイン非依存のプリミティブ（Button, EmptyState など）

lib/
  auth.ts              Better Auth 初期化
  authz.ts             requireUser / requireRole / assertOwner（"server-only"）
  validation.ts        Zod スキーマと ActionState 型
  prisma.ts            Prisma クライアントの単一インスタンス
  inquiries/           問合せドメイン（types / repository / labels）

prisma/
  schema.prisma        Prisma スキーマ
  migrations/          マイグレーション履歴
  dev.db               ローカル開発 DB（git 管理外）

.kiro/
  steering/            プロジェクトの正典（必読）
  specs/<feature>/     機能ごとの仕様書
```

依存方向は **`app/` → `lib/<domain>/` → `lib/prisma.ts`** の一方向。`lib/` から `app/` を import してはいけません。詳細は `.kiro/steering/structure.md`。

---

## コントリビューションの流れ

このプロジェクトは Kiro 流の Spec-Driven Development を採用しています。新機能を追加するときは、いきなりコードを書かずに以下の手順を踏んでください。

1. **Discovery**: アイデアの粒度を明確化（`/kiro-discovery "アイデア"`）
2. **Specification**: 要件 → 設計 → タスクの 3 段階を承認制で進める
   - 一括: `/kiro-spec-quick <feature>`
   - 段階的: `/kiro-spec-init` → `/kiro-spec-requirements` → `/kiro-spec-design` → `/kiro-spec-tasks`
3. **Implementation**: タスク単位で実装（`/kiro-impl <feature> [タスク番号]`）
4. **Validation**: 完了前に検証（`/kiro-validate-impl <feature>` / `/kiro-verify-completion`）

各フェーズで人間レビューを行い、`-y` フラグは「意図的なファストトラック」のときだけ使用します。詳しい運用ルールは `CLAUDE.md` を参照してください。

### 既存機能を修正する場合

- 該当 spec（`.kiro/specs/<feature>/`）の要件・設計と変更内容を突き合わせる
- 仕様変更が必要な場合は spec を先に更新してからコードを直す
- スタイルは Tailwind ユーティリティを直接使う（`dark:*` は禁止）

### コミット前チェックリスト

- [ ] `bun run check:fix` を実行した
- [ ] スキーマ変更を伴うなら `bun run db:migrate` 済み
- [ ] `.env` などの秘匿情報を commit していない
- [ ] 変更が spec の範囲内に収まっている（または spec を更新した）

---

## トラブルシューティング

| 症状 | 原因 / 対応 |
|---|---|
| `Prisma Client not generated` | `bun run db:generate` を実行 |
| ログインしてもリダイレクトループ | `BETTER_AUTH_SECRET` が未設定 / `.env` が読まれていない |
| `dev.db` が壊れた | `prisma/dev.db` を削除 → `bun run db:migrate` で再作成（**ローカル限定**） |
| Better Auth で認証が通らない | `BETTER_AUTH_URL` がアクセス元と一致しているか確認 |
| ダークモードで表示が崩れる | 当プロジェクトはライト固定。`dark:*` クラスを追加していないか確認 |

---

## 困ったら

- **仕様**: `.kiro/specs/<feature>/requirements.md` と `design.md`
- **方針**: `.kiro/steering/`
- **エージェント運用**: `CLAUDE.md` / `AGENTS.md`
- **進捗確認**: `/kiro-spec-status <feature>`
