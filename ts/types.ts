import { AddOperation, CopyOperation, RemoveOperation } from "rfc6902/diff";

export type BiPredicate<T> = (a: T, b: T) => boolean;

export type TypedAddOperation<T> = Omit<AddOperation, "value"> & { value: T };
export type TypedRemoveOperation<T> = RemoveOperation & { value: T };

export type Indices = { newIndex: number; oldIndex: number };
export type IndexedAddOperation<T> = TypedAddOperation<T> & Indices & { count: 1; };
export type IndexedRemoveOperation<T> = TypedRemoveOperation<T> & Indices & { count: 1; };
export type IndexedCopyOperation = CopyOperation & Indices & { count: number };

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
