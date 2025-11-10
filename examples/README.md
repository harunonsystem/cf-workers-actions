# Cleanup Action Examples

Cloudflare Workers のクリーンアップアクション (cleanup) の実装例です。

## 概要

**cleanup** は Cloudflare Workers を自動削除する GitHub Action です。

主な使い方：

- **PR がクローズされたとき** → PR の Preview Worker を自動削除
- **手動実行** → GitHub UI から `workflow_dispatch` で任意のタイミングに実行
- **パターンマッチで削除** → 複数 Workers を条件指定で一括削除
- **除外設定で保護** → 本番環境や重要な Workers は削除から除外

---

## 2つの削除方法

### 1. worker-names: 具体的な Worker を指定して削除

**使い方**: PR 番号から Worker 名を組み立てて削除

```yaml
name: Cleanup PR Worker

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          # PR #123 → myapp-pr-123 を削除
          # PR #456 → myapp-pr-456 を削除
          worker-names: myapp-pr-${{ github.event.pull_request.number }}

          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**特徴**:

- ✅ **完全一致**: `myapp-pr-123` のみ削除（`myapp-pr-1234` は削除しない）
- ✅ **複数指定可**: `myapp-pr-1,myapp-pr-2,myapp-pr-3` で複数削除可
- ✅ **正確**: PR 番号が確実に分かる場合に使用

---

### 2. worker-pattern: ワイルドカードでパターンマッチして削除

**使い方**: パターンに合致する全ての Worker を削除

```yaml
name: Cleanup by Pattern

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          # myapp-pr-* パターンで全て削除
          # myapp-pr-1, myapp-pr-2, myapp-pr-123 ...
          # myapp-pr-feature-branch なども削除
          worker-pattern: 'myapp-pr-*'

          # 削除対象から除外
          exclude: 'myapp-develop,myapp-staging,myapp'

          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**特徴**:

- ✅ **パターンマッチ**: `myapp-pr-*` が全てマッチ（複数削除）
- ✅ **1パターンのみ**: 複数パターンは使えない（複数が必要な場合は `exclude` で制御）
- ✅ **除外設定**: 削除対象から除外する Worker を指定

---

## 比較表

| 用途             | `worker-names`          | `worker-pattern`       |
| ---------------- | ----------------------- | ---------------------- |
| **削除方式**     | 完全一致（リスト指定）  | ワイルドカードマッチ   |
| **例**           | `myapp-pr-1,myapp-pr-2` | `myapp-pr-*`           |
| **マッチ対象**   | 指定したもののみ        | パターンに合致した全て |
| **複数パターン** | ✅ 複数指定可           | ❌ 1つのみ             |
| **除外設定**     | 使用可                  | 使用可                 |
| **最適な用途**   | PR 番号で削除           | 定期クリーンアップ     |

---

## 実装例

### GitHub Flow（PR クローズ時に削除）

```yaml
name: Cleanup PR Worker

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          # PR #123 → myapp-pr-123 を削除
          worker-names: myapp-pr-${{ github.event.pull_request.number }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

---

### Git Flow（パターンで複数削除 + 環境除外）

```yaml
name: Cleanup with Environment Protection

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          # PR パターンで全て削除
          worker-pattern: 'myapp-pr-*'

          # 環境ブランチは保護
          exclude: 'myapp-develop,myapp-staging,myapp-stg,myapp-release-*,*-prod'

          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**削除される**:

- `myapp-pr-1`, `myapp-pr-2`, `myapp-pr-123`, `myapp-pr-feature-x` など

**削除されない（除外）**:

- `myapp-develop` - develop ブランチ Worker
- `myapp-staging`, `myapp-stg` - staging ブランチ Worker
- `myapp-release-1`, `myapp-release-v1.0` - リリース Worker
- `api-prod`, `web-prod` - 本番 Worker

---

### 手動実行（workflow_dispatch）

```yaml
name: Manual Cleanup

on:
  workflow_dispatch:
    inputs:
      deletion-type:
        description: 'Deletion type'
        required: true
        type: choice
        options:
          - by-pattern
          - by-names
      worker-input:
        description: 'Worker pattern (myapp-pr-*) or names (myapp-pr-1,myapp-pr-2)'
        required: true
        default: 'myapp-pr-*'
      dry-run:
        description: 'Dry run (true=確認のみ, false=実削除)'
        required: false
        default: 'true'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: ${{ github.event.inputs.deletion-type == 'by-pattern' && github.event.inputs.worker-input || '' }}
          worker-names: ${{ github.event.inputs.deletion-type == 'by-names' && github.event.inputs.worker-input || '' }}
          exclude: 'myapp,myapp-develop,myapp-staging,myapp-release-*'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: ${{ github.event.inputs.dry-run }}
```

---

## パターンマッチの詳細

### worker-pattern（ワイルドカード対応）

```yaml
worker-pattern: 'myapp-pr-*'

削除される:
  - myapp-pr-1
  - myapp-pr-2
  - myapp-pr-123
  - myapp-pr-feature-branch
  - myapp-pr-xyz

削除されない:
  - myapp-pr # * は 1文字以上必須
  - myapp-main
  - myapp-develop
```

### exclude（ワイルドカード対応）

**完全一致による除外**:

```yaml
exclude: 'myapp,myapp-develop,myapp-staging'
```

**パターンによる除外**:

```yaml
exclude: 'myapp-release-*,*-prod,*-production'
```

**実践例**:

```yaml
exclude: 'myapp,myapp-main,myapp-develop,myapp-staging,myapp-release-*,myapp-*-prod'
```

削除されない:

- `myapp` - 本番
- `myapp-main` - main ブランチ
- `myapp-develop` - develop ブランチ
- `myapp-staging` - staging ブランチ
- `myapp-release-1`, `myapp-release-v1.0` - リリース Worker
- `myapp-api-prod`, `myapp-web-prod` - 本番環境

---

## 入力値 (Inputs)

| 入力値                  | 説明                                                           | 必須 | 例                                     |
| ----------------------- | -------------------------------------------------------------- | ---- | -------------------------------------- |
| `worker-names`          | 削除対象の Worker 名（カンマ区切り、完全一致）                 | ⚠️※1 | `myapp-pr-1,myapp-pr-2`                |
| `worker-pattern`        | 削除対象の Worker パターン（ワイルドカード対応）               | ⚠️※1 | `myapp-pr-*`                           |
| `exclude`               | 削除から除外する Worker 名またはパターン（ワイルドカード対応） | ✅   | `myapp-develop,myapp-release-*,*-prod` |
| `dry-run`               | 削除する前に確認するのみ                                       | ✅   | `true` (デフォルト)                    |
| `cloudflare-api-token`  | Cloudflare API Token                                           | ❌   | `${{ secrets.CLOUDFLARE_API_TOKEN }}`  |
| `cloudflare-account-id` | Cloudflare Account ID                                          | ❌   | `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` |

※1: `worker-names` と `worker-pattern` のいずれか一つを指定する必要があります

---

## 出力値 (Outputs)

```yaml
- id: cleanup
  uses: harunonsystem/cloudflare-actions/cleanup@v1
  with:
    # ... configuration ...

- name: Notify results
  run: |
    echo "Deleted: ${{ steps.cleanup.outputs.deleted-count }} workers"
```

| 出力値            | 説明                                         |
| ----------------- | -------------------------------------------- |
| `deleted-workers` | 削除された Worker 名の配列（JSON）           |
| `deleted-count`   | 削除された Worker の数                       |
| `skipped-workers` | 削除失敗 / スキップされた Worker 名の配列    |
| `dry-run-results` | ドライランで削除対象となった Worker 名の配列 |

---

## ベストプラクティス

### ✅ やるべきこと

1. **本番環境は必ず除外**

   ```yaml
   exclude: 'myapp,myapp-main,myapp-prod,*-production'
   ```

2. **最初は dry-run で確認**

   ```yaml
   dry-run: 'true' # 削除対象を確認
   ```

3. **削除ログを確認**
   - GitHub Actions のログで削除結果を確認
   - Slack などで通知を設定

### ❌ しないこと

1. 本番環境を削除対象に含める
2. exclude 設定なしで広いパターン `*` を削除
3. ドライラン確認なしでいきなり削除

---

## トラブルシューティング

### 削除対象が見つからない

1. `worker-names` または `worker-pattern` が正しいか確認
2. `exclude` で誤って除外していないか確認
3. Cloudflare ダッシュボードで実際の Worker 名を確認

### 重要な Worker が削除された場合

1. Cloudflare ダッシュボードで復旧可能か確認
2. バックアップがあれば復元
3. 今後は `exclude` で保護設定を追加

---

## セットアップ

### 認証情報の設定

1. GitHub Settings → Secrets and variables → Actions
2. 以下を追加：
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID

### ワークフローファイルの作成

1. このディレクトリからサンプルをコピー
2. `.github/workflows/` に配置
3. `worker-names` / `worker-pattern` を自分の環境に合わせて編集

---

## ファイル一覧

- `worker-delete/using-secrets.yml` - GitHub Secrets を使った基本的な例
- `worker-delete/using-1pass-cli.yml` - 1Password CLI を使った例
- `worker-delete/gitflow-cleanup.yml` - Git Flow パターン例
- `worker-delete/advanced-cleanup.yml` - 応用例（ドライラン、通知など）
