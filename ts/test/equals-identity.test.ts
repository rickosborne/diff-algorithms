import { describe, it } from "mocha";
import { equalsIdentity } from "../equals-identity.js";
import { expect } from "chai";

describe(equalsIdentity.name, () => {
	const expectations: [unknown, unknown, boolean, string][] = [
		[ 1, 1, true, "same number" ],
		[ 1, 2, false, "different numbers" ],
		[ "a", "a", true, "same string" ],
		[ "a", "b", false, "different strings" ],
		[ null, undefined, false, "null/undefined" ],
		[ [], [], false, "different arrays" ],
		[ {}, {}, false, "different objects" ],
	];
	expectations.forEach(([ left, right, same, name ]) => {
		it(name, () => {
			expect(equalsIdentity(left, right)).equals(same, name);
		});
	});
});
