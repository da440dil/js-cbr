import { Circuit } from './Circuit';
import { CircuitState } from './CircuitState';
import { CircuitError } from './CircuitError';

export class Breaker {
	private circuit: Circuit;
	private timeout = 0;
	private run = run;

	constructor(circuit: Circuit, { timeout, isBreakable }: BreakerOptions = {}) {
		this.circuit = circuit;
		if (timeout) {
			this.timeout = timeout;
			this.run = withTimeout(timeout);
		}
		if (isBreakable) {
			this.isBreakable = isBreakable;
		}
	}

	/** Execute a function with circuit breaker logic. */
	public async exec<T>(fn: ExecFunction<T>, signal?: AbortSignal): Promise<T> {
		if (!this.circuit.request()) {
			if (this.circuit.state() === CircuitState.Open) {
				throw new CircuitError('Circuit broken', this.circuit.ttl());
			}
			throw new CircuitError('Request rate limit exceeded', this.timeout);
		}
		try {
			const v: T = signal ? await withSignal(fn, signal) : await this.run(fn);
			this.circuit.success();
			return v;
		} catch (err) {
			if (this.isBreakable(err)) {
				this.circuit.error();
			}
			throw err;
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected isBreakable(_err: unknown): boolean {
		return true;
	}
}

export type BreakerOptions = {
	/** Maximum time in milliseconds to execute a function before timing out. Default: no timeout = 0. */
	timeout?: number;
	/**
	 * Error checking function. Answers the question: should the error be taken into account or not.
	 * Default: all errors are taken into account.
	 */
	isBreakable?: (err: unknown) => boolean;
};

export type ExecFunction<T> = (signal?: AbortSignal) => Promise<T>;

async function withSignal<T>(fn: ExecFunction<T>, signal: AbortSignal): Promise<T> {
	const v = await fn(signal);
	signal.throwIfAborted();
	return v;
}

function run<T>(fn: ExecFunction<T>): Promise<T> {
	return fn();
}

function withTimeout<T>(timeout: number): (fn: ExecFunction<T>) => Promise<T> {
	return async function withSignal(fn) {
		const controller = new AbortController();
		let timer: NodeJS.Timeout | undefined;
		const timeoutPromise = new Promise<void>((resolve) => {
			timer = setTimeout(() => {
				controller.abort(new CircuitError('Request timeout exceeded'));
				resolve();
			}, timeout);
		});
		try {
			const v = await Promise.race([fn(controller.signal), timeoutPromise]);
			controller.signal.throwIfAborted();
			return v as T;
		} finally {
			clearTimeout(timer);
		}
	};
}
