# Obsidian Memos View Plugin

---

# Ticket Management Instructions

Use `./ticket.sh` for ticket management.

## Working with current-ticket.md

### If `current-ticket.md` exists in project root

- This file is your work instruction - follow its contents
- When receiving additional instructions from users, add them as new tasks under `## Tasks` and record details in `current-note.md` before proceeding
- During the work, also write down notes, logs, and findings in `current-note.md`
- Continue working on the active ticket

### If current-ticket.md does not exist in project root
- When receiving user requests, first ask whether to create a new ticket
- Do not start work without confirming ticket creation
- Even small requests should be tracked through the ticket system

## Create New Ticket

1. Create ticket: `./ticket.sh new feature-name`
2. Edit ticket content and description in the generated file

## Start Working on Ticket

1. Check available tickets: `./ticket.sh list` or browse tickets directory
2. Start work: `./ticket.sh start 241225-143502-feature-name`
3. Develop on feature branch
4. Reference work files:
   - `current-ticket.md` shows active ticket with tasks
   - `current-note.md` for working notes related to this ticket (if used)

## Closing Tickets

1. Before closing:
   - Review `current-ticket.md` content and description, collect information from `current-note.md` and other notes, and summarize the final work results and conclusions so that anyone reading the ticket can understand the work done on this branch
   - Check all tasks in checklist are completed (mark with `[x]`)
   - Commit all your work: `git add . && git commit -m "your message"`
   - Get user approval before proceeding
2. Complete: `./ticket.sh close`

---

## プロジェクト概要

特定のタグ（`#memos`、設定で変更可能）がついたMarkdownファイルを開いたときに、通常のMarkdownビューではなく、Thino風のカードビュー形式で表示するObsidianプラグイン。

## 目的

- Jupyter Notebookのようなセルベースの管理
- 各ブロックにチェックボックスを付けられる
- Markdownの箇条書きよりも視覚的で扱いやすいビュー
- ファイル自体は通常のMarkdownとして保存

## 実装済みの機能

### ✅ 1. タグベースのビュー切り替え
- ファイル内に `#memos` タグが含まれているかを検出（frontmatterおよび本文中）
- 該当するファイルを開いたときに自動的にカスタムビューに切り替え
- 通常のMarkdownビューとの切り替え機能（トグルボタン、コマンド）
- 設定でタグをカスタマイズ可能

### ✅ 2. カードビュー表示
- Markdownの各H2見出しブロックをカードとして表示
- 各カードは独立して折りたたみ・展開可能（状態はファイルとlocalStorageに保存）
- Thino風のスタイリング（カード型デザイン）
- フルObsidianマークダウンレンダリング対応（コードブロック、テーブル、画像、リンクなど）

### ✅ 3. チェックボックス機能
- 各カード（H2見出し）にチェックボックス表示
- チェック状態をMarkdownファイルに保存（`## [ ]` / `## [x]` 形式）
- カード単位でのタスク管理
- カード内のタスクリストも対応

### ✅ 4. タイムスタンプ機能
- 各カード（ブロック）に作成日時を記録
- 見出しに日付を含める（形式: `## YYYY-MM-DD HH:mm`）
- 時系列でのメモ管理
- カードヘッダーにタイムスタンプを表示

### ✅ 5. セル管理機能
- カードの順序変更（ドラッグ&ドロップ、ビジュアルフィードバック付き）
- カードの追加（"Add Card"ボタン、クイック入力）
- カードの削除（確認ダイアログ付き）
- カード内容の編集（インラインエディター、CodeMirror使用）

### ✅ 6. クイック入力とドラフト自動保存
- 画面下部のクイック入力フィールド
- 1秒間のタイピング停止後に自動的にドラフトとして保存
- ドラフトは `%%quickadd-draft%%` でマークされビューには表示されない
- "Save"ボタンで確定してカード化
- 空のドラフトは自動削除

### ✅ 7. スマート状態管理
- カードの折りたたみ状態を保存（ファイル: `[collapsed:: true]`、localStorage）
- チェックボックス状態をMarkdownファイルに保存
- 外部ファイル変更の検出と自動リロード
- 編集中はリロードをスキップ（競合防止）

### ✅ 8. 高度な機能
- ブロックID自動生成（`^blockid` 形式）
- Frontmatterのタイトル表示対応
- ドラフト内の見出しレベル自動調整（H1/H2を含むコンテンツをH3以降に変換）
- 画像やリンクなどの埋め込みコンテンツ対応
- 設定パネル（タグ、タイトル表示、デバッグログ）

### ✅ 9. テストカバレッジ
- MarkdownParser のテスト
- カードチェックボックス機能のテスト
- 見出しレベル調整機能のテスト
- クイック入力機能のテスト
- Markdown再構築機能のテスト

## 技術スタック

- **TypeScript**: Obsidian Plugin API
- **Obsidian Plugin API**:
  - `ItemView`: カスタムビューの実装
  - `MarkdownRenderer`: Markdownレンダリング
  - `WorkspaceLeaf`: ビュー管理
  - `Component`, `MarkdownRenderChild`: コンポーネントライフサイクル管理
- **CodeMirror 6**: カード編集とクイック入力のエディター
- **CSS**: カードビューのスタイリング
- **Jest**: ユニットテスト

## 実装済みのファイル構成

```
obsidian-file-memos-plugin/
├── src/
│   ├── main.ts                          # プラグインのエントリーポイント、設定管理
│   ├── MemosView.ts                     # カスタムビューの実装、カード管理
│   ├── CardComponent.ts                 # カード要素のコンポーネント、インタラクション
│   ├── MarkdownParser.ts                # Markdown解析ロジック
│   ├── EmbeddableMarkdownEditor.ts      # CodeMirror 6ベースのエディター
│   ├── Logger.ts                        # デバッグログ管理
│   ├── utils.ts                         # ユーティリティ関数（タグ検出、日付フォーマットなど）
│   └── __tests__/                       # テストファイル
│       ├── MarkdownParser.test.ts
│       ├── MemosViewCheckbox.test.ts
│       ├── MemosViewHeadingAdjust.test.ts
│       ├── MemosViewQuickAdd.test.ts
│       └── MemosViewReconstruct.test.ts
├── styles.css                           # プラグインのスタイル
├── manifest.json                        # プラグインのメタデータ
├── package.json
├── tsconfig.json
├── jest.config.js
├── esbuild.config.mjs
├── version-bump.mjs
├── ticket.sh                            # チケット管理スクリプト
└── README.md
```

## 主要クラス設計（実装済み）

### `MemosViewPlugin` (main.ts)
- プラグインのメインクラス
- ビューの登録とファイルオープン時の自動検出
- 設定管理（タグ、タイトル表示、デバッグログ）
- "Toggle Memos View"コマンドの登録

### `MemosView extends ItemView`
- カスタムビューの実装
- Markdownの解析と描画
- カードコンポーネントの管理
- クイック入力とドラフト自動保存
- 外部ファイル変更の監視とリロード
- Markdown再構築（frontmatter保持、ブロックID管理）

### `MarkdownParser`
- Markdownファイルをブロック単位で解析
- 各ブロックの種類（見出し、コード、リスト、引用など）を識別
- H2見出しのメタデータ解析（チェックボックス、ブロックID、collapsed状態、ドラフトフラグ）
- frontmatter除外処理

### `CardComponent`
- 個別のカード要素の描画と管理
- タイムスタンプの表示
- 折りたたみ・展開の状態管理とアイコン切り替え
- チェックボックスのインタラクションとファイル保存
- ドラッグ&ドロップ処理（視覚的フィードバック）
- 編集モードへの切り替えとインラインエディター
- 削除処理（確認ダイアログ）
- ブロック更新による部分レンダリング（再描画の最適化）

### `EmbeddableMarkdownEditor`
- CodeMirror 6ベースのマークダウンエディター
- クイック入力とカード編集に使用
- Obsidianテーマ連動
- 基本的なマークダウン編集機能

### `Logger`
- 設定によるデバッグログの有効/無効切り替え
- 開発時のトラブルシューティング支援

## Markdownファイル形式（実装済み）

```markdown
---
tags: [memos]
title: 日々のメモ
---

## 2025-10-13 14:30 ^abc123

段落1のテキスト。これが1つのカードになる。
**Markdown** 記法も使える。

## 2025-10-13 15:45 [x] ^def456 [collapsed:: true]

完了済みタスクで折りたたまれたカード。

- [ ] サブタスク1
- [x] サブタスク2

## 2025-10-13 16:20 ^ghi789 %%quickadd-draft%%

ドラフトメモ（ビューには表示されない）。
ユーザーがクイック入力中に自動保存される。
```

各カード（H2見出し）の構造:
- タイムスタンプ: `YYYY-MM-DD HH:mm`
- チェックボックス（オプション）: `[ ]` または `[x]`
- テキスト（オプション）
- ブロックID: `^blockid`
- Collapsed状態（オプション）: `[collapsed:: true]`
- ドラフトフラグ（オプション）: `%%quickadd-draft%%`

## 参考リソース

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [CodeMirror 6](https://codemirror.net/)
- Thino Plugin（旧Memos）のUI/UX参考

## 開発環境セットアップ

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# 開発モード（ホットリロード）
npm run dev

# テスト実行
npm test

# テスト（ウォッチモード）
npm run test:watch
```

## 実装上の注意点（経験から得た知見）

- Obsidian Plugin APIのベストプラクティスに従う
- メモリリークに注意（イベントリスナーのクリーンアップ、`MarkdownRenderChild`の`unload`）
- Markdownファイルの整合性を保つ（frontmatter保持、ブロックID保持）
- 内部変更と外部変更の区別（`isInternalModification`フラグ）
- 編集中のリロード防止（`editingBlockId`、クイック入力内容チェック）
- 並行レンダリング防止（`isRendering`フラグ）
- ドラッグ&ドロップの視覚的フィードバック（上半分/下半分の判定）
- ドラフト内の見出しレベル調整（H1/H2がドラフトブロックを破壊するのを防ぐ）
- ユーザーの既存のMarkdownファイルに影響を与えない（frontmatter、既存のブロックID保持）

## 今後の拡張案

- [ ] 日付範囲でのフィルタリング（今日、今週、今月など）
- [ ] カレンダービューでの表示
- [ ] カードのフィルタリング・検索機能
- [ ] カードのタグ付け（`#tag`形式）
- [ ] カードのグループ化（見出しによる）
- [ ] エクスポート機能（PDF、HTMLなど）
- [ ] 複数のビューテンプレート
- [ ] カスタム日付フォーマット設定
- [ ] カードのソート機能（日付、チェック状態など）
- [ ] ショートカットキー設定
- [ ] カードのカラーコーディング
- [ ] モバイル対応の最適化
