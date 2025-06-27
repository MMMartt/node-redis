interface RawRedisEndpoint {
    username?: string;
    password?: string;
    tls: boolean;
    endpoints: string[];
}
export type RedisEndpointsConfig = Record<string, RawRedisEndpoint>;
export declare function loadFromJson(jsonString: string): RedisEndpointsConfig;
export declare function loadFromFile(path: string): Promise<RedisEndpointsConfig>;
export {};
//# sourceMappingURL=cae-client-testing.d.ts.map