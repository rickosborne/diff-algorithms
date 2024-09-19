import { equalsIdentity } from "./equals-identity.js";
import { DiffNotFoundError } from "./errors.js";
import { toIndexedAdd, toIndexedCopy, toIndexedRemove } from "./indexed.js";
import { isDefined } from "./is-defined.js";
import { memoizeBiFunction } from "./memoize-bi-function.js";
import { type BiPredicate, DefaultDiffConfig, DefaultDiffResult, Defined, DiffConfig, IndexedAddOperation, IndexedCopyOperation, IndexedRemoveOperation } from "./types.js";

// noinspection SpellCheckingInspection
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 * In this overload, the returned operations are {@link IndexedAddOperation},
 * {@link IndexedCopyOperation}, and {@link IndexedRemoveOperation}, which
 * are vaguely supersets of RFC6902 data types.
 *
 * This is based on Chris Marchetti's implementation, which is a simplified version of Myers.
 * @see https://gist.github.com/adamnew123456/37923cf53f51d6b9af32a539cdfa7cc4
 */
export function marchettiDiff<ValueT>(
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
 * This is based on Chris Marchetti's implementation, which is a simplified version of Myers.
 * @see https://gist.github.com/adamnew123456/37923cf53f51d6b9af32a539cdfa7cc4
 */
export function marchettiDiff<ValueT, AddOpT, RemoveOpT, ReadOpT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, ReadOpT>,
): Defined<AddOpT | RemoveOpT | ReadOpT>[];
// noinspection SpellCheckingInspection
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 *
 * This is based on Chris Marchetti's implementation, which is a simplified version of Myers.
 * @see https://gist.github.com/adamnew123456/37923cf53f51d6b9af32a539cdfa7cc4
 */
export function marchettiDiff<ValueT, AddOpT, RemoveOpT, CopyT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, CopyT> = {},
): Defined<AddOpT | RemoveOpT | CopyT>[] {
	type ResultT = Defined<AddOpT | RemoveOpT | CopyT>[];

	/**
	 * Count of items in the left array.
	 * In Marchetti's implementation, this is {@code a_max}.
	 */
	const leftCount = left.length;
	/**
	 * In Marchetti's implementation, this is {@code b_max}.
	 */
	const rightCount = right.length;
	/**
	 * Both empty?  Easy!
	 */
	if (leftCount === 0 && rightCount === 0) {
		return [];
	}
	const { equals = equalsIdentity } = config;
	const toAdd = (config.toAdd ?? toIndexedAdd) as Defined<(typeof config)["toAdd"]>;
	const toRemove = (config.toRemove ?? toIndexedRemove) as Defined<(typeof config)["toRemove"]>;
	const toCopy = (config.toCopy ?? toIndexedCopy) as Defined<(typeof config)["toCopy"]>;
	const process = (config.processValue ?? ((v) => v));
	/**
	 * Last index of the left array.  This just makes off-by-one math a little easier to read.
	 */
	const leftLast = leftCount - 1;
	/**
	 * Last index of the right array.  This just makes off-by-one math a little easier to read.
	 */
	const rightLast = rightCount - 1;
	/**
	 * Same instance? Just return a Copy Operation.
	 */
	if (left === right) {
		return [ toCopy(leftCount, 0, 0) ].filter(isDefined);
	}
	/**
	 * Use the cache by default if a custom comparator was provided.  Otherwise, we
	 * assume identity comparisons probably don't need to be cached.
	 */
	const cacheDefault = equals === equalsIdentity;
	/**
	 * Actual cache preference by the caller, or the default if not given.
	 */
	const cacheEquals = config.cacheEquals ?? cacheDefault;
	/**
	 * We'll be working with indices when comparing, so we wrap the value comparator
	 * in a function which gets their values from their indices.  This also allows us
	 * to cache the results, if desired.
	 */
	let equalsAt: BiPredicate<number> = (leftIndex: number, rightIndex: number) => equals(process(left[leftIndex]), process(right[rightIndex]));
	if (cacheEquals) {
		equalsAt = memoizeBiFunction(equalsAt);
	}
	const maxSteps = leftCount + rightCount + 1;
	/**
	 * Marchetti's implementation uses an array of tuples, named {@code frontier}.
	 * For simplicity, this tuple is deconstructed here into two arrays which are
	 * kept in sync.  That implementation also uses 1-indexed arrays, as that's
	 * what the original Myers paper uses, while this one uses zero-indexed arrays.
	 */
	const frontierLefts: number[] = [ -1 ];
	const frontierHistories: ResultT[] = [ [] ];
	/**
	 * In Marchetti's implementation, this is {@code d}.
	 */
	for (let steps = 0; steps < maxSteps; steps++) {
		/**
		 * How far back and forward we'll look for matches.
		 */
		const lookMin = -steps - 1;
		const lookMax = steps - 1;
		/**
		 * An offset for how far forward/back we want to look.
		 * In Marchetti's implementation, this is {@code k}.
		 */
		for (let look = lookMin; look < steps; look += 2) {
			const lookForward = look - 1;
			const lookDown = look + 1;
			const goDown = (look === lookMin) || (look < lookMax && frontierLefts[lookForward] < frontierLefts[lookDown]);
			const indexOffset = goDown ? 0 : 1;
			const lookDirection = goDown ? lookDown : lookForward;
			/**
			 * In Marchetti's implementation, this is {@code old_x}.
			 */
			const oldLeftIndex = frontierLefts[lookDirection];
			/**
			 * Marchetti's implementation reads and duplicates a {@code history} variable
			 * immediately, while this one tracks changes and updates everything at the end.
			 */
			const historyChanges: ResultT = [];
			/**
			 * In Marchetti's implementation, this is {@code x}.
			 */
			let leftIndex = oldLeftIndex + indexOffset;
			/**
			 * In Marchetti's implementation, this is {@code y}.
			 */
			let rightIndex = leftIndex - lookDown;
			if (0 <= rightIndex && rightIndex < rightCount && goDown) {
				const addOp = toAdd(right[rightIndex], leftIndex + 1, rightIndex);
				if (isDefined(addOp)) {
					historyChanges.push(addOp);
				}
			} else if (0 <= leftIndex && leftIndex < leftCount) {
				const removeOp = toRemove(left[leftIndex], leftIndex, rightIndex + 1);
				if (isDefined(removeOp)) {
					historyChanges.push(removeOp);
				}
			}
			/**
			 * Marchetti's implementation stores a "Read" operation for each individual
			 * value.  This implementation instead counts the number of reads/copies and
			 * returns a single one for the entire run.
			 */
			let copyCount = 0;
			while (leftIndex < leftLast && rightIndex < rightLast && equalsAt(leftIndex + 1, rightIndex + 1)) {
				leftIndex++;
				rightIndex++;
				copyCount++;
			}
			if (copyCount > 0) {
				const copyOp = toCopy(copyCount, leftIndex - copyCount + 1, rightIndex - copyCount + 1);
				if (isDefined(copyOp)) {
					historyChanges.push(copyOp);
				}
			}
			/**
			 * The prior change history up to this point.
			 */
			let history: ResultT = frontierHistories[lookDirection];
			// If necessary, the array is cloned before adding this path's changes.
			if (historyChanges.length > 0) {
				history = history.concat(historyChanges);
			}
			if (leftIndex >= leftLast && rightIndex >= rightLast) {
				return history;
			}
			// Update the history and farthest left index.
			frontierHistories[look] = history;
			frontierLefts[look] = leftIndex;
		}
	}
	throw new DiffNotFoundError(maxSteps, leftCount, rightCount);
}
