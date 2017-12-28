/**
 * OAuth2クライアント
 */

import * as crypto from 'crypto';
import * as createDebug from 'debug';
import { BAD_REQUEST, OK } from 'http-status';
import * as fetch from 'isomorphic-fetch';
import * as querystring from 'querystring';

import ICredentials from './credentials';

const debug = createDebug('ttts-line-assistant:auth:oAuth2client');

export interface IGenerateAuthUrlOpts {
    scopes: string[];
    state: string;
    codeVerifier?: string;
}

export interface IOptions {
    domain: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    logoutUri?: string;
    responseType?: string;
    responseMode?: string;
    scopes?: string[];
    state?: string;
    nonce?: string | null;
    audience?: string;
    tokenIssuer?: string;
}

/**
 * OAuth2 client
 */
export default class OAuth2client {
    /**
     * The base URL for auth endpoints.
     */
    protected static readonly OAUTH2_AUTH_BASE_URI: string = '/authorize';

    /**
     * The base endpoint for token retrieval.
     */
    protected static readonly OAUTH2_TOKEN_URI: string = '/token';

    /**
     * The base endpoint to revoke tokens.
     */
    protected static readonly OAUTH2_LOGOUT_URI: string = '/logout';

    /**
     * certificates.
     */
    // protected static readonly OAUTH2_FEDERATED_SIGNON_CERTS_URL = 'https://www.example.com/oauth2/v1/certs';

    public credentials: ICredentials;
    public options: IOptions;

    constructor(options: IOptions) {
        // tslint:disable-next-line:no-suspicious-comment
        // TODO add minimum validation

        this.options = options;
        this.credentials = {};
    }

    public static BASE64URLENCODE(str: Buffer) {
        return str.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    public static SHA256(buffer: any) {
        return crypto.createHash('sha256').update(buffer).digest();
    }

    /**
     * Generates URL for consent page landing.
     */
    public generateAuthUrl(optOpts: IGenerateAuthUrlOpts) {
        const options: any = {
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
    public generateLogoutUrl() {
        const options: any = {
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
    public async getToken(code: string, codeVerifier?: string): Promise<ICredentials> {
        const form = {
            code: code,
            client_id: this.options.clientId,
            redirect_uri: this.options.redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
        };
        const secret = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`, 'utf8').toString('base64');
        const options: RequestInit = {
            body: querystring.stringify(form),
            method: 'POST',
            headers: {
                Authorization: `Basic ${secret}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        debug('fetching...', options);

        return fetch(
            `https://${this.options.domain}${OAuth2client.OAUTH2_TOKEN_URI}`,
            options
        ).then(async (response) => {
            debug('response:', response.status);
            if (response.status !== OK) {
                if (response.status === BAD_REQUEST) {
                    const body = await response.json();
                    throw new Error(body.error);
                } else {
                    const body = await response.text();
                    throw new Error(body);
                }
            } else {
                const tokens = await response.json();
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (tokens && tokens.expires_in) {
                    // tslint:disable-next-line:no-magic-numbers
                    tokens.expiry_date = ((new Date()).getTime() + (tokens.expires_in * 1000));
                    delete tokens.expires_in;
                }

                return tokens;
            }
        });
    }

    /**
     * OAuthクライアントに認証情報をセットします。
     */
    public setCredentials(credentials: ICredentials) {
        this.credentials = credentials;
    }

    public async refreshAccessToken(): Promise<ICredentials> {
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
    }

    /**
     * 期限の切れていないアクセストークンを取得します。
     * 必要であれば更新してから取得します。
     */
    public async getAccessToken(): Promise<string> {
        // tslint:disable-next-line:max-line-length
        const expiryDate = this.credentials.expiry_date;

        // if no expiry time, assume it's not expired
        const isTokenExpired = (expiryDate !== undefined) ? (expiryDate <= (new Date()).getTime()) : false;

        if (this.credentials.access_token === undefined && this.credentials.refresh_token === undefined) {
            throw new Error('No access or refresh token is set.');
        }

        const shouldRefresh = (this.credentials.access_token === undefined) || isTokenExpired;
        if (shouldRefresh && this.credentials.refresh_token !== undefined) {
            await this.refreshAccessToken();
        }

        return <string>this.credentials.access_token;
    }

    /**
     * Refreshes the access token.
     */
    protected async refreshToken(refreshToken: string): Promise<ICredentials> {
        // request for new token
        debug('refreshing access token...', this.credentials, refreshToken);

        const form = {
            client_id: this.options.clientId,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        };
        const secret = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`, 'utf8').toString('base64');
        const options: RequestInit = {
            body: querystring.stringify(form),
            method: 'POST',
            headers: {
                Authorization: `Basic ${secret}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

        debug('fetching...', options);

        return fetch(
            `https://${this.options.domain}${OAuth2client.OAUTH2_TOKEN_URI}`,
            options
        ).then(async (response) => {
            debug('response:', response.status);
            if (response.status !== OK) {
                if (response.status === BAD_REQUEST) {
                    const body = await response.json();
                    throw new Error(body.error);
                } else {
                    const body = await response.text();
                    throw new Error(body);
                }
            } else {
                const tokens = await response.json();
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (tokens && tokens.expires_in) {
                    // tslint:disable-next-line:no-magic-numbers
                    tokens.expiry_date = ((new Date()).getTime() + (tokens.expires_in * 1000));
                    delete tokens.expires_in;
                }

                return tokens;
            }
        });
    }
}
