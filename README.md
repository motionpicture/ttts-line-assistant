<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# TTTS LINE Messaging APIを使った業務アプリ

[![CircleCI](https://circleci.com/gh/motionpicture/ttts-line-assistant.svg?style=svg&circle-token=8173b83b175943355f70bcbccd120ea94879d1be)](https://circleci.com/gh/motionpicture/ttts-line-assistant)


## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [Jsdoc](#jsdoc)
* [License](#license)
* [Reference](#reference)

## Usage

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


## Code Samples

Code sample are [here](https://github.com/motionpicture/ttts-line-assistant/tree/master/example).

## Jsdoc

`npm run doc` emits jsdoc to ./doc.

## License

UNLICENSED


## Reference

### LINE Reference

* [LINE BUSSINESS CENTER](https://business.line.me/ja/)
* [LINE@MANAGER](https://admin-official.line.me/)
* [API Reference](https://devdocs.line.me/ja/)
* [LINE Pay技術サポート](https://pay.line.me/jp/developers/documentation/download/tech?locale=ja_JP)
* [LINE Pay Home](https://pay.line.me/jp/)


### Cognitive Services

* [Web Language Model API](https://westus.dev.cognitive.microsoft.com/docs/services/55de9ca4e597ed1fd4e2f104/operations/55de9ca4e597ed19b0de8a51)
