import { EventEmitter } from 'events';
import { CircuitState } from './CircuitState';
import { CircuitError } from './CircuitError';

export class CircuitBreaker extends EventEmitter {
	/** Decorate a class method with circuit breaker logic. */
	public static Breakable<This, Args extends unknown[], Return>(breaker: CircuitBreaker) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		return (fn: (this: This, ...args: Args) => Promise<Return>, _: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>) => {
			return function breakable(this: This, ...args: Args): Promise<Return> {
				return breaker.exec(() => fn.apply(this, args));
			};
		};
	}

	private state: CircuitState = CircuitState.Closed;
	private requestCount = 0;
	private failureCount = 0;
	private successCount = 0;
	private expiresAt = 0;
	private errorThreshold: number;
	private resetTimeout: number;
	private successThreshold: number;

	constructor({ errorThreshold = 1, resetTimeout, successThreshold = 1, isBreakable }: {
		/** The number of consecutive errors, if reached the circuit state switches from "Closed" to "Open". By default equals 1. */
		errorThreshold?: number;
		/** The period of time, when passed the circuit state switches from "Open" to "HalfOpen". */
		resetTimeout: number;
		/** The number of consecutive successes, if reached the circuit state switches from "HalfOpen" to "Closed". By default equals 1. */
		successThreshold?: number;
		/** Error checking function. Answers the question: should the error be taken into account or not. By default, all errors are taken into account. */
		isBreakable?: (err: unknown) => boolean;
	}) {
		super();
		this.errorThreshold = errorThreshold;
		this.resetTimeout = resetTimeout;
		this.successThreshold = successThreshold;
		if (isBreakable) {
			this.isBreakable = isBreakable;
		}
	}

	/** Execute a function with circuit breaker logic. */
	public async exec<T>(fn: () => Promise<T>): Promise<T> {
		if (this.broken()) {
			throw new CircuitError();
		}
		try {
			const v = await fn();
			this.success();
			return v;
		} catch (err) {
			if (this.isBreakable(err)) {
				this.failure();
			}
			throw err;
		}
	}

	private broken(): boolean {
		if (this.state === CircuitState.Open) {
			if (this.expiresAt < Date.now()) {
				this.setState(CircuitState.HalfOpen);
				this.expiresAt = 0;
			} else {
				return true;
			}
		} else if (this.state === CircuitState.HalfOpen && this.requestCount >= this.successThreshold) {
			return true;
		}
		this.requestCount++;
		return false;
	}

	private success(): void {
		if (this.state !== CircuitState.Open) {
			this.successCount++;
			if (this.state === CircuitState.HalfOpen && this.successCount >= this.successThreshold) {
				this.setState(CircuitState.Closed);
			}
		}
	}

	private failure(): void {
		if (this.state === CircuitState.Closed) {
			this.failureCount++;
			if (this.failureCount >= this.errorThreshold) {
				this.setState(CircuitState.Open);
				this.setExpiresAt();
			}
		} else if (this.state === CircuitState.HalfOpen) {
			this.setState(CircuitState.Open);
			this.setExpiresAt();
		}
	}

	private setExpiresAt(): void {
		this.expiresAt = Date.now() + this.resetTimeout;
	}

	private setState(state: CircuitState): void {
		this.state = state;
		this.requestCount = 0;
		this.failureCount = 0;
		this.successCount = 0;
		this.emit('state', this.state);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private isBreakable(_: unknown): boolean {
		return true;
	}
}
