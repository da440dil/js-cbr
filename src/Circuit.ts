import { EventEmitter } from 'node:events';
import { ICounter } from './ICounter';
import { CounterFixed } from './CounterFixed';
import { CounterSliding } from './CounterSliding';
import { CircuitState } from './CircuitState';
import { CircuitStats } from './CircuitStats';

export class Circuit extends EventEmitter<{ state: [CircuitState]; }> {
	public static fixed({ windowSize, ...rest }: CircuitParams): Circuit {
		return new Circuit({ ...rest, counter: new CounterFixed(windowSize) });
	}

	public static sliding({ windowSize, ...rest }: CircuitParams): Circuit {
		return new Circuit({ ...rest, counter: new CounterSliding(windowSize) });
	}

	private state: CircuitState;
	public expiry = 0;
	private errorThreshold: number;
	private volumeThreshold: number;
	private resetTimeout: number;
	private successThreshold: number;
	private counter: ICounter;
	private threshold: Threshold;

	constructor({
		state = CircuitState.Closed, errorThreshold = 1, volumeThreshold = 1, resetTimeout, successThreshold = 1, counter
	}: Omit<CircuitParams, 'windowSize'> & { counter: ICounter; }) {
		super();
		this.state = state;
		this.errorThreshold = errorThreshold;
		this.volumeThreshold = volumeThreshold;
		this.resetTimeout = resetTimeout;
		this.successThreshold = successThreshold;
		this.counter = counter;
		this.threshold = errorThreshold < 1 && errorThreshold % 1 ? thresholdPercent : threshold;
	}

	/**
	 * Increments request counter if circuit state is "HalfOpen" and number of requests is not greater than `successThreshold`.
	 * 
	 * Returns `false` if circuit is "broken": circuit state is "Open" or "HalfOpen" +
	 * number of requests is greater than `successThreshold`.
	 */
	public request(): boolean {
		if (this.state === CircuitState.Open) {
			if (this.expiry > Date.now()) {
				return false;
			}
			this.setState(CircuitState.HalfOpen);
			this.expiry = 0;
			this.counter.count(request);
		} else if (this.state === CircuitState.HalfOpen) {
			this.counter.tidy();
			if (this.counter.get(request) >= this.successThreshold) {
				return false;
			}
			this.counter.count(request);
		}
		return true;
	}

	/** Increments success request counter if circuit state is "Closed" or "HalfOpen". */
	public success(): void {
		if (this.state !== CircuitState.Open) {
			this.counter.tidy();
			this.counter.count(success);
			if (this.state === CircuitState.HalfOpen) {
				if (this.counter.get(success) >= this.successThreshold) {
					this.setState(CircuitState.Closed);
				}
			}
		}
	}

	/** Increments error counter if circuit state is "Closed". */
	public error(): void {
		if (this.state === CircuitState.Closed) {
			this.counter.tidy();
			this.counter.count(error);
			if (this.threshold(this.errorThreshold, this.volumeThreshold, this.counter.get(success), this.counter.get(error))) {
				this.open();
			}
		} else if (this.state === CircuitState.HalfOpen) {
			this.open();
		}
	}

	private open(): void {
		this.setState(CircuitState.Open);
		this.expiry = Date.now() + this.resetTimeout;
	}

	private setState(state: CircuitState): void {
		this.state = state;
		this.counter.reset();
		this.emit('state', this.state);
	}

	/** Current stats: state and counter values. */
	public stats(): CircuitStats {
		this.counter.tidy();
		return {
			state: this.state,
			requestCount: this.counter.get(request),
			successCount: this.counter.get(success),
			errorCount: this.counter.get(error)
		};
	}

	/**
	 * Time in seconds during which the circuit state will not switch:
	 * `Cache-Control` header `max-age` value or `Retry-After` header value.
	 */
	public maxAge(): number {
		const diff = this.expiry - Date.now();
		return diff > 0 ? Math.ceil(diff / 1000) : 0;
	}
}

export type CircuitParams = {
	/** Initial circuit state. Default "Closed". */
	state?: CircuitState;
	/** The size of the counter window for the total number of requests, successful requests, and errors, in milliseconds. */
	windowSize: number;
	/**
	 * The number of errors within specified `windowSize`,
	 * upon reaching which the circuit state switches from "Closed" to "Open". Default 1.
	 * 
	 * If the value is less than 1, then this is the error threshold in percent:
	 * calculated based on the ratio of the number of errors to the total number of requests.
	 */
	errorThreshold?: number;
	/**
	 * The minimum number of requests within specified `windowSize`,
	 * upon reaching which the circuit state switches from "Closed" to "Open".
	 * Default 1.
	 * 
	 * It doesn't matter how many errors there were,
	 * until a certain number of requests were made the circuit state will not switch from "Closed" to "Open".
	 */
	volumeThreshold?: number;
	/**
	 * The period of time in milliseconds, when passed the circuit state switches from "Open" to "HalfOpen".
	 */
	resetTimeout: number;
	/**
	 * The number of success requests within specified `windowSize`,
	 * upon reaching which the circuit state switches from "HalfOpen" to "Closed".
	 * Default 1.
	 */
	successThreshold?: number;
};

const request = 'r';
const success = 's';
const error = 'e';

type Threshold = (errorThreshold: number, volumeThreshold: number, successCount: number, errorCount: number) => boolean;

const threshold: Threshold = (errorThreshold, volumeThreshold, successCount, errorCount) => {
	const total = successCount + errorCount;
	return total >= volumeThreshold && errorCount >= errorThreshold;
};

const thresholdPercent: Threshold = (errorThreshold, volumeThreshold, successCount, errorCount) => {
	const total = successCount + errorCount;
	return total >= volumeThreshold && errorCount / total >= errorThreshold;
};
