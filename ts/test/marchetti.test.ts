import { marchettiDiff } from "../marchetti.js";
import { diffFunctionTest } from "./diff-function-test.js";
import { describe } from "mocha";

describe(marchettiDiff.name, () => {
	diffFunctionTest(marchettiDiff);
});
