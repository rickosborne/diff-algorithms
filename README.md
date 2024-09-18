# @rickosborne/diff-algorithms

Straightforward implementations of Diff algorithms, including Myers Diff.
Written in TypeScript and thoroughly commented to make them easier to understand without getting a PhD.

## Usage

```javascript
import { myersDiff } from "@rickosborne/diff-algorithms";

const before = [ 1, 2, 3, 4 ];
const after  = [ 1, 2, 4, 5 ];
const diff = myersDiff(before, after);

console.log(diff);
```

Yields:

```json5
[
  {
    count: 2,
    from: '/0',
    newIndex: 0,
    oldIndex: 0,
    op: 'copy',
    path: '/0'
  },
  {
    count: 1,
    newIndex: 2,
    oldIndex: 2,
    op: 'remove',
    path: '/2',
    value: 3
  },
  {
    count: 1,
    from: '/3',
    newIndex: 2,
    oldIndex: 3,
    op: 'copy',
    path: '/2'
  },
  {
    count: 1,
    newIndex: 3,
    oldIndex: 4,
    op: 'add',
    path: '/3',
    value: 5
  }
]
```

Or you could generate patch-like results by supplying callbacks to structure the different return types:

```javascript
const before = [ "apple", "banana", "cherry" ];
const after = [ "apple", "cherry", "durian", "plum" ]
const diff = myersDiff(before, after, {
	toAdd: (v, b, a) => `@@ -${b+1},1 +${a+1},1 @@\n+ ${v}`,
	toCopy: () => undefined,
	toRemove: (v, b, a) => `@@ -${b+1},1 +${a+1},1 @@\n- ${v}`,
});
diff.unshift("--- before", "+++ after");

console.log(diff.join("\n"));
```

This shows:

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

# License

This code is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0):

https://creativecommons.org/licenses/by-nc-sa/4.0/
