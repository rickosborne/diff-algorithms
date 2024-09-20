import type { MinimalOp } from "./boilerplate.js";
import { boilerplate } from "./boilerplate.js";
import { filledArray } from "./filled-array.js";
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
export function wagnerFischerOriginalDiff<ValueT>(
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
export function wagnerFischerOriginalDiff<ValueT, AddOpT, RemoveOpT, ReadOpT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, ReadOpT>,
): Defined<AddOpT | RemoveOpT | ReadOpT>[];
// noinspection SpellCheckingInspection
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 *
 * This is not a particularly efficient algoritthm.  It uses {@code O(L*R*D)}
 * memory and has {@code O(L*D)} performance in all cases.
 *
 * This is based on the Wagner-Fischer algorithm.
 * @see https://en.wikipedia.org/wiki/Wagner%E2%80%93Fischer_algorithm
 */
export function wagnerFischerOriginalDiff<ValueT, AddOpT, RemoveOpT, CopyT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, CopyT> = {},
): Defined<AddOpT | RemoveOpT | CopyT>[] {
	return boilerplate(left, right, config, ({ equalsAt, leftCount, rightCount, toAdd, toCopy, toRemove, toReplace }) => {
		/**
		 * The cross product / matrix of distances.
		 * The first array corresponds to the position in the left / {@code m} array,
		 * while the second index here is the position in the right / {@code n} array.
		 */
		const distances: number[][] = [];
		const operations: MinimalOp[][][] = [];
		for (let m = 0; m <= leftCount; m++) {
			distances[m] = filledArray(rightCount + 1, 0);
			operations[m] = filledArray(rightCount + 1, []);
		}
		/**
		 * This algorithm uses 1-indexing in the cursors to allow the matrix
		 * to use 0-indexing.  Accordingly, what would normally be called
		 * {@code leftIndex} is here called {@code leftPos}, to try to
		 * help you keep that in mind.
		 */
		for (let leftCursor = 1; leftCursor <= leftCount; leftCursor++) {
			/**
			 * Going across the top starts with increasing distance values
			 * as you get farther into the left array.
			 */
			distances[leftCursor][0] = leftCursor;
			/**
			 * Similarly, it starts with increasing counts of Remove operations,
			 * to show nothing on the right (going down) has yet matched.
			 */
			operations[leftCursor][0] = operations[leftCursor - 1][0].concat([ toRemove(leftCursor - 1, 0) ]);
		}
		for (let rightCursor = 1; rightCursor <= rightCount; rightCursor++) {
			/**
			 * Going down the left side starts with increasing distance values
			 * as you get farther into the right array.
			 */
			distances[0][rightCursor] = rightCursor;
			/**
			 * Similarly, it starts with increasing counts of Add operations,
			 * to show nothing on the left (going across) has yet matched.
			 */
			operations[0][rightCursor] = rightCursor === 1 ? [ toAdd(0, rightCursor - 1) ] : operations[0][rightCursor - 1].concat([ toAdd(0, rightCursor - 1) ]);
		}
		for (let rightCursor = 1; rightCursor <= rightCount; rightCursor++) {
			for (let leftCursor = 1; leftCursor <= leftCount; leftCursor++) {
				/**
				 * Here, translate back to index values when testing equality.
				 */
				const same = equalsAt(leftCursor - 1, rightCursor - 1);
				/**
				 * Assign costs to each type of operation, plus the cost up to this point
				 * at previous left/right intersections.
				 */
				const substitutionCost = same ? 0 : 1;
				const deleteCost = distances[leftCursor - 1][rightCursor] + 1;
				const insertCost = distances[leftCursor][rightCursor - 1] + 1;
				const replaceCost = distances[leftCursor - 1][rightCursor - 1] + substitutionCost;
				/**
				 * Technically you can end up with ties here.  We pick one as the "correct" value,
				 * which means we could guess incorrectly.  However, that can't provide a
				 * broken diff/patch, as it's still a valid operation, even if not the most optimal.
				 */
				const minCost = Math.min(deleteCost, insertCost, replaceCost);
				/**
				 * This will include a copy of the winning operation's history, but we need
				 * to pick a winner to know where to find that history.
				 */
				let history: MinimalOp[];
				/**
				 * Each step in the matrix is exactly one change operation.
				 */
				let change: MinimalOp;
				if (minCost === replaceCost) {
					history = operations[leftCursor - 1][rightCursor - 1];
					if (same) {
						change = toCopy(1, leftCursor - 1, rightCursor - 1);
					} else {
						change = toReplace(1, leftCursor - 1, rightCursor - 1);
					}
				} else if (minCost === insertCost) {
					history = operations[leftCursor][rightCursor - 1];
					change = toAdd(leftCursor, rightCursor - 1);
				} else {
					history = operations[leftCursor - 1][rightCursor];
					change = toRemove(leftCursor - 1, rightCursor);
				}
				/**
				 * Store the winning cost to be used by future checks.
				 */
				distances[leftCursor][rightCursor] = minCost;
				/**
				 * Story a copy of the history, plus the winning operation.
				 */
				operations[leftCursor][rightCursor] = history.concat([ change ]);
			}
		}
		/**
		 * Since we chose the minimum-cost winner as we went, and then each later choice
		 * was based on the cluster of related choices, we have a path to a minimum-cost
		 * solution.  It's not guaranteed to be the most efficient, or the most logical,
		 * or the easiest to read, but it is guaranteed to produce a valid diff.
		 */
		return operations[leftCount][rightCount];
	});
}
