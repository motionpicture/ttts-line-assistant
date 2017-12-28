"use strict";
/**
 * LINEモジュール
 * @namespace line
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
const createDebug = require("debug");
const request = require("request-promise-native");
const debug = createDebug('ttts-line-assistant:controller:line');
exports.URL_PUSH_MESSAGE = 'https://api.line.me/v2/bot/message/push';
/**
 * メッセージ送信
 * @export
 * @function
 * @memberof app.controllers.line
 * @param {string} userId LINEユーザーID
 * @param {string} text メッセージ
 */
function pushMessage(userId, text) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('pushing a message...', text);
        // push message
        yield request.post({
            simple: false,
            url: exports.URL_PUSH_MESSAGE,
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'text',
                        text: text
                    }
                ]
            }
        }).promise();
    });
}
exports.pushMessage = pushMessage;
