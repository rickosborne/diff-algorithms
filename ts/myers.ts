import type { MinimalOp } from "./boilerplate.js";
import { boilerplate } from "./boilerplate.js";
import { DiffNotFoundError } from "./errors.js";
import { filledArray } from "./filled-array.js";
import { flooredModulo } from "./floored-modulo.js";
import { isDefined } from "./is-defined.js";
import type { DefaultDiffConfig, DefaultDiffResult, Defined, DiffConfig } from "./types.js";

/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 * In this overload, the returned operations are {@code IndexedAddOperation},
 * {@code IndexedCopyOperation}, and {@code IndexedRemoveOperation}, which
 * are vaguely supersets of RFC6902 data types.
 */
export function myersDiff<ValueT>(
	left: ValueT[],
	right: ValueT[],
	config?: undefined | DefaultDiffConfig<ValueT>,
): DefaultDiffResult<ValueT>;
/**
 * Calculate a shallow diff (set of patch operations) between two arrays,
 * optionally using the provided equality predicate.
 * In this overload, you provide your own custom wrappers for the Add
 * and Remove operations.
 */
export function myersDiff<ValueT, AddOpT, RemoveOpT, ReadOpT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, ReadOpT>,
): Defined<AddOpT | RemoveOpT | ReadOpT>[];

// noinspection SpellCheckingInspection
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
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, CopyT> = {},
): Defined<AddOpT | RemoveOpT | CopyT>[] {
	return boilerplate(left, right, config, ({ equalsAt, leftCount, rightCount, toAdd, toCopy, toRemove }) => {
		const diffSlices = (
			leftStart: number,
			leftMax: number,
			rightStart: number,
			rightMax: number,
		): MinimalOp[] => {
			/**
			 * In Elder's implementation, this is {@code N}.
			 */
			const leftCount = leftMax - leftStart;
			if (leftCount === 0) {
				return right.slice(rightStart, rightMax).map((value, index) => toAdd(leftStart, rightStart + index));
			}
			/**
			 * In Elder's implementation, this is {@code M}.
			 */
			const rightCount = rightMax - rightStart;
			if (rightCount === 0) {
				return left.slice(leftStart, leftMax).map((value, index) => toRemove(index + leftStart, rightStart)).filter(isDefined);
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
			throw new DiffNotFoundError(windowMax, leftCount, rightCount);
		};
		return diffSlices(0, leftCount, 0, rightCount);
	});
}
