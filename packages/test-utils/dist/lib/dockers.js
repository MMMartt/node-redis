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
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnSentinelNode = exports.spawnRedisSentinel = exports.spawnRedisCluster = exports.spawnRedisServer = exports.spawnRedisServerDocker = void 0;
const node_net_1 = require("node:net");
const node_events_1 = require("node:events");
const index_1 = require("@redis/client/index");
const promises_1 = require("node:timers/promises");
// import { ClusterSlotsReply } from '@redis/client/dist/lib/commands/CLUSTER_SLOTS';
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const execAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
async function isPortAvailable(port) {
    try {
        const socket = (0, node_net_1.createConnection)({ port });
        await (0, node_events_1.once)(socket, 'connect');
        socket.end();
    }
    catch (err) {
        if (err instanceof Error && err.code === 'ECONNREFUSED') {
            return true;
        }
    }
    return false;
}
const portIterator = (async function* () {
    for (let i = 6379; i < 65535; i++) {
        if (await isPortAvailable(i)) {
            yield i;
        }
    }
    throw new Error('All ports are in use');
})();
async function spawnRedisServerDocker(options, serverArguments) {
    let port;
    if (options.mode == "sentinel") {
        port = options.port;
    }
    else {
        port = (await portIterator.next()).value;
    }
    const portStr = port.toString();
    const dockerArgs = [
        'run',
        '--init',
        '-e', `PORT=${portStr}`
    ];
    if (options.mode == "sentinel") {
        options.mounts.forEach(mount => {
            dockerArgs.push('-v', mount);
        });
    }
    dockerArgs.push('-d', '--network', 'host', `${options.image}:${options.version}`);
    if (serverArguments.length > 0) {
        for (let i = 0; i < serverArguments.length; i++) {
            dockerArgs.push(serverArguments[i]);
        }
    }
    console.log(`[Docker] Spawning Redis container - Image: ${options.image}:${options.version}, Port: ${port}, Mode: ${options.mode}`);
    const { stdout, stderr } = await execAsync('docker', dockerArgs);
    if (!stdout) {
        throw new Error(`docker run error - ${stderr}`);
    }
    while (await isPortAvailable(port)) {
        await (0, promises_1.setTimeout)(50);
    }
    return {
        port,
        dockerId: stdout.trim()
    };
}
exports.spawnRedisServerDocker = spawnRedisServerDocker;
const RUNNING_SERVERS = new Map();
function spawnRedisServer(dockerConfig, serverArguments) {
    const runningServer = RUNNING_SERVERS.get(serverArguments);
    if (runningServer) {
        return runningServer;
    }
    const dockerPromise = spawnRedisServerDocker(dockerConfig, serverArguments);
    RUNNING_SERVERS.set(serverArguments, dockerPromise);
    return dockerPromise;
}
exports.spawnRedisServer = spawnRedisServer;
async function dockerRemove(dockerId) {
    const { stderr } = await execAsync('docker', ['rm', '-f', dockerId]);
    if (stderr) {
        throw new Error(`docker rm error - ${stderr}`);
    }
}
after(() => {
    return Promise.all([...RUNNING_SERVERS.values()].map(async (dockerPromise) => await dockerRemove((await dockerPromise).dockerId)));
});
async function spawnRedisClusterNodeDockers(dockersConfig, serverArguments, fromSlot, toSlot, clientConfig) {
    const range = [];
    for (let i = fromSlot; i < toSlot; i++) {
        range.push(i);
    }
    const master = await spawnRedisClusterNodeDocker(dockersConfig, serverArguments, clientConfig);
    await master.client.clusterAddSlots(range);
    if (!dockersConfig.numberOfReplicas)
        return [master];
    const replicasPromises = [];
    for (let i = 0; i < (dockersConfig.numberOfReplicas ?? 0); i++) {
        replicasPromises.push(spawnRedisClusterNodeDocker(dockersConfig, [
            ...serverArguments,
            '--cluster-enabled',
            'yes',
            '--cluster-node-timeout',
            '5000'
        ], clientConfig).then(async (replica) => {
            const requirePassIndex = serverArguments.findIndex((x) => x === '--requirepass');
            if (requirePassIndex !== -1) {
                const password = serverArguments[requirePassIndex + 1];
                await replica.client.configSet({ 'masterauth': password });
            }
            await replica.client.clusterMeet('127.0.0.1', master.docker.port);
            while ((await replica.client.clusterSlots()).length === 0) {
                await (0, promises_1.setTimeout)(25);
            }
            await replica.client.clusterReplicate(await master.client.clusterMyId());
            return replica;
        }));
    }
    return [
        master,
        ...await Promise.all(replicasPromises)
    ];
}
async function spawnRedisClusterNodeDocker(dockersConfig, serverArguments, clientConfig) {
    const docker = await spawnRedisServerDocker(dockersConfig, [
        ...serverArguments,
        '--cluster-enabled',
        'yes',
        '--cluster-node-timeout',
        '5000'
    ]), client = (0, index_1.createClient)({
        socket: {
            port: docker.port
        },
        ...clientConfig
    });
    await client.connect();
    return {
        docker,
        client
    };
}
const SLOTS = 16384;
async function spawnRedisClusterDockers(dockersConfig, serverArguments, clientConfig) {
    const numberOfMasters = dockersConfig.numberOfMasters ?? 2, slotsPerNode = Math.floor(SLOTS / numberOfMasters), spawnPromises = [];
    for (let i = 0; i < numberOfMasters; i++) {
        const fromSlot = i * slotsPerNode, toSlot = i === numberOfMasters - 1 ? SLOTS : fromSlot + slotsPerNode;
        spawnPromises.push(spawnRedisClusterNodeDockers(dockersConfig, serverArguments, fromSlot, toSlot, clientConfig));
    }
    const nodes = (await Promise.all(spawnPromises)).flat(), meetPromises = [];
    for (let i = 1; i < nodes.length; i++) {
        meetPromises.push(nodes[i].client.clusterMeet('127.0.0.1', nodes[0].docker.port));
    }
    await Promise.all(meetPromises);
    await Promise.all(nodes.map(async ({ client }) => {
        while (totalNodes(await client.clusterSlots()) !== nodes.length ||
            !(await client.sendCommand(['CLUSTER', 'INFO'])).startsWith('cluster_state:ok') // TODO
        ) {
            await (0, promises_1.setTimeout)(50);
        }
        client.destroy();
    }));
    return nodes.map(({ docker }) => docker);
}
// TODO: type ClusterSlotsReply
function totalNodes(slots) {
    let total = slots.length;
    for (const slot of slots) {
        total += slot.replicas.length;
    }
    return total;
}
const RUNNING_CLUSTERS = new Map();
function spawnRedisCluster(dockersConfig, serverArguments, clientConfig) {
    const runningCluster = RUNNING_CLUSTERS.get(serverArguments);
    if (runningCluster) {
        return runningCluster;
    }
    const dockersPromise = spawnRedisClusterDockers(dockersConfig, serverArguments, clientConfig);
    RUNNING_CLUSTERS.set(serverArguments, dockersPromise);
    return dockersPromise;
}
exports.spawnRedisCluster = spawnRedisCluster;
after(() => {
    return Promise.all([...RUNNING_CLUSTERS.values()].map(async (dockersPromise) => {
        return Promise.all((await dockersPromise).map(({ dockerId }) => dockerRemove(dockerId)));
    }));
});
const RUNNING_NODES = new Map();
const RUNNING_SENTINELS = new Map();
async function spawnRedisSentinel(dockerConfigs, serverArguments) {
    const runningNodes = RUNNING_SENTINELS.get(serverArguments);
    if (runningNodes) {
        return runningNodes;
    }
    const passIndex = serverArguments.indexOf('--requirepass') + 1;
    let password = undefined;
    if (passIndex != 0) {
        password = serverArguments[passIndex];
    }
    const master = await spawnRedisServerDocker(dockerConfigs, serverArguments);
    const redisNodes = [master];
    const replicaPromises = [];
    const replicasCount = 2;
    for (let i = 0; i < replicasCount; i++) {
        replicaPromises.push((async () => {
            const replica = await spawnRedisServerDocker(dockerConfigs, serverArguments);
            const client = (0, index_1.createClient)({
                socket: {
                    port: replica.port
                },
                password: password
            });
            await client.connect();
            await client.replicaOf("127.0.0.1", master.port);
            await client.close();
            return replica;
        })());
    }
    const replicas = await Promise.all(replicaPromises);
    redisNodes.push(...replicas);
    RUNNING_NODES.set(serverArguments, redisNodes);
    const sentinelPromises = [];
    const sentinelCount = 3;
    const appPrefix = 'sentinel-config-dir';
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), appPrefix));
    for (let i = 0; i < sentinelCount; i++) {
        sentinelPromises.push(spawnSentinelNode(dockerConfigs, serverArguments, master.port, "mymaster", path.join(tmpDir, i.toString()), password));
    }
    const sentinelNodes = await Promise.all(sentinelPromises);
    RUNNING_SENTINELS.set(serverArguments, sentinelNodes);
    if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true });
    }
    return sentinelNodes;
}
exports.spawnRedisSentinel = spawnRedisSentinel;
after(() => {
    return Promise.all([...RUNNING_NODES.values(), ...RUNNING_SENTINELS.values()].map(async (dockersPromise) => {
        return Promise.all(dockersPromise.map(({ dockerId }) => dockerRemove(dockerId)));
    }));
});
async function spawnSentinelNode(dockerConfigs, serverArguments, masterPort, sentinelName, tmpDir, password) {
    const port = (await portIterator.next()).value;
    let sentinelConfig = `port ${port}
sentinel monitor ${sentinelName} 127.0.0.1 ${masterPort} 2
sentinel down-after-milliseconds ${sentinelName} 500
sentinel failover-timeout ${sentinelName} 1000
`;
    if (password !== undefined) {
        sentinelConfig += `requirepass ${password}\n`;
        sentinelConfig += `sentinel auth-pass ${sentinelName} ${password}\n`;
    }
    const dir = fs.mkdtempSync(tmpDir);
    fs.writeFile(`${dir}/redis.conf`, sentinelConfig, err => {
        if (err) {
            console.error("failed to create temporary config file", err);
        }
    });
    return await spawnRedisServerDocker({
        image: dockerConfigs.image,
        version: dockerConfigs.version,
        mode: "sentinel",
        mounts: [`${dir}/redis.conf:/redis/config/node-sentinel-1/redis.conf`],
        port: port,
    }, serverArguments);
}
exports.spawnSentinelNode = spawnSentinelNode;
//# sourceMappingURL=dockers.js.map