import { Circuit } from './Circuit';
import { CircuitError } from './CircuitError';

export class CircuitBreaker {
	private circuit: Circuit;

	constructor(circuit: Circuit) {
		this.circuit = circuit;
	}

	/** Execute a function with circuit breaker logic. */
	public async exec<T>(fn: () => Promise<T>): Promise<T> {
		if (!this.circuit.request()) {
			throw new CircuitError();
		}
		try {
			const v = await fn();
			this.circuit.success();
			return v;
		} catch (err) {
			if (this.isBreakable(err)) {
				this.circuit.error();
			}
			throw err;
		}
	}

	/**
	 * Error checking function. Answers the question: should the error be taken into account or not.
	 * Default: all errors are taken into account.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected isBreakable(_: unknown): boolean {
		return true;
	}
}
