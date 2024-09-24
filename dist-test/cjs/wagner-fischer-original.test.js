const { wagnerFischerOriginalDiff } = require("../../dist/cjs/wagner-fischer-original.js");
const { diffFunctionTest } = require("../../dist/cjs/test/diff-function-test");
const { describe } = require("mocha");

describe("wagnerFischerOriginalDiff-cjs", () => {
	diffFunctionTest(wagnerFischerOriginalDiff);
});
