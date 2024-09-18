import { describe, it } from "mocha";
import { expect } from "chai";
import { myersDiff, toIndexedAdd, toIndexedCopy, toIndexedRemove } from "../myers.js";

describe(myersDiff.name, () => {
	it("handles both empty", () => {
		expect(myersDiff([], [])).eql([]);
	});
	it("handles both the same", () => {
		expect(myersDiff([ 0, 1, 2 ], [ 0, 1, 2 ])).eql([
			toIndexedCopy(3, 0, 0),
		]);
	});
	it("handles all adds", () => {
		expect(myersDiff([], [ 3, 2, 1 ])).eql([
			toIndexedAdd(3, 0, 0),
			toIndexedAdd(2, 0, 1),
			toIndexedAdd(1, 0, 2),
		]);
	});
	it("handles all removes", () => {
		expect(myersDiff([ 4, 5, 6 ], [ ])).eql([
			toIndexedRemove(4, 0, 0),
			toIndexedRemove(5, 1, 0),
			toIndexedRemove(6, 2, 0),
		]);
	});
	it("handles basic combos", () => {
		expect(myersDiff([ 0, 1, 2, 3 ], [ 4, 1, 3 ])).eql([
			toIndexedRemove(0,0, 0),
			toIndexedAdd(4, 1, 0),
			toIndexedCopy(1, 1, 1),
			toIndexedRemove(2, 2, 2),
			toIndexedCopy(1, 3, 2),
		]);
		expect(myersDiff([ 4, 1, 3 ], [ 0, 1, 2, 3 ])).eql([
			toIndexedRemove(4,0, 0),
			toIndexedAdd(0, 1, 0),
			toIndexedCopy(1, 1, 1),
			toIndexedAdd(2, 2, 2),
			toIndexedCopy(1, 2, 3),
		]);
	});
	it("handles head insertions", () => {
		expect(myersDiff([ 1, 2, 3 ], [ 0, 1, 2, 3 ])).eql([
			toIndexedAdd(0, 0, 0),
			toIndexedCopy(3, 0, 1),
		]);
	});
	it("handles tail insertions", () => {
		expect(myersDiff([ 1, 2, 3 ], [ 1, 2, 3, 0 ])).eql([
			toIndexedCopy(3, 0, 0),
			toIndexedAdd(0, 3, 3),
		]);
	});
	it("handles head removal", () => {
		expect(myersDiff([ 0, 1, 2, 3 ], [ 2, 3 ])).eql([
			toIndexedRemove(0, 0, 0),
			toIndexedRemove(1, 1, 0),
			toIndexedCopy(2, 2, 0),
		]);
	});
	it("handles tail removal", () => {
		expect(myersDiff([ 1, 2, 3, 4 ], [ 1, 2 ])).eql([
			toIndexedCopy(2, 0, 0),
			toIndexedRemove(3, 2, 2),
			toIndexedRemove(4, 3, 2),
		]);
	});
	it("handles head changes", () => {
		expect(myersDiff([ 0, 1, 2, 3 ], [ 4, 1, 2, 3 ])).eql([
			toIndexedRemove(0, 0, 0),
			toIndexedAdd(4, 1, 0),
			toIndexedCopy(3, 1, 1),
		]);
	});
	it("handles tail changes", () => {
		expect(myersDiff([ 1, 2, 3, 4 ], [ 1, 2, 3, 5 ])).eql([
			toIndexedCopy(3, 0, 0),
			toIndexedRemove(4, 3, 3),
			toIndexedAdd(5, 4, 3),
		]);
	});
	it("handles total replacement", () => {
		expect(myersDiff([ 0, 1, 2 ], [ 3, 4, 5 ])).eql([
			toIndexedRemove(0, 0, 0),
			toIndexedRemove(1, 1, 0),
			toIndexedRemove(2, 2, 0),
			toIndexedAdd(3, 3, 0),
			toIndexedAdd(4, 3, 1),
			toIndexedAdd(5, 3, 2),
		]);
	});
	it("handles longer mixed sequences", () => {
		expect(myersDiff([ 2, 4, 6, 8, 10, 12, 14, 16, 18 ], [ 2, 4, 5, 6, 7, 8, 10, 16, 18 ])).eql([
			toIndexedCopy(2, 0, 0),
			toIndexedAdd(5, 2, 2),
			toIndexedCopy(1, 2, 3),
			toIndexedAdd(7, 3, 4),
			toIndexedCopy(2, 3, 5),
			toIndexedRemove(12, 5, 7),
			toIndexedRemove(14, 6, 7),
			toIndexedCopy(2, 7, 7),
		]);
	});

	it("can pre-process text to ignore whitespace", () => {
		expect(myersDiff(
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

	it("can pre-process numbers to do close-enough matching", () => {
		const before = [ 1.1, 2.2, 3.3 ];
		const after = [ 1.1, 2.3, 4.4 ];
		const expected = [
			toIndexedCopy(2, 0, 0),
			toIndexedRemove(3.3, 2, 2),
			toIndexedAdd(4.4, 3, 2),
		];
		expect(myersDiff(before, after,
			{ processValue: (n) => Math.round(n) },
		)).eql(expected);
		// same outcome
		expect(myersDiff(before, after,
			{ equals: (a, b) => Math.round(a) === Math.round(b) },
		)).eql(expected);
	});
});
