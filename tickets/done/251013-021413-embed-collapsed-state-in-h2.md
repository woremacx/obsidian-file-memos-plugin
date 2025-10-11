---
priority: 2
description: "H2見出しにDataview inline field形式でカードのcollapsed状態を埋め込む"
created_at: "2025-10-13T02:14:13Z"
started_at: 2025-10-13T02:23:37Z # Do not modify manually
closed_at: 2025-10-13T02:36:29Z # Do not modify manually
---

# H2見出しにcollapsed状態を埋め込む機能の実装

## 背景と目的

現在、カードの折りたたみ状態（collapsed state）はlocalStorageに保存されており、以下の問題があります：

- ファイルパスに依存しているため、ファイルをリネーム・移動すると状態が失われる
- デバイス間で同期されない
- Vaultを移動すると状態が失われる

この問題を解決するため、Dataview plugin の inline field 形式 `[collapsed:: true/false]` を使用して、H2見出し内にcollapsed状態を直接埋め込みます。

## 実装方針

### 1. データ形式

H2見出しに `[collapsed:: true]` または `[collapsed:: false]` を埋め込む：

```markdown
## [ ] 2025-10-13 10:00 ^abc123 [collapsed:: true] %%quickadd-draft%%
```

**要素の順序**: `## [checkbox] text ^block-id [collapsed:: true/false] %%draft%%`

### 2. 実装ステップ

#### Step 1: MarkdownBlock インターフェースの拡張
`src/MarkdownParser.ts` の `MarkdownBlock` インターフェースに `collapsed` フィールドを追加：

```typescript
export interface MarkdownBlock {
    // ... 既存フィールド
    collapsed?: boolean; // H2見出しの折りたたみ状態
}
```

#### Step 2: パーサーの更新
`src/MarkdownParser.ts` の `parseH2Section()` で collapsed フィールドを抽出：

- 正規表現で `[collapsed:: true|false]` を検出
- 見出しテキストから除去
- `block.collapsed` プロパティに設定

既存の checkbox, blockId, draft 検出と同様のパターンで実装。

#### Step 3: Markdown再構築の更新
`src/MemosView.ts` の `reconstructMarkdown()` で collapsed フィールドを出力：

- H2見出し構築時に `[collapsed:: true/false]` を追加
- block ID の後、draft flag の前に配置

#### Step 4: 状態管理の移行
`src/MemosView.ts` の状態管理を更新：

**ロード時**:
- Markdown埋め込みの collapsed 状態を優先
- 未設定の場合は `collapsed: false` をデフォルト値として使用
- localStorageは後方互換のためのフォールバックとして残す

**折りたたみトグル時**:
- `blocks[index].collapsed` を更新
- Markdownファイルに即座に保存
- localStorageも更新（後方互換性のため）

### 3. メリット

- ✅ ファイルと一緒に状態が移動（ポータブル）
- ✅ デバイス間で同期
- ✅ ファイルリネームに強い
- ✅ ソースモードで手動編集可能
- ✅ Dataviewプラグインとの互換性
- ✅ 既存のメタデータ埋め込みパターンと一貫性

### 4. 後方互換性

- `[collapsed:: ...]` がないファイルは `collapsed: false` がデフォルト
- 既存のlocalStorage状態は最初のロード時に移行可能
- 既存ファイルへの破壊的変更なし

Please record any notes related to this ticket, such as debugging information, review results, or other work logs, `251013-021413-embed-collapsed-state-in-h2-note.md`.

## Tasks

- [ ] MarkdownBlock インターフェースに `collapsed?: boolean` フィールドを追加
- [ ] `parseH2Section()` に collapsed フィールドの抽出ロジックを実装
  - [ ] 正規表現パターンの追加
  - [ ] 見出しテキストから collapsed 記法を除去
  - [ ] Logger.debug でパース結果をログ出力
- [ ] `reconstructMarkdown()` に collapsed フィールドの出力ロジックを実装
  - [ ] H2見出し構築時に `[collapsed:: true/false]` を追加
  - [ ] 要素の順序を正しく配置
- [ ] `MemosView.ts` の状態管理を更新
  - [ ] `loadViewState()` で Markdown埋め込み状態を優先的に読み込む
  - [ ] `onCardStateChange()` で `block.collapsed` を更新し Markdown に保存
  - [ ] `initializeCardStates()` メソッドを実装（必要に応じて）
- [ ] 動作確認
  - [ ] 新規カードの折りたたみ状態が正しく保存されることを確認
  - [ ] ファイルリロード後に状態が復元されることを確認
  - [ ] 既存ファイル（collapsed記法なし）が正しく動作することを確認
  - [ ] ソースモードで手動編集した collapsed 値が反映されることを確認
- [ ] Run tests before closing and pass all tests (No exceptions)
- [ ] Run `npm run build` to build the project
- [ ] Get developer approval before closing
