import { RedisModules, RedisFunctions, RedisScripts, RespVersions, TypeMapping, RedisClientOptions, RedisClientType, RedisSentinelOptions, RedisSentinelType, RedisPoolOptions, RedisClientPoolType, RedisClusterOptions, RedisClusterType } from '@redis/client/index';
import { RedisServerDocker } from './dockers';
interface TestUtilsConfig {
    /**
     * The name of the Docker image to use for spawning Redis test instances.
     * This should be a valid Docker image name that contains a Redis server.
     *
     * @example 'redislabs/client-libs-test'
     */
    dockerImageName: string;
    /**
     * The command-line argument name used to specify the Redis version.
     * This argument can be passed when running tests / GH actions.
     *
     * @example
     * If set to 'redis-version', you can run tests with:
     * ```bash
     * npm test -- --redis-version="6.2"
     * ```
     */
    dockerImageVersionArgument: string;
    /**
     * The default Redis version to use if no version is specified via command-line arguments.
     * Can be a specific version number (e.g., '6.2'), 'latest', or 'edge'.
     * If not provided, defaults to 'latest'.
     *
     * @optional
     * @default 'latest'
     */
    defaultDockerVersion?: string;
}
interface CommonTestOptions {
    serverArguments: Array<string>;
    minimumDockerVersion?: Array<number>;
    skipTest?: boolean;
}
interface ClientTestOptions<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts, RESP extends RespVersions, TYPE_MAPPING extends TypeMapping> extends CommonTestOptions {
    clientOptions?: Partial<RedisClientOptions<M, F, S, RESP, TYPE_MAPPING>>;
    disableClientSetup?: boolean;
}
interface SentinelTestOptions<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts, RESP extends RespVersions, TYPE_MAPPING extends TypeMapping> extends CommonTestOptions {
    sentinelOptions?: Partial<RedisSentinelOptions<M, F, S, RESP, TYPE_MAPPING>>;
    clientOptions?: Partial<RedisClientOptions<M, F, S, RESP, TYPE_MAPPING>>;
    scripts?: S;
    functions?: F;
    modules?: M;
    disableClientSetup?: boolean;
    replicaPoolSize?: number;
    masterPoolSize?: number;
    reserveClient?: boolean;
}
interface ClientPoolTestOptions<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts, RESP extends RespVersions, TYPE_MAPPING extends TypeMapping> extends CommonTestOptions {
    clientOptions?: Partial<RedisClientOptions<M, F, S, RESP, TYPE_MAPPING>>;
    poolOptions?: RedisPoolOptions;
}
interface ClusterTestOptions<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts, RESP extends RespVersions, TYPE_MAPPING extends TypeMapping> extends CommonTestOptions {
    clusterConfiguration?: Partial<RedisClusterOptions<M, F, S, RESP, TYPE_MAPPING>>;
    numberOfMasters?: number;
    numberOfReplicas?: number;
}
interface AllTestOptions<M extends RedisModules, F extends RedisFunctions, S extends RedisScripts, RESP extends RespVersions, TYPE_MAPPING extends TypeMapping> {
    client: ClientTestOptions<M, F, S, RESP, TYPE_MAPPING>;
    cluster: ClusterTestOptions<M, F, S, RESP, TYPE_MAPPING>;
}
interface Version {
    string: string;
    numbers: Array<number>;
}
export default class TestUtils {
    #private;
    static parseVersionNumber(version: string): Array<number>;
    constructor({ string, numbers }: Version, dockerImageName: string);
    /**
     * Creates a new TestUtils instance from a configuration object.
     *
     * @param config - Configuration object containing Docker image and version settings
     * @param config.dockerImageName - The name of the Docker image to use for tests
     * @param config.dockerImageVersionArgument - The command-line argument name for specifying Redis version
     * @param config.defaultDockerVersion - Optional default Redis version if not specified via arguments
     * @returns A new TestUtils instance configured with the provided settings
     */
    static createFromConfig(config: TestUtilsConfig): TestUtils;
    isVersionGreaterThan(minimumVersion: Array<number> | undefined): boolean;
    isVersionGreaterThanHook(minimumVersion: Array<number> | undefined): void;
    isVersionInRange(minVersion: Array<number>, maxVersion: Array<number>): boolean;
    /**
     * Compares two semantic version arrays and returns:
     * -1 if version a is less than version b
     *  0 if version a equals version b
     *  1 if version a is greater than version b
     *
     * @param a First version array
     * @param b Second version array
     * @returns -1 | 0 | 1
     */
    static compareVersions(a: Array<number>, b: Array<number>): -1 | 0 | 1;
    testWithClient<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(title: string, fn: (client: RedisClientType<M, F, S, RESP, TYPE_MAPPING>) => unknown, options: ClientTestOptions<M, F, S, RESP, TYPE_MAPPING>): void;
    testWithClientSentinel<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(title: string, fn: (sentinel: RedisSentinelType<M, F, S, RESP, TYPE_MAPPING>) => unknown, options: SentinelTestOptions<M, F, S, RESP, TYPE_MAPPING>): void;
    testWithClientIfVersionWithinRange<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(range: ([minVersion: Array<number>, maxVersion: Array<number>] | [minVersion: Array<number>, 'LATEST']), title: string, fn: (client: RedisClientType<M, F, S, RESP, TYPE_MAPPING>) => unknown, options: ClientTestOptions<M, F, S, RESP, TYPE_MAPPING>): void;
    testWithClienSentineltIfVersionWithinRange<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(range: ([minVersion: Array<number>, maxVersion: Array<number>] | [minVersion: Array<number>, 'LATEST']), title: string, fn: (sentinel: RedisSentinelType<M, F, S, RESP, TYPE_MAPPING>) => unknown, options: SentinelTestOptions<M, F, S, RESP, TYPE_MAPPING>): void;
    testWithClientPool<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(title: string, fn: (client: RedisClientPoolType<M, F, S, RESP, TYPE_MAPPING>) => unknown, options: ClientPoolTestOptions<M, F, S, RESP, TYPE_MAPPING>): void;
    testWithCluster<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(title: string, fn: (cluster: RedisClusterType<M, F, S, RESP, TYPE_MAPPING>) => unknown, options: ClusterTestOptions<M, F, S, RESP, TYPE_MAPPING>): void;
    testAll<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(title: string, fn: (client: RedisClientType<M, F, S, RESP, TYPE_MAPPING> | RedisClusterType<M, F, S, RESP, TYPE_MAPPING>) => unknown, options: AllTestOptions<M, F, S, RESP, TYPE_MAPPING>): void;
    spawnRedisServer<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(options: ClientPoolTestOptions<M, F, S, RESP, TYPE_MAPPING>): Promise<RedisServerDocker>;
    spawnRedisSentinels<M extends RedisModules = {}, F extends RedisFunctions = {}, S extends RedisScripts = {}, RESP extends RespVersions = 2, TYPE_MAPPING extends TypeMapping = {}>(options: ClientPoolTestOptions<M, F, S, RESP, TYPE_MAPPING>, masterPort: number, sentinelName: string, count: number): Promise<Array<RedisServerDocker>>;
}
export {};
//# sourceMappingURL=index.d.ts.map