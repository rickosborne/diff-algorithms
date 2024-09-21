import { DiffOperationUnknownError } from "./errors.js";
import type { DefaultDiffResult, Defined, IndexedAddOperation, IndexedCopyOperation, IndexedRemoveOperation } from "./types.js";

export type DefaultPatchConfig<AddOpT, RemoveOpT, CopyOpT> = {
	onChange?: (op: Defined<AddOpT | RemoveOpT | CopyOpT>, changeIndex: number) => void;
	reverse?: boolean;
}

export type PatchConfig<ValueT, AddOpT, RemoveOpT, CopyOpT> = DefaultPatchConfig<AddOpT, RemoveOpT, CopyOpT> & {
	isAdd: (op: Defined<AddOpT | RemoveOpT | CopyOpT>) => op is Defined<AddOpT>;
	isCopy: (op: Defined<AddOpT | RemoveOpT | CopyOpT>) => op is Defined<CopyOpT>;
	isRemove: (op: Defined<AddOpT | RemoveOpT | CopyOpT>) => op is Defined<RemoveOpT>;
	valueFromAdd: (op: Defined<AddOpT>) => ValueT;
	valuesFromCopy: (op: Defined<CopyOpT>, reverse: boolean, allValues: ValueT[]) => ValueT[];
	valueFromRemove: (op: Defined<RemoveOpT>) => ValueT;
};

/**
 * Apply the given change set to the given array to generate a new array.
 * Optionally, run the patch in reverse, which inverts the operations.
 */
export function applyPatch<ValueT>(
	original: ValueT[],
	changes: DefaultDiffResult<ValueT>,
	reverseOrConfig?: undefined | boolean | DefaultPatchConfig<IndexedAddOperation<ValueT>, IndexedRemoveOperation<ValueT>, IndexedCopyOperation>,
): ValueT[];

/**
 * Apply the given change set to the given array to generate a new array.
 * Optionally, run the patch in reverse, which inverts the operations.
 * This variant allows you to supply a diff in a custom format, for which
 * you then need to supply type guards and value mappers.
 */
export function applyPatch<ValueT, AddOpT, RemoveOpT, CopyOpT>(
	original: ValueT[],
	changes: Defined<AddOpT | RemoveOpT | CopyOpT>[],
	typedConfig: PatchConfig<ValueT, AddOpT, RemoveOpT, CopyOpT>,
): ValueT[];

/**
 * Apply the given change set to the given array to generate a new array.
 * Optionally, run the patch in reverse, which inverts the operations.
 */
export function applyPatch<ValueT, AddOpT, RemoveOpT, CopyOpT>(
	original: ValueT[],
	changes: Defined<AddOpT | RemoveOpT | CopyOpT>[],
	maybeConfig?: boolean | undefined | DefaultPatchConfig<IndexedAddOperation<ValueT>, IndexedRemoveOperation<ValueT>, IndexedCopyOperation> | PatchConfig<ValueT, AddOpT, RemoveOpT, CopyOpT>,
): ValueT[] {
	type DefinedOpT = Defined<AddOpT | RemoveOpT | CopyOpT>;
	type PatchConfigT = PatchConfig<ValueT, AddOpT, RemoveOpT, CopyOpT>;

	let reverse = false;
	let config: PatchConfig<ValueT, AddOpT, RemoveOpT, CopyOpT> | undefined;
	if (maybeConfig === false || maybeConfig === true) {
		reverse = maybeConfig;
	} else if (maybeConfig != null) {
		config = maybeConfig as PatchConfigT;
		reverse = config.reverse ?? reverse;
	}
	config ??= {} as PatchConfigT;
	const hasOp = (op: unknown, value: string): boolean => (op != null && typeof op === "object" && "op" in op && op.op === value);
	const isAdd = config.isAdd ?? ((op: DefinedOpT): op is Defined<AddOpT> => hasOp(op, "add"));
	const isCopy = config.isCopy ?? ((op: DefinedOpT): op is Defined<CopyOpT> => hasOp(op, "copy"));
	const isRemove = config.isRemove ?? ((op: DefinedOpT): op is Defined<RemoveOpT> => hasOp(op, "remove"));
	const valueFromAdd = config.valueFromAdd ?? ((op: Defined<AddOpT>) => (op as IndexedAddOperation<ValueT>).value);
	const valueFromRemove = config.valueFromRemove ?? ((op: Defined<RemoveOpT>) => (op as IndexedRemoveOperation<ValueT>).value);
	const valuesFromCopy = config.valuesFromCopy ?? ((op: Defined<CopyOpT>, reverse: boolean, allValues: ValueT[]) => {
		const copy = op as IndexedCopyOperation;
		const index = reverse ? copy.newIndex : copy.oldIndex;
		return allValues.slice(index, index + copy.count);
	});
	const { onChange } = config;
	let result: ValueT[] = [];
	for (let changeIndex = 0; changeIndex < changes.length; changeIndex++) {
		const change = changes[changeIndex];
		onChange?.(change, changeIndex);
		if (isAdd(change)) {
			if (!reverse) {
				result.push(valueFromAdd(change));
			}
		} else if (isRemove(change)) {
			if (reverse) {
				result.push(valueFromRemove(change));
			}
		} else if (isCopy(change)) {
			result = result.concat(valuesFromCopy(change, reverse, original));
		} else {
			throw new DiffOperationUnknownError(change);
		}
	}
	return result;
}

