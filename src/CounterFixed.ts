import { ICounter } from './ICounter';

/** "Fixed Window" algorithm. */
export class CounterFixed implements ICounter {
	private data: Record<string, number> = {};
	private size: number;
	private key: number;

	constructor(size: number) {
		this.size = size;
		this.key = this.currKey(Date.now());
	}

	private currKey(now: number): number {
		return now - now % this.size;
	}

	public count(key: string): void {
		const v = this.data[key] || 0;
		this.data[key] = v + 1;
	}

	public get(key: string): number {
		return this.data[key] || 0;
	}

	public tidy(): void {
		const currKey = this.currKey(Date.now());
		if (currKey > this.key) {
			this.key = currKey;
			this.data = {};
		}
	}

	public reset(): void {
		this.data = {};
	}
}
