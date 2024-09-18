import type { Defined } from "./types.js";

export const isDefined = <T>(value: T): value is Defined<T> => value !== undefined;
