const { wagnerFischerDiff } = require("../../dist/cjs/wagner-fischer.js");
const { diffFunctionTest } = require("../../dist/cjs/test/diff-function-test");
const { describe } = require("mocha");

describe("wagnerFischerDiff-cjs", () => {
	diffFunctionTest(wagnerFischerDiff);
});
