<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# TTTS LINE Messaging APIを使った業務アプリ

LINE Messaging APIは、トークやアカウントに関するイベントに対するウェブフックの仕組みを持っています。
それを受けるウェブアプリです。

## Getting Started

### インフラ
基本的にnode.jsのウェブアプリケーション。
ウェブサーバーとしては、AzureのWebApps or GCPのAppEngine or AWSのelastic beanstalkを想定。
全てで動くように開発していくことが望ましい。

### 言語
実態としては、linuxあるいはwindows上でのnode.js。プログラミング言語としては、TypeScript。

* [TypeScript](https://www.typescriptlang.org/)

### 開発方法
npmでパッケージをインストール。

```shell
npm install
```
* [npm](https://www.npmjs.com/)

typescriptをjavascriptにコンパイル。

```shell
npm run build -- -w
```

npmでローカルサーバーを起動。

```shell
npm start
```


### Environment variables

| Name                              | Required | Purpose               | Value                           |
| --------------------------------- | -------- | --------------------- | ------------------------------- |
| `DEBUG`                           | false    | ttts-line-assistant:* | Debug                           |
| `NPM_TOKEN`                       | true     |                       | NPM auth token                  |
| `NODE_ENV`                        | true     |                       | environment name                |
| `MONGOLAB_URI`                    | true     |                       | MongoDB connection URI          |
| `SENDGRID_API_KEY`                | true     |                       | SendGrid API Key                |
| `REDIS_HOST`                      | true     |                       | ログイン状態保持ストレージ等             |
| `REDIS_PORT`                      | true     |                       | ログイン状態保持ストレージ等             |
| `REDIS_KEY`                       | true     |                       | ログイン状態保持ストレージ等             |
| `GMO_ENDPOINT`                    | true     |                       | GMO API endpoint                |
| `GMO_SITE_ID`                     | true     |                       | GMO SiteID                      |
| `GMO_SITE_PASS`                   | true     |                       | GMO SitePass                    |
| `AZURE_STORAGE_CONNECTION_STRING` | true     |                       | Save CSV files on azure storage |
| `LINE_BOT_CHANNEL_SECRET`         | true     |                       | LINE Messaging API 署名検証     |
| `LINE_BOT_CHANNEL_ACCESS_TOKEN`   | true     |                       | LINE Messaging API 認証         |
| `API_AUTHORIZE_SERVER_DOMAIN`     | true     |                       | TTTS API 認可サーバードメイン           |
| `API_CLIENT_ID`                   | true     |                       | TTTS APIクライアントID                |
| `API_CLIENT_SECRET`               | true     |                       | TTTS APIクライアントシークレット            |
| `API_TOKEN_ISSUER`                | true     |                       | TTTS APIトークン発行者              |
| `API_CODE_VERIFIER`               | true     |                       | TTTS API認可コード検証鍵           |
| `USER_EXPIRES_IN_SECONDS`         | true     |                       | ユーザーセッション保持期間               |


## tslint

コード品質チェックをtslintで行う。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)

`npm run check`でチェック実行。


## パッケージ脆弱性のチェック

* [nsp](https://www.npmjs.com/package/nsp)


## clean
`npm run clean`で不要なソース削除。


## テスト
`npm test`でテスト実行。


## ドキュメント
`npm run doc`でjsdocが作成されます。


## 参考

### LINE Reference

* [LINE BUSSINESS CENTER](https://business.line.me/ja/)
* [LINE@MANAGER](https://admin-official.line.me/)
* [API Reference](https://devdocs.line.me/ja/)
* [LINE Pay技術サポート](https://pay.line.me/jp/developers/documentation/download/tech?locale=ja_JP)
* [LINE Pay Home](https://pay.line.me/jp/)


### Cognitive Services

* [Web Language Model API](https://westus.dev.cognitive.microsoft.com/docs/services/55de9ca4e597ed1fd4e2f104/operations/55de9ca4e597ed19b0de8a51)
