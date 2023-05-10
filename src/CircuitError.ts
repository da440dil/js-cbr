/** Service unavailable: either the circuit state is "Open", or the circuit state is "HalfOpen" and the number of requests exceeds the limit. */
export const CircuitBroken = 'Circuit broken';

export class CircuitError extends Error { }
CircuitError.prototype.name = 'CircuitError';
CircuitError.prototype.message = CircuitBroken;
