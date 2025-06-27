import { RedisClusterClientOptions } from '@redis/client/dist/lib/cluster';
interface RedisServerDockerConfig {
    image: string;
    version: string;
}
interface SentinelConfig {
    mode: "sentinel";
    mounts: Array<string>;
    port: number;
}
interface ServerConfig {
    mode: "server";
}
export type RedisServerDockerOptions = RedisServerDockerConfig & (SentinelConfig | ServerConfig);
export interface RedisServerDocker {
    port: number;
    dockerId: string;
}
export declare function spawnRedisServerDocker(options: RedisServerDockerOptions, serverArguments: Array<string>): Promise<RedisServerDocker>;
export declare function spawnRedisServer(dockerConfig: RedisServerDockerOptions, serverArguments: Array<string>): Promise<RedisServerDocker>;
export type RedisClusterDockersConfig = RedisServerDockerOptions & {
    numberOfMasters?: number;
    numberOfReplicas?: number;
};
export declare function spawnRedisCluster(dockersConfig: RedisClusterDockersConfig, serverArguments: Array<string>, clientConfig?: Partial<RedisClusterClientOptions>): Promise<Array<RedisServerDocker>>;
export declare function spawnRedisSentinel(dockerConfigs: RedisServerDockerOptions, serverArguments: Array<string>): Promise<Array<RedisServerDocker>>;
export declare function spawnSentinelNode(dockerConfigs: RedisServerDockerOptions, serverArguments: Array<string>, masterPort: number, sentinelName: string, tmpDir: string, password?: string): Promise<RedisServerDocker>;
export {};
//# sourceMappingURL=dockers.d.ts.map