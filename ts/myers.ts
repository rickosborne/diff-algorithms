import type { BiPredicate, Defined, IndexedAddOperation, IndexedCopyOperation, IndexedRemoveOperation, MyersDiffBaseConfig, MyersDiffConfig } from "./types.js";
import { equalsIdentity } from "./equals-identity.js";
import { filledArray } from "./filled-array.js";
import { flooredModulo } from "./floored-modulo.js";
import { isDefined } from "./is-defined.js";

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

export const toIndexedCopy = (count: number, oldIndex: number, newIndex: number): IndexedCopyOperation => ({
	count,
	from: `/${ oldIndex }`,
	newIndex,
	oldIndex,
	op: "copy",
	path: `/${ newIndex }`,
});

/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 * In this overload, the returned operations are {@link IndexedAddOperation}
 * and {@link IndexedRemoveOperation}, which are vaguely supersets of
 * RFC6902 data types.
 */
export function myersDiff<ValueT>(
	left: ValueT[],
	right: ValueT[],
	config?: undefined | MyersDiffBaseConfig & Pick<MyersDiffConfig<ValueT, unknown, unknown, unknown>, "processValue" | "equals">,
): (IndexedAddOperation<ValueT> | IndexedRemoveOperation<ValueT> | IndexedCopyOperation)[];
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 * In this overload, you provide your own custom wrappers for the Add
 * and Remove operations.
 */
export function myersDiff<ValueT, AddOpT, RemoveOpT, ReadOpT>(
	left: ValueT[],
	right: ValueT[],
	config: MyersDiffConfig<ValueT, AddOpT, RemoveOpT, ReadOpT>,
): Defined<AddOpT | RemoveOpT | ReadOpT>[];
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 *
 * This is based on Robert Elder's implementation:
 * @see https://github.com/RobertElderSoftware/roberteldersoftwarediff/blob/master/myers_diff_and_variations.py
 * But made legible for non-monsters.
 */
export function myersDiff<ValueT, AddOpT, RemoveOpT, CopyT>(
	left: ValueT[],
	right: ValueT[],
	config: MyersDiffConfig<ValueT, AddOpT, RemoveOpT, CopyT> = {},
): Defined<AddOpT | RemoveOpT | CopyT>[] {
	const { equals = equalsIdentity, logger } = config;
	const toAdd = (config.toAdd?.bind(config) ?? toIndexedAdd) as Defined<(typeof config)["toAdd"]>;
	const toRemove = (config.toRemove?.bind(config) ?? toIndexedRemove) as Defined<(typeof config)["toRemove"]>;
	const toCopy = (config.toCopy?.bind(config) ?? toIndexedCopy) as Defined<(typeof config)["toCopy"]>;
	const process = (config.processValue?.bind(config) ?? ((v) => v));
	/**
	 * Both empty?  Easy!
	 */
	if (left.length === 0 && right.length === 0) {
		return [];
	}
	/**
	 * Same instance? Just return a Copy Operation.
	 */
	if (left === right) {
		return [ toCopy(left.length, 0, 0) ].filter(isDefined);
	}
	/**
	 * We'll be working with indices when comparing, so we wrap the value comparator
	 * in a function which gets their values from their indices.  This also allows us
	 * to cache the results, if desired.
	 */
	let equalsAt: BiPredicate<number>;
	/**
	 * Use the cache by default if a custom comparator was provided.  Otherwise, we
	 * assume identity comparisons probably don't need to be cached.
	 */
	const cacheDefault = equals === equalsIdentity;
	/**
	 * Actual cache preference by the caller, or the default if not given.
	 */
	const cacheEquals = config.cacheEquals ?? cacheDefault;
	if (cacheEquals) {
		/**
		 * This is just a super simple cache of the equality check outcomes.
		 * This may only be useful if you have a complex equality check, or expect
		 * the operation to be slow.
		 */
		const leftCache: boolean[][] = [];
		equalsAt = (leftIndex: number, rightIndex: number): boolean => {
			let rightCache = leftCache.at(leftIndex);
			if (rightCache == null) {
				rightCache = [];
				leftCache[leftIndex] = rightCache;
			}
			let same = rightCache.at(rightIndex);
			if (same == null) {
				logger?.(`eq(${ leftIndex }, ${ rightIndex })`);
				same = equals(process(left[leftIndex]), process(right[rightIndex]));
				rightCache[rightIndex] = same;
			}
			return same;
		};
	} else {
		equalsAt = (leftIndex: number, rightIndex: number) => equals(process(left[leftIndex]), process(right[rightIndex]));
	}
	/**
	 * Calculate the diff of just slices of each array.  This will be called recursively,
	 * like a binary search.  Note that both the {@code *Max} indices are exclusive of
	 * the implied range.
	 * @param {number} leftStart - In Elder's implementation, this is {@code i}.
	 * @param {number} leftMax - In Elder's implementation, this is {@code i+N}.
	 * @param {number} rightStart - In Elder's implementation, this is {@code j}.
	 * @param {number} rightMax - In Elder's implementation, this is {@code j+M}.
	 */
	const diffSlices = (
		leftStart: number,
		leftMax: number,
		rightStart: number,
		rightMax: number,
	): Defined<AddOpT | RemoveOpT | CopyT>[] => {
		logger?.(`diffSlices(${ leftStart }:${ leftMax }, ${ rightStart }:${ rightMax })`);
		/**
		 * In Elder's implementation, this is {@code N}.
		 */
		const leftCount = leftMax - leftStart;
		if (leftCount === 0) {
			logger?.(`right[${ rightStart }:${ rightMax }] => +`);
			return right.slice(rightStart, rightMax).map((value, index) => toAdd(value, leftStart, rightStart + index)).filter(isDefined);
		}
		/**
		 * In Elder's implementation, this is {@code M}.
		 */
		const rightCount = rightMax - rightStart;
		if (rightCount === 0) {
			logger?.(`left[${ leftStart }:${ leftMax }] = (${ left.slice(leftStart, leftMax) }) => -`);
			return left.slice(leftStart, leftMax).map((value, index) => toRemove(value, index + leftStart, rightStart)).filter(isDefined);
		}
		/**
		 * In Elder's implementation, this is {@code L}.
		 */
		const totalCount = leftCount + rightCount;
		/**
		 * In Elder's implementation, this is {@code Z}.
		 */
		const worstCount = 2 * Math.min(leftCount, rightCount) + 2;
		/**
		 * In Elder's implementation, this is {@code w}.
		 */
		const countChange = leftCount - rightCount;
		/**
		 * These are the indices for the left and right frontiers.
		 * That is, they track the best possible indices along two paths.
		 * The first is from (logical) top left to bottom right.
		 * In Elder's implementation, this is {@code g} or {@code Vf}.
		 */
		const leftFrontier = filledArray(worstCount, 0);
		/**
		 * And this is the best indices along the path from (logical) bottom left to top right.
		 * In Elder's implementation, this is {@code p} or {@code Vb}.
		 */
		const rightFrontier = filledArray(worstCount, 0);
		/**
		 * Note: we can use {@code %} here because we know {@code totalCount} is positive.
		 */
		const totalOdd = totalCount % 2;
		/**
		 * This is the largest distance we'll look forward or backward to find a match.
		 */
		const windowMax = Math.floor(totalCount / 2) + totalOdd + 1;
		/**
		 * Count of steps along the "middle snake" path.
		 * In Elder's implementation, this is {@code h}.
		 */
		for (let steps = 0; steps < windowMax; steps++) {
			/**
			 * This version of the algorithm reuses the lookahead code to also lookbehind.
			 * But to do so, we'll need to swap which axis is primary versus secondary.
			 * You can think of a {@code direction} of {@code 0} as being forward and
			 * {@code 1} as being backward.
			 * In Elder's implementation, this is {@code r}.
			 */
			for (let direction of [ 0, 1 ] as (0 | 1)[]) {
				/**
				 * In Elder's implementation, this is {@code c}.
				 */
				let primary: number[];
				/**
				 * In Elder's implementation, this is {@code d}.
				 */
				let secondary: number[];
				/**
				 * In Elder's implementation, this is {@code m}.
				 */
				let sign: 1 | -1;
				if (direction === 0) {
					primary = leftFrontier;
					secondary = rightFrontier;
					sign = 1;
				} else {
					primary = rightFrontier;
					secondary = leftFrontier;
					sign = -1;
				}
				/**
				 * In Elder's implementation, this is {@code o}.
				 */
				const odd = 1 - direction;
				const negOneIfEven = odd - 1;
				/**
				 * How far backward should we look?
				 */
				const lookMin = 0 - (steps - (2 * Math.max(0, steps - rightCount)));
				/**
				 * How far ahead should we look?
				 */
				const lookMax = steps - (2 * Math.max(0, steps - leftCount)) + 1;
				logger?.(`opC=${ steps }; dir=${ direction }; odd=${ odd }; sign=${ sign }; lMin=${ lookMin }; lMax=${ lookMax }`);
				/**
				 * The value of {@code look} is just the delta between the left index and right index.
				 */
				for (let look = lookMin; look < lookMax; look += 2) {
					const backWorst = flooredModulo(look - 1, worstCount);
					const forwardWorst = flooredModulo(look + 1, worstCount);
					/**
					 * In Elder's implementation, this is {@code a} in "diff", or {@code x} in the "original".
					 */
					let leftOffset: number;
					/**
					 * If we're on the left edge ({@code -steps}), or we're not on the right edge ({@code steps})
					 * and there's more progress forward, keep going forward.  Otherwise, go down.
					 */
					if (look === 0 - steps || (look !== steps && primary[backWorst] < primary[forwardWorst])) {
						leftOffset = primary[forwardWorst];
					} else {
						leftOffset = primary[backWorst] + 1;
					}
					/**
					 * In Elder's implementation, this is {@code b}.
					 */
					let rightOffset = leftOffset - look;
					/**
					 * In Elder's implementation, this is {@code s}.
					 */
					const leftStarted = leftOffset;
					/**
					 * In Elder's implementation, this is {@code t}.
					 */
					const rightStarted = rightOffset;
					/**
					 * Where is "home base" for future comparisons?  We'll then read in the
					 * current direction, greedily bypassing matches.
					 */
					let leftBase = leftStart + direction * leftCount + negOneIfEven;
					let rightBase = rightStart + direction * rightCount + negOneIfEven;
					while (
						(leftOffset + leftStart < leftMax) &&
						(rightOffset + rightStart < rightMax) &&
						equalsAt(leftBase + (sign * leftOffset), rightBase + (sign * rightOffset))
						) {
						leftOffset++;
						rightOffset++;
					}
					let lookModWorst = flooredModulo(look, worstCount);
					/**
					 * Where the next difference starts.
					 */
					primary[lookModWorst] = leftOffset;
					let overshoot = -(look - countChange);
					const overshootModWorst = flooredModulo(overshoot, worstCount);
					if (
						(totalOdd === odd) &&
						(overshoot >= -(steps - odd)) &&
						(overshoot <= steps - odd) &&
						(primary[lookModWorst] + secondary[overshootModWorst]) >= leftCount
					) {
						let doubleSteps = 2 * steps;
						/**
						 * These are the coordinates for the "middle snake", as deltas/offsets from the current
						 * start indices.
						 */
						let leftHeadOffset: number, rightHeadOffset: number, leftTailOffset: number, rightTailOffset: number;
						if (odd === 1) {
							doubleSteps--;
							leftHeadOffset = leftStarted;
							rightHeadOffset = rightStarted;
							leftTailOffset = leftOffset;
							rightTailOffset = rightOffset;
						} else {
							leftHeadOffset = leftCount - leftOffset;
							rightHeadOffset = rightCount - rightOffset;
							leftTailOffset = leftCount - leftStarted;
							rightTailOffset = rightCount - rightStarted;
						}
						const pastFirstStep = doubleSteps > 1;
						if (pastFirstStep || (leftHeadOffset !== leftTailOffset && rightHeadOffset !== rightTailOffset)) {
							/**
							 * We know the middle snake matches, so we just need to split up and recurse into the before and after parts.
							 */
							const leftHalf = diffSlices(leftStart, leftStart + leftHeadOffset, rightStart, rightStart + rightHeadOffset);
							const middleCount = leftTailOffset - leftHeadOffset;
							const middle = middleCount > 0 ? toCopy(middleCount, leftStart + leftHeadOffset, rightStart + rightHeadOffset) : undefined;
							const rightHalf = diffSlices(leftStart + leftTailOffset, leftMax, rightStart + rightTailOffset, rightMax);
							return leftHalf.concat([ ...(isDefined(middle) ? [ middle ] : []) ], rightHalf);
						}
						if (rightCount > leftCount) {
							/**
							 * There's no left side, so just return the right.
							 */
							return diffSlices(leftMax, leftMax, rightStart + leftCount, rightMax);
						}
						if (rightCount < leftCount) {
							/**
							 * There's no right side, so just return the left.
							 */
							return diffSlices(leftStart + rightCount, leftMax, rightMax, rightMax);
						}
						return [];
					}
				}
			}
		}
		throw new Error("Could not find difference");
	};
	/**
	 * The length of the common head, if any.
	 */
	let start = 0;
	while (start < left.length && start < right.length && equalsAt(start, start)) {
		start++;
	}
	/**
	 * The initial Copy Operation, if any.
	 * Typing this the same as the return type here just makes the
	 * below `concat` operation tidier.
	 */
	const headCopy: Defined<AddOpT | RemoveOpT | CopyT>[] = start === 0 ? [] : [ toCopy(start, 0, 0) ].filter(isDefined);
	/**
	 * Similarly, follow back along the common tail, if any.
	 */
	let leftMax = left.length;
	let rightMax = right.length;
	if (start === leftMax && start === rightMax) {
		// They're the same.
		return [ toCopy(leftMax, 0, 0) ].filter(isDefined);
	}
	while (leftMax >= start + 1 && rightMax >= start + 1 && equalsAt(leftMax - 1, rightMax - 1)) {
		leftMax--;
		rightMax--;
	}
	let tailCount = left.length - leftMax;
	const tailCopy = leftMax === left.length ? [] : [ toCopy(tailCount, leftMax, rightMax) ].filter(isDefined);
	/**
	 * Start with just the subset.
	 */
	return headCopy.concat(diffSlices(start, leftMax, start, rightMax), tailCopy);
}
