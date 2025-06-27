"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAccessToken = exports.isAuthenticationResult = exports.OID_CREDENTIALS_MAPPER = exports.DEFAULT_CREDENTIALS_MAPPER = exports.EntraidCredentialsProvider = void 0;
class EntraidCredentialsProvider {
    tokenManager;
    idp;
    options;
    type = 'streaming-credentials-provider';
    #listeners = new Set();
    #tokenManagerDisposable = null;
    #isStarting = false;
    #pendingSubscribers = [];
    constructor(tokenManager, idp, options = {}) {
        this.tokenManager = tokenManager;
        this.idp = idp;
        this.options = options;
        this.onReAuthenticationError = options.onReAuthenticationError ?? DEFAULT_ERROR_HANDLER;
        this.#credentialsMapper = options.credentialsMapper ?? exports.DEFAULT_CREDENTIALS_MAPPER;
    }
    async subscribe(listener) {
        const currentToken = this.tokenManager.getCurrentToken();
        if (currentToken) {
            return [this.#credentialsMapper(currentToken.value), this.#createDisposable(listener)];
        }
        if (this.#isStarting) {
            return new Promise((resolve, reject) => {
                this.#pendingSubscribers.push({ resolve, reject, pendingListener: listener });
            });
        }
        this.#isStarting = true;
        try {
            const initialToken = await this.#startTokenManagerAndObtainInitialToken();
            this.#pendingSubscribers.forEach(({ resolve, pendingListener }) => {
                resolve([this.#credentialsMapper(initialToken.value), this.#createDisposable(pendingListener)]);
            });
            this.#pendingSubscribers = [];
            return [this.#credentialsMapper(initialToken.value), this.#createDisposable(listener)];
        }
        finally {
            this.#isStarting = false;
        }
    }
    onReAuthenticationError;
    #credentialsMapper;
    #createTokenManagerListener(subscribers) {
        return {
            onError: (error) => {
                if (!error.isRetryable) {
                    subscribers.forEach(listener => listener.onError(error));
                }
                else {
                    this.options.onRetryableError?.(error.message);
                }
            },
            onNext: (token) => {
                const credentials = this.#credentialsMapper(token.value);
                subscribers.forEach(listener => listener.onNext(credentials));
            }
        };
    }
    #createDisposable(listener) {
        this.#listeners.add(listener);
        return {
            dispose: () => {
                this.#listeners.delete(listener);
                if (this.#listeners.size === 0 && this.#tokenManagerDisposable) {
                    this.#tokenManagerDisposable.dispose();
                    this.#tokenManagerDisposable = null;
                }
            }
        };
    }
    async #startTokenManagerAndObtainInitialToken() {
        const { ttlMs, token: initialToken } = await this.idp.requestToken();
        const token = this.tokenManager.wrapAndSetCurrentToken(initialToken, ttlMs);
        this.#tokenManagerDisposable = this.tokenManager.start(this.#createTokenManagerListener(this.#listeners), this.tokenManager.calculateRefreshTime(token));
        return token;
    }
    hasActiveSubscriptions() {
        return this.#tokenManagerDisposable !== null && this.#listeners.size > 0;
    }
    getSubscriptionsCount() {
        return this.#listeners.size;
    }
    getTokenManager() {
        return this.tokenManager;
    }
    getCurrentCredentials() {
        const currentToken = this.tokenManager.getCurrentToken();
        return currentToken ? this.#credentialsMapper(currentToken.value) : null;
    }
}
exports.EntraidCredentialsProvider = EntraidCredentialsProvider;
const DEFAULT_CREDENTIALS_MAPPER = (token) => {
    if (isAuthenticationResult(token)) {
        return {
            username: token.uniqueId,
            password: token.accessToken
        };
    }
    else {
        return (0, exports.OID_CREDENTIALS_MAPPER)(token);
    }
};
exports.DEFAULT_CREDENTIALS_MAPPER = DEFAULT_CREDENTIALS_MAPPER;
const DEFAULT_ERROR_HANDLER = (error) => console.error('ReAuthenticationError', error);
const OID_CREDENTIALS_MAPPER = (token) => {
    if (isAuthenticationResult(token)) {
        // Client credentials flow is app-only authentication (no user context),
        // so only access token is provided without user-specific claims (uniqueId, idToken, ...)
        // this means that we need to extract the oid from the access token manually
        const accessToken = JSON.parse(Buffer.from(token.accessToken.split('.')[1], 'base64').toString());
        return ({
            username: accessToken.oid,
            password: token.accessToken
        });
    }
    else {
        const accessToken = JSON.parse(Buffer.from(token.token.split('.')[1], 'base64').toString());
        return ({
            username: accessToken.oid,
            password: token.token
        });
    }
};
exports.OID_CREDENTIALS_MAPPER = OID_CREDENTIALS_MAPPER;
/**
 * Type guard to check if a token is an MSAL AuthenticationResult
 *
 * @param auth - The token to check
 * @returns true if the token is an AuthenticationResult
 */
function isAuthenticationResult(auth) {
    return typeof auth.accessToken === 'string' &&
        !('token' in auth);
}
exports.isAuthenticationResult = isAuthenticationResult;
/**
 * Type guard to check if a token is an Azure Identity AccessToken
 *
 * @param auth - The token to check
 * @returns true if the token is an AccessToken
 */
function isAccessToken(auth) {
    return typeof auth.token === 'string' &&
        !('accessToken' in auth);
}
exports.isAccessToken = isAccessToken;
//# sourceMappingURL=entraid-credentials-provider.js.map