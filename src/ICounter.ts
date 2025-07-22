export interface ICounter {
	/** Increment key value. */
	count(key: string): void;
	/** Get key value. */
	get(key: string): number;
	/** Actualize all values on current time. */
	tidy(): void;
	/** Reset all values to zero. */
	reset(): void;
}
