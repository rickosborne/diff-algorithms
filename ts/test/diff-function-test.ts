import { expect } from "chai";
import { it } from "mocha";
import { toIndexedAdd, toIndexedCopy, toIndexedRemove } from "../indexed.js";
import { ArrayDiffFunction, DefaultArrayDiffFunction, DefaultDiffConfig, DefaultDiffResult } from "../types.js";

export const diffFunctionTest = (
	diffFunction: ArrayDiffFunction<unknown>,
) => {
	const patch = <ValueT>(original: ValueT[], changes: DefaultDiffResult<ValueT>, reverse: boolean): ValueT[] => {
		const result: ValueT[] = [];
		let nextNewIndex = 0;
		let nextOldIndex = 0;
		changes.forEach((change, changeIndex) => {
			expect(change.oldIndex).equals(nextOldIndex, `oldIndex[${ changeIndex }]`);
			expect(change.newIndex).equals(nextNewIndex, `newIndex[${ changeIndex }]`);
			if (change.op === "add") {
				nextNewIndex++;
				if (!reverse) {
					result.push(change.value);
				}
			} else if (change.op === "remove") {
				nextOldIndex++;
				if (reverse) {
					result.push(change.value);
				}
			} else {
				const baseIndex = reverse ? change.newIndex : change.oldIndex;
				nextOldIndex += change.count;
				nextNewIndex += change.count;
				for (let at = 0; at < change.count; at++) {
					result.push(original[baseIndex + at]);
				}
			}
		});
		return result;
	};

	const testDefault = <ValueT>(left: ValueT[], right: ValueT[], config?: DefaultDiffConfig<ValueT>): DefaultDiffResult<ValueT> => {
		const result = (diffFunction as DefaultArrayDiffFunction<ValueT>)(left, right, config) as DefaultDiffResult<ValueT>;
		const leftFromRight = patch(right, result, true);
		expect({ left, right, leftFromRight, result }).eql({ left, leftFromRight: left, result, right }, "left from right");
		const rightFromLeft = patch(left, result, false);
		expect({ left, right, result, rightFromLeft }).eql({ left, result, right, rightFromLeft: right }, "right from left");
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

	// These tests are lossy, so we can't just pass them through `testDefault`.
	// These just help tsc grumble less.
	const diffNumbers = diffFunction as ArrayDiffFunction<number>;
	const diffStrings = diffFunction as ArrayDiffFunction<string>;

	it("can pre-process numbers to do close-enough matching", () => {
		const before = [ 1.1, 2.2, 3.3 ];
		const after = [ 1.1, 2.3, 4.4 ];
		const expected = [
			toIndexedCopy(2, 0, 0),
			toIndexedRemove(3.3, 2, 2),
			toIndexedAdd(4.4, 3, 2),
		];
		// These are technically lossy, as we can't recover the close-enough
		// numbers to accurately reconstruct the other side.
		expect(diffNumbers(before, after,
			{ processValue: (n) => Math.round(n) },
		)).eql(expected);
		// same outcome
		expect(diffNumbers(before, after,
			{ equals: (a, b) => Math.round(a) === Math.round(b) },
		)).eql(expected);
	});
	it("can pre-process text to ignore whitespace", () => {
		// Theis is technically lossy, as we can't recover the whitespace
		// changes to accurately reconstruct the other side.
		expect(diffStrings(
			[ "\tapple", "\tbanana", "durian" ],
			[ "  apple", "  cherry", "\tdurian" ],
			{ processValue: (s) => s.trim() },
		)).eql([
			toIndexedCopy(1, 0, 0),
			toIndexedRemove("\tbanana", 1, 1),
			toIndexedAdd("  cherry", 2, 1),
			toIndexedCopy(1, 2, 2),
		]);
	});
};
