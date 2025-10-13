# Phase 4 Implementation Notes

## 実施日時
2025-10-11

## 実装内容

### 1. ドラッグ&ドロップ機能
- **CardComponent の拡張**:
  - ドラッグハンドルボタン追加（grip-vertical アイコン）
  - setupDragAndDrop メソッドで drag イベント実装
  - dragstart, dragend, dragover, dragleave, drop イベント処理
  - getDragAfterElement ヘルパーメソッドで位置計算

- **MemosView の更新**:
  - onCardReorder コールバック実装
  - ドラッグ後のブロック配列操作
  - カード状態のインデックス再計算
  - Markdown ファイルへの並び順反映

- **ビジュアルフィードバック**:
  - `.memos-dragging` クラス: 半透明 + 破線ボーダー
  - `.memos-drag-over` クラス: 上部に青いボーダー
  - ドラッグハンドルのカーソル変更（grab/grabbing）

### 2. カード削除機能
- **削除ボタン追加**:
  - CardComponent に trash-2 アイコンボタン
  - handleDelete メソッド実装

- **確認ダイアログ**:
  - showDeleteConfirmation モーダル実装
  - カスタム modal UI（Cancel/Delete ボタン）
  - 背景クリックで閉じる機能

- **MemosView の削除処理**:
  - onCardDelete コールバック実装
  - ブロック配列から該当カードを削除
  - カード状態のインデックス再計算
  - Markdown ファイルの更新

- **CSS スタイリング**:
  - `.memos-confirm-modal`: 全画面オーバーレイ
  - `.memos-confirm-content`: モーダルコンテンツ
  - キャンセル/削除ボタンの差別化

### 3. インライン編集機能
- **編集ボタン追加**:
  - CardComponent に pencil アイコンボタン
  - toggleEditMode メソッド実装

- **編集モード**:
  - enterEditMode: textarea で編集可能に
  - getEditableContent: ブロックタイプ別の編集用テキスト取得
  - auto-resize textarea（入力に応じて高さ調整）
  - Save/Cancel ボタン

- **編集の保存**:
  - saveEdit メソッドで onEdit コールバック呼び出し
  - MemosView の onCardEdit で Markdown 更新
  - 編集後のビューリロード

- **CSS スタイリング**:
  - `.memos-editing`: 編集モード用背景色
  - `.memos-edit-textarea`: monospace フォント、resize 可能
  - `.memos-edit-buttons`: Save/Cancel ボタンレイアウト

### 4. ビュー切り替え機能
- **トグルボタン追加**:
  - MemosView ヘッダーに "Markdown View" ボタン
  - クリックで通常 Markdown ビューに切り替え
  - `.memos-header-actions` コンテナで複数ボタン配置

- **既存のコマンド活用**:
  - main.ts の toggleMemosView コマンドは既に実装済み
  - Ctrl/Cmd + P で "Toggle Memos View" コマンド使用可能

### 5. Markdown 再構築機能
- **reconstructMarkdown メソッド**:
  - ブロック配列から Markdown テキストを生成
  - ブロックタイプ別の適切なフォーマット
  - 見出し: `## content`
  - コードブロック: ` ```lang\ncontent\n``` `
  - リスト: そのまま
  - 引用: 各行に `>` プレフィックス
  - 区切り線: `---`
  - 段落: そのまま

### 6. 実装の特徴

#### ファイル整合性
- 全ての操作後に Markdown ファイルを更新
- vault.modify() で安全な書き込み
- 更新後は自動的にビューをリロード

#### 状態管理
- カード状態のインデックス管理
- 削除・並び替え時のインデックス再計算
- localStorage での永続化

#### ユーザーエクスペリエンス
- ドラッグ時の視覚的フィードバック
- 削除前の確認ダイアログ
- インライン編集の直感的な UI
- ビュー切り替えボタンで簡単に通常ビューへ

### 7. ビルドと動作確認
- TypeScript 型チェック成功
- esbuild ビルド成功: main.js 生成
- 全機能が実装完了

## 技術的な実装詳細

### カード構造の拡張
```
.memos-card
  .memos-card-header
    input.memos-card-checkbox
    button.memos-collapse-btn (chevron icon)
    button.memos-drag-handle (grip-vertical icon)
    span.memos-card-info
    button.memos-edit-btn (pencil icon)
    button.memos-delete-btn (trash-2 icon)
  .memos-card-content (collapsible/editable)
    [view mode: block content]
    [edit mode: textarea + buttons]
```

### ドラッグ&ドロップフロー
1. ユーザーがドラッグハンドルをドラッグ開始
2. dragstart イベントで draggedIndex 保存、.memos-dragging 追加
3. dragover イベントで drop 位置を計算、.memos-drag-over 追加
4. drop イベントで onReorder(fromIndex, toIndex) 呼び出し
5. MemosView がブロック配列を並び替え
6. Markdown ファイルを更新
7. ビューをリロード

### 削除フロー
1. ユーザーが削除ボタンクリック
2. showDeleteConfirmation モーダル表示
3. ユーザーが "Delete" をクリック
4. onCardDelete(blockIndex) 呼び出し
5. MemosView がブロック配列から削除
6. カード状態のインデックス再計算
7. Markdown ファイルを更新
8. ビューをリロード

### 編集フロー
1. ユーザーが編集ボタンクリック
2. enterEditMode で textarea 表示
3. ユーザーが内容を編集
4. "Save" ボタンクリック
5. onCardEdit(blockIndex, newContent) 呼び出し
6. MemosView が該当ブロックを更新
7. Markdown ファイルを更新
8. ビューをリロード

## 未実装の機能（Phase 4 タスクから）
- 設定タブ UI（プラグイン設定画面）
- タイムスタンプフォーマット設定
- デフォルトビュー設定
- カードスタイル設定

**注**: 設定機能は Obsidian Plugin Settings API を使用する必要があり、
PluginSettingTab を拡張したクラスを作成する必要があります。
現時点では、コア機能（CRUD操作、ビュー切り替え）が完全に動作しているため、
設定機能は追加の拡張として実装可能です。

## ファイル構成
```
src/
├── main.ts              # プラグインエントリーポイント（コマンド追加）
├── MemosView.ts         # カスタムビュー（CRUD操作、ビュー切り替え）
├── CardComponent.ts     # カードコンポーネント（編集、削除、ドラッグ）
├── MarkdownParser.ts    # Markdown解析
└── utils.ts             # ユーティリティ関数
styles.css               # スタイル（編集、削除、ドラッグ UI）
main.js                  # ビルド済みプラグイン
```

## 統計
- 更新ファイル: 3個（CardComponent.ts, MemosView.ts, styles.css）
- 新規メソッド:
  - CardComponent: toggleEditMode, enterEditMode, exitEditMode, getEditableContent, saveEdit
  - MemosView: onCardDelete, onCardReorder, onCardEdit, showDeleteConfirmation, reconstructMarkdown
- CSS セレクタ: 約25個追加
- 機能: ドラッグ&ドロップ、削除、編集、ビュー切り替え

## 次のステップ（オプション）
- 設定タブ UI の実装
- タイムスタンプフォーマットのカスタマイズ
- カードスタイルのテーマ切り替え
- エクスポート機能
- カレンダービュー
