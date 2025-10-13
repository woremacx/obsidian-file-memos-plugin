# Phase 3 Implementation Notes

## 実施日時
2025-10-11

## 実装内容

### 1. CardComponent の拡張
- **折りたたみ・展開機能**:
  - カードヘッダーに折りたたみボタン追加
  - `collapsed` 状態の管理
  - chevron アイコンで視覚的なフィードバック

- **カードチェックボックス**:
  - 各カードにチェックボックスを追加
  - `checked` 状態の管理
  - チェック済みカードは半透明表示

- **CardState インターフェース**:
  ```typescript
  interface CardState {
    collapsed: boolean;
    checked: boolean;
  }
  ```

- **状態変更コールバック**:
  - `onStateChange` コールバックで親コンポーネントに通知
  - リアルタイムで状態を保存

- **カードヘッダー**:
  - チェックボックス
  - 折りたたみボタン
  - タイムスタンプ/ブロックタイプ表示

### 2. MemosView の状態管理
- **ViewState 管理**:
  - カードごとの状態をインデックスで管理
  - LocalStorageに永続化
  - ファイルパスをキーとして保存

- **タイムスタンプ自動生成**:
  - "Add Card" ボタンでタイムスタンプ付き見出しを追加
  - `formatTimestamp()` ユーティリティ使用
  - デフォルトフォーマット: `## YYYY-MM-DD HH:mm`

- **Markdownファイル書き戻し**:
  - `app.vault.modify()` でファイル更新
  - 新規カード追加時に自動書き戻し
  - 書き戻し後にビューを自動リロード

- **状態の永続化**:
  - `loadViewState()`: ファイルオープン時に状態を読み込み
  - `saveViewState()`: 状態変更時に保存
  - キー: `memos-state-${filePath}`

### 3. スタイリングの追加
- **カードヘッダー**:
  - フレックスレイアウト
  - 下ボーダーで区切り
  - コントロールとインフォの配置

- **折りたたみボタン**:
  - 透明背景
  - ホバー時に色変更
  - SVGアイコンサイズ調整

- **チェック済みカード**:
  - `memos-card-checked` クラス
  - opacity: 0.6
  - セカンダリ背景色

- **Add Card ボタン**:
  - アクセントカラー背景
  - ヘッダー右側に配置
  - ホバーエフェクト

- **折りたたみ状態**:
  - `.collapsed` クラスで `display: none`

### 4. 実装の特徴

#### 状態管理
- カードインデックスベースの状態管理
- ファイルごとに独立した状態
- LocalStorageで永続化

#### ユーザーインタラクション
- クリック一つで折りたたみ/展開
- チェックボックスで完了管理
- ボタン一つで新規カード追加

#### ファイル整合性
- Vault APIを使用した安全な書き込み
- 書き戻し後の自動リロード
- エラーハンドリング

### 5. ビルドと動作確認
- TypeScript型チェック成功
- ビルド成功: main.js生成
- 全機能が正常に動作

## 技術的な実装詳細

### カードコンポーネントの構造
```
.memos-card
  .memos-card-header
    input.memos-card-checkbox
    button.memos-collapse-btn (icon)
    span.memos-card-info
  .memos-card-content (collapsible)
    [block content]
```

### 状態フロー
1. ユーザーがチェックボックスをクリック
2. CardComponent が checked 状態を更新
3. onStateChange コールバックで MemosView に通知
4. MemosView が cardStates を更新
5. saveViewState() で localStorage に保存

### タイムスタンプ生成フロー
1. "Add Card" ボタンクリック
2. formatTimestamp() で現在時刻取得
3. `## YYYY-MM-DD HH:mm` 形式の見出し生成
4. ファイルに追記
5. ビューをリロードして表示

## 次のステップ（Phase 4）
- カードのドラッグ&ドロップ
- カード内容の編集機能
- カードの削除機能
- ビュー切り替えトグル
- 設定UI

## ファイル構成
```
src/
├── main.ts              # プラグインエントリーポイント
├── MemosView.ts         # カスタムビュー（状態管理追加）
├── CardComponent.ts     # カードコンポーネント（インタラクション追加）
├── MarkdownParser.ts    # Markdown解析
└── utils.ts             # ユーティリティ関数
styles.css               # スタイル（カードヘッダー追加）
main.js                  # ビルド済みプラグイン
```

## 統計
- 更新ファイル: 3個（CardComponent.ts, MemosView.ts, styles.css）
- 新規機能: 折りたたみ、チェックボックス、タイムスタンプ、状態永続化
- CSSセレクタ: 約15個追加
- LocalStorage使用: ファイルごとの状態保存
