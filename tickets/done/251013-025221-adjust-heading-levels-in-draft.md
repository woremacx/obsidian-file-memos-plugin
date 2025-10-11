---
priority: 2
description: "Draft内のH1/H2見出しを動的にH3以下にスライドさせる機能の実装"
created_at: "2025-10-13T02:52:21Z"
started_at: 2025-10-13T02:57:17Z # Do not modify manually
closed_at: 2025-10-13T03:12:49Z # Do not modify manually
---

# Draft内の見出しレベルを動的に調整する機能

## 問題背景

現在、draft block（`%%quickadd-draft%%`付き）内にH1またはH2見出しが含まれていると、MarkdownParserがそこで区切ってしまい、draft blockが正しくパースできない問題がある。

**実例**:
```markdown
## 2025-10-13 11:42 ^mgoj32p4-ghuyg %%quickadd-draft%%

## 【AMD Ryzen 5 5500U】のベンチマーク ^mgoj340i-wzb6r

内容...
```

上記の場合、37行目のH2見出しで区切られ、2つの独立したH2 blockとして認識される。これによりdraft blockが空になり、再読み込み時に正常に動作しない。

## 要件

Draft内に含まれる見出しを、**最小レベルがH3以下になるように動的にスライド**させる。

### 変換ルール

1. Draft内の見出しレベルの**最小値**を検出
2. 最小レベルがH3（level 3）になるように**シフト量**を計算
   - シフト量 = `max(0, 3 - 最小レベル)`
3. 全ての見出しにシフト量を加算
4. レベル7以上（範囲外）になる見出しは**通常テキスト**に変換

### 変換例

#### 例1: H1のみ含まれる
```
入力:  # 見出し
最小:  1
シフト: 2
結果:  ### 見出し (H1→H3)
```

#### 例2: H2のみ含まれる（今回の問題）
```
入力:  ## 見出し
最小:  2
シフト: 1
結果:  ### 見出し (H2→H3)
```

#### 例3: H1とH2が混在
```
入力:  # H1
       ## H2
       ### H3
最小:  1
シフト: 2
結果:  ### H1 (1+2=3)
       #### H2 (2+2=4)
       ##### H3 (3+2=5)
```

#### 例4: H3以下のみ
```
入力:  ### 見出し
最小:  3
シフト: 0
結果:  ### 見出し (変更なし)
```

#### 例5: 範囲外になる場合
```
入力:  # H1
       ##### H5
       ###### H6
最小:  1
シフト: 2
結果:  ### H1 (1+2=3)
       H5 (5+2=7, 範囲外→通常テキスト)
       H6 (6+2=8, 範囲外→通常テキスト)
```

## 実装方針

### 1. 新規メソッド: `adjustHeadingLevelsInDraft(content: string): string`

**場所**: `src/MemosView.ts`

**処理フロー**:
1. 全行をスキャンして最小見出しレベルを検出
2. シフト量を計算: `shift = max(0, 3 - minLevel)`
3. シフト量が0なら元のcontentをそのまま返す
4. 各行の見出し記号をシフト量分増やす
5. レベル7以上は見出し記号を除去して通常テキストに変換

### 2. autoSaveDraft() の修正

**場所**: `src/MemosView.ts` 行350-395

**変更箇所**:
- 既存draft更新時（行370の `const newBlock = ...` の前）
- 新規draft作成時（行389の `const newBlockMarkdown = ...` の前）

**追加コード**:
```typescript
// Before saving, adjust heading levels in draft content
content = this.adjustHeadingLevelsInDraft(content);
```

### 3. Draft復元時の処理

**検討結果**: 逆変換は実装しない

**理由**:
- ファイルに保存された内容がH3以下になっているため、それを表示するのが自然
- ユーザーがSave時に確定版として保存すれば、調整済みの見出しレベルで確定
- 逆変換を実装すると、元のレベル情報を保持する必要があり複雑化

## 実装詳細

### adjustHeadingLevelsInDraft() メソッド

```typescript
private adjustHeadingLevelsInDraft(content: string): string {
    const lines = content.split('\n');

    // Step 1: 最小見出しレベルを検出
    let minLevel = 7; // 初期値は範囲外
    for (const line of lines) {
        const match = line.match(/^(#{1,6})\s/);
        if (match) {
            const level = match[1].length;
            minLevel = Math.min(minLevel, level);
        }
    }

    // Step 2: シフト量を計算（最小レベルをH3にする）
    const shift = Math.max(0, 3 - minLevel);

    // シフト不要の場合はそのまま返す
    if (shift === 0) {
        return content;
    }

    Logger.debug('[MemosView.adjustHeadingLevelsInDraft] Min level:', minLevel, 'Shift:', shift);

    // Step 3: 全ての見出しをシフト
    return lines.map(line => {
        const match = line.match(/^(#{1,6})(\s.*)$/);
        if (match) {
            const currentLevel = match[1].length;
            const newLevel = currentLevel + shift;
            const rest = match[2];

            // レベル7以上は通常テキストに変換
            if (newLevel > 6) {
                Logger.debug('[MemosView.adjustHeadingLevelsInDraft] Heading out of range, converting to text:', line);
                return rest.trim(); // 見出し記号を除去
            }

            return '#'.repeat(newLevel) + rest;
        }
        return line;
    }).join('\n');
}
```

Please record any notes related to this ticket, such as debugging information, review results, or other work logs, `251013-025221-adjust-heading-levels-in-draft-note.md`.

## Tasks

- [ ] `adjustHeadingLevelsInDraft()` メソッドを実装
  - [ ] 最小見出しレベルの検出ロジック
  - [ ] シフト量の計算ロジック
  - [ ] 見出しレベルの調整ロジック
  - [ ] 範囲外（レベル7以上）の通常テキスト化
  - [ ] Logger.debug でデバッグ情報を出力
- [ ] `autoSaveDraft()` を修正（既存draft更新時）
  - [ ] 行370の前に `content = this.adjustHeadingLevelsInDraft(content);` を追加
- [ ] `autoSaveDraft()` を修正（新規draft作成時）
  - [ ] 行389の前に `content = this.adjustHeadingLevelsInDraft(content);` を追加
- [ ] 動作確認
  - [ ] H1のみを含むdraftで動作確認
  - [ ] H2のみを含むdraftで動作確認（今回の問題ケース）
  - [ ] H1とH2が混在するdraftで動作確認
  - [ ] H3以下のみのdraftで変更されないことを確認
  - [ ] H5/H6を含むdraftで通常テキスト化されることを確認
  - [ ] リロード後にdraftが正常に復元されることを確認
- [ ] Run tests before closing and pass all tests (No exceptions)
- [ ] Run `npm run build` to build the project
- [ ] Get developer approval before closing
