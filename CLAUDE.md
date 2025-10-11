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

特定のタグ（`#memos`）がついたMarkdownファイルを開いたときに、通常のMarkdownビューではなく、Thino風のカードビュー形式で表示するObsidianプラグイン。

## 目的

- Jupyter Notebookのようなセルベースの管理
- 各ブロックにチェックボックスを付けられる
- Markdownの箇条書きよりも視覚的で扱いやすいビュー
- ファイル自体は通常のMarkdownとして保存

## 主な機能要件

### 1. タグベースのビュー切り替え
- ファイル内に `#memos` タグが含まれているかを検出
- 該当するファイルを開いたときに自動的にカスタムビューに切り替え
- 通常のMarkdownビューとの切り替えも可能

### 2. カードビュー表示
- Markdownの各ブロック（段落、見出し、コードブロックなど）をカードとして表示
- 各カードは独立して折りたたみ・展開可能
- Thino風のスタイリング（カード型デザイン）

### 3. チェックボックス機能
- 各カードにチェックボックスを追加可能
- チェック状態をMarkdownファイルに反映（`- [ ]` / `- [x]` 形式）
- カード単位でのタスク管理

### 4. タイムスタンプ機能
- 各カード（ブロック）に作成日時を自動記録
- 見出しに日付を含める（例: `## 2025-10-11 14:30`）
- 時系列でのメモ管理
- 日付フォーマットはカスタマイズ可能

### 5. セル管理機能
- カードの順序変更（ドラッグ&ドロップ）
- カードの追加・削除
- カード内容の編集

## 技術スタック

- **TypeScript**: Obsidian Plugin API
- **Obsidian Plugin API**:
  - `MarkdownView`: ビューの拡張
  - `MarkdownPostProcessor`: Markdown解析
  - `WorkspaceLeaf`: ビュー管理
- **CSS**: カードビューのスタイリング

## 実装アプローチ

### フェーズ1: 基本構造
1. Obsidianプラグインのboilerplate作成
2. `#memos` タグの検出ロジック実装
3. カスタムビュー（`MemosView`）の基本クラス作成

### フェーズ2: Markdown解析とカード表示
1. Markdownファイルをブロック単位で解析
2. 各ブロックをカード要素として描画
3. 基本的なスタイリング適用

### フェーズ3: インタラクション機能
1. カードの折りたたみ・展開
2. チェックボックスの追加と状態管理
3. タイムスタンプの自動生成と表示
4. Markdownファイルへの書き戻し

### フェーズ4: 高度な機能
1. カードのドラッグ&ドロップ
2. カードの編集・追加・削除
3. 通常ビューとの切り替えトグル

## ファイル構成

```
obsidian-memos-view/
├── src/
│   ├── main.ts                 # プラグインのエントリーポイント
│   ├── MemosView.ts            # カスタムビューの実装
│   ├── MarkdownParser.ts       # Markdown解析ロジック
│   ├── CardComponent.ts        # カード要素のコンポーネント
│   └── utils.ts                # ユーティリティ関数
├── styles.css                  # プラグインのスタイル
├── manifest.json               # プラグインのメタデータ
├── package.json
├── tsconfig.json
└── README.md
```

## 主要クラス設計

### `MemosViewPlugin` (main.ts)
- プラグインのメインクラス
- ビューの登録とファイルオープン時の検出

### `MemosView extends ItemView`
- カスタムビューの実装
- Markdownの解析と描画
- カードのレンダリング管理

### `MarkdownParser`
- Markdownファイルをブロック単位で解析
- 各ブロックの種類（段落、見出し、コード、リストなど）を識別
- チェックボックスの状態を検出

### `CardComponent`
- 個別のカード要素
- タイムスタンプの表示と管理
- 折りたたみ・展開の状態管理
- チェックボックスのインタラクション
- 編集モードへの切り替え

## Markdownファイル形式

```markdown
---
tags: [memos]
---

# Memos - 2025-10-11

## 2025-10-11 14:30

段落1のテキスト。これが1つのカードになる。

## 2025-10-11 15:45

段落2のテキスト。これも1つのカードになる。

- [ ] タスク1
- [x] タスク2

## 2025-10-11 16:20

\```javascript
console.log("コードブロックも1つのカードに");
\```
```

## 参考リソース

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- Thino Plugin（旧Memos）のUI/UX参考

## 開発環境セットアップ

```bash
# プラグインの初期化
npm init
npm install -D @types/node typescript obsidian

# ビルド
npm run build

# 開発モード（ホットリロード）
npm run dev
```

## テスト計画

1. **基本機能テスト**
   - `#memos` タグの検出
   - カスタムビューへの切り替え
   - Markdownの正しい解析

2. **インタラクションテスト**
   - チェックボックスのトグル
   - カードの折りたたみ
   - ファイルへの書き戻し

3. **エッジケーステスト**
   - 大きなファイルのパフォーマンス
   - 特殊なMarkdown記法
   - 複数ファイルの同時編集

## 実装上の注意点

- Obsidian Plugin APIのベストプラクティスに従う
- メモリリークに注意（イベントリスナーのクリーンアップ）
- Markdownファイルの整合性を保つ（不正な編集を防ぐ）
- ユーザーの既存のMarkdownファイルに影響を与えない

## 今後の拡張案

- 日付範囲でのフィルタリング（今日、今週、今月など）
- カレンダービューでの表示
- カードのフィルタリング・検索機能
- カードのタグ付け
- カードのグループ化
- エクスポート機能（PDF、HTMLなど）
- 複数のビューテンプレート
