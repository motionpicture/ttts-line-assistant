/**
 * 認証ルーター
 * @ignore
 */

import * as express from 'express';
import * as request from 'request-promise-native';

import * as LINE from '../../line';
import User from '../user';

const authRouter = express.Router();

/**
 * サインイン
 * Cognitoからリダイレクトしてくる
 */
authRouter.get(
    '/signIn',
    async (req, res, next) => {
        try {
            // stateにはイベントオブジェクトとして受け取ったリクエストボディが入っている
            const body = JSON.parse(req.query.state);
            const event: LINE.IWebhookEvent = body.events[0];
            const user = new User({
                host: req.hostname,
                userId: event.source.userId,
                state: req.query.state
            });

            await user.signIn(req.query.code);
            await user.isAuthenticated();
            await LINE.pushMessage(event.source.userId, `Signed in. ${user.payload.username}`);

            // イベントを強制的に再送信
            try {
                await request.post(`https://${req.hostname}/webhook`, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    form: body
                });
            } catch (error) {
                await LINE.pushMessage(event.source.userId, error.message);
            }

            const location = 'line://';
            // if (event.type === 'message') {
            //     location = `line://oaMessage/${LINE_ID}/?${event.message.text}`;
            // }

            res.send(`
<html>
<body onload="location.href='line://'">
<div style="text-align:center; font-size:400%">
<h1>Hello ${user.payload.username}.</h1>
<a href="${location}">Back to LINE.</a>
</div>
</body>
</html>`
            );
        } catch (error) {
            next(error);
        }
    });

export default authRouter;
