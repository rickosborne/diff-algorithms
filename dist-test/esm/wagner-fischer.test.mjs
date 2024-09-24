import { wagnerFischerDiff } from "../../dist/esm/wagner-fischer.js";
import { diffFunctionTest } from "../../dist/esm/test/diff-function-test.js";
import { describe } from "mocha";

describe("wagnerFischerDiff-esm", () => {
	diffFunctionTest(wagnerFischerDiff);
});
