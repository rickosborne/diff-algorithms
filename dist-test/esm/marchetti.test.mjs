import { marchettiDiff } from "../../dist/esm/marchetti.js";
import { diffFunctionTest } from "../../dist/esm/test/diff-function-test.js";
import { describe } from "mocha";

describe("marchettiDiff-esm", () => {
	diffFunctionTest(marchettiDiff);
});
