import { expect } from "chai";
import { it } from "mocha";
import { applyPatch } from "../apply-patch.js";
import { equalsIdentity } from "../equals-identity.js";
import { toIndexedCopy } from "../indexed.js";
import { isDefined } from "../is-defined.js";
import { ArrayDiffFunction, DefaultDiffConfig, DefaultDiffResult, DiffConfig } from "../types.js";
import { patchConfigForTest } from "./patch-config-for-test.js";

export const diffFunctionTest = (
	diffFunction: ArrayDiffFunction<unknown>,
) => {
	/**
	 * Given two arrays and an optional config, generate a diff, and then
	 * apply that diff to each side, checking to ensure the result equals
	 * the other side.
	 */
	const testDefault = <ValueT>(left: ValueT[], right: ValueT[], config?: undefined | DefaultDiffConfig<ValueT> | DiffConfig<ValueT, unknown, unknown, unknown>): DefaultDiffResult<ValueT> => {
		const result = diffFunction(left, right, config as undefined) as DefaultDiffResult<ValueT>;
		const leftFromRight = applyPatch(right, result, patchConfigForTest(true));
		const rightFromLeft = applyPatch(left, result, patchConfigForTest(false));
		const processValue = config?.processValue ?? ((v) => v);
		const equals = config?.equals ?? equalsIdentity;
		const compare = (actualValues: ValueT[], expectedValues: ValueT[], label: string) => {
			/**
			 * Because the {@code processedValue} and {@code equals} functions
			 * may be lossy, we can't just use Chai's {@code eql} assertion.
			 * Instead, we use those functions to check the outcomes, then
			 * generate a list of mismatches.
			 */
			const mismatched = expectedValues.map((original, index) => {
				const returned = actualValues[index];
				const actual = processValue(returned);
				const expected = processValue(original);
				if (equals(expected, actual)) {
					return undefined;
				}
				return { actual, expected, index, original, returned };
			}).filter(isDefined);
			expect(mismatched).eql([], label);
		};
		compare(leftFromRight, left, "left from right");
		compare(rightFromLeft, right, "right from left");
		return result;
	};

	it("handles both empty", () => {
		expect(diffFunction([], [])).eql([]);
	});
	it("handles both the same", () => {
		const result = testDefault([ 0, 1, 2 ], [ 0, 1, 2 ]);
		// We also want to see this just a Copy operation,
		// and not something wacky.
		expect(result).eql([
			toIndexedCopy(3, 0, 0),
		]);
	});
	it("handles same instance", () => {
		const items = [ 3, 2, 1 ];
		const result = testDefault(items, items);
		// Same — this should just be a copy.
		expect(result).eql([
			toIndexedCopy(3, 0, 0),
		]);
	});
	it("handles all adds", () => {
		testDefault([], [ 3, 2, 1 ]);
	});
	it("handles all removes", () => {
		testDefault([ 4, 5, 6 ], []);
	});
	it("handles basic combos, forward", () => {
		testDefault([ 0, 1, 2, 3 ], [ 4, 1, 3 ]);
	});
	it("handles basic combos, backward", () => {
		testDefault([ 4, 1, 3 ], [ 0, 1, 2, 3 ]);
	});
	it("handles head insertions", () => {
		testDefault([ 1, 2, 3 ], [ 0, 1, 2, 3 ]);
	});
	it("handles tail insertions", () => {
		testDefault([ 1, 2, 3 ], [ 1, 2, 3, 0 ]);
	});
	it("handles head removal", () => {
		testDefault([ 0, 1, 2, 3 ], [ 2, 3 ]);
	});
	it("handles tail removal", () => {
		testDefault([ 1, 2, 3, 4 ], [ 1, 2 ]);
	});
	it("handles head changes", () => {
		testDefault([ 0, 1, 2, 3 ], [ 4, 1, 2, 3 ]);
	});
	it("handles tail changes", () => {
		testDefault([ 1, 2, 3, 4 ], [ 1, 2, 3, 5 ]);
	});
	it("handles total replacement", () => {
		testDefault([ 0, 1, 2 ], [ 3, 4, 5 ]);
	});
	it("handles longer mixed sequences", () => {
		testDefault(
			[ 2, 4, 6, 8, 10, 12, 14, 16, 18 ],
			[ 2, 4, 5, 6, 7, 8, 10, 16, 18 ],
		);
	});

	it("sparse changes", () => {
		testDefault(
			[ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
			[ 0, 11, 2, 3, 4, 5, 6, 77, 8, 9 ],
		);
	});
	it("long replacements", () => {
		testDefault([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
			[ 0, 11, 22, 33, 44, 5, 66, 77, 88, 9 ]);
	});

	it("can pre-process numbers to do close-enough matching", () => {
		const before = [ 1.1, 2.2, 3.3 ];
		const after = [ 1.1, 2.3, 4.4 ];
		testDefault(before, after, { processValue: (n) => Math.round(n) });
		// same outcome
		testDefault(before, after, { equals: (a, b) => Math.round(a) === Math.round(b) });
	});
	it("can pre-process text to ignore whitespace", () => {
		testDefault([ "\tapple", "\tbanana", "durian" ],
			[ "  apple", "  cherry", "\tdurian" ],
			{ processValue: (s) => s.trim() });
		// same outcome
		testDefault([ "\tapple", "\tbanana", "durian" ],
			[ "  apple", "  cherry", "\tdurian" ],
			{ equals: (a, b) => a.trim() === b.trim() });
	});
};
