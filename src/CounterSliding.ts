import { ICounter } from './ICounter';

/** "Sliding Window" algorithm. */
export class CounterSliding implements ICounter {
	private prevData: Record<string, number> = {};
	private currData: Record<string, number> = {};
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
		const v = this.currData[key] || 0;
		this.currData[key] = v + 1;
	}

	public get(key: string): number {
		const prev = this.prevData[key] || 0;
		let curr = this.currData[key] || 0;
		if (prev) {
			const now = Date.now();
			const currKey = this.currKey(now);
			const remainder = this.size - (now - currKey);
			curr += Math.floor(prev * (remainder / this.size));
		}
		return curr;
	}

	public tidy(): void {
		const currKey = this.currKey(Date.now());
		const prevKey = currKey - this.size;
		if (prevKey >= this.key) {
			if (prevKey === this.key) {
				this.prevData = this.currData;
			} else {
				this.prevData = {};
			}
			this.currData = {};
			this.key = currKey;
		}
	}

	public reset(): void {
		this.prevData = {};
		this.currData = {};
	}
}
