# Cleanup Action - 完全ガイド

Cloudflare Workers を自動削除する cleanup アクションの完全な実装ガイドです。

---

## 概要

cleanup アクションは 2つの方法で Workers を削除できます：

| 方法             | `worker-names`          | `worker-pattern`       |
| ---------------- | ----------------------- | ---------------------- |
| **削除方式**     | 完全一致（リスト指定）  | ワイルドカードマッチ   |
| **指定例**       | `myapp-pr-1,myapp-pr-2` | `myapp-pr-*`           |
| **削除対象**     | 指定したもののみ        | パターンに合致した全て |
| **複数パターン** | ✅ 複数指定可           | ❌ 1つのみ             |
| **使う場面**     | PR 番号で削除           | 定期クリーンアップ     |

---

## 4つの削除パターン

### パターン1️⃣: 特定の Worker だけ削除

**使い方**: PR #1, #2 は削除したいが、PR #3 は残したい

```yaml
name: Delete Specific Workers

on:
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-names: 'myapp-pr-1,myapp-pr-2'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-pr-2` → 削除
- ❌ `myapp-pr-3` → **削除しない**（指定されていない）

**重要**: `worker-pattern` は指定しない（ブランク）

---

### パターン2️⃣: パターンで全て削除

**使い方**: PR Worker は全部削除

```yaml
name: Delete All PR Workers

on:
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: 'myapp-pr-*'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-pr-2` → 削除
- ✅ `myapp-pr-3` → **削除**
- ✅ `myapp-pr-999` → 削除

**重要**: `worker-names` は指定しない（ブランク）

---

### パターン3️⃣: パターン + 一部除外

**使い方**: PR Worker は全部削除するが、PR #3 だけ残す

```yaml
name: Delete PR Workers (Except #3)

on:
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: 'myapp-pr-*'
          exclude: 'myapp-pr-3'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-pr-2` → 削除
- ❌ `myapp-pr-3` → **削除しない**（除外指定）
- ✅ `myapp-pr-999` → 削除

**重要**: `worker-names` は指定しない（ブランク）、`exclude` で除外

---

### パターン4️⃣: 複数環境を除外（最も実用的）

**使い方**: PR Worker は全部削除するが、環境ブランチは保護

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

          # 重要な環境は保護
          exclude: 'myapp,myapp-develop,myapp-staging,myapp-release-*,*-prod'

          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-feature-x` → 削除
- ❌ `myapp` → **削除しない**（除外: 本番環境）
- ❌ `myapp-develop` → **削除しない**（除外: develop ブランチ）
- ❌ `myapp-staging` → **削除しない**（除外: staging ブランチ）
- ❌ `myapp-release-1.0` → **削除しない**（除外: リリース）
- ❌ `api-prod` → **削除しない**（除外パターン）

---

## 実装シーン別ガイド

### シーン1: PR がクローズされたときに自動削除

```yaml
name: Auto Cleanup on PR Close

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          # PR #123 → myapp-pr-123 を自動削除
          worker-names: myapp-pr-${{ github.event.pull_request.number }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**動作**: PR がクローズされると自動的に該当 Worker が削除される

---

### シーン2: 手動実行で複数パターンから選択

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
        description: 'Pattern (myapp-pr-*) or Names (myapp-pr-1,myapp-pr-2)'
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

**使い方**:

1. GitHub UI → Actions → Manual Cleanup
2. "Run workflow" をクリック
3. `by-pattern` または `by-names` を選択
4. 削除対象を入力
5. `dry-run: true` で先に確認
6. 削除対象を確認後、`dry-run: false` で再実行

---

## 入力値 (Inputs)

```yaml
worker-names: 'myapp-pr-1,myapp-pr-2' # 完全一致、複数指定可
worker-pattern: 'myapp-pr-*' # ワイルドカード、1つのみ
exclude: 'myapp-develop,myapp-release-*' # 除外設定、ワイルドカード対応
dry-run: 'true' # true=確認のみ, false=実削除
cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### 重要なルール

⚠️ **`worker-names` と `worker-pattern` は必ずどちらか一つだけ指定**

| 指定方法                                       | 結果      |
| ---------------------------------------------- | --------- |
| `worker-names: 'a,b'`, `worker-pattern: ''`    | ✅ OK     |
| `worker-names: ''`, `worker-pattern: 'a-*'`    | ✅ OK     |
| `worker-names: 'a,b'`, `worker-pattern: 'a-*'` | ❌ エラー |
| `worker-names: ''`, `worker-pattern: ''`       | ❌ エラー |

---

## exclude パラメータの詳細

### 完全一致による除外

```yaml
exclude: 'myapp,myapp-develop,myapp-staging'
```

削除されない:

- `myapp` のみ
- `myapp-develop` のみ
- `myapp-staging` のみ

削除される:

- `myapp-dev` ← 部分一致は削除される

### パターンによる除外

```yaml
exclude: 'myapp-release-*,*-prod,*-production'
```

削除されない:

- `myapp-release-1`, `myapp-release-v1.0`
- `api-prod`, `web-prod`
- `staging-production`

### 複合的な除外

```yaml
exclude: 'myapp,myapp-main,myapp-develop,myapp-staging,myapp-release-*,myapp-*-prod'
```

削除されない:

- `myapp` - 本番
- `myapp-main` - main ブランチ
- `myapp-develop` - develop ブランチ
- `myapp-staging` - staging ブランチ
- `myapp-release-1.0` - リリース
- `myapp-api-prod` - 本番環境

---

## よくあるシナリオ

### シナリオA: GitHub Flow（シンプル）

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-names: myapp-pr-${{ github.event.pull_request.number }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

→ PR がクローズされると Worker が削除される

---

### シナリオB: Git Flow（複数環境）

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: 'myapp-pr-*'
          exclude: 'myapp,myapp-develop,myapp-staging,myapp-release-*'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

→ PR Worker は全削除、環境ブランチは保護

---

### シナリオC: 定期クリーンアップ（cron）

```yaml
on:
  schedule:
    - cron: '0 2 * * *' # 毎日 2 AM UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: 'myapp-pr-*'
          exclude: 'myapp,myapp-develop,myapp-staging'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

→ 毎日朝 2 時に古い PR Worker を削除

---

## ドライラン確認フロー（推奨）

安全に削除するための2段階実行：

```yaml
name: Cleanup with Dry-Run

on:
  workflow_dispatch:
    inputs:
      worker-pattern:
        description: 'Pattern to delete'
        required: true
        default: 'myapp-pr-*'

jobs:
  dry-run:
    runs-on: ubuntu-latest
    steps:
      - id: check
        uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: ${{ github.event.inputs.worker-pattern }}
          exclude: 'myapp,myapp-develop,myapp-staging'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'true'

      - name: Show results
        run: |
          echo "Dry-run results:"
          echo "${{ steps.check.outputs.dry-run-results }}"
          echo ""
          echo "✅ これらが削除されます"
          echo "実削除は dry-run: false で再実行してください"

  delete:
    needs: dry-run
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: ${{ github.event.inputs.worker-pattern }}
          exclude: 'myapp,myapp-develop,myapp-staging'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

---

## トラブルシューティング

### 削除対象が見つからない

1. `worker-names` / `worker-pattern` を確認
2. `exclude` で誤って除外していないか確認
3. Cloudflare ダッシュボードで実際の Worker 名を確認

### 重要な Worker が削除された

1. Cloudflare ダッシュボードで復旧可能か確認
2. `exclude` に追加して再度削除されないようにする

---

## ベストプラクティス

### ✅ やるべきこと

1. **本番環境は必ず除外**

   ```yaml
   exclude: 'myapp,myapp-main,*-production'
   ```

2. **最初は dry-run で確認**

   ```yaml
   dry-run: 'true'
   ```

3. **Slack 通知を設定**
   削除結果を Slack に通知

### ❌ してはいけないこと

1. 本番環境を削除対象に含める
2. `exclude` なしで広いパターン削除
3. ドライラン確認なしで実削除

---

## 認証情報セットアップ

### GitHub Secrets の設定

1. GitHub Settings → Secrets and variables → Actions
2. 以下を追加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### ワークフローファイル配置

1. このディレクトリから `.yml` ファイルをコピー
2. `.github/workflows/` に配置
3. `worker-names` / `worker-pattern` を自分の環境に合わせて編集

---

## 出力値 (Outputs)

```yaml
- id: cleanup
  uses: harunonsystem/cloudflare-actions/cleanup@v1
  with: # ...

- name: Notify Slack
  run: |
    echo "Deleted: ${{ steps.cleanup.outputs.deleted-count }} workers"
    echo "Skipped: ${{ steps.cleanup.outputs.skipped-workers }}"
```

| 出力値            | 説明                                         |
| ----------------- | -------------------------------------------- |
| `deleted-workers` | 削除された Worker 名の配列（JSON）           |
| `deleted-count`   | 削除された Worker の数                       |
| `skipped-workers` | 削除失敗した Worker 名の配列                 |
| `dry-run-results` | ドライランで削除対象となった Worker 名の配列 |

---

## サンプルファイル

- `using-secrets.yml` - GitHub Secrets を使った基本的な例
- `using-1pass-cli.yml` - 1Password CLI を使った例
- `gitflow-cleanup.yml` - Git Flow パターン例
- `advanced-cleanup.yml` - 応用例（ドライラン、通知など）
