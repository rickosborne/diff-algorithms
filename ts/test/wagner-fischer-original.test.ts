import { describe } from "mocha";
import { wagnerFischerOriginalDiff } from "../wagner-fischer-original.js";
import { diffFunctionTest } from "./diff-function-test.js";

describe(wagnerFischerOriginalDiff.name, () => {
	diffFunctionTest(wagnerFischerOriginalDiff);
});
