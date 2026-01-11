import { ICounter } from './ICounter';

/** "Fixed Window" algorithm. */
export class CounterFixed implements ICounter {
	private data: Record<string, number> = {};
	private size: number;
	private timer?: NodeJS.Timeout;

	constructor(size: number) {
		this.size = size;
	}

	public start(): void {
		if (!this.timer) {
			this.timer = setTimeout(() => {
				this.data = {};
				if (this.timer) {
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
		const v = this.data[key] || 0;
		this.data[key] = v + 1;
	}

	public get(key: string): number {
		return this.data[key] || 0;
	}

	public reset(): void {
		this.data = {};
	}
}
