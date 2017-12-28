"use strict";
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
const httpStatus = require("http-status");
const fetch = require("isomorphic-fetch");
const querystring = require("querystring");
const oAuth2client_1 = require("./oAuth2client");
const debug = createDebug('ttts-line-assistant:auth:clientCredentialsClient');
/**
 * クライアント認証OAuthクライアント
 *
 * @class ClientCredentialsClient
 */
class ClientCredentialsClient extends oAuth2client_1.default {
    constructor(options) {
        // tslint:disable-next-line:no-suspicious-comment
        // TODO add minimum validation
        super(options);
        this.options = options;
        this.credentials = { refresh_token: 'ignored' };
    }
    /**
     * クライアント認証でアクセストークンを取得します。
     */
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            debug('requesting an access token...');
            const form = {
                scope: this.options.scopes.join(' '),
                state: this.options.state,
                grant_type: 'client_credentials'
            };
            const secret = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`, 'utf8').toString('base64');
            const options = {
                credentials: 'include',
                body: querystring.stringify(form),
                method: 'POST',
                headers: {
                    Authorization: `Basic ${secret}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            debug('fetching...', options);
            return fetch(`https://${this.options.domain}${oAuth2client_1.default.OAUTH2_TOKEN_URI}`, options).then((response) => __awaiter(this, void 0, void 0, function* () {
                debug('response:', response.status);
                if (response.status !== httpStatus.OK) {
                    if (response.status === httpStatus.BAD_REQUEST) {
                        const body = yield response.json();
                        throw new Error(body.error);
                    }
                    else {
                        const body = yield response.text();
                        throw new Error(body);
                    }
                }
                else {
                    const tokens = yield response.json();
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (tokens && tokens.expires_in) {
                        // tslint:disable-next-line:no-magic-numbers
                        tokens.expiry_date = ((new Date()).getTime() + (tokens.expires_in * 1000));
                        delete tokens.expires_in;
                    }
                    tokens.refresh_token = 'ignored';
                    return tokens;
                }
            }));
        });
    }
    /**
     * Refreshes the access token.
     */
    refreshToken(__) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('refreshing an access token...');
            return this.getToken();
        });
    }
}
exports.default = ClientCredentialsClient;
