# Implementation Plan

## Foundation (基盤設定)

- [x] 1. プロジェクト依存関係の追加と環境設定
  - [x] 1.1 Better Auth、Prisma、Zod を package.json に追加してインストール
  - [x] 1.2 .env ファイルを作成し、DATABASE_URL、BETTER_AUTH_SECRET、BETTER_AUTH_URL を設定
  - [x] 1.3 .gitignore に prisma/dev.db*、.env、.env.local を追加
  - 完了状態: `bun install` が成功し、.env が設定されている
  - _Requirements: 1.1_

- [x] 2. Prisma スキーマ定義とデータベース初期化
  - [x] 2.1 Prisma を初期化し、schema.prisma に User、Account、Session、Inquiry モデルを定義
  - [x] 2.2 Prisma クライアントシングルトン (lib/prisma.ts) を実装
  - [x] 2.3 データベースマイグレーションを実行して dev.db を生成
  - 完了状態: `npx prisma migrate dev` が成功し、dev.db が生成されている
  - _Requirements: 1.1, 2.1_
  - _Boundary: Prisma Layer_

- [x] 3. Better Auth の設定と API ルート
  - [x] 3.1 lib/auth.ts で Better Auth サーバインスタンスを設定（ロール拡張含む）
  - [x] 3.2 lib/auth-client.ts でクライアント側 auth インスタンスを作成
  - [x] 3.3 app/api/auth/[...all]/route.ts で Better Auth ハンドラーをエクスポート
  - 完了状態: Better Auth エンドポイントが `/api/auth/*` で応答する
  - _Requirements: 1.1, 1.2, 1.3, 2.1_
  - _Boundary: Auth Domain_
  - _Depends: 2_

## Core (コア実装)

- [x] 4. 認可ヘルパーの実装
  - [x] 4.1 lib/authz.ts で requireUser、requireRole、assertOwner 関数を実装
  - [x] 4.2 server-only インポートを追加してクライアント側からの呼び出しを防止
  - 完了状態: Server Components/Actions からセッションとロール検証が可能
  - _Requirements: 1.7, 2.2, 2.3, 2.4, 2.5_
  - _Boundary: Authz Layer_
  - _Depends: 3_

- [x] 5. バリデーションスキーマの実装
  - [x] 5.1 lib/validation.ts で signupSchema、loginSchema、inquirySchema、statusUpdateSchema を実装
  - [x] 5.2 ActionState と ActionFieldErrors 型を定義
  - 完了状態: 全 Server Actions で Zod 検証が使用可能
  - _Requirements: 1.3, 3.4, 3.5, 6.1, 6.6_
  - _Boundary: Validation Layer_
  - _Depends: 2_

- [x] 6. 問合せドメイン型とラベルの実装
  - [x] 6.1 lib/inquiries/types.ts で Status、Category、Inquiry、InquiryListCriteria 型を定義
  - [x] 6.2 lib/inquiries/labels.ts で日本語ラベルマップを定義
  - 完了状態: 型安全な問合せデータ操作が可能
  - _Requirements: 3.2, 6.1_
  - _Boundary: Inquiry Types_
  - _Depends: 2_

- [ ] 7. 問合せリポジトリの実装
  - [ ] 7.1 lib/inquiries/repository.ts で listInquiries、createInquiry、updateInquiryStatus、findInquiryById を実装
  - [ ] 7.2 server-only インポートを追加
  - 完了状態: Prisma 経由で問合せの CRUD 操作が可能
  - _Requirements: 3.3, 4.1, 4.3, 5.2, 5.3, 5.4, 5.5, 6.2, 6.4_
  - _Boundary: Inquiry Repository_
  - _Depends: 2, 6_

- [ ] 8. 認証 Server Actions の実装
  - [ ] 8.1 app/(auth)/actions.ts で signupAction、loginAction、logoutAction を実装
  - [ ] 8.2 エラーハンドリングとロール別リダイレクトを実装
  - 完了状態: サインアップ・ログイン・ログアウトが機能する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: Auth Actions_
  - _Depends: 3, 4, 5_

- [ ] 9. 問合せ Server Actions の実装
  - [ ] 9.1 app/(employee)/inquiries/actions.ts で createInquiryAction を実装
  - [ ] 9.2 app/(it-staff)/admin/inquiries/actions.ts で updateInquiryStatusAction を実装
  - 完了状態: 問合せ登録とステータス更新が機能する
  - _Requirements: 3.3, 3.4, 3.6, 6.3, 6.4, 6.5_
  - _Boundary: Inquiry Actions_
  - _Depends: 4, 5, 7_

- [ ] 10. UI コンポーネントの実装
  - [ ] 10.1 components/auth/AuthForm.tsx と LogoutButton.tsx を実装
  - [ ] 10.2 components/inquiries/InquiryForm.tsx、InquiryList.tsx、InquiryFilterBar.tsx、StatusBadge.tsx、StatusSelector.tsx を実装
  - [ ] 10.3 components/ui/FieldError.tsx、EmptyState.tsx、Button.tsx を実装
  - 完了状態: 全 UI コンポーネントが使用可能
  - _Requirements: 3.1, 3.2, 4.2, 5.1, 5.2, 5.3, 5.4, 6.3_
  - _Boundary: UI Components_
  - _Depends: 5, 6_

## Integration (統合)

- [ ] 11. 認証ページとルートの実装
  - [ ] 11.1 app/(auth)/login/page.tsx でログインページを実装
  - [ ] 11.2 app/(auth)/signup/page.tsx でサインアップページを実装
  - 完了状態: /login と /signup で認証フォームが表示される
  - _Requirements: 1.1, 1.4, 1.5_
  - _Boundary: Auth Pages_
  - _Depends: 8, 10_

- [ ] 12. 社員向けページとレイアウトの実装
  - [ ] 12.1 app/(employee)/layout.tsx でロールガードと共通ヘッダーを実装
  - [ ] 12.2 app/(employee)/inquiries/page.tsx で自分の問合せ一覧を実装
  - [ ] 12.3 app/(employee)/inquiries/new/page.tsx で問合せ登録フォームを実装
  - 完了状態: 社員が問合せ登録と一覧確認ができる
  - _Requirements: 1.7, 2.2, 3.1, 4.1, 4.2, 4.3, 4.4_
  - _Boundary: Employee Pages_
  - _Depends: 4, 7, 9, 10_

- [ ] 13. 情シス担当向けページとレイアウトの実装
  - [ ] 13.1 app/(it-staff)/layout.tsx でロールガードと共通ヘッダーを実装
  - [ ] 13.2 app/(it-staff)/admin/inquiries/page.tsx で全件一覧と検索・フィルタ・ソートを実装
  - 完了状態: 情シス担当が全件一覧とステータス更新ができる
  - _Requirements: 1.7, 2.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - _Boundary: IT Staff Pages_
  - _Depends: 4, 7, 9, 10_

- [ ] 14. ミドルウェアとルート保護の実装
  - [ ] 14.1 middleware.ts で Edge ランタイムの Cookie 判定を実装
  - [ ] 14.2 保護ルートの未ログイン時リダイレクトを実装
  - 完了状態: 未ログインで保護ページにアクセスすると /login へリダイレクト
  - _Requirements: 1.7_
  - _Boundary: Middleware_
  - _Depends: 3_

- [ ] 15. ルートページとレイアウトの統合
  - [ ] 15.1 app/page.tsx を修正して認証状態に応じたリダイレクトを実装
  - [ ] 15.2 app/layout.tsx のメタデータを更新
  - 完了状態: ルートアクセス時にロール別ホームへリダイレクト
  - _Requirements: 1.4, 1.7_
  - _Boundary: Root Integration_
  - _Depends: 3, 12, 13_

## Validation (検証)

- [ ] 16. 認証フローの検証
  - [ ] 16.1 サインアップ→自動ログイン→社員ホーム遷移を検証
  - [ ] 16.2 ログイン・ログアウト・認証エラーを検証
  - 完了状態: 認証フローの全要件が満たされている
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: Auth Flow_
  - _Depends: 11, 14, 15_

- [ ] 17. 認可の検証
  - [ ] 17.1 ロール別画面アクセス制限を検証
  - [ ] 17.2 直接 URL アクセス時の認可拒否を検証
  - 完了状態: 認可の全要件が満たされている
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 4.5_
  - _Boundary: Authz Flow_
  - _Depends: 12, 13, 14_

- [ ] 18. 問合せ機能の検証
  - [ ] 18.1 問合せ登録と入力エラーを検証
  - [ ] 18.2 社員一覧と情シス全件一覧を検証
  - [ ] 18.3 検索・フィルタ・ソートを検証
  - [ ] 18.4 ステータス更新と反映を検証
  - 完了状態: 問合せ機能の全要件が満たされている
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - _Boundary: Inquiry Flow_
  - _Depends: 12, 13_
