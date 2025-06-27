"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@redis/client/index");
const dockers_1 = require("./dockers");
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
class TestUtils {
    static parseVersionNumber(version) {
        if (version === 'latest' || version === 'edge')
            return [Infinity];
        // Match complete version number patterns
        const versionMatch = version.match(/(^|\-)\d+(\.\d+)*($|\-)/);
        if (!versionMatch) {
            throw new TypeError(`${version} is not a valid redis version`);
        }
        // Extract just the numbers and dots between first and last dash (or start/end)
        const versionNumbers = versionMatch[0].replace(/^\-|\-$/g, '');
        return versionNumbers.split('.').map(x => {
            const value = Number(x);
            if (Number.isNaN(value)) {
                throw new TypeError(`${version} is not a valid redis version`);
            }
            return value;
        });
    }
    static #getVersion(argumentName, defaultVersion = 'latest') {
        return (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
            .option(argumentName, {
            type: 'string',
            default: defaultVersion
        })
            .coerce(argumentName, (version) => {
            return {
                string: version,
                numbers: TestUtils.parseVersionNumber(version)
            };
        })
            .demandOption(argumentName)
            .parseSync()[argumentName];
    }
    #VERSION_NUMBERS;
    #DOCKER_IMAGE;
    constructor({ string, numbers }, dockerImageName) {
        this.#VERSION_NUMBERS = numbers;
        this.#DOCKER_IMAGE = {
            image: dockerImageName,
            version: string,
            mode: "server"
        };
    }
    /**
     * Creates a new TestUtils instance from a configuration object.
     *
     * @param config - Configuration object containing Docker image and version settings
     * @param config.dockerImageName - The name of the Docker image to use for tests
     * @param config.dockerImageVersionArgument - The command-line argument name for specifying Redis version
     * @param config.defaultDockerVersion - Optional default Redis version if not specified via arguments
     * @returns A new TestUtils instance configured with the provided settings
     */
    static createFromConfig(config) {
        return new TestUtils(TestUtils.#getVersion(config.dockerImageVersionArgument, config.defaultDockerVersion), config.dockerImageName);
    }
    isVersionGreaterThan(minimumVersion) {
        if (minimumVersion === undefined)
            return true;
        return TestUtils.compareVersions(this.#VERSION_NUMBERS, minimumVersion) >= 0;
    }
    isVersionGreaterThanHook(minimumVersion) {
        const isVersionGreaterThanHook = this.isVersionGreaterThan.bind(this);
        const versionNumber = this.#VERSION_NUMBERS.join('.');
        const minimumVersionString = minimumVersion?.join('.');
        before(function () {
            if (!isVersionGreaterThanHook(minimumVersion)) {
                console.warn(`TestUtils: Version ${versionNumber} is less than minimum version ${minimumVersionString}, skipping test`);
                return this.skip();
            }
        });
    }
    isVersionInRange(minVersion, maxVersion) {
        return TestUtils.compareVersions(this.#VERSION_NUMBERS, minVersion) >= 0 &&
            TestUtils.compareVersions(this.#VERSION_NUMBERS, maxVersion) <= 0;
    }
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
    static compareVersions(a, b) {
        const maxLength = Math.max(a.length, b.length);
        const paddedA = [...a, ...Array(maxLength - a.length).fill(0)];
        const paddedB = [...b, ...Array(maxLength - b.length).fill(0)];
        for (let i = 0; i < maxLength; i++) {
            if (paddedA[i] > paddedB[i])
                return 1;
            if (paddedA[i] < paddedB[i])
                return -1;
        }
        return 0;
    }
    testWithClient(title, fn, options) {
        let dockerPromise;
        if (this.isVersionGreaterThan(options.minimumDockerVersion)) {
            const dockerImage = this.#DOCKER_IMAGE;
            before(function () {
                this.timeout(30000);
                dockerPromise = (0, dockers_1.spawnRedisServer)(dockerImage, options.serverArguments);
                return dockerPromise;
            });
        }
        it(title, async function () {
            if (options.skipTest)
                return this.skip();
            if (!dockerPromise)
                return this.skip();
            const client = (0, index_1.createClient)({
                ...options.clientOptions,
                socket: {
                    ...options.clientOptions?.socket,
                    port: (await dockerPromise).port
                }
            });
            if (options.disableClientSetup) {
                return fn(client);
            }
            await client.connect();
            try {
                await client.flushAll();
                await fn(client);
            }
            finally {
                if (client.isOpen) {
                    await client.flushAll();
                    client.destroy();
                }
            }
        });
    }
    testWithClientSentinel(title, fn, options) {
        let dockerPromises;
        const passIndex = options.serverArguments.indexOf('--requirepass') + 1;
        let password = undefined;
        if (passIndex != 0) {
            password = options.serverArguments[passIndex];
        }
        if (this.isVersionGreaterThan(options.minimumDockerVersion)) {
            const dockerImage = this.#DOCKER_IMAGE;
            before(function () {
                this.timeout(30000);
                dockerPromises = (0, dockers_1.spawnRedisSentinel)(dockerImage, options.serverArguments);
                return dockerPromises;
            });
        }
        it(title, async function () {
            this.timeout(30000);
            if (options.skipTest)
                return this.skip();
            if (!dockerPromises)
                return this.skip();
            const promises = await dockerPromises;
            const rootNodes = promises.map(promise => ({
                host: "127.0.0.1",
                port: promise.port
            }));
            const sentinel = (0, index_1.createSentinel)({
                name: 'mymaster',
                sentinelRootNodes: rootNodes,
                nodeClientOptions: {
                    password: password || undefined,
                },
                sentinelClientOptions: {
                    password: password || undefined,
                },
                replicaPoolSize: options?.replicaPoolSize || 0,
                scripts: options?.scripts || {},
                modules: options?.modules || {},
                functions: options?.functions || {},
                masterPoolSize: options?.masterPoolSize || undefined,
                reserveClient: options?.reserveClient || false,
            });
            if (options.disableClientSetup) {
                return fn(sentinel);
            }
            await sentinel.connect();
            try {
                await sentinel.flushAll();
                await fn(sentinel);
            }
            finally {
                if (sentinel.isOpen) {
                    await sentinel.flushAll();
                    sentinel.destroy();
                }
            }
        });
    }
    testWithClientIfVersionWithinRange(range, title, fn, options) {
        if (this.isVersionInRange(range[0], range[1] === 'LATEST' ? [Infinity, Infinity, Infinity] : range[1])) {
            return this.testWithClient(`${title}  [${range[0].join('.')}] - [${(range[1] === 'LATEST') ? range[1] : range[1].join(".")}] `, fn, options);
        }
        else {
            console.warn(`Skipping test ${title} because server version ${this.#VERSION_NUMBERS.join('.')} is not within range ${range[0].join(".")} - ${range[1] !== 'LATEST' ? range[1].join(".") : 'LATEST'}`);
        }
    }
    testWithClienSentineltIfVersionWithinRange(range, title, fn, options) {
        if (this.isVersionInRange(range[0], range[1] === 'LATEST' ? [Infinity, Infinity, Infinity] : range[1])) {
            return this.testWithClientSentinel(`${title}  [${range[0].join('.')}] - [${(range[1] === 'LATEST') ? range[1] : range[1].join(".")}] `, fn, options);
        }
        else {
            console.warn(`Skipping test ${title} because server version ${this.#VERSION_NUMBERS.join('.')} is not within range ${range[0].join(".")} - ${range[1] !== 'LATEST' ? range[1].join(".") : 'LATEST'}`);
        }
    }
    testWithClientPool(title, fn, options) {
        let dockerPromise;
        if (this.isVersionGreaterThan(options.minimumDockerVersion)) {
            const dockerImage = this.#DOCKER_IMAGE;
            before(function () {
                this.timeout(30000);
                dockerPromise = (0, dockers_1.spawnRedisServer)(dockerImage, options.serverArguments);
                return dockerPromise;
            });
        }
        it(title, async function () {
            if (options.skipTest)
                return this.skip();
            if (!dockerPromise)
                return this.skip();
            const pool = (0, index_1.createClientPool)({
                ...options.clientOptions,
                socket: {
                    ...options.clientOptions?.socket,
                    port: (await dockerPromise).port
                }
            }, options.poolOptions);
            await pool.connect();
            try {
                await pool.flushAll();
                await fn(pool);
            }
            finally {
                await pool.flushAll();
                pool.close();
            }
        });
    }
    static async #clusterFlushAll(cluster) {
        return Promise.all(cluster.masters.map(async (master) => {
            if (master.client) {
                await (await cluster.nodeClient(master)).flushAll();
            }
        }));
    }
    testWithCluster(title, fn, options) {
        let dockersPromise;
        if (this.isVersionGreaterThan(options.minimumDockerVersion)) {
            const dockerImage = this.#DOCKER_IMAGE;
            before(function () {
                this.timeout(30000);
                dockersPromise = (0, dockers_1.spawnRedisCluster)({
                    ...dockerImage,
                    numberOfMasters: options.numberOfMasters,
                    numberOfReplicas: options.numberOfReplicas
                }, options.serverArguments, options.clusterConfiguration?.defaults);
                return dockersPromise;
            });
        }
        it(title, async function () {
            if (!dockersPromise)
                return this.skip();
            const dockers = await dockersPromise, cluster = (0, index_1.createCluster)({
                rootNodes: dockers.map(({ port }) => ({
                    socket: {
                        port
                    }
                })),
                minimizeConnections: true,
                ...options.clusterConfiguration
            });
            await cluster.connect();
            try {
                await TestUtils.#clusterFlushAll(cluster);
                await fn(cluster);
            }
            finally {
                await TestUtils.#clusterFlushAll(cluster);
                cluster.destroy();
            }
        });
    }
    testAll(title, fn, options) {
        this.testWithClient(`client.${title}`, fn, options.client);
        this.testWithCluster(`cluster.${title}`, fn, options.cluster);
    }
    spawnRedisServer(options) {
        return (0, dockers_1.spawnRedisServerDocker)(this.#DOCKER_IMAGE, options.serverArguments);
    }
    async spawnRedisSentinels(options, masterPort, sentinelName, count) {
        const sentinels = [];
        for (let i = 0; i < count; i++) {
            const appPrefix = 'sentinel-config-dir';
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
            sentinels.push(await (0, dockers_1.spawnSentinelNode)(this.#DOCKER_IMAGE, options.serverArguments, masterPort, sentinelName, tmpDir));
            if (tmpDir) {
                fs.rmSync(tmpDir, { recursive: true });
            }
        }
        return sentinels;
    }
}
exports.default = TestUtils;
//# sourceMappingURL=index.js.map