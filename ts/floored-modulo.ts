/**
 * Floored/Knuth modulo.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
 * @see https://python-history.blogspot.com/2010/08/why-pythons-integer-division-floors.html
 * @see https://en.wikipedia.org/wiki/Modulo
 */
export const flooredModulo = (dividend: number, divisor: number): number => {
	if (divisor === 0) {
		return NaN;
	}
	if (dividend === 0) {
		return 0;
	}
	return ((dividend % divisor) + divisor) % divisor;
	// The above is equivalent to the following, but without going through floating point:
	// const quotient = Math.floor(dividend / divisor);
	// return dividend - (quotient * divisor);
};
