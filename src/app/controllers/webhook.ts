/**
 * LINE webhookコントローラー
 * @namespace app.controllers.webhook
 */

import * as createDebug from 'debug';
import * as querystring from 'querystring';

import * as LINE from '../../line';
import * as MessageController from './webhook/message';
import * as PostbackController from './webhook/postback';

const debug = createDebug('ttts-line-assistant:controller:webhook');

/**
 * メッセージが送信されたことを示すEvent Objectです。
 */
export async function message(event: LINE.IWebhookEvent) {
    const messageText: string = event.message.text;
    const userId = event.source.userId;

    try {
        switch (true) {
            // [購入番号]で検索
            case /^\d{6}$/.test(messageText):
                await MessageController.askReservationEventDate(userId, messageText);
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
                await MessageController.pushHowToUse(userId);
                break;
        }
    } catch (error) {
        // エラーメッセージ表示
        await LINE.pushMessage(userId, error.toString());
    }
}

/**
 * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです。
 */
export async function postback(event: LINE.IWebhookEvent) {
    const data = querystring.parse(event.postback.data);
    debug('data:', data);
    const userId = event.source.userId;

    try {
        switch (data.action) {
            case 'searchTransactionByPaymentNo':
                // 購入番号と開演日で取引検索
                await PostbackController.searchTransactionByPaymentNo(userId, <string>data.paymentNo, <string>event.postback.params.date);
                break;

            case 'pushNotification':
                await PostbackController.pushNotification(userId, <string>data.transaction);
                break;

            case 'settleSeatReservation':
                await PostbackController.settleSeatReservation(userId, <string>data.transaction);
                break;

            case 'searchTransactionsByDate':
                await PostbackController.searchTransactionsByDate(userId, <string>event.postback.params.date);
                break;

            default:
                break;
        }
    } catch (error) {
        console.error(error);
        // エラーメッセージ表示
        await LINE.pushMessage(userId, error.toString());
    }
}

/**
 * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです。
 */
export async function follow(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベント送信元にブロックされたことを示すevent objectです。
 */
export async function unfollow(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです。
 */
export async function join(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループから退出させられたことを示すevent objectです。
 */
export async function leave(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです。
 */
export async function beacon(event: LINE.IWebhookEvent) {
    debug('event is', event);
}
