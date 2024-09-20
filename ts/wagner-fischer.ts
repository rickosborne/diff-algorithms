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
		 * The cross product / matrix of distances.
		 * The first array corresponds to left / {@code m},
		 * while the second is right / {@code n}.
		 */
		const d: number[][] = [];
		const ops: MinimalOp[][][] = [];
		for (let m = 0; m <= leftCount; m++) {
			d[m] = filledArray(rightCount + 1, 0);
			ops[m] = filledArray(rightCount + 1, []);
		}
		for (let i = 1; i <= leftCount; i++) {
			d[i][0] = i;
			ops[i][0] = i === 1 ? [ toRemove(i - 1, 0) ] : ops[i - 1][0].concat([ toRemove(i - 1, 0) ]);
		}
		for (let j = 1; j <= rightCount; j++) {
			d[0][j] = j;
			ops[0][j] = j === 1 ? [ toAdd(0, j - 1) ] : ops[0][j - 1].concat([ toAdd(0, j - 1) ]);
		}
		// let previousOps = filledArray<MinimalOp[]>(leftCount + 1, []);
		// let previousDistance = filledArray(leftCount + 1, (idx) => idx);
		for (let j = 1; j <= rightCount; j++) {
			// let currentOps: MinimalOp[][] = [];
			// let currentDistance: number[] = [];
			for (let i = 1; i <= leftCount; i++) {
				const same = equalsAt(i - 1, j - 1);
				const substitutionCost = same ? 0 : 1;
				const deleteCost = d[i - 1][j] + 1;
				const insertCost = d[i][j - 1] + 1;
				const replaceCost = d[i - 1][j - 1] + substitutionCost;
				const minCost = Math.min(deleteCost, insertCost, replaceCost);
				let changes: MinimalOp[];
				if (minCost === replaceCost) {
					changes = ops[i - 1][j - 1].slice();
					if (same) {
						changes.push(toCopy(1, i - 1, j - 1));
					} else {
						changes.push(toReplace(1, i - 1, j - 1));
					}
				} else if (minCost === insertCost) {
					changes = ops[i][j - 1].concat([ toAdd(i, j - 1) ]);
				} else {
					changes = ops[i - 1][j].concat([ toRemove(i - 1, j) ]);
				}
				d[i][j] = minCost;
				ops[i][j] = changes;
			}
			// previousOps = currentOps;
			// previousDistance = currentDistance;
		}
		return ops[leftCount][rightCount];
	});
}
