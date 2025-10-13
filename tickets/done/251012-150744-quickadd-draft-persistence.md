---
priority: 2
description: "Quick add コンテンツの揮発を防ぐ - H2に%%quickadd-draft%%フラグを持たせてファイルに保存する"
created_at: "2025-10-12T15:07:44Z"
started_at: 2025-10-12T15:09:27Z # Do not modify manually
closed_at: 2025-10-13T00:30:40Z # Do not modify manually
---

# Quick Add コンテンツ揮発問題の修正

## 問題

quick add 領域のコンテンツが Save せずに揮発してしまう問題がある。

### 現状の動作

1. quick add 領域にコンテンツを入力中
2. 外部からファイルが変更される、またはビューを切り替える、アプリを再起動する
3. quick add 領域のコンテンツが失われる（揮発）

### 既存の対策とその不足

- `handleExternalFileChange()` で quick input にコンテンツがあればリロードをスキップする仕組みは存在
- しかし Save ボタンを押すまでコンテンツはメモリにのみ存在
- `renderMemosView()` が呼ばれると quick input エディタが破棄・再作成されるため揮発

### 通常の markdown カード編集との違い

- カード編集時は `onCardEditStart()` で `editingBlockId` を設定
- ファイルに直接書き込まれるため、リロードしてもコンテンツは保持される
- quick add はファイルに保存されないため揮発する

## 修正方針

Obsidian の非表示コメント構文 `%%...%%` を使って H2 に "quickadd-draft" フラグを持たせる。

### 採用する方式

```markdown
## 2025-10-12 23:56 ^block-id %%quickadd-draft%%

(quick add から入力中のコンテンツ)
```

- `%%...%%` は Obsidian の非表示コメント構文
- Markdown view では表示されない
- メタデータとして機能する

### 実装の流れ

1. **Save ボタン押下時**:
   - 新しい H2 ブロックを作成（`%%quickadd-draft%%` 付き）
   - コンテンツをファイルに書き込む
   - カードとして表示
   - エディタをクリア

2. **ビューのロード時**:
   - `%%quickadd-draft%%` フラグを持つブロックを検出
   - このブロックを編集モードで開く
   - フラグを削除（確定扱い）

3. **利点**:
   - ファイルに保存されるため揮発しない
   - 外部ツールでファイルを開いても見た目は通常の H2
   - Obsidian のコメント構文なので非表示
   - 既存のカード編集機能を活用できる

Please record any notes related to this ticket, such as debugging information, review results, or other work logs, `251012-150744-quickadd-draft-persistence-note.md`.

## Tasks

- [ ] `MarkdownBlock` インターフェースに `isDraft?: boolean` を追加
- [ ] `MarkdownParser.parseH2Section()` を修正:
  - `%%quickadd-draft%%` を検出して `isDraft: true` を設定
  - コメント部分は content から除外
- [ ] `handleQuickInput()` を修正:
  - Save 時に `%%quickadd-draft%%` フラグ付きで H2 を作成
  - ファイルに即座に保存
- [ ] `handleQuickInputBottom()` を同様に修正
- [ ] `renderMemosView()` を修正:
  - ロード時に `isDraft: true` のブロックを検出
  - 該当ブロックを自動的に編集モードで開く
  - フラグを削除して確定扱いにする
- [ ] `reconstructMarkdown()` を修正:
  - `isDraft: true` のブロックは `%%quickadd-draft%%` を付けて出力
- [ ] 動作確認（揮発しないこと、ビュー切り替え後の復元）
- [ ] テストを追加（draft フラグの検出、保存、復元）
- [ ] Run tests before closing and pass all tests (No exceptions)
- [ ] Run `npm run build` to build the project
- [ ] Get developer approval before closing
