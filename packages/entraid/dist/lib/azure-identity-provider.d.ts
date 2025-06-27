import type { AccessToken } from '@azure/core-auth';
import { IdentityProvider, TokenResponse } from '@redis/client/dist/lib/authx';
export declare class AzureIdentityProvider implements IdentityProvider<AccessToken> {
    private readonly getToken;
    constructor(getToken: () => Promise<AccessToken>);
    requestToken(): Promise<TokenResponse<AccessToken>>;
}
//# sourceMappingURL=azure-identity-provider.d.ts.map