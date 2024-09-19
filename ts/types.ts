import { AddOperation, CopyOperation, RemoveOperation } from "rfc6902/diff";

export type BiPredicate<T> = (a: T, b: T) => boolean;

export type TypedValue<T> = { value: T };

// All types include the indices of the change
// in both the old (left) and new (right) arrays,
// as well as a count of changed items.
export type Indexed = {
	/**
	 * Number of items in the change.
	 */
	count: number;
	/**
	 * Index in the new/right/after array.
	 */
	newIndex: number;
	/**
	 * Index in the old/left/before array.
	 */
	oldIndex: number;
};

// Add and Remove operations are always for a
// single value, and thus always have a count of 1.
export type SingleValue<T> = TypedValue<T> & Omit<Indexed, "count"> & { count: 1 };

export type IndexedAddOperation<T> = Omit<AddOperation, "value"> & SingleValue<T>;
export type IndexedRemoveOperation<T> = RemoveOperation & SingleValue<T>;
export type IndexedCopyOperation = CopyOperation & Indexed;

export type Defined<T> = Exclude<T, undefined>;

export type LoggerLike = ((message: string) => void);


export type MyersDiffBaseConfig = {
	/**
	 * Toggle whether to cache results of the equality operation.
	 * This is on by default if you use the default {@link equalsIdentity} function,
	 * and off by default otherwise.
	 */
	cacheEquals?: undefined | boolean;
	/**
	 * If you're having trouble visualizing the operations, or want to compare with
	 * another implementation, you can throw in a logger method to get some output.
	 */
	logger?: undefined | LoggerLike;
};

export type MyersDiffConfig<ValueT, AddOpT, RemoveOpT, CopyT> = MyersDiffBaseConfig & {
	/**
	 * An equality test for the value type.
	 * @default {typeof equalsIdentity} Strict identity equals.
	 */
	equals?: undefined | BiPredicate<ValueT>;
	/**
	 * If provided, this callback transform will be applied to values before the equality test.
	 * The transformed values will not be cached by the function, so this should be a cheap
	 * operation, but can be useful when you don't want to spare the memory to transform the
	 * arrays before calling the function.
	 */
	processValue?: undefined | ((value: ValueT) => ValueT);
	/**
	 * A callback function which structures a given value and indices into an Add Operation.
	 * Careful! To match the order for the Remove operation, and to preserve the "left is
	 * first, right is second" convention, this callback supplies the old/left index as
	 * the first argument, even though you may only care about the new/right index.
	 * If this returns undefined, Add Operations will not be included in the result.
	 */
	toAdd?: undefined | ((value: ValueT, oldIndex: number, newIndex: number) => AddOpT | undefined);
	/**
	 * A callback function which structures a given value and indices into a Copy Operation.
	 * If this returns undefined, Copy Operations will not be included in the result.
	 */
	toCopy?: undefined | ((count: number, oldIndex: number, newIndex: number) => CopyT | undefined);
	/**
	 * A callback function which structures a given value and indices into a Remove Operation.
	 * If this returns undefined, Remove Operations will not be included in the result.
	 */
	toRemove?: undefined | ((value: ValueT, oldIndex: number, newIndex: number) => RemoveOpT | undefined);
};
