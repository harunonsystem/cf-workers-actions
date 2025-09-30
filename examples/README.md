# Examples

このディレクトリには、Cloudflare ActionsをGitHub Marketplaceで公開した際の実際の使用例が含まれています。

## 概要

Cloudflare Actionsは、Cloudflare Workers/Pagesのデプロイを自動化するGitHub Actionです。このexamplesディレクトリでは、実際のワークフローでどのように使用するかを示すサンプルを提供しています。

## 構造

各機能（preview deploy、worker delete）について、以下の2つの認証方法のサンプルを提供しています：

### 認証方法

- **1Password CLIを使った場合** (`using-1pass-cli.yml`)
- **GitHub Secretsを使った場合** (`using-secrets.yml`)

### 各機能のサンプル

- **`preview-deploy/`** - プレビュー及び本番環境へのデプロイ例
- **`advanced/gitflow-pattern/`** - GitFlowパターン（develop/staging/mainブランチ）
- **`worker-delete/`** - Workerのクリーンアップ例

## クイックスタート

### 基本的なセットアップ

1. **認証方法を選択**：1Password CLIまたはGitHub Secretsのいずれかを選択
2. **必要なSecretsを設定**：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. **ワークフローファイルをコピー**：`.github/workflows/`にコピー

### 認証方法の詳細

#### 1Password CLIを使った場合

1Password CLIを使用して、Cloudflareの認証情報を安全に取得します。

```yaml
- name: Setup 1Password CLI
  uses: 1password/load-secrets-action@v1
  with:
    export-env: true
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    CLOUDFLARE_API_TOKEN: op://vault/cloudflare-api-token
    CLOUDFLARE_ACCOUNT_ID: op://vault/cloudflare-account-id
```

#### GitHub Secretsを使った場合

GitHubのSecrets機能を使用して認証情報を管理します。

```yaml
- name: Deploy to Cloudflare
  uses: harunonsystem/cloudflare-actions/deploy@v1
  with:
    api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## 各機能の詳細

### preview-deploy/

プレビュー環境と本番環境へのデプロイを自動化します。

- **プレビュー**: PRやfeatureブランチから動的な名前でWorkerを作成
- **本番**: main/masterブランチから固定名でデプロイ
- **自動URL生成**: デプロイ後にアクセスURLを自動生成・出力

### worker-delete/

使用しなくなったWorkerを自動的に削除します。

- **自動クリーンアップ**: マージされたPRのプレビューWorkerを削除
- **パターン指定**: 削除対象のWorkerをパターンで指定可能

### advanced/gitflow-pattern/

より複雑なGitFlowパターンの実装例です。

- **複数環境**: develop → staging → main の流れ
- **環境別設定**: 各環境に固有の設定を適用

## 使用例

各ディレクトリのREADMEファイルで詳細な使用方法を確認してください。実際のユースケースに応じて、適切な認証方法と設定を選択してください。

## 注意事項

- 1Password CLIを使用する場合は、別途1Passwordのアカウントと設定が必要です
- GitHub Secretsを使用する場合は、事前にCloudflareの認証情報をGitHubのSecretsに登録してください
- 各サンプルは実際のプロジェクトに合わせて適宜カスタマイズしてください
