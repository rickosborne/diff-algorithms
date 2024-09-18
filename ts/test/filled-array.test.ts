import { describe, it } from "mocha";
import { expect } from "chai";
import { filledArray } from "../filled-array.js";

describe(filledArray.name, () => {
	it("handles zero-length", () => {
		expect(filledArray(0)).eql([]);
	});
	it("handles 1-length", () => {
		expect(filledArray(1)).eql([ undefined ]);
	});
	it("handles 2-length", () => {
		expect(filledArray(2)).eql([ undefined, undefined ]);
	});
	it("handles static filler", () => {
		expect(filledArray(2, 0)).eql([ 0, 0 ]);
	});
	it("handles dynamic filler", () => {
		expect(filledArray(2, () => 3)).eql([ 3, 3 ]);
	});
	it("passes the expected values to the callback", () => {
		let expectedIndex = 0;
		expect(filledArray(3, (index) => {
			expect(index).equals(expectedIndex, "index");
			expectedIndex++;
			return 0 - index;
		})).eql([ 0, -1, -2 ]);
	});
	it("works with non-numbers", () => {
		let expectedIndex = 0;
		const returned = [ "apple", "banana", "cherry" ];
		expect(filledArray(3, (index) => {
			expect(index).equals(expectedIndex);
			expectedIndex++;
			return returned[2 - index];
		})).eql([ "cherry", "banana", "apple" ]);
	});
});
