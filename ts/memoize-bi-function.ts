import { BiFunction } from "./types.js";

/**
 * This is just a super simple caching wrapper around a {@link BiFunction}.
 */
export const memoizeBiFunction = <ValueT, ResultT>(
	fn: (left: ValueT, right: ValueT) => ResultT,
): BiFunction<ValueT, ResultT> => {
	const leftCache = new Map<ValueT, Map<ValueT, ResultT>>();
	return (left: ValueT, right: ValueT): ResultT => {
		if (!leftCache.has(left)) {
			leftCache.set(left, new Map());
		}
		let rightCache = leftCache.get(left) as Map<ValueT, ResultT>;
		if (!rightCache.has(right)) {
			const actual = fn(left, right);
			rightCache.set(right, actual);
			return actual;
		}
		return rightCache.get(right) as ResultT;
	};
};
