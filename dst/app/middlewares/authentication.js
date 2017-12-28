"use strict";
/**
 * oauthミドルウェア
 * @module middlewares.authentication
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const http_status_1 = require("http-status");
const request = require("request-promise-native");
const LINE = require("../../line");
const user_1 = require("../user");
exports.default = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // ユーザー認証無効化の設定の場合
        if (process.env.USER_AUTHENTICATION_DISABLED === '1') {
            next();
            return;
        }
        // RedisからBearerトークンを取り出す
        const event = (req.body.events !== undefined) ? req.body.events[0] : undefined;
        if (event === undefined) {
            throw new Error('Invalid request.');
        }
        const userId = event.source.userId;
        req.user = new user_1.default({
            host: req.hostname,
            userId: userId,
            state: JSON.stringify(req.body)
        });
        if (yield req.user.isAuthenticated()) {
            next();
            return;
        }
        // ログインボタンを送信
        // await LINE.pushMessage(userId, req.user.generateAuthUrl());
        yield request.post({
            simple: false,
            url: LINE.URL_PUSH_MESSAGE,
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'ログインボタン',
                        template: {
                            type: 'buttons',
                            text: 'ログインしてください。',
                            actions: [
                                {
                                    type: 'uri',
                                    label: 'Sign In',
                                    uri: req.user.generateAuthUrl()
                                }
                            ]
                        }
                    }
                ]
            }
        });
        res.status(http_status_1.OK).send('ok');
    }
    catch (error) {
        next(new ttts.factory.errors.Unauthorized(error.message));
    }
});
