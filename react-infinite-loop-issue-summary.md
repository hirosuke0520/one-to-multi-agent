# React無限ループ問題 解決レポート

## 概要
一時プロンプト設定モーダルで発生した「Maximum update depth exceeded」エラーの原因分析と解決方法についてまとめています。

## 発生した問題

### エラーメッセージ
```
Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

### 症状
- コンソールに無限にログが出力される
- `tempPrompts state changed: {twitter: ''}` が繰り返し表示
- UIの応答性が著しく低下
- テキスト入力が正常に動作しない

## 根本原因

### 問題のあったコード
```typescript
// 問題: 毎回新しい配列が作成される
const normalizedPlatforms = selectedPlatforms.map(p => platformMapping[p] || p);

useEffect(() => {
  if (isOpen) {
    // 初期プロンプトを設定
    const initial: Record<string, string> = {};
    normalizedPlatforms.forEach(platform => {
      initial[platform] = initialPrompts[platform] || '';
    });
    setTempPrompts(initial);
    // ...
  }
}, [isOpen, selectedPlatforms, initialPrompts, normalizedPlatforms]); // ← 問題の依存配列
```

### 無限ループのメカニズム
1. **コンポーネントレンダリング時**: `normalizedPlatforms`が毎回新しい配列として作成される
2. **useEffect実行**: 依存配列に`normalizedPlatforms`が含まれているため、useEffectが実行される
3. **状態更新**: `setTempPrompts()`により状態が更新される
4. **再レンダリング**: 状態更新によりコンポーネントが再レンダリングされる
5. **手順1に戻る**: 新しい`normalizedPlatforms`配列が作成され、無限ループが発生

### 技術的な詳細
- JavaScriptでは、`array.map()`は常に新しい配列を返すため、参照が変わる
- Reactの依存配列比較は浅い比較（shallow comparison）を使用
- 配列の内容が同じでも、参照が異なれば「変更あり」と判定される

## 解決方法

### 1. useMemoによる配列の安定化
```typescript
// 修正後: useMemoで配列を安定化
const normalizedPlatforms = useMemo(() =>
  selectedPlatforms.map(p => platformMapping[p] || p),
  [selectedPlatforms]  // selectedPlatformsが変更された時のみ再計算
);
```

### 2. useEffectの依存配列最適化
```typescript
useEffect(() => {
  if (isOpen) {
    // 初期プロンプトを設定
    const initial: Record<string, string> = {};
    normalizedPlatforms.forEach(platform => {
      initial[platform] = initialPrompts[platform] || '';
    });
    setTempPrompts(initial);
    // ...
  }
}, [isOpen, normalizedPlatforms, initialPrompts]); // 安定化された依存配列
```

## 修正前後の比較

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| 配列作成 | 毎レンダリング時に新規作成 | useMemoで必要時のみ作成 |
| 依存配列 | 不安定な参照を含む | 安定した参照のみ |
| パフォーマンス | 無限ループで極めて悪い | 正常なレンダリングサイクル |
| メモリ使用量 | 無制限に増加 | 適切に管理 |

## 学んだこと

### React Hooksのベストプラクティス
1. **useMemo/useCallbackの適切な使用**: 参照の安定性が重要な場合は積極的に使用
2. **依存配列の慎重な設計**: 不要な再実行を避けるため、必要最小限の依存関係を指定
3. **デバッグの重要性**: 適切なログとエラーハンドリングで問題の早期発見

### パフォーマンス最適化の原則
1. **参照等価性の理解**: Reactの比較メカニズムを理解する
2. **副作用の最小化**: useEffect内での状態更新は慎重に行う
3. **プロファイリング**: React DevToolsを使用した問題特定

## 予防策

### コードレビューチェックリスト
- [ ] useEffectの依存配列に不安定な参照が含まれていないか
- [ ] useMemo/useCallbackが適切に使用されているか
- [ ] 無限ループの可能性がある箇所はないか

### 開発時の注意点
- コンポーネント内で配列やオブジェクトを直接作成する場合は要注意
- useEffectの依存配列は可能な限り安定した値を使用
- React DevToolsのProfilerを活用した定期的なパフォーマンスチェック

## 結論
今回の問題は、Reactの基本的な仕組み（参照等価性、レンダリングサイクル）を理解していれば予防可能でした。useMemoによる最適化と適切な依存配列の設計により、問題を根本的に解決できました。

---

*日付: 2025年9月21日*
*プロジェクト: One-to-Multi Agent*
*担当: Claude Code Assistant*