import { wagnerFischerDiff } from "../wagner-fischer.js";
import { diffFunctionTest } from "./diff-function-test.js";
import { describe } from "mocha";

describe(wagnerFischerDiff.name, () => {
	diffFunctionTest(wagnerFischerDiff);
});
