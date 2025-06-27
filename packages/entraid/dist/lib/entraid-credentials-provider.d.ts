import { AuthenticationResult } from '@azure/msal-common/node';
import { AccessToken } from '@azure/core-auth';
import { BasicAuth, StreamingCredentialsProvider, IdentityProvider, TokenManager, ReAuthenticationError, StreamingCredentialsListener, Disposable } from '@redis/client/dist/lib/authx';
/**
 * A streaming credentials provider that uses the Entraid identity provider to provide credentials.
 * Please use one of the factory functions in `entraid-credetfactories.ts` to create an instance of this class for the different
 * type of authentication flows.
 */
export type AuthenticationResponse = AuthenticationResult | AccessToken;
export declare class EntraidCredentialsProvider implements StreamingCredentialsProvider {
    #private;
    readonly tokenManager: TokenManager<AuthenticationResponse>;
    readonly idp: IdentityProvider<AuthenticationResponse>;
    private readonly options;
    readonly type = "streaming-credentials-provider";
    constructor(tokenManager: TokenManager<AuthenticationResponse>, idp: IdentityProvider<AuthenticationResponse>, options?: {
        onReAuthenticationError?: (error: ReAuthenticationError) => void;
        credentialsMapper?: (token: AuthenticationResponse) => BasicAuth;
        onRetryableError?: (error: string) => void;
    });
    subscribe(listener: StreamingCredentialsListener<BasicAuth>): Promise<[BasicAuth, Disposable]>;
    onReAuthenticationError: (error: ReAuthenticationError) => void;
    hasActiveSubscriptions(): boolean;
    getSubscriptionsCount(): number;
    getTokenManager(): TokenManager<AuthenticationResponse>;
    getCurrentCredentials(): BasicAuth | null;
}
export declare const DEFAULT_CREDENTIALS_MAPPER: (token: AuthenticationResponse) => BasicAuth;
export declare const OID_CREDENTIALS_MAPPER: (token: (AuthenticationResult | AccessToken)) => {
    username: any;
    password: string;
};
/**
 * Type guard to check if a token is an MSAL AuthenticationResult
 *
 * @param auth - The token to check
 * @returns true if the token is an AuthenticationResult
 */
export declare function isAuthenticationResult(auth: AuthenticationResult | AccessToken): auth is AuthenticationResult;
/**
 * Type guard to check if a token is an Azure Identity AccessToken
 *
 * @param auth - The token to check
 * @returns true if the token is an AccessToken
 */
export declare function isAccessToken(auth: AuthenticationResult | AccessToken): auth is AccessToken;
//# sourceMappingURL=entraid-credentials-provider.d.ts.map