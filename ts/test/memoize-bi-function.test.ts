import { expect } from "chai";
import { describe } from "mocha";
import { memoizeBiFunction } from "../memoize-bi-function.js";

describe(memoizeBiFunction.name, () => {
	it("only calls the given function once for each value", () => {
		const calls: [number, number][] = [];
		const cachingEquals = memoizeBiFunction((a: number, b: number) => {
			calls.push([ a, b ]);
			return a === b;
		});
		expect(cachingEquals(1, 2)).equals(false);
		expect(cachingEquals(3, 3)).equals(true);
		expect(cachingEquals(1, 2)).equals(false);
		expect(cachingEquals(3, 3)).equals(true);
		expect(calls).eql([
			[ 1, 2 ],
			[ 3, 3 ],
		]);
	});
	it("can handle undefined and null values", () => {
		const calls: [unknown, unknown][] = [];
		const cachingFn = memoizeBiFunction<number | null | undefined, number | null | undefined>((a, b) => {
			calls.push([ a, b ]);
			if (a === undefined || b === undefined) {
				return -7;
			}
			if (a === null || b === null) {
				return 6;
			}
			if (a < 0) {
				return undefined;
			}
			if (b < 0) {
				return null;
			}
			return a - b;
		});
		expect(cachingFn(1, 2)).equals(-1);
		expect(cachingFn(-1, 2)).equals(undefined);
		expect(cachingFn(1, -2)).equals(null);
		expect(cachingFn(undefined, -2)).equals(-7);
		expect(cachingFn(1, null)).equals(6);
		expect(cachingFn(1, 2)).equals(-1);
		expect(cachingFn(1, -2)).equals(null);
		expect(cachingFn(-1, 2)).equals(undefined);
		expect(cachingFn(1, null)).equals(6);
		expect(cachingFn(undefined, -2)).equals(-7);
		expect(calls).eql([
			[ 1, 2 ],
			[ -1, 2 ],
			[ 1, -2 ],
			[ undefined, -2 ],
			[ 1, null ],
		]);
	});
});
