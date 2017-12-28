/**
 * LINE webhook postbackコントローラー
 * @namespace app.controllers.webhook.postback
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
// import * as moment from 'moment';
// import * as request from 'request-promise-native';
// import * as util from 'util';

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
 * 予約番号で取引を検索する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId LINEユーザーID
 * @param {string} reserveNum 予約番号
 * @param {string} theaterCode 劇場コード
 */
export async function searchTransactionByReserveNum(userId: string, reserveNum: string, theaterCode: string) {
    debug(userId, reserveNum);
    await LINE.pushMessage(userId, '予約番号で検索しています...');

    // 取引検索
    const transactionAdapter = new ttts.repository.Transaction(ttts.mongoose.connection);
    await transactionAdapter.transactionModel.findOne(
        {
            // tslint:disable-next-line:no-magic-numbers
            'result.order.orderInquiryKey.confirmationNumber': parseInt(reserveNum, 10),
            'result.order.orderInquiryKey.theaterCode': theaterCode
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
 * 電話番号で取引を検索する
 * @export
 * @function
 * @memberof app.controllers.webhook.postback
 * @param {string} userId LINEユーザーID
 * @param {string} tel 電話番号
 * @param {string} theaterCode 劇場コード
 */
export async function searchTransactionByTel(userId: string, tel: string, __: string) {
    debug('tel:', tel);
    await LINE.pushMessage(userId, 'implementing...');
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
    await LINE.pushMessage(userId, 'implementing...');
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
