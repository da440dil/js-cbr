/**
 * Service unavailable: either the circuit state is "Open",
 * or the circuit state is "HalfOpen" and the number of requests exceeds the limit.
 */
export class CircuitError extends Error {
	/** Time in milliseconds during which the circuit state will not switch from "Open" to "HalfOpen". */
	public ttl: number;

	constructor(message: string, ttl: number = 0) {
		super(message);
		this.ttl = ttl;
	}
}

CircuitError.prototype.name = 'CircuitError';
