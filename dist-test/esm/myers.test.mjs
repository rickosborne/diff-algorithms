import { myersDiff } from "../../dist/esm/myers.js";
import { diffFunctionTest } from "../../dist/esm/test/diff-function-test.js";
import { describe } from "mocha";

describe("myersDiff-esm", () => {
	diffFunctionTest(myersDiff);
});
