import { myersDiff } from "../myers.js";
import { diffFunctionTest } from "./diff-function-test.js";
import { describe } from "mocha";

describe(myersDiff.name, () => {
	diffFunctionTest(myersDiff);
});

