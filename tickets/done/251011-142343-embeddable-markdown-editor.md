---
priority: 2
description: "クイック追加エリアをObsidian編集画面相当にする。Fevol実装のEmbeddableMarkdownEditorを使用してMarkdownシンタックスハイライト、リンク・タグ補完、プラグイン連携をサポート。"
created_at: "2025-10-11T14:23:43Z"
started_at: 2025-10-11T14:34:56Z # Do not modify manually
closed_at: 2025-10-12T23:42:00Z   # Do not modify manually
---

# クイック追加エリアをObsidian編集画面相当にする

## 概要

現在のクイック追加エリアは単純な `<textarea>` 要素で、プレーンテキスト入力のみ可能。これをObsidianネイティブの編集画面と同等の機能を持つMarkdownエディタに置き換える。

### 現状の問題点
- プレーンテキスト入力のみ
- Markdownシンタックスハイライトなし
- リンク・タグの自動補完なし
- Obsidianプラグイン（vim等）との連携なし

### 目標
- Obsidianネイティブと同等のMarkdown編集体験
- シンタックスハイライト
- リンク・タグの自動補完
- Obsidianプラグイン連携（vim、コマンド実行等）
- インラインプレビュー（bold、italic等）

## 技術アプローチ

### 選択した実装: WidgetEditorView + ScrollableMarkdownEditor (Fevol実装)

参考: https://fevol.github.io/obsidian-notes/notes/snippets/embeddable-markdown-renderer/

**利点:**
- Obsidianネイティブの全機能をサポート
- `app.embedRegistry.embedByExtension.md()` で一時的なエディタを生成
- プロトタイプを動的に解決してカスタムエディタクラスを作成
- vim、プラグイン連携、補完機能をすべてサポート

**他の候補:**
1. Kanbanプラグイン実装 - Reactが必要（本プロジェクトは非React）
2. CodeMirror直接使用 - Obsidianネイティブ機能との統合が限定的

## 実装タスク

### フェーズ1: EmbeddableMarkdownEditor クラス作成
- [ ] `src/EmbeddableMarkdownEditor.ts` を新規作成
- [ ] `resolveEditorPrototype` 関数を実装（動的にエディタプロトタイプを解決）
- [ ] `EmbeddableMarkdownEditor` クラスを実装
  - [ ] カスタマイズ可能なコンストラクタオプション
  - [ ] 初期値設定メソッド
  - [ ] イベントハンドラ（Enter、Escape、Submit、Blur）
  - [ ] ライフサイクル管理（destroy等）

### フェーズ2: MemosView統合
- [ ] `src/MemosView.ts` の `renderMemosView` メソッドを修正
- [ ] クイック入力エリア作成部分（line 175-213）を置き換え
  - [ ] `textarea` 要素を削除
  - [ ] `EmbeddableMarkdownEditor` インスタンスを作成
  - [ ] プレースホルダー設定
- [ ] イベントハンドラを移行
  - [ ] Enter: `handleQuickInput` 呼び出し
  - [ ] Escape: 入力クリア
  - [ ] Submit: メモ追加
- [ ] エディタのライフサイクル管理
  - [ ] `onClose` でエディタをdestroy
  - [ ] 再レンダリング時の適切なクリーンアップ

### フェーズ3: スタイリング
- [ ] `styles.css` でエディタスタイルを調整
- [ ] `.memos-quick-input-container` のスタイル更新
- [ ] Obsidianネイティブエディタとの見た目統一
- [ ] フォーカス状態の視覚的フィードバック

### フェーズ4: TypeScript型定義
- [ ] `ScrollableMarkdownEditor` の型定義追加（非公開API対応）
- [ ] `WidgetEditorView` の型定義追加
- [ ] `app.embedRegistry` の型定義追加
- [ ] 必要に応じて `@ts-ignore` または型アサーション使用

### フェーズ5: テストと検証
- [ ] 基本的なMarkdown入力テスト
- [ ] シンタックスハイライト確認
- [ ] リンク・タグ補完の動作確認
- [ ] Enterキーでのメモ追加確認
- [ ] Escapeキーでのクリア確認
- [ ] モバイル対応確認（可能であれば）
- [ ] vim等のプラグイン連携確認

### 最終タスク
- [ ] Run tests before closing and pass all tests (No exceptions)
- [ ] Run `npm run build` to build the project
- [ ] Update documentation if necessary
  - [ ] Update README if needed
  - [ ] Document the embeddable editor implementation
- [ ] Get developer approval before closing

## 技術的課題と対応

### 課題1: 非公開API使用
- `ScrollableMarkdownEditor`、`WidgetEditorView` は非公開API
- 対応: 型定義を自前で追加、将来のAPI変更に注意

### 課題2: エディタライフサイクル管理
- メモリリーク防止のため適切なdestroy必要
- 対応: `onClose`、再レンダリング時に確実にクリーンアップ

### 課題3: モバイル対応
- モバイルでのCodeMirror動作確認必要
- 対応: 可能な範囲でテスト、問題あれば別途対応

## 参考リンク

- Fevol's Embeddable Markdown Renderer: https://fevol.github.io/obsidian-notes/notes/snippets/embeddable-markdown-renderer/
- Obsidian Kanban Plugin (mgmeyers): https://github.com/mgmeyers/obsidian-kanban/blob/main/src/components/Editor/MarkdownEditor.tsx
- Obsidian Forum Discussion: https://forum.obsidian.md/t/how-to-get-obsidian-editor-inside-modal/89603

## ノート

作業ログや実装中の気づきは `251011-142343-embeddable-markdown-editor-note.md` に記録してください。
