/** Circuit state: "Closed", "Open", "HalfOpen". */
export const CircuitState = {
	/** Requests are allowed. Switches to "Open" state if `errorThreshold` is reached. */
	Closed: 0,
	/** Requests are disallowed. Switches to "HalfOpen" state after `resetTimeout` passed. */
	Open: 1,
	/** Limited number of requests are allowed. Switches to "Closed" state if `successThreshold` is reached. */
	HalfOpen: 2
} as const;

export type CircuitState = typeof CircuitState[keyof typeof CircuitState];
