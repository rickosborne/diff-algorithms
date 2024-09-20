import { describe } from "mocha";
import { isDefined } from "../is-defined.js";
import { expect } from "chai";

describe(isDefined.name, () => {
	const examples: [unknown, boolean, string][] = [
		[ undefined, false, "undefined" ],
		[ null, true, "null" ],
		[ false, true, "false" ],
		[ 0, true, "zero" ],
		[ "a", true, "string" ],
		[ NaN, true, "NaN" ],
		[ Infinity, true, "Infinity" ],
		[ -0, true, "-0" ],
		[ [], true, "[]" ],
		[ {}, true, "{}" ],
		[ void(1), false, "void(1)" ],
	];
	examples.forEach(([ value, expected, name ]) => {
		it(`${name} => ${expected}`, () => {
			expect(isDefined(value)).equals(expected, name);
		});
	});
});
