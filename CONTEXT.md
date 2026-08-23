# Cloudflare Workers Actions

Cloudflare Workers の preview deployment と、その GitHub Actions からの運用を扱う context です。

## Preview deployment

ブランチまたは commit に対応する一時的な Worker の deployment と、その確認用 URL。
_Avoid_: production deployment, release

## Worker

Cloudflare 上で実行される script と、preview deployment に割り当てられた名前の組み合わせ。
_Avoid_: function, service

## Worker name template

ブランチ名や commit hash から preview 用 Worker の名前を組み立てる表現。
_Avoid_: worker pattern

## Cleanup

不要になった preview Worker を選択し、削除または dry run の結果として扱う運用。
_Avoid_: garbage collection, purge

## Preview comment

GitHub の pull request に preview deployment の URL、Worker 名、状態を伝える comment。
_Avoid_: deployment message, status note

## Action contract

GitHub Action が外部に公開する input、output、default、説明の組み合わせ。
_Avoid_: manifest only, configuration detail
