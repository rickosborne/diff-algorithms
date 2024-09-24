import { wagnerFischerOriginalDiff } from "../../dist/esm/wagner-fischer-original.js";
import { diffFunctionTest } from "../../dist/esm/test/diff-function-test.js";
import { describe } from "mocha";

describe("wagnerFischerOriginalDiff-esm", () => {
	diffFunctionTest(wagnerFischerOriginalDiff);
});
