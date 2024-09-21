export class DiffNotFoundError extends Error {
	constructor(
		public readonly stepCount: number,
		public readonly leftCount: number,
		public readonly rightCount: number,
	) {
		super("Could not find a diff");
	}
}

export class DiffOperationUnknownError extends Error {
	constructor(
		public readonly operation: unknown,
	) {
		super("Diff/Patch operation unknown");
	}
}
