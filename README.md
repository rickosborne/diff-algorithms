# @rickosborne/diff-algorithms

Straightforward implementations of Diff algorithms, including Myers Diff.
Written in TypeScript and thoroughly commented to make them easier to understand without getting a PhD.

## Usage

Install the package via the usual methods, and then `import` or `require`.
Both CommonJS and ESM are supported.

```typescript
// CommonJS
const { myersDiff } = require("@rickosborne/diff-algorithms");

// TypeScript or ESM
import { myersDiff } from "@rickosborne/diff-algorithms";
```

### Implementations

Two variants of the Myers algorithm and two variants of the Wagner-Fisher algorithm are currently implemented:

- `myersDiff`, based on [an implementation by Robert Elder](https://github.com/RobertElderSoftware/roberteldersoftwarediff/blob/master/myers_diff_and_variations.py)
- `marchettiDiff`, based on [an implementation by Chris Marchetti](https://gist.github.com/adamnew123456/37923cf53f51d6b9af32a539cdfa7cc4)
- `wagnerFisherDiff`, [via Wikipedia](https://en.wikipedia.org/wiki/Wagner%E2%80%93Fischer_algorithm) plus a memory optimization, and a `wagnerFisherOriginalDiff` which does not have that optimization.

Both share the same type signature and options.
In theory, the Elder implementation _may_ be faster and more memory efficient.
However, they should both return the same results and be roughly on the same order of magnitude for average use-cases.

> In the author's personal opinion, the Marchetti version is _much_ easier to read through and reason about than the Elder version.
> And although Wagner-Fisher isn't as efficient, it's also a good place to start before tackling the others.

Basic usage is to just pass in two arrays:

```typescript
import { myersDiff } from "@rickosborne/diff-algorithms";

const before = [ 1, 2, 3, 4 ];
const after = [ 1, 2, 4, 5 ];
const diff = myersDiff(before, after);

console.log(diff);
```

The default return structures are a little verbose, but probably have everything you need.

```typescript
// All types include the indices of the change
// in both the old (left) and new (right) arrays,
// as well as a count of changed items.
type Indexed = {
  count: number;
  newIndex: number;
  oldIndex: number;
};

// Operations which return values (Add and Remove) are typed.
type TypedValue<T> = { value: T };

// The defaults are based on RFC6902 structures,
// which include an operation and a path.
type Operation = {
  op: "add" | "copy" | "remove";
  path: string;
};

// Add and Remove operations are always for a
// single value, and thus always have a count of 1.
export type SingleValue<T> = TypedValue<T> & Omit<Indexed, "count"> & { count: 1 };

export type IndexedAddOperation<T> = Omit<AddOperation, "value"> & SingleValue<T>;
export type IndexedRemoveOperation<T> = RemoveOperation & SingleValue<T>;

// Copy operations only include a
// count, but no value(s), and are
// not typed.
export type IndexedCopyOperation = CopyOperation & Indexed;
```

Please note these are only the defaults, which you can easily override if you want.

With those structures in mind, the above example yields:

```json5
[
  {
    "count": 2,
    "from": "/0",
    "newIndex": 0,
    "oldIndex": 0,
    "op": "copy",
    "path": "/0"
  },
  {
    "count": 1,
    "newIndex": 2,
    "oldIndex": 2,
    "op": "remove",
    "path": "/2",
    "value": 3
  },
  {
    "count": 1,
    "from": "/3",
    "newIndex": 2,
    "oldIndex": 3,
    "op": "copy",
    "path": "/2"
  },
  {
    "count": 1,
    "newIndex": 3,
    "oldIndex": 4,
    "op": "add",
    "path": "/3",
    "value": 5
  }
]
```

#### Custom return values

A more custom example would involve supplying callbacks to generate your own structures.
For example, you could generate patch-like results like so:

```javascript
const before = [ "apple", "banana", "cherry" ];
const after = [ "apple", "cherry", "durian", "plum" ];
const diff = myersDiff(before, after, {
  toAdd: (v, b, a) => `@@ -${b + 1},1 +${a + 1},1 @@\n+ ${v}`,
  toCopy: () => undefined,
  toRemove: (v, b, a) => `@@ -${b + 1},1 +${a + 1},1 @@\n- ${v}`,
});
diff.unshift("--- before", "+++ after");

console.log(diff.join("\n"));
```

Notice that `toAdd`, `toCopy`, and `toRemove` return string values, accepting values and indices as arguments.

If you were to write out type signatures and implementations, they would look like:

```typescript
type AddHandler<ValueT, AddOpT> = (value: ValueT, oldIndex: number, newIndex: number) => AddOpT | undefined;

// Thus, in practical terms, the above ends up with:
const toAdd = (value: number, oldIndex: number, newIndex: number): string => {
  return `@@ -${oldIndex + 1},1 +${newIndex + 1},1 @@\n+ ${value}`;
};

// The Copy handler always returns `undefined`,
// which are dropped by the function.
const toCopy = () => undefined;
```

Running the code would show:

```
--- before
+++ after
@@ -2,1 +2,1 @@
- banana
@@ -4,1 +3,1 @@
+ durian
@@ -4,1 +4,1 @@
+ plum
```

It's not a perfect patch structure, of course.
You might want to aggregate the operations for adjacent lines, like a real patch would.

#### Additional configuration options

In the same config structure, you can also add:

`equals?: BiPredicate<ValueT>`

Or, more concretely:

`equals?: (a: ValueT, b: ValueT) => boolean`

Provide your own equality function.
This defaults to `equalsIdentity`, which is exactly what it sounds like: `(a, b) => a === b`.

`cacheEquals?: boolean`

Toggle whether to cache results of the equality operation.
This is on by default if you use the default `equalsIdentity` function,
and off by default otherwise.

`processValue?: (value: ValueT) => ValueT)`

If provided, this callback transform will be applied to each value before the equality test.
The transformed values will not be cached by the function, so this should be a cheap
operation, but can be useful when you don't want to spare the memory to transform the
arrays before calling the function.

### Additional utility functions

#### `flooredModulo`

The `%` operator in Javascript may not work the way you expect if you come from other languages:

* [Remainder operator on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder)
* [Why Python's Integer Division Floors](https://python-history.blogspot.com/2010/08/why-pythons-integer-division-floors.html)
* [Modulo on Wikipedia](https://en.wikipedia.org/wiki/Modulo)

This function performs floored modulo:

```javascript
console.log(17 % -5); // 2
console.log(flooredModulo(17, -5)); // -3
```

#### `filledArray`

Generate an array of the given length, filled with the given value (`undefined` if not provided), or by the given function.

```javascript
console.log(filledArray(3));
// [ undefined, undefined, undefined ]

console.log(filledArray(3, 0));
// [ 0, 0, 0 ]

console.log(filledArray(3, (idx) => idx));
// [ 0, 1, 2 ]
```

You might find this useful if you've ever been disappointed to find that `Array(3)` doesn't work quite like you expect.

#### `memoizeBiFunction`

A very simple transformer to add memoization/caching to a bi-function with a signature like:

```typescript
type BiFunction<T, U> = (a: T, b: T) => U;
```

Yeah, I know, `BiFunction` is a bit overloaded here, and is often used to mean `(T, U) => V` implementations.
But naming things is hard, y'all.

# Release Notes

`2024.9.18`

- DOC: Major overhaul to `README.md`.
- FIX: Trivial non-functional refactor to `types.ts` to make them easier to understand.
- FEATURE: Add the Marchetti implementation.

`2024.9.17`

- FIX: Removed `engines` from the `package.json` and `engines-strict` from `.npmrc`, which would have been annoying for users.

# License

This code is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0):

https://creativecommons.org/licenses/by-nc-sa/4.0/
