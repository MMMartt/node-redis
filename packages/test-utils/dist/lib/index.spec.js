"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const index_1 = __importDefault(require("./index"));
describe('TestUtils', () => {
    describe('parseVersionNumber', () => {
        it('should handle special versions', () => {
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('latest'), [Infinity]);
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('edge'), [Infinity]);
        });
        it('should parse simple version numbers', () => {
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('7.4.0'), [7, 4, 0]);
        });
        it('should handle versions with multiple dashes and prefixes', () => {
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('rs-7.4.0-v2'), [7, 4, 0]);
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('rs-7.4.0'), [7, 4, 0]);
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('7.4.0-v2'), [7, 4, 0]);
        });
        it('should handle various version number formats', () => {
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('10.5'), [10, 5]);
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('8.0.0'), [8, 0, 0]);
            node_assert_1.strict.deepStrictEqual(index_1.default.parseVersionNumber('rs-6.2.4-v1'), [6, 2, 4]);
        });
        it('should throw TypeError for invalid version strings', () => {
            ['', 'invalid', 'rs-', 'v2', 'rs-invalid-v2'].forEach(version => {
                node_assert_1.strict.throws(() => index_1.default.parseVersionNumber(version), TypeError, `Expected TypeError for version string: ${version}`);
            });
        });
    });
});
describe('Version Comparison', () => {
    it('should correctly compare versions', () => {
        const tests = [
            [[1, 0, 0], [1, 0, 0], 0],
            [[2, 0, 0], [1, 9, 9], 1],
            [[1, 9, 9], [2, 0, 0], -1],
            [[1, 2, 3], [1, 2], 1],
            [[1, 2], [1, 2, 3], -1],
            [[1, 2, 0], [1, 2, 1], -1],
            [[1], [1, 0, 0], 0],
            [[2], [1, 9, 9], 1],
        ];
        tests.forEach(([a, b, expected]) => {
            node_assert_1.strict.equal(index_1.default.compareVersions(a, b), expected, `Failed comparing ${a.join('.')} with ${b.join('.')}: expected ${expected}`);
        });
    });
    it('should correctly compare versions', () => {
        const tests = [
            [[1, 0, 0], [1, 0, 0], 0],
            [[2, 0, 0], [1, 9, 9], 1],
            [[1, 9, 9], [2, 0, 0], -1],
            [[1, 2, 3], [1, 2], 1],
            [[1, 2], [1, 2, 3], -1],
            [[1, 2, 0], [1, 2, 1], -1],
            [[1], [1, 0, 0], 0],
            [[2], [1, 9, 9], 1],
        ];
        tests.forEach(([a, b, expected]) => {
            node_assert_1.strict.equal(index_1.default.compareVersions(a, b), expected, `Failed comparing ${a.join('.')} with ${b.join('.')}: expected ${expected}`);
        });
    });
    it('isVersionInRange should work correctly', () => {
        const tests = [
            [[7, 0, 0], [7, 0, 0], [7, 0, 0], true],
            [[7, 0, 1], [7, 0, 0], [7, 0, 2], true],
            [[7, 0, 0], [7, 0, 1], [7, 0, 2], false],
            [[7, 0, 3], [7, 0, 1], [7, 0, 2], false],
            [[7], [6, 0, 0], [8, 0, 0], true],
            [[7, 1, 1], [7, 1, 0], [7, 1, 2], true],
            [[6, 0, 0], [7, 0, 0], [8, 0, 0], false],
            [[9, 0, 0], [7, 0, 0], [8, 0, 0], false]
        ];
        tests.forEach(([version, min, max, expected]) => {
            const testUtils = new index_1.default({ string: version.join('.'), numbers: version }, "test");
            node_assert_1.strict.equal(testUtils.isVersionInRange(min, max), expected, `Failed checking if ${version.join('.')} is between ${min.join('.')} and ${max.join('.')}: expected ${expected}`);
        });
    });
});
//# sourceMappingURL=index.spec.js.map