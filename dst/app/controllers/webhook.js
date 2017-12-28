"use strict";
/**
 * LINE webhookコントローラー
 * @namespace app.controllers.webhook
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
const querystring = require("querystring");
const LINE = require("../../line");
const MessageController = require("./webhook/message");
const PostbackController = require("./webhook/postback");
const debug = createDebug('ttts-line-assistant:controller:webhook');
/**
 * メッセージが送信されたことを示すEvent Objectです。
 */
function message(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const messageText = event.message.text;
        const userId = event.source.userId;
        try {
            switch (true) {
                // [購入番号]で検索
                case /^\d{6}$/.test(messageText):
                    yield MessageController.askReservationEventDate(userId, messageText);
                    break;
                // 取引csv要求
                // case /^csv$/.test(messageText):
                // await MessageController.askFromWhenAndToWhen(userId);
                //     break;
                // 取引csv期間指定
                // case /^\d{8}-\d{8}$/.test(messageText):
                //     // tslint:disable-next-line:no-magic-numbers
                //     await MessageController.publishURI4transactionsCSV(userId, messageText.substr(0, 8), messageText.substr(9, 8));
                //     break;
                default:
                    // 予約照会方法をアドバイス
                    yield MessageController.pushHowToUse(userId);
                    break;
            }
        }
        catch (error) {
            console.error(error);
            // エラーメッセージ表示
            yield LINE.pushMessage(userId, error.toString());
        }
    });
}
exports.message = message;
/**
 * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです。
 */
function postback(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = querystring.parse(event.postback.data);
        debug('data:', data);
        const userId = event.source.userId;
        try {
            switch (data.action) {
                case 'searchTransactionByPaymentNo':
                    // 購入番号と開演日で取引検索
                    yield PostbackController.searchTransactionByPaymentNo(userId, data.paymentNo, event.postback.params.date);
                    break;
                case 'pushNotification':
                    yield PostbackController.pushNotification(userId, data.transaction);
                    break;
                case 'settleSeatReservation':
                    yield PostbackController.settleSeatReservation(userId, data.transaction);
                    break;
                case 'searchTransactionsByDate':
                    yield PostbackController.searchTransactionsByDate(userId, event.postback.params.date);
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            console.error(error);
            // エラーメッセージ表示
            yield LINE.pushMessage(userId, error.toString());
        }
    });
}
exports.postback = postback;
/**
 * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです。
 */
function follow(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.follow = follow;
/**
 * イベント送信元にブロックされたことを示すevent objectです。
 */
function unfollow(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.unfollow = unfollow;
/**
 * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです。
 */
function join(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.join = join;
/**
 * イベントの送信元グループから退出させられたことを示すevent objectです。
 */
function leave(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.leave = leave;
/**
 * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです。
 */
function beacon(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.beacon = beacon;
