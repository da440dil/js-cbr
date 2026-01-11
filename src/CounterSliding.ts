import { ICounter } from './ICounter';

/** "Sliding Window" algorithm. */
export class CounterSliding implements ICounter {
	private prevData: Record<string, number> = {};
	private currData: Record<string, number> = {};
	private size: number;
	private time = 0;
	private timer?: NodeJS.Timeout;

	constructor(size: number) {
		this.size = size;
	}

	public start(): void {
		if (!this.timer) {
			this.time = Date.now();
			this.timer = setTimeout(() => {
				this.prevData = this.currData;
				this.currData = {};
				if (this.timer) {
					this.time = Date.now();
					this.timer.refresh();
				}
			}, this.size);
			this.timer.unref();
		}
	}

	public stop(): void {
		clearTimeout(this.timer);
		this.timer = undefined;
	}

	public incr(key: string): void {
		const v = this.currData[key] || 0;
		this.currData[key] = v + 1;
	}

	public get(key: string): number {
		const prev = this.prevData[key] || 0;
		let curr = this.currData[key] || 0;
		if (prev) {
			const rest = this.size - (Date.now() - this.time);
			if (rest > 0) {
				curr += Math.floor(prev * (rest / this.size));
			}
		}
		return curr;
	}

	public reset(): void {
		this.prevData = {};
		this.currData = {};
	}
}
