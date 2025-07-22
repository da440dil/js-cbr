import { CircuitState } from './CircuitState';

/** Current stats: state and counter values. */
export type CircuitStats = {
	/** Circuit state: "Closed", "Open", "HalfOpen". */
	state: CircuitState;
	/** Request counter. Increments at `Circuit.request()` method if circuit state is "HalfOpen". */
	requestCount: number;
	/** Success request counter. Increments at `Circuit.success()` method if circuit state is "Closed" or "HalfOpen". */
	successCount: number;
	/** Error counter. Increments at `Circuit.error()` method if circuit state is "Closed". */
	errorCount: number;
};
