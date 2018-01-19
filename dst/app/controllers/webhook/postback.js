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
const moment = require("moment");
// tslint:disable-next-line:no-require-imports no-var-requires
require('moment-timezone');
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
 * 購入番号で取引を検索する
 * @export
 * @memberof app.controllers.webhook.postback
 */
function searchTransactionByPaymentNo(userId, paymentNo, performanceDate) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${performanceDate}-${paymentNo}の取引を検索しています...`);
        // 取引検索
        const transactionAdapter = new ttts.repository.Transaction(ttts.mongoose.connection);
        yield transactionAdapter.transactionModel.findOne({
            typeOf: ttts.factory.transactionType.PlaceOrder,
            'result.order.orderInquiryKey.performanceDay': moment(`${performanceDate}T00:00:00+09:00`).tz('Asia/Tokyo').format('YYYYMMDD'),
            'result.order.orderInquiryKey.paymentNo': paymentNo
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
exports.searchTransactionByPaymentNo = searchTransactionByPaymentNo;
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
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const taskAdapter = new ttts.repository.Task(ttts.mongoose.connection);
        const transactionAdapter = new ttts.repository.Transaction(ttts.mongoose.connection);
        // 取引検索
        const transaction = yield transactionAdapter.transactionModel.findOne({
            'result.order.orderNumber': orderNumber,
            typeOf: ttts.factory.transactionType.PlaceOrder
        }).then((doc) => doc.toObject());
        const report = ttts.service.transaction.placeOrder.transaction2report(transaction);
        debug('report:', report);
        // 返品取引検索
        const returnOrderTransaction = yield transactionAdapter.transactionModel.findOne({
            'object.transaction.id': transaction.id,
            typeOf: ttts.factory.transactionType.ReturnOrder
        }).then((doc) => (doc === null) ? null : doc.toObject());
        debug('returnOrderTransaction:', returnOrderTransaction);
        // 確定取引なので、結果はundefinedではない
        // const transactionResult = <ttts.factory.transaction.placeOrder.IResult>transaction.result;
        // const transactionResult = transactionResult.eventReservations.filter(
        //     (r) => r.status === ttts.factory.reservationStatusType.ReservationConfirmed
        // );
        // 予約検索
        const reservations = yield reservationRepo.reservationModel.find({
            transaction: transaction.id
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug('reservations:', reservations.length);
        // 非同期タスク検索
        const tasks = yield taskAdapter.taskModel.find({
            'data.transactionId': transaction.id
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        // 取引に関するイベント
        const transactionEvents = [
            { name: '開始', occurDate: transaction.startDate },
            { name: '確定', occurDate: transaction.endDate }
        ];
        tasks.forEach((task) => {
            let taskNameStr = task.name.toString();
            switch (task.name) {
                case ttts.factory.taskName.SettleSeatReservation:
                    taskNameStr = '予約作成';
                    break;
                case ttts.factory.taskName.SettleCreditCard:
                    taskNameStr = '売上';
                    break;
                case ttts.factory.taskName.SendEmailNotification:
                    taskNameStr = 'メール送信';
                    break;
                case ttts.factory.taskName.CreateOrder:
                    taskNameStr = '注文作成';
                    break;
                default:
            }
            const occurDate = (task.status === ttts.factory.taskStatus.Executed && task.lastTriedAt !== null)
                ? task.lastTriedAt
                : undefined;
            transactionEvents.push({
                name: taskNameStr,
                occurDate: occurDate
            });
        });
        if (returnOrderTransaction !== null) {
            transactionEvents.push({
                name: '返品確定',
                occurDate: returnOrderTransaction.endDate
            });
        }
        // tslint:disable:max-line-length
        const transactionDetails = `--------------------
注文取引概要
--------------------
取引ステータス: ${report.status}
注文ステータス:${(returnOrderTransaction === null) ? ttts.factory.orderStatus.OrderDelivered : ttts.factory.orderStatus.OrderReturned}
購入番号: ${report.confirmationNumber}
--------------------
注文取引状況
--------------------
${transactionEvents.map((e) => `${(e.occurDate !== undefined) ? moment(e.occurDate).format('YYYY-MM-DD HH:mm:ss') : '---------- --:--:--'} ${e.name}`).join('\n')}
--------------------
購入者情報
--------------------
${report.customer.group}
${report.customer.name}
${report.customer.telephone}
${report.customer.email}
--------------------
座席予約
--------------------
${moment(report.eventStartDate).format('YYYY-MM-DD HH:mm')}-${moment(report.eventEndDate).format('HH:mm')}
${report.reservedTickets.split('\n').map((str) => `●${str}`).join('\n')}
--------------------
決済方法
--------------------
${report.paymentMethod}
${report.paymentMethodId}
${report.price}
--------------------
割引
--------------------
${report.discounts}
${report.discountCodes}
￥${report.discountPrices}
--------------------
予約現状
--------------------
${reservations.map((r) => `●${r.seat_code} ${r.status}`).join('\n')}
`;
        yield LINE.pushMessage(userId, transactionDetails);
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
function searchTransactionsByDate(userId, date) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(userId, `${date}の取引を検索しています...`);
        const startFrom = moment(`${date}T00:00:00+09:00`);
        const startThrough = moment(`${date}T00:00:00+09:00`).add(1, 'day');
        const csv = yield ttts.service.transaction.placeOrder.download({
            startFrom: startFrom.toDate(),
            startThrough: startThrough.toDate()
        }, 'csv')(new ttts.repository.Transaction(ttts.mongoose.connection));
        yield LINE.pushMessage(userId, 'csvを作成しています...');
        const sasUrl = yield ttts.service.util.uploadFile({
            fileName: `ttts-line-assistant-transactions-${moment().format('YYYYMMDDHHmmss')}.csv`,
            text: csv
        })();
        yield LINE.pushMessage(userId, `download -> ${sasUrl} `);
    });
}
exports.searchTransactionsByDate = searchTransactionsByDate;
