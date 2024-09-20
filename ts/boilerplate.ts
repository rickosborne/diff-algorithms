import { equalsIdentity } from "./equals-identity.js";
import { toIndexedAdd, toIndexedCopy, toIndexedRemove } from "./indexed.js";
import { isDefined } from "./is-defined.js";
import { memoizeBiFunction } from "./memoize-bi-function.js";
import { type BiPredicate, Defined, DiffConfig } from "./types.js";

const ADD = "+" as const;
const DEL = "-" as const;
const COPY = "=" as const;

export type MinimalAdd = [ op: typeof ADD, oldIndex: number, newIndex: number ];
export type MinimalCopy = [ op: typeof COPY, count: number, oldIndex: number, newIndex: number ];
export type MinimalRemove = [ op: typeof DEL, oldIndex: number, newIndex: number ];
export type MinimalOp = MinimalAdd | MinimalCopy | MinimalRemove;

export type DiffAlgorithmContext = {
	equalsAt(leftIndex: number, rightIndex: number): boolean;
	leftCount: number;
	leftLast: number;
	rightCount: number;
	rightLast: number;
	toAdd(oldIndex: number, newIndex: number): MinimalAdd;
	toCopy(count: number, oldIndex: number, newIndex: number): MinimalCopy;
	toRemove(oldIndex: number, newIndex: number): MinimalRemove;
}

export function boilerplate<ValueT, AddOpT, RemoveOpT, CopyT>(
	left: ValueT[],
	right: ValueT[],
	config: DiffConfig<ValueT, AddOpT, RemoveOpT, CopyT> = {},
	impl: (context: DiffAlgorithmContext) => MinimalOp[],
): Defined<AddOpT | RemoveOpT | CopyT>[] {
	/**
	 * Both empty?  Easy!
	 */
	if (left.length === 0 && right.length === 0) {
		return [];
	}
	const { equals = equalsIdentity } = config;
	const toAdd = (config.toAdd ?? toIndexedAdd) as Defined<(typeof config)["toAdd"]>;
	const toRemove = (config.toRemove ?? toIndexedRemove) as Defined<(typeof config)["toRemove"]>;
	const toCopy = (config.toCopy ?? toIndexedCopy) as Defined<(typeof config)["toCopy"]>;
	const process = (config.processValue ?? ((v) => v));
	/**
	 * Same instance? Just return a Copy Operation.
	 */
	if (left === right) {
		return [ toCopy(left.length, 0, 0) ].filter(isDefined);
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
	const headCopy: MinimalOp[] = start === 0 ? [] : [ [ COPY, start, 0, 0 ] ];
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
	const tailCopy: MinimalOp[] = leftMax === left.length ? [] : [ [ COPY, tailCount, leftMax, rightMax ] ];
	/**
	 * Count of items in the left array which the algorithm will need to consider.
	 */
	const leftCount = left.length - start - tailCount;
	/**
	 * Count of items in the right array which the algorithm will need to consider.
	 */
	const rightCount = right.length - start - tailCount;
	/**
	 * Last index of the left array, as far as the algorithm is concerned.
	 * This just makes off-by-one math a little easier to read.
	 */
	const leftLast = leftCount - 1;
	/**
	 * Last index of the right array, as far as the algorithm is concerned.
	 * This just makes off-by-one math a little easier to read.
	 */
	const rightLast = rightCount - 1;
	/**
	 * Hand off to the algorithm implementation, transparently shifting
	 * index values by the calculated `start` value.
	 */
	const middle = impl({
		equalsAt: start === 0 ? equalsAt : (leftIndex: number, rightIndex: number) => equalsAt(leftIndex + start, rightIndex + start),
		leftCount,
		leftLast,
		rightCount,
		rightLast,
		toAdd: (oldIndex: number, newIndex: number): MinimalAdd => [ ADD, oldIndex + start, newIndex + start ],
		toCopy: (count: number, oldIndex: number, newIndex: number): MinimalCopy => [ COPY, count, oldIndex + start, newIndex + start ],
		toRemove: (oldIndex: number, newIndex: number): MinimalRemove => [ DEL, oldIndex + start, newIndex + start ],
	});
	/**
	 * Translate from the Minimal operations to the formats built by the caller.
	 */
	return headCopy.concat(middle, tailCopy).map((op) => {
		if (op[0] === ADD) {
			return toAdd(right[op[2]], op[1], op[2]);
		}
		if (op[0] === COPY) {
			return toCopy(op[1], op[2], op[3]);
		}
		if (op[0] === DEL) {
			return toRemove(left[op[1]], op[1], op[2]);
		}
		throw new SyntaxError(`Unknown op: ${ op[0] }`);
	}).filter(isDefined);
};
