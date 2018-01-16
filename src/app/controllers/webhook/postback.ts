/**
 * LINE webhook postbackコントローラー
 * @namespace app.controllers.webhook.postback
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';
// tslint:disable-next-line:no-require-imports no-var-requires
require('moment-timezone');

import * as LINE from '../../../line';

const debug = createDebug('ttts-line-assistant:controller:webhook:postback');
const MESSAGE_TRANSACTION_NOT_FOUND = '該当取引はありません';

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

/**
 * 購入番号で取引を検索する
 * @export
 * @memberof app.controllers.webhook.postback
 */
export async function searchTransactionByPaymentNo(userId: string, paymentNo: string, performanceDate: string) {
    await LINE.pushMessage(userId, `${performanceDate}-${paymentNo}の取引を検索しています...`);

    // 取引検索
    const transactionAdapter = new ttts.repository.Transaction(ttts.mongoose.connection);
    await transactionAdapter.transactionModel.findOne(
        {
            'result.order.orderInquiryKey.performanceDay': moment(`${performanceDate}T00:00:00+09:00`).tz('Asia/Tokyo').format('YYYYMMDD'),
            'result.order.orderInquiryKey.paymentNo': paymentNo
        },
        'result'
    ).exec().then(async (doc) => {
        if (doc === null) {
            await LINE.pushMessage(userId, MESSAGE_TRANSACTION_NOT_FOUND);
        } else {
            const transaction = <ttts.factory.transaction.placeOrder.ITransaction>doc.toObject();
            await pushTransactionDetails(userId, (<ttts.factory.transaction.placeOrder.IResult>transaction.result).order.orderNumber);
        }
    });
}

/**
 * 取引IDから取引情報詳細を送信する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId LINEユーザーID
 * @param {string} transactionId 取引ID
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function pushTransactionDetails(userId: string, orderNumber: string) {
    await LINE.pushMessage(userId, `${orderNumber}の取引詳細をまとめています...`);

    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
    const taskAdapter = new ttts.repository.Task(ttts.mongoose.connection);
    const transactionAdapter = new ttts.repository.Transaction(ttts.mongoose.connection);

    // 取引検索
    const transaction = <ttts.factory.transaction.placeOrder.ITransaction>await transactionAdapter.transactionModel.findOne({
        'result.order.orderNumber': orderNumber,
        typeOf: ttts.factory.transactionType.PlaceOrder
    }).then((doc: ttts.mongoose.Document) => doc.toObject());
    const report = ttts.service.transaction.placeOrder.transaction2report(transaction);
    debug('report:', report);

    // 返品取引検索
    const returnOrderTransaction = await transactionAdapter.transactionModel.findOne({
        'object.transaction.id': transaction.id,
        typeOf: ttts.factory.transactionType.ReturnOrder
    }).then((doc) => (doc === null) ? null : <ttts.factory.transaction.returnOrder.ITransaction>doc.toObject());
    debug('returnOrderTransaction:', returnOrderTransaction);

    // 確定取引なので、結果はundefinedではない
    // const transactionResult = <ttts.factory.transaction.placeOrder.IResult>transaction.result;
    // const transactionResult = transactionResult.eventReservations.filter(
    //     (r) => r.status === ttts.factory.reservationStatusType.ReservationConfirmed
    // );

    // 予約検索
    const reservations = await reservationRepo.reservationModel.find({
        transaction: transaction.id
    }).exec().then((docs) => docs.map((doc) => <ttts.factory.reservation.event.IReservation>doc.toObject()));
    debug('reservations:', reservations.length);

    // 非同期タスク検索
    const tasks = <ttts.factory.task.ITask[]>await taskAdapter.taskModel.find({
        'data.transactionId': transaction.id
    }).exec().then((docs) => docs.map((doc) => doc.toObject()));

    // 取引に関するイベント
    const transactionEvents: {
        name: string;
        occurDate?: Date;
    }[] = [
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
`
        ;

    await LINE.pushMessage(userId, transactionDetails);
}

/**
 * 取引を通知する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param userId LINEユーザーID
 * @param transactionId 取引ID
 */
export async function pushNotification(userId: string, transactionId: string) {
    await LINE.pushMessage(userId, '送信中...');

    const taskAdapter = new ttts.repository.Task(ttts.mongoose.connection);

    // タスク検索
    const tasks = await taskAdapter.taskModel.find({
        name: ttts.factory.taskName.SendEmailNotification,
        'data.transactionId': transactionId
    }).exec();

    if (tasks.length === 0) {
        await LINE.pushMessage(userId, 'Task not found.');

        return;
    }

    let promises: Promise<void>[] = [];
    promises = promises.concat(tasks.map(async (task) => {
        await ttts.service.task.execute(<ttts.factory.task.ITask>task.toObject())(taskAdapter, ttts.mongoose.connection, redisClient);
    }));

    try {
        await Promise.all(promises);
    } catch (error) {
        await LINE.pushMessage(userId, `送信失敗:${error.message}`);

        return;
    }

    await LINE.pushMessage(userId, '送信完了');
}

/**
 * 座席の本予約を実行する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param userId LINEユーザーID
 * @param transactionId 取引ID
 */
export async function settleSeatReservation(userId: string, transactionId: string) {
    await LINE.pushMessage(userId, '本予約中...');

    const taskAdapter = new ttts.repository.Task(ttts.mongoose.connection);

    // タスク検索
    const tasks = await taskAdapter.taskModel.find({
        name: ttts.factory.taskName.SettleSeatReservation,
        'data.transactionId': transactionId
    }).exec();

    if (tasks.length === 0) {
        await LINE.pushMessage(userId, 'Task not found.');

        return;
    }

    try {
        await Promise.all(tasks.map(async (task) => {
            await ttts.service.task.execute(<ttts.factory.task.ITask>task.toObject())(taskAdapter, ttts.mongoose.connection, redisClient);
        }));
    } catch (error) {
        await LINE.pushMessage(userId, `本予約失敗:${error.message}`);

        return;
    }

    await LINE.pushMessage(userId, '本予約完了');
}

/**
 * 取引検索(csvダウンロード)
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId
 * @param {string} date YYYY-MM-DD形式
 */
export async function searchTransactionsByDate(userId: string, __: string) {
    await LINE.pushMessage(userId, 'implementing...');
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
}
