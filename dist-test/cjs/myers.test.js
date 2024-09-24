const { myersDiff } = require("../../dist/cjs/myers.js");
const { diffFunctionTest } = require("../../dist/cjs/test/diff-function-test");
const { describe } = require("mocha");

describe("myersDiff-cjs", () => {
	diffFunctionTest(myersDiff);
});
