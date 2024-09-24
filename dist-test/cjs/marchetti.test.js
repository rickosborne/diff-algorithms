const { marchettiDiff } = require("../../dist/cjs/marchetti.js");
const { diffFunctionTest } = require("../../dist/cjs/test/diff-function-test");
const { describe } = require("mocha");

describe("marchettiDiff-cjs", () => {
    diffFunctionTest(marchettiDiff);
});
