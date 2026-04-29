# Brief: it-inquiry-list

## Problem
社内の情報システム部門に届く問合せが、メール・チャット・口頭など複数経路に散在しており、受付状況を一覧で把握できる仕組みがない。
- **社員側の痛み**: 自分が出した問合せが今どうなっているか分からない
- **情シス側の痛み**: 全社からの問合せ全体像を一目で把握できず、優先順位付けや対応漏れの確認に手間がかかる

## Current State
- 専用の問合せ受付ツールは未導入（greenfield プロジェクト）
- 既存の Next.js 16 / React 19 / TypeScript / Tailwind 4 のスケルトン以外、機能実装は無し
- 認証基盤・DB・ドメインモデルとも未整備

## Desired Outcome
- 社員はアプリ内のフォームから問合せを登録できる
- 社員は自分が登録した問合せの一覧と現在の状態を確認できる
- 情シス部門担当者は全社の問合せを一覧で確認でき、検索・フィルタ・ソートで必要なものを素早く絞り込める

## Approach
**Approach 3: Better Auth + Prisma + SQLite（Next.js 16 App Router フルスタック）**

- 認証は **Better Auth v1.6.5 以上**（email + password / Credentials 相当、メール検証 OFF）を採用
- データ永続化は **Prisma + SQLite**（`prismaAdapter(prisma, { provider: "sqlite" })`）
- 一覧は Server Components でサーバ側描画、登録は Server Actions で実装
- ロールは「社員（employee）」と「情シス担当（it-staff）」の 2 種類。Better Auth Admin プラグイン or User テーブルへの `role` カラム手動追加のいずれかで実現（設計フェーズで確定）

**選定理由**:
- Credentials ベース認証の DX が Auth.js より洗練されており、本件のように「シンプルな email + password + ロール 2 種」のユースケースにフィット
- viability check で Next.js 16 / React 19 互換、MIT ライセンス、Prisma + SQLite 公式サポートを確認済み

## Scope
- **In**:
  - 問合せ登録フォーム（必須項目: タイトル、カテゴリ、本文）
  - 社員向け「自分の問合せ一覧」画面
  - 情シス担当向け「全件一覧」画面
  - 検索（キーワード）・フィルタ（カテゴリ、ステータス）・ソート（登録日時など）
  - email + password による認証、ログイン／ログアウト、サインアップ
  - 社員 / 情シス担当 の 2 ロールによる認可
  - 簡素なステータス管理（例: 受付済 / 対応中 / 完了 などの固定値、手動更新）
- **Out**:
  - 添付ファイル機能
  - 登録時のメール／チャット通知
  - SLA 管理、エスカレーション、自動割当
  - ナレッジベース、過去問合せの再利用フロー
  - 外部チケットシステム（Jira / Zendesk 等）連携
  - SSO（Microsoft Entra ID / Google Workspace 等）連携
  - 多言語化（日本語のみで開始）

## Boundary Candidates
- **認証境界**: Better Auth セッション管理 + ロール判定 ミドルウェア
- **データアクセス境界**: Prisma クライアント経由のリポジトリ層（問合せ CRUD、ユーザー取得）
- **UI 境界**:
  - 公開（未ログイン）: ログイン / サインアップ
  - 社員ロール: 問合せ登録、自分の一覧
  - 情シス担当ロール: 全件一覧
- **検索／フィルタ境界**: クエリパラメータ駆動の Server Component 検索ロジック

## Out of Boundary
- 担当者割当・ワークフロー（受付 → 対応中 → 完了 以外の遷移制御は持たない）
- 回答記録の本格的な管理（コメントスレッド、履歴差分など）
- 通知系（メール／Webhook／Push）一切
- 監査ログ・操作履歴
- 多テナント（複数会社対応）

## Upstream / Downstream
- **Upstream**:
  - Next.js 16 / React 19 / TypeScript / Tailwind 4 の既存スケルトン（`app/` 配下）
  - Better Auth、Prisma、SQLite の公式提供物
- **Downstream**（将来このスペックの上に乗る可能性のある機能）:
  - 通知連携（メール、Slack、Teams）
  - 担当者割当 / SLA 管理
  - ナレッジベース化、FAQ 自動生成
  - SSO 連携、外部チケットシステム連携

## Existing Spec Touchpoints
- **Extends**: なし（greenfield、本スペックが最初の機能スペック）
- **Adjacent**: なし

## Constraints
- フレームワーク: Next.js 16.2.4 / React 19.2.4 / TypeScript 5 / Tailwind CSS 4（既存スケルトンを踏襲）
- ライブラリバージョン:
  - **Better Auth は `>= 1.6.5`（推奨 1.6.9 以上）を pin**（Next.js 16 互換性 & CVE-2026-41427 回避のため）
  - Prisma は SQLite サポートする最新安定版
- DB: SQLite（社内・少人数利用想定であり同時書込制約は問題なし）
- 通知・添付・SSO は本スペックではスコープ外
- 言語: 日本語 UI のみで開始
