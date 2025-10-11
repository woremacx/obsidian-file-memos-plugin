---
priority: 1
description: "フェーズ1: 基本構造の構築 - プラグインの基本セットアップ、#memosタグ検出、カスタムビューの基礎実装"
created_at: "2025-10-11T03:57:04Z"
started_at: 2025-10-11T04:06:01Z # Do not modify manually
closed_at: 2025-10-11T04:15:07Z # Do not modify manually
---

# Phase 1: 基本構造の構築

Obsidian Memos View Pluginの基本構造を構築します。プラグインのメインクラス、カスタムビューの基本実装、`#memos`タグの検出ロジックを実装します。

Please record any notes related to this ticket, such as debugging information, review results, or other work logs, `251011-035704-phase1-basic-structure-note.md`.


## Tasks

- [x] プラグインの基本情報を更新（manifest.json, package.json）
- [x] `src/` ディレクトリを作成し、既存ファイルを整理
- [x] `src/main.ts` にプラグインのメインクラス `MemosViewPlugin` を作成
- [x] `src/utils.ts` を作成し、`#memos` タグの検出ロジックを実装（frontmatterとコンテンツから検出）
- [x] `src/MemosView.ts` にカスタムビュー `MemosView extends ItemView` の基本クラスを作成
- [x] ビューの登録とファイルオープン時の自動切り替え機能を実装
- [x] 動作確認とビルドテスト
- [x] Run `npm run build` to build the project
- [ ] Get developer approval before closing
