import type { MinimalOp } from "./boilerplate.js";
import { boilerplate } from "./boilerplate.js";
import type { DefaultDiffConfig, DefaultDiffResult, Defined, DiffConfig } from "./types.js";

/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 * In this overload, the returned operations are {@link IndexedAddOperation},
 * {@link IndexedCopyOperation}, and {@link IndexedRemoveOperation}, which
 * are vaguely supersets of RFC6902 data types.
 *
 * This is based on the Wagner-Fischer algorithm.
 * @see https://en.wikipedia.org/wiki/Wagner%E2%80%93Fischer_algorithm
 */
export function wagnerFischerDiff<ValueT>(
	left: ValueT[],
	right: ValueT[],
	config?: undefined | DefaultDiffConfig<ValueT>,
): DefaultDiffResult<ValueT>;
// noinspection SpellCheckingInspection
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 * In this overload, you provide your own custom wrappers for the Add
 * and Remove operations.
 *
 * This is based on the Wagner-Fischer algorithm.
 * @see https://en.wikipedia.org/wiki/Wagner%E2%80%93Fischer_algorithm
 */
export function wagnerFischerDiff<ValueT, AddOpT, RemoveOpT, ReadOpT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, ReadOpT>,
): Defined<AddOpT | RemoveOpT | ReadOpT>[];
// noinspection SpellCheckingInspection
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 *
 * This version is slightly more optimized than the original, using
 * {@code O(2*L*D)} memory instead of {@code O(L*R*D)}.  The performance
 * remains the same: {@code O(L*R)} in all cases.
 *
 * This is based on the Wagner-Fischer algorithm.
 * @see https://en.wikipedia.org/wiki/Wagner%E2%80%93Fischer_algorithm
 */
export function wagnerFischerDiff<ValueT, AddOpT, RemoveOpT, CopyT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, CopyT> = {},
): Defined<AddOpT | RemoveOpT | CopyT>[] {
	return boilerplate(left, right, config, ({ equalsAt, leftCount, rightCount, toAdd, toCopy, toRemove, toReplace }) => {
		/**
		 * This will include a copy of the winning operation's history.  It's been
		 * moved out here to allow us to reuse the variable, and to make it clearer
		 * when "the current or best history" is changed.
		 */
		let history: MinimalOp[] = [];
		/**
		 * Instead of storing the entire {@code L*R*D} matrix as the original does,
		 * this version only stores two {@code L*D} rows: the last one and the
		 * current one.  You could optimize for memory a little further here by
		 * swapping left and right so the length here would be the shorter of the two.
		 */
		let previousOps: MinimalOp[][] = [ history ];
		let previousDistance: number[] = [ 0 ];
		for (let leftCursor = 1; leftCursor <= leftCount; leftCursor++) {
			/**
			 * As in the original, the top row shows increasing distance along the left array.
			 */
			previousDistance[leftCursor] = leftCursor;
			/**
			 * As in the original, the top row here is an increasing number of Remove
			 * operations, to show a history of non-matches against the right array.
			 */
			history = previousOps[leftCursor - 1].concat([ toRemove(leftCursor - 1, 0) ]);
			previousOps[leftCursor] = history;
		}
		for (let rightCursor = 1; rightCursor <= rightCount; rightCursor++) {
			/**
			 * Since we moved "down" from the previous row, this row's history starts
			 * with an Add operation on top of the previous history.
			 */
			history = previousOps[0].concat([ toAdd(0, rightCursor - 1) ]);
			/**
			 * Create a fresh array to fill for this row of matches.
			 */
			let currentOps: MinimalOp[][] = [ history ];
			/**
			 * Similarly, we start with a distance which reflects how far down (into the
			 * right array) we already are.
			 */
			let currentDistance: number[] = [ rightCursor ];
			for (let leftCursor = 1; leftCursor <= leftCount; leftCursor++) {
				/**
				 * We still need to correct for 1-indexing here.
				 */
				const same = equalsAt(leftCursor - 1, rightCursor - 1);
				/**
				 * Operation costs and logic are the same here, if a bit easier to read.
				 */
				const substitutionCost = same ? 0 : 1;
				const deleteCost = currentDistance[leftCursor - 1] + 1;
				const insertCost = previousDistance[leftCursor] + 1;
				const replaceCost = previousDistance[leftCursor - 1] + substitutionCost;
				const minCost = Math.min(deleteCost, insertCost, replaceCost);
				/**
				 * Each step is still exactly one change operation.  The logic below is the same.
				 */
				let change: MinimalOp;
				if (minCost === replaceCost) {
					history = previousOps[leftCursor - 1];
					if (same) {
						change = toCopy(1, leftCursor - 1, rightCursor - 1);
					} else {
						change = toReplace(1, leftCursor - 1, rightCursor - 1);
					}
				} else if (minCost === insertCost) {
					history = previousOps[leftCursor];
					change = toAdd(leftCursor, rightCursor - 1);
				} else {
					history = currentOps[leftCursor - 1];
					change = toRemove(leftCursor - 1, rightCursor);
				}
				/**
				 * We want to make a copy here, so multiple future steps can use it.
				 */
				history = history.concat([ change ]);
				currentDistance[leftCursor] = minCost;
				currentOps[leftCursor] = history;
			}
			/**
			 * As we move down to the next row, use the current as the next previous.
			 */
			previousOps = currentOps;
			/**
			 * Same for the distances.
			 */
			previousDistance = currentDistance;
		}
		/**
		 * And again, we return the operations of the very last history.
		 */
		return history;
	});
}
