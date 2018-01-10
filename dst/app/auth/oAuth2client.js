"use strict";
/**
 * OAuth2クライアント
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
const crypto = require("crypto");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const fetch = require("isomorphic-fetch");
const querystring = require("querystring");
const debug = createDebug('ttts-line-assistant:auth:oAuth2client');
/**
 * OAuth2 client
 */
class OAuth2client {
    constructor(options) {
        // tslint:disable-next-line:no-suspicious-comment
        // TODO add minimum validation
        this.options = options;
        this.credentials = {};
    }
    static BASE64URLENCODE(str) {
        return str.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    static SHA256(buffer) {
        return crypto.createHash('sha256').update(buffer).digest();
    }
    /**
     * Generates URL for consent page landing.
     */
    generateAuthUrl(optOpts) {
        const options = {
            response_type: 'code',
            client_id: this.options.clientId,
            redirect_uri: this.options.redirectUri,
            scope: optOpts.scopes.join(' '),
            state: optOpts.state
        };
        if (optOpts.codeVerifier !== undefined) {
            options.code_challenge_method = 'S256';
            options.code_challenge = OAuth2client.BASE64URLENCODE(OAuth2client.SHA256(optOpts.codeVerifier));
        }
        const rootUrl = `https://${this.options.domain}${OAuth2client.OAUTH2_AUTH_BASE_URI}`;
        return `${rootUrl}?${querystring.stringify(options)}`;
    }
    /**
     * Generates URL for logout.
     */
    generateLogoutUrl() {
        const options = {
            client_id: this.options.clientId,
            logout_uri: this.options.logoutUri
        };
        const rootUrl = `https://${this.options.domain}${OAuth2client.OAUTH2_LOGOUT_URI}`;
        return `${rootUrl}?${querystring.stringify(options)}`;
    }
    /**
     * Gets the access token for the given code.
     * @param {string} code The authorization code.
     */
    getToken(code, codeVerifier) {
        return __awaiter(this, void 0, void 0, function* () {
            const form = {
                code: code,
                client_id: this.options.clientId,
                redirect_uri: this.options.redirectUri,
                grant_type: 'authorization_code',
                code_verifier: codeVerifier
            };
            const secret = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`, 'utf8').toString('base64');
            const options = {
                body: querystring.stringify(form),
                method: 'POST',
                headers: {
                    Authorization: `Basic ${secret}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            debug('fetching...', options);
            return fetch(`https://${this.options.domain}${OAuth2client.OAUTH2_TOKEN_URI}`, options).then((response) => __awaiter(this, void 0, void 0, function* () {
                debug('response:', response.status);
                if (response.status !== http_status_1.OK) {
                    if (response.status === http_status_1.BAD_REQUEST) {
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
                    return tokens;
                }
            }));
        });
    }
    /**
     * OAuthクライアントに認証情報をセットします。
     */
    setCredentials(credentials) {
        this.credentials = credentials;
    }
    refreshAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.credentials.refresh_token === undefined) {
                throw new Error('No refresh token is set.');
            }
            return this.refreshToken(this.credentials.refresh_token)
                .then((tokens) => {
                tokens.refresh_token = this.credentials.refresh_token;
                debug('setting credentials...', tokens);
                this.credentials = tokens;
                return this.credentials;
            });
        });
    }
    /**
     * 期限の切れていないアクセストークンを取得します。
     * 必要であれば更新してから取得します。
     */
    getAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            // tslint:disable-next-line:max-line-length
            const expiryDate = this.credentials.expiry_date;
            // if no expiry time, assume it's not expired
            const isTokenExpired = (expiryDate !== undefined) ? (expiryDate <= (new Date()).getTime()) : false;
            if (this.credentials.access_token === undefined && this.credentials.refresh_token === undefined) {
                throw new Error('No access or refresh token is set.');
            }
            const shouldRefresh = (this.credentials.access_token === undefined) || isTokenExpired;
            if (shouldRefresh && this.credentials.refresh_token !== undefined) {
                yield this.refreshAccessToken();
            }
            return this.credentials.access_token;
        });
    }
    /**
     * Refreshes the access token.
     */
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            // request for new token
            debug('refreshing access token...', this.credentials, refreshToken);
            const form = {
                client_id: this.options.clientId,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            };
            const secret = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`, 'utf8').toString('base64');
            const options = {
                body: querystring.stringify(form),
                method: 'POST',
                headers: {
                    Authorization: `Basic ${secret}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            debug('fetching...', options);
            return fetch(`https://${this.options.domain}${OAuth2client.OAUTH2_TOKEN_URI}`, options).then((response) => __awaiter(this, void 0, void 0, function* () {
                debug('response:', response.status);
                if (response.status !== http_status_1.OK) {
                    if (response.status === http_status_1.BAD_REQUEST) {
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
                    return tokens;
                }
            }));
        });
    }
}
/**
 * The base URL for auth endpoints.
 */
OAuth2client.OAUTH2_AUTH_BASE_URI = '/authorize';
/**
 * The base endpoint for token retrieval.
 */
OAuth2client.OAUTH2_TOKEN_URI = '/token';
/**
 * The base endpoint to revoke tokens.
 */
OAuth2client.OAUTH2_LOGOUT_URI = '/logout';
exports.default = OAuth2client;
