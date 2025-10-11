---
priority: 2
description: "Quick add から要素追加時のフルリロードを防ぐ - 末尾に1要素追加するだけなので、DOMに直接カードを追加してリロードを回避する"
created_at: "2025-10-12T14:50:00Z"
started_at: 2025-10-12T14:54:15Z # Do not modify manually
closed_at: 2025-10-12T14:58:56Z # Do not modify manually
---

# Quick add フルリロード問題の修正

## 問題

quick add（クイック入力）から要素を追加すると、ファイル末尾に1ブロック追加しただけなのにフルリロード (`renderMemosView()`) が走る。

### 現状の処理フロー

1. `handleQuickInput()` / `handleQuickInputBottom()` が呼ばれる
2. ファイル末尾に新しいブロックを追加
3. `app.vault.modify()` でファイルを更新
4. **`renderMemosView()` を呼び出してフルリロード**

### 問題点

- 全カードを破棄して再レンダリングしている
- スクロール位置が失われる
- カードの折りたたみ状態が失われる（短時間だが）
- `onCardCheckToggle()` や `onCardEdit()` では `isInternalModification` フラグを使ってリロードを回避しているのに、quick add では回避していない

## 修正方針

`onCardEdit()` や `onCardReorder()` と同様のパターンを適用:

1. `isInternalModification = true` を設定してファイル変更イベントのリロードを防止
2. 新しいカードコンポーネントを DOM に追加（フルリロードなし）

## Tasks

- [ ] `handleQuickInput()` を修正:
  - ファイル更新前に `isInternalModification = true` を設定
  - フルリロードの代わりに新しい `CardComponent` を作成して DOM に追加
  - `this.cardComponents` 配列に追加
  - 入力欄をクリア
- [ ] `handleQuickInputBottom()` を同様に修正
- [ ] 動作確認（スクロール位置、折りたたみ状態が保持されること）
- [ ] 既存のテストが通ることを確認
- [ ] コミット

## 期待される効果

- スクロール位置が保持される
- カードの折りたたみ状態が保持される
- UX が大幅に改善される（checkbox toggle と同じスムーズさ）

## 参考実装

`onCardEdit()` (MemosView.ts:217-256) が良い参考になる:
- `isInternalModification = true` を設定
- ファイル更新後、`cardComponent.updateBlock()` で個別更新
