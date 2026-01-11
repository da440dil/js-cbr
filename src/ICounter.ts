export interface ICounter {
	/** Start timer. */
	start(): void;
	/** Stop timer. */
	stop(): void;
	/** Increment key value. */
	incr(key: string): void;
	/** Get key value. */
	get(key: string): number;
	/** Reset all values to zero. */
	reset(): void;
}
