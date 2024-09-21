import { expect } from "chai";
import type { DefaultPatchConfig } from "../apply-patch.js";
import type { IndexedAddOperation, IndexedCopyOperation, IndexedRemoveOperation } from "../types.js";

/**
 * A patch config which lets us test that the generated patches follow
 * our convention of "read/write heads".
 */
export const patchConfigForTest = <ValueT>(reverse: boolean): DefaultPatchConfig<IndexedAddOperation<ValueT>, IndexedRemoveOperation<ValueT>, IndexedCopyOperation> => {
	let nextNewIndex = 0;
	let nextOldIndex = 0;
	return ({
		onChange: (change, changeIndex) => {
			expect(change.oldIndex).equals(nextOldIndex, `oldIndex[${ changeIndex }]`);
			expect(change.newIndex).equals(nextNewIndex, `newIndex[${ changeIndex }]`);
			if (change.op === "add") {
				nextNewIndex++;
			} else if (change.op === "remove") {
				nextOldIndex++;
			} else {
				nextOldIndex += change.count;
				nextNewIndex += change.count;
			}
		},
		reverse,
	});
};
