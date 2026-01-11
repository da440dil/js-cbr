import { EventEmitter } from 'node:events';
import { ICounter } from './ICounter';
import { CounterFixed } from './CounterFixed';
import { CounterSliding } from './CounterSliding';
import { CircuitState } from './CircuitState';
import { Threshold, threshold } from './Threshold';

const request = 'r';
const success = 's';
const error = 'e';

export class Circuit extends EventEmitter<{ state: [CircuitState]; }> {
	/** Create circuit which uses "Fixed Window" algorithm to store counters. */
	public static fixedWindow({ windowSize = 30000, ...rest }: CircuitOptions = {}): Circuit {
		const counter = new CounterFixed(windowSize);
		counter.start();
		return new Circuit({ ...rest, counter });
	}
	/** Create circuit which uses "Sliding Window" algorithm to store counters. */
	public static slidingWindow({ windowSize = 30000, ...rest }: CircuitOptions = {}): Circuit {
		const counter = new CounterSliding(windowSize);
		counter.start();
		return new Circuit({ ...rest, counter });
	}

	private circuitState: CircuitState;
	public readonly errorThreshold: number;
	public readonly volumeThreshold: number;
	public readonly resetTimeout: number;
	public readonly successThreshold: number;
	private counter: ICounter;
	private threshold: Threshold;
	private expireAt = 0;
	private timer?: NodeJS.Timeout;

	constructor({
		state = CircuitState.Closed, errorThreshold = 1, volumeThreshold = 1,
		resetTimeout = 30000, successThreshold = 1, counter
	}: Omit<CircuitOptions, 'windowSize'> & { counter: ICounter; }) {
		super();
		this.circuitState = state;
		this.errorThreshold = errorThreshold;
		this.volumeThreshold = volumeThreshold;
		this.resetTimeout = resetTimeout;
		this.successThreshold = successThreshold;
		this.counter = counter;
		this.threshold = threshold(errorThreshold);
		if (state === CircuitState.Open) {
			this.open();
		}
	}

	/**
	 * Increments request counter if circuit state is "HalfOpen" and number of requests is not greater than `successThreshold`.
	 * 
	 * Returns `false` if circuit is "broken": circuit state is "Open" or "HalfOpen" +
	 * number of requests is greater than `successThreshold`.
	 */
	public request(): boolean {
		if (this.circuitState === CircuitState.Open) {
			return false;
		} else if (this.circuitState === CircuitState.HalfOpen) {
			if (this.counter.get(request) >= this.successThreshold) {
				return false;
			}
			this.counter.incr(request);
		}
		return true;
	}

	/** Increments success request counter if circuit state is "Closed" or "HalfOpen". */
	public success(): void {
		if (this.circuitState !== CircuitState.Open) {
			this.counter.incr(success);
			if (this.circuitState === CircuitState.HalfOpen) {
				if (this.counter.get(success) >= this.successThreshold) {
					this.setState(CircuitState.Closed);
				}
			}
		}
	}

	/** Increments error counter if circuit state is "Closed". */
	public error(): void {
		if (this.circuitState === CircuitState.Closed) {
			this.counter.incr(error);
			if (this.threshold(this.errorThreshold, this.volumeThreshold, this.counter.get(success), this.counter.get(error))) {
				this.open();
			}
		} else if (this.circuitState === CircuitState.HalfOpen) {
			this.open();
		}
	}

	private open(): void {
		this.setState(CircuitState.Open);
		if (!this.timer) {
			this.expireAt = Date.now() + this.resetTimeout;
			this.timer = setTimeout(() => {
				this.expireAt = 0;
				this.timer = undefined;
				this.setState(CircuitState.HalfOpen);
			}, this.resetTimeout);
		}
	}

	private setState(state: CircuitState): void {
		this.circuitState = state;
		this.counter.reset();
		this.emit('state', this.circuitState);
	}

	/** Destroys circuit: stops internal timers. */
	public destroy(): void {
		this.counter.stop();
		clearTimeout(this.timer);
		this.expireAt = 0;
		this.timer = undefined;
	}

	/** Circuit state: "Closed", "Open", "HalfOpen". */
	public state(): CircuitState {
		return this.circuitState;
	}

	/** Request counter. Increments at `Circuit.request()` method if circuit state is "HalfOpen". */
	public requestCount(): number {
		return this.counter.get(request);
	}

	/** Success request counter. Increments at `Circuit.success()` method if circuit state is "Closed" or "HalfOpen". */
	public successCount(): number {
		return this.counter.get(success);
	}

	/** Error counter. Increments at `Circuit.error()` method if circuit state is "Closed". */
	public errorCount(): number {
		return this.counter.get(error);
	}

	/** Timestamp upon reaching which the circuit state will switch from "Open" to "HalfOpen". */
	public expiry(): number {
		return this.expireAt;
	}

	/** Time in milliseconds during which the circuit state will not switch from "Open" to "HalfOpen". */
	public ttl(): number {
		const diff = this.expireAt - Date.now();
		return diff > 0 ? diff : 0;
	}
}

export type CircuitOptions = {
	/** Initial circuit state. Default: "Closed". */
	state?: CircuitState;
	/**
	 * The size of the counter window for the total number of requests, successful requests, and errors,
	 * in milliseconds. Default: 30 seconds.
	 */
	windowSize?: number;
	/**
	 * The number of errors within specified `windowSize`,
	 * upon reaching which the circuit state switches from "Closed" to "Open". Default: 1.
	 * 
	 * If the value is less than 1, then this is the error threshold in percent:
	 * calculated based on the ratio of the number of errors to the total number of requests.
	 */
	errorThreshold?: number;
	/**
	 * The minimum number of requests within specified `windowSize`,
	 * upon reaching which the circuit state switches from "Closed" to "Open".
	 * Default: 1.
	 * 
	 * It doesn't matter how many errors there were,
	 * until a certain number of requests were made the circuit state will not switch from "Closed" to "Open".
	 */
	volumeThreshold?: number;
	/**
	 * The period of time in milliseconds, when passed the circuit state switches from "Open" to "HalfOpen".
	 * Default: 30 seconds.
	 */
	resetTimeout?: number;
	/**
	 * The number of success requests within specified `windowSize`,
	 * upon reaching which the circuit state switches from "HalfOpen" to "Closed".
	 * Default: 1.
	 */
	successThreshold?: number;
};
