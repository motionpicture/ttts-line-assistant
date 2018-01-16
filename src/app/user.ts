import * as tttsapi from '@motionpicture/ttts-api-nodejs-client';
import * as createDebug from 'debug';
import * as redis from 'ioredis';
import * as jwt from 'jsonwebtoken';
// tslint:disable-next-line:no-require-imports no-var-requires
const jwkToPem = require('jwk-to-pem');
import * as request from 'request-promise-native';

const debug = createDebug('ttts-line-assistant:user');
const ISSUER = <string>process.env.API_TOKEN_ISSUER;
let pems: IPems;

const redisClient = new redis({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: <any>{ servername: <string>process.env.REDIS_HOST }
});

/**
 * cognito認可サーバーのOPEN ID構成インターフェース
 * @export
 * @interface
 */
export interface IOpenIdConfiguration {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    jwks_uri: string;
    response_types_supported: string[];
    subject_types_supported: string[];
    version: string;
    id_token_signing_alg_values_supported: string[];
    x509_url: string;
}

/**
 * トークンに含まれる情報インターフェース
 * @export
 * @interface
 */
export interface IPayload {
    sub: string;
    token_use: string;
    scope: string;
    iss: string;
    exp: number;
    iat: number;
    version: number;
    jti: string;
    client_id: string;
    username?: string;
}

/**
 * 公開鍵インターフェース
 * @export
 * @interface
 */
export interface IPems {
    [key: string]: string;
}

/**
 * ユーザー設定インターフェース
 * @export
 * @interface
 */
export interface IConfigurations {
    host: string;
    userId: string;
    state: string;
}

if (process.env.USER_EXPIRES_IN_SECONDS === undefined) {
    throw new Error('USER_EXPIRES_IN_SECONDS undefined.');
}
// tslint:disable-next-line:no-magic-numbers
const EXPIRES_IN_SECONDS = parseInt(<string>process.env.USER_EXPIRES_IN_SECONDS, 10);

/**
 * LINEユーザー
 * @class
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
export default class User {
    public host: string;
    public state: string;
    public userId: string;
    public payload: IPayload;
    public scopes: string[];
    public accessToken: string;
    private authClient: tttsapi.auth.OAuth2;

    constructor(configurations: IConfigurations) {
        this.host = configurations.host;
        this.userId = configurations.userId;
        this.state = configurations.state;

        this.authClient = new tttsapi.auth.OAuth2({
            domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
            clientId: <string>process.env.API_CLIENT_ID,
            clientSecret: <string>process.env.API_CLIENT_SECRET,
            redirectUri: `https://${configurations.host}/signIn`,
            logoutUri: `https://${configurations.host}/logout?userId=${this.userId}`
        });
    }

    public generateAuthUrl() {
        const scopes = [
            'phone', 'openid', 'email', 'aws.cognito.signin.user.admin', 'profile'
        ];

        return this.authClient.generateAuthUrl({
            scopes: scopes,
            state: this.state,
            codeVerifier: <string>process.env.API_CODE_VERIFIER
        });
    }

    public generateLogoutUrl() {
        return this.authClient.generateLogoutUrl();
    }

    public async isAuthenticated() {
        const token = await redisClient.get(`token.${this.userId}`);
        if (token === null) {
            return false;
        }

        const payload = await validateToken(token, {
            issuer: ISSUER,
            tokenUse: 'access' // access tokenのみ受け付ける
        });
        debug('verified! payload:', payload);
        this.payload = payload;
        this.scopes = (typeof payload.scope === 'string') ? payload.scope.split((' ')) : [];
        this.accessToken = token;

        return true;
    }

    public async signIn(code: string) {
        // 認証情報を取得できればログイン成功
        const credentials = await this.authClient.getToken(code, <string>process.env.API_CODE_VERIFIER);
        debug('credentials published', credentials);

        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`token.${this.userId}`, credentials.access_token)
            .expire(`token.${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        return credentials;
    }

    public async logout() {
        await redisClient.del(`token.${this.userId}`);
    }
}

export const URI_OPENID_CONFIGURATION = '/.well-known/openid-configuration';
async function createPems(issuer: string) {
    const openidConfiguration: IOpenIdConfiguration = await request({
        url: `${issuer}${URI_OPENID_CONFIGURATION}`,
        json: true
    }).then((body) => body);

    return request({
        url: openidConfiguration.jwks_uri,
        json: true
    }).then((body) => {
        debug('got jwks_uri', body);
        const pemsByKid: IPems = {};
        (<any[]>body.keys).forEach((key) => {
            pemsByKid[key.kid] = jwkToPem(key);
        });

        return pemsByKid;
    });
}

/**
 * トークンを検証する
 */
async function validateToken(token: string, verifyOptions: {
    issuer: string;
    tokenUse?: string;
}): Promise<IPayload> {
    debug('validating token...', token);
    const decodedJwt = <any>jwt.decode(token, { complete: true });
    if (!decodedJwt) {
        throw new Error('Not a valid JWT token.');
    }
    debug('decodedJwt:', decodedJwt);

    // audienceをチェック
    // if (decodedJwt.payload.aud !== AUDIENCE) {
    //     throw new Error('invalid audience');
    // }

    // tokenUseが期待通りでなければ拒否
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore else */
    if (verifyOptions.tokenUse !== undefined) {
        if (decodedJwt.payload.token_use !== verifyOptions.tokenUse) {
            throw new Error(`Not a ${verifyOptions.tokenUse}.`);
        }
    }

    // 公開鍵未取得であればcognitoから取得
    if (pems === undefined) {
        pems = await createPems(verifyOptions.issuer);
    }

    // トークンからkidを取り出して、対応するPEMを検索
    const pem = pems[decodedJwt.header.kid];
    if (pem === undefined) {
        throw new Error('Invalid access token.');
    }

    // 対応PEMがあればトークンを検証
    return new Promise<IPayload>((resolve, reject) => {
        jwt.verify(
            token,
            pem,
            {
                issuer: ISSUER // 期待しているユーザープールで発行されたJWTトークンかどうか確認
                // audience: pemittedAudiences
            },
            (err, payload) => {
                if (err !== null) {
                    reject(err);
                } else {
                    // Always generate the policy on value of 'sub' claim and not for 'username' because username is reassignable
                    // sub is UUID for a user which is never reassigned to another user
                    resolve(<IPayload>payload);
                }
            }
        );
    });
}
