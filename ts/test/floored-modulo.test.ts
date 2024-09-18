import { describe, it } from "mocha";
import { expect } from "chai";
import { flooredModulo } from "../floored-modulo.js";

describe(flooredModulo.name, () => {
	/**
	 * Some examples taken from:
	 * @see https://www.uvm.edu/~cbcafier/cs1210/book/04_variables,_statements,_and_expressions/modulo_and_floor.html
	 */
	const expectations: [dividend: number, divisor: number, expected: number][] = [
		[ 5, 2, 1 ],
		[ 5, 7, 5 ],
		[ 9, 3, 0 ],
		[ 17, -5, -3 ],
		[ 25, 7, 4 ],
		[ -15, 5, 0 ],
		[ -43, -3 , -1 ],
		[ 0, 3, 0 ],
		[ 0, 0, NaN ],
		[ 1, 0, NaN ],
	];
	expectations.forEach(([ dividend, divisor, expected ]) => {
		it(`${dividend} % ${divisor} => ${expected}`, () => {
			const actual: number = flooredModulo(dividend, divisor);
			if (isNaN(expected)) {
				expect(actual).is.NaN;
			} else {
				expect(actual).equals(expected);
			}
		});
	});
});
