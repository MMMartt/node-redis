"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureIdentityProvider = void 0;
class AzureIdentityProvider {
    getToken;
    constructor(getToken) {
        this.getToken = getToken;
    }
    async requestToken() {
        const result = await this.getToken();
        return {
            token: result,
            ttlMs: result.expiresOnTimestamp - Date.now()
        };
    }
}
exports.AzureIdentityProvider = AzureIdentityProvider;
//# sourceMappingURL=azure-identity-provider.js.map