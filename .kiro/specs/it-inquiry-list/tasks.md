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

- [x] 7. 問合せリポジトリの実装
  - [x] 7.1 lib/inquiries/repository.ts で listInquiries、createInquiry、updateInquiryStatus、findInquiryById を実装
  - [x] 7.2 server-only インポートを追加
  - 完了状態: Prisma 経由で問合せの CRUD 操作が可能
  - _Requirements: 3.3, 4.1, 4.3, 5.2, 5.3, 5.4, 5.5, 6.2, 6.4_
  - _Boundary: Inquiry Repository_
  - _Depends: 2, 6_

- [x] 8. 認証 Server Actions の実装
  - [x] 8.1 app/(auth)/actions.ts で signupAction、loginAction、logoutAction を実装
  - [x] 8.2 エラーハンドリングとロール別リダイレクトを実装
  - 完了状態: サインアップ・ログイン・ログアウトが機能する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: Auth Actions_
  - _Depends: 3, 4, 5_

- [x] 9. 問合せ Server Actions の実装
  - [x] 9.1 app/(employee)/inquiries/actions.ts で createInquiryAction を実装
  - [x] 9.2 app/(it-staff)/admin/inquiries/actions.ts で updateInquiryStatusAction を実装
  - 完了状態: 問合せ登録とステータス更新が機能する
  - _Requirements: 3.3, 3.4, 3.6, 6.3, 6.4, 6.5_
  - _Boundary: Inquiry Actions_
  - _Depends: 4, 5, 7_

- [x] 10. UI コンポーネントの実装
  - [x] 10.1 components/auth/AuthForm.tsx と LogoutButton.tsx を実装
  - [x] 10.2 components/inquiries/InquiryForm.tsx、InquiryList.tsx、InquiryFilterBar.tsx、StatusBadge.tsx、StatusSelector.tsx を実装
  - [x] 10.3 components/ui/FieldError.tsx、EmptyState.tsx、Button.tsx を実装
  - 完了状態: 全 UI コンポーネントが使用可能
  - _Requirements: 3.1, 3.2, 4.2, 5.1, 5.2, 5.3, 5.4, 6.3_
  - _Boundary: UI Components_
  - _Depends: 5, 6_

## Integration (統合)

- [x] 11. 認証ページとルートの実装
  - [x] 11.1 app/(auth)/login/page.tsx でログインページを実装
  - [x] 11.2 app/(auth)/signup/page.tsx でサインアップページを実装
  - 完了状態: /login と /signup で認証フォームが表示される
  - _Requirements: 1.1, 1.4, 1.5_
  - _Boundary: Auth Pages_
  - _Depends: 8, 10_

- [x] 12. 社員向けページとレイアウトの実装
  - [x] 12.1 app/(employee)/layout.tsx でロールガードと共通ヘッダーを実装
  - [x] 12.2 app/(employee)/inquiries/page.tsx で自分の問合せ一覧を実装
  - [x] 12.3 app/(employee)/inquiries/new/page.tsx で問合せ登録フォームを実装
  - 完了状態: 社員が問合せ登録と一覧確認ができる
  - _Requirements: 1.7, 2.2, 3.1, 4.1, 4.2, 4.3, 4.4_
  - _Boundary: Employee Pages_
  - _Depends: 4, 7, 9, 10_

- [x] 13. 情シス担当向けページとレイアウトの実装
  - [x] 13.1 app/(it-staff)/layout.tsx でロールガードと共通ヘッダーを実装
  - [x] 13.2 app/(it-staff)/admin/inquiries/page.tsx で全件一覧と検索・フィルタ・ソートを実装
  - 完了状態: 情シス担当が全件一覧とステータス更新ができる
  - _Requirements: 1.7, 2.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - _Boundary: IT Staff Pages_
  - _Depends: 4, 7, 9, 10_

- [x] 14. ミドルウェアとルート保護の実装
  - [x] 14.1 middleware.ts で Edge ランタイムの Cookie 判定を実装
  - [x] 14.2 保護ルートの未ログイン時リダイレクトを実装
  - 完了状態: 未ログインで保護ページにアクセスすると /login へリダイレクト
  - _Requirements: 1.7_
  - _Boundary: Middleware_
  - _Depends: 3_

- [x] 15. ルートページとレイアウトの統合
  - [x] 15.1 app/page.tsx を修正して認証状態に応じたリダイレクトを実装
  - [x] 15.2 app/layout.tsx のメタデータを更新
  - 完了状態: ルートアクセス時にロール別ホームへリダイレクト
  - _Requirements: 1.4, 1.7_
  - _Boundary: Root Integration_
  - _Depends: 3, 12, 13_

## Validation (検証)

- [x] 16. 認証フローの検証
  - [x] 16.1 サインアップ→自動ログイン→社員ホーム遷移を検証
  - [x] 16.2 ログイン・ログアウト・認証エラーを検証
  - 完了状態: 認証フローの全要件が満たされている
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Boundary: Auth Flow_
  - _Depends: 11, 14, 15_

- [x] 17. 認可の検証
  - [x] 17.1 ロール別画面アクセス制限を検証
  - [x] 17.2 直接 URL アクセス時の認可拒否を検証
  - 完了状態: 認可の全要件が満たされている
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 4.5_
  - _Boundary: Authz Flow_
  - _Depends: 12, 13, 14_

- [x] 18. 問合せ機能の検証
  - [x] 18.1 問合せ登録と入力エラーを検証
  - [x] 18.2 社員一覧と情シス全件一覧を検証
  - [x] 18.3 検索・フィルタ・ソートを検証
  - [x] 18.4 ステータス更新と反映を検証
  - 完了状態: 問合せ機能の全要件が満たされている
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - _Boundary: Inquiry Flow_
  - _Depends: 12, 13_

## Requirement 7 Extension (要件7: 情シス担当向け問合せ詳細表示)

- [ ] 19. 情シス担当向け問合せ詳細表示の実装
  - [ ] 19.1 (P) 詳細ページコンポーネントの新規作成
    - `app/(it-staff)/admin/inquiries/[id]/page.tsx` を Server Component として新規作成
    - `findInquiryById(params.id)` でデータ取得、戻り値が存在する場合はタイトル・カテゴリ（日本語ラベル）・本文（`whitespace-pre-wrap break-words` で改行保持）・登録者氏名・登録日時（`toLocaleString("ja-JP")`）・現在ステータス（`StatusBadge`）を表示
    - 詳細画面に `StatusSelect` を埋め込みステータス変更を可能にする（既存の `updateInquiryStatusSimple` を呼び出し、`router.refresh()` で再描画）
    - `searchParams`（keyword/status/sort）を保持した一覧戻りリンクを `<Link href="/admin/inquiries?...">` 形式で設置
    - `findInquiryById` が `null` を返した場合は `EmptyState` で「対象の問合せが見つかりません」+ 一覧戻り導線を表示（`notFound()` は使用しない）
    - 詳細ページ内でも `requireRole("it-staff")` を呼び二重防御（Action 直叩き経路を保護）
    - 完了状態: it-staff ロールで `/admin/inquiries/{有効id}` にアクセスして全項目（本文を改行保持で含む）が表示され、`StatusSelect` でステータス変更ができ、戻りリンクで一覧へ遷移できる。存在しない id の場合は EmptyState が表示される
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 2.3, 6.3_
    - _Boundary: IT Staff Detail Page_

  - [ ] 19.2 (P) 全件一覧のタイトル列リンク化と searchParams 持ち回し
    - `app/(it-staff)/admin/inquiries/page.tsx` のタイトル列を `<Link href="/admin/inquiries/{id}?{現在のsearchParams}">` で wrap
    - `URLSearchParams` で keyword/status/sort のうち値があるものだけを query string に組み立て直して詳細URLに付与
    - `StatusSelect` セルはリンク外を維持し、行内クリックの操作衝突を回避（タイトル列のみリンク）
    - リンクの見た目は `text-blue-600 hover:underline` 等で視認性を確保
    - 完了状態: 全件一覧画面でフィルタを適用した状態でタイトルをクリックすると、フィルタ条件を保持した URL で詳細画面に遷移する
    - _Requirements: 7.1, 7.6_
    - _Boundary: IT Staff List Page_

  - [ ] 19.3 (P) ステータス更新 Action の revalidate 範囲を layout モードへ拡大
    - `app/(it-staff)/admin/inquiries/actions.ts` の `revalidatePath("/admin/inquiries")` を `revalidatePath("/admin/inquiries", "layout")` に変更
    - 既存の `revalidatePath("/inquiries")`（社員側反映用）は維持
    - これにより詳細ページ追加後も配下が一括 revalidate され、詳細パスを actions.ts に列挙する手間を排除
    - 完了状態: 一覧／詳細いずれの画面からステータス変更しても、`/admin/inquiries` 配下と `/inquiries` の両方が次回アクセス時に最新値で再描画される
    - _Requirements: 6.4, 7.5_
    - _Boundary: IT Staff Inquiry Actions_

  - [ ] 19.4 (P) 詳細ページのコンポーネント単体テスト
    - `app/(it-staff)/admin/inquiries/[id]/page.test.tsx` を新規作成（structure.md のコロケーション規約に従う）
    - `findInquiryById` を `vi.mock` でモックし、以下2シナリオを検証:
      - **有効な inquiry**: タイトル / カテゴリ日本語ラベル / 本文（改行保持を `whitespace-pre-wrap` クラスまたは DOM テキストノードで確認）/ 登録者氏名 / 登録日時（ja-JP 整形）/ ステータスバッジ / `StatusSelect` / 戻りリンクの全要素が描画される。戻りリンク `<a>` の `href` が与えた searchParams を query string として保持している
      - **不在 ID**: `EmptyState`（「対象の問合せが見つかりません」テキスト）と一覧戻り導線が描画される
    - Server Component の async 関数を `await` して返却 JSX を `render` する Vitest + Testing Library パターン（既存 `LogoutButton.test.tsx` の慣行を踏襲、`afterEach(cleanup)` も含む）
    - `requireRole` も `vi.mock` でモックして it-staff セッションを返すスタブを与える
    - 完了状態: `bun run test` で `[id]/page.test.tsx` の全テストが pass、本文の改行保持が DOM 上で確認できる
    - _Depends: 19.1_
    - _Requirements: 7.2, 7.3, 7.4, 7.6, 7.7_
    - _Boundary: app/(it-staff)/admin/inquiries/[id]/page_

  - [ ] 19.5 (P) 一覧タイトル列リンクのコンポーネント単体テスト
    - `app/(it-staff)/admin/inquiries/page.test.tsx` を新規作成（コロケーション）
    - `listInquiries` を `vi.mock` でモックし、複数件の inquiry を返すスタブを与える
    - `requireRole` のモックも添えて it-staff セッションを返す
    - 検証項目:
      - 各行のタイトル列が `<a href="/admin/inquiries/{id}?{保持query}">タイトル</a>` 形式で生成される
      - searchParams の組み合わせ（空 / `keyword` のみ / `keyword + status + sort` 全項目）3パターンで href が期待通りに組み立てられる
      - `StatusSelect` セルがタイトルリンク `<a>` の外（独立した `<td>` 内）に配置されている（行内クリックでの操作衝突回避）
    - 完了状態: `bun run test` で `page.test.tsx` の全テストが pass、リンク href が searchParams を正しく保持していることが確認できる
    - _Depends: 19.2_
    - _Requirements: 7.1, 7.6_
    - _Boundary: app/(it-staff)/admin/inquiries/page_

- [ ] 20. 詳細表示機能の検証
  - [ ] 20.1 詳細表示・戻り導線・ステータス変更の統合フロー検証
    - it-staff でログイン → 全件一覧でフィルタ（keyword/status/sort）を適用 → タイトルクリックで詳細遷移
    - 詳細画面で本文の改行が保持されて表示されることを確認
    - 詳細画面でステータスを変更 → `router.refresh()` 後に詳細画面の表示ステータスが更新されることを確認
    - 戻りリンクで一覧に戻った時、適用していたフィルタ条件が復元されていること、および変更したステータスが一覧上にも反映されていることを確認
    - 存在しない id を URL バー直入力で指定 → `EmptyState`（「対象の問合せが見つかりません」+ 一覧戻り導線）が表示されることを確認
    - 完了状態: 上記5シナリオを手動またはE2E（Playwright等）で通過し、すべて期待通り動作する
    - _Depends: 19.1, 19.2, 19.3_
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
    - _Boundary: IT Staff Detail Flow_

  - [ ] 20.2 認可境界の再検証（employee ロール / 未ログイン）
    - employee ロールで `/admin/inquiries/{任意のid}` を直接アクセス → `(it-staff)/layout.tsx` のロールガードにより `/login`（または認可エラー画面）へリダイレクトされることを確認
    - 未ログイン状態で `/admin/inquiries/{任意のid}` を直接アクセス → middleware（`proxy.ts`）または layout により `/login` へリダイレクトされることを確認
    - 完了状態: 上記2ケースとも保護されており、employee や未ログイン経路から問合せ詳細の閲覧・ステータス変更が一切できない
    - _Depends: 19.1_
    - _Requirements: 2.2, 2.4, 4.5_
    - _Boundary: Authz Flow_
