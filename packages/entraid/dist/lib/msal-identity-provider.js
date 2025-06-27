"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MSALIdentityProvider = void 0;
class MSALIdentityProvider {
    getToken;
    constructor(getToken) {
        this.getToken = getToken;
    }
    async requestToken() {
        const result = await this.getToken();
        if (!result?.accessToken || !result?.expiresOn) {
            throw new Error('Invalid token response');
        }
        return {
            token: result,
            ttlMs: result.expiresOn.getTime() - Date.now()
        };
    }
}
exports.MSALIdentityProvider = MSALIdentityProvider;
//# sourceMappingURL=msal-identity-provider.js.map