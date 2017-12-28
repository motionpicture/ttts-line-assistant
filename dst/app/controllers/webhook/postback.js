"use strict";
/**
 * LINE webhook postbackコントローラー
 * @namespace app.controllers.webhook.postback
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
const createDebug = require("debug");
// import * as moment from 'moment';
// import * as request from 'request-promise-native';
// import * as util from 'util';
const LINE = require("../../../line");
const debug = createDebug('ttts-line-assistant:controller:webhook:postback');
const MESSAGE_TRANSACTION_NOT_FOUND = '該当取引はありません';
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
/**
 * 予約番号で取引を検索する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId LINEユーザーID
 * @param {string} reserveNum 予約番号
 * @param {string} theaterCode 劇場コード
 */
function searchTransactionByReserveNum(userId, reserveNum, theaterCode) {
    return __awaiter(this, void 0, void 0, function* () {
        debug(userId, reserveNum);
        yield LINE.pushMessage(userId, '予約番号で検索しています...');
        // 取引検索
        const transactionAdapter = new ttts.repository.Transaction(ttts.mongoose.connection);
        yield transactionAdapter.transactionModel.findOne({
            // tslint:disable-next-line:no-magic-numbers
            'result.order.orderInquiryKey.confirmationNumber': parseInt(reserveNum, 10),
            'result.order.orderInquiryKey.theaterCode': theaterCode
        }, 'result').exec().then((doc) => __awaiter(this, void 0, void 0, function* () {
            if (doc === null) {
                yield LINE.pushMessage(userId, MESSAGE_TRANSACTION_NOT_FOUND);
            }
            else {
                const transaction = doc.toObject();
                yield pushTransactionDetails(userId, transaction.result.order.orderNumber);
            }
        }));
    });
}
exports.searchTransactionByReserveNum = searchTransactionByReserveNum;
/**
 * 電話番号で取引を検索する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId LINEユーザーID
 * @param {string} tel 電話番号
 * @param {string} theaterCode 劇場コード
 */
function searchTransactionByTel(userId, tel, __) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('tel:', tel);
        yield LINE.pushMessage(userId, 'implementing...');
    });
}
exports.searchTransactionByTel = searchTransactionByTel;
/**
 * 取引IDから取引情報詳細を送信する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId LINEユーザーID
 * @param {string} transactionId 取引ID
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function pushTransactionDetails(userId, orderNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${orderNumber}の取引詳細をまとめています...`);
        yield LINE.pushMessage(userId, 'implementing...');
    });
}
/**
 * 取引を通知する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param userId LINEユーザーID
 * @param transactionId 取引ID
 */
function pushNotification(userId, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, '送信中...');
        const taskAdapter = new ttts.repository.Task(ttts.mongoose.connection);
        // タスク検索
        const tasks = yield taskAdapter.taskModel.find({
            name: ttts.factory.taskName.SendEmailNotification,
            'data.transactionId': transactionId
        }).exec();
        if (tasks.length === 0) {
            yield LINE.pushMessage(userId, 'Task not found.');
            return;
        }
        let promises = [];
        promises = promises.concat(tasks.map((task) => __awaiter(this, void 0, void 0, function* () {
            yield ttts.service.task.execute(task.toObject())(taskAdapter, ttts.mongoose.connection, redisClient);
        })));
        try {
            yield Promise.all(promises);
        }
        catch (error) {
            yield LINE.pushMessage(userId, `送信失敗:${error.message}`);
            return;
        }
        yield LINE.pushMessage(userId, '送信完了');
    });
}
exports.pushNotification = pushNotification;
/**
 * 座席の本予約を実行する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param userId LINEユーザーID
 * @param transactionId 取引ID
 */
function settleSeatReservation(userId, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, '本予約中...');
        const taskAdapter = new ttts.repository.Task(ttts.mongoose.connection);
        // タスク検索
        const tasks = yield taskAdapter.taskModel.find({
            name: ttts.factory.taskName.SettleSeatReservation,
            'data.transactionId': transactionId
        }).exec();
        if (tasks.length === 0) {
            yield LINE.pushMessage(userId, 'Task not found.');
            return;
        }
        try {
            yield Promise.all(tasks.map((task) => __awaiter(this, void 0, void 0, function* () {
                yield ttts.service.task.execute(task.toObject())(taskAdapter, ttts.mongoose.connection, redisClient);
            })));
        }
        catch (error) {
            yield LINE.pushMessage(userId, `本予約失敗:${error.message}`);
            return;
        }
        yield LINE.pushMessage(userId, '本予約完了');
    });
}
exports.settleSeatReservation = settleSeatReservation;
/**
 * 取引検索(csvダウンロード)
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId
 * @param {string} date YYYY-MM-DD形式
 */
function searchTransactionsByDate(userId, __) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, 'implementing...');
        // await LINE.pushMessage(userId, `${date}の取引を検索しています...`);
        // const startFrom = moment(`${date}T00:00:00+09:00`);
        // const startThrough = moment(`${date}T00:00:00+09:00`).add(1, 'day');
        // const csv = await ttts.service.transaction.placeOrder.download(
        //     {
        //         startFrom: startFrom.toDate(),
        //         startThrough: startThrough.toDate()
        //     },
        //     'csv'
        // )(new ttts.repository.Transaction(ttts.mongoose.connection));
        // await LINE.pushMessage(userId, 'csvを作成しています...');
        // const sasUrl = await ttts.service.util.uploadFile({
        //     fileName: `ttts-line-assistant-transactions-${moment().format('YYYYMMDDHHmmss')}.csv`,
        //     text: csv
        // })();
        // await LINE.pushMessage(userId, `download -> ${sasUrl} `);
    });
}
exports.searchTransactionsByDate = searchTransactionsByDate;
