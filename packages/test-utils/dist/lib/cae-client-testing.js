"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFromFile = exports.loadFromJson = void 0;
const promises_1 = require("node:fs/promises");
function loadFromJson(jsonString) {
    try {
        return JSON.parse(jsonString);
    }
    catch (error) {
        throw new Error(`Invalid JSON configuration: ${error}`);
    }
}
exports.loadFromJson = loadFromJson;
async function loadFromFile(path) {
    try {
        const configFile = await (0, promises_1.readFile)(path, 'utf-8');
        return loadFromJson(configFile);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            throw new Error(`Config file not found at path: ${path}`);
        }
        throw error;
    }
}
exports.loadFromFile = loadFromFile;
//# sourceMappingURL=cae-client-testing.js.map