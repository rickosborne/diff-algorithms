import type { IndexedAddOperation, IndexedCopyOperation, IndexedRemoveOperation } from "./types.js";

/**
 * Structure the given value and index into an {@link IndexedAddOperation}.
 * It may seem odd to have an `oldIndex` here, as by definition there isn't anything at
 * that position in the old array.  But it can be thought of as a "read head pointer":
 * in applying this as part of a series of operations, where did we last look at the
 * old array?
 * Careful! To match the order for the Remove operation, and to preserve the "left is
 * first, right is second" convention, this callback supplies the old/left index as
 * the first argument, even though you may only care about the new/right index.
 */
export const toIndexedAdd = <T>(value: T, oldIndex: number, newIndex: number): IndexedAddOperation<T> => ({
	count: 1,
	newIndex,
	oldIndex,
	op: "add",
	path: `/${ newIndex }`,
	value,
});
/**
 * Structure the given value and index into a {@link IndexedRemoveOperation}.
 * It may seem odd to have a `newIndex` here, as by definition there isn't anything at
 * that position in the new array.  But it can be thought of as a "write head pointer":
 * in applying this as part of a series of changes, where did we last look at the
 * new array?
 */
export const toIndexedRemove = <T>(value: T, oldIndex: number, newIndex: number): IndexedRemoveOperation<T> => ({
	count: 1,
	newIndex,
	oldIndex,
	op: "remove",
	path: `/${ oldIndex }`,
	value,
});

/**
 * Structure the given count and indices into a {@link IndexedCopyOperation}.
 * Note that unlike Add and Remove, this structure does not include value(s).
 */
export const toIndexedCopy = (count: number, oldIndex: number, newIndex: number): IndexedCopyOperation => ({
	count,
	from: `/${ oldIndex }`,
	newIndex,
	oldIndex,
	op: "copy",
	path: `/${ newIndex }`,
});
