/**
 * Strict identity equality comparison.  Generally passed as a callback
 * when you need a simple comparator.
 */
export const equalsIdentity = <T>(a: T, b: T): a is typeof b => a === b;
