import { promisify } from 'util';
import { CircuitBreaker } from './CircuitBreaker';
import { CircuitState } from './CircuitState';
import { CircuitError, CircuitBroken } from './CircuitError';

const sleep = promisify(setTimeout);

const resetTimeout = 100;

describe('exec', () => {
	const breaker = new CircuitBreaker({ errorThreshold: 2, resetTimeout, successThreshold: 2 });
	const fn = jest.fn();
	const v = 42;
	const e = new Error('Some error');

	it('should execute a function with circuit breaker logic', async () => {
		let state: CircuitState = CircuitState.Closed;
		breaker.on('state', (v: CircuitState) => {
			state = v;
		});

		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).resolves.toBe(v);
		expect(state).toBe(CircuitState.Closed);
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrowError(e);
		expect(state).toBe(CircuitState.Closed);
		await expect(breaker.exec(fn)).rejects.toThrowError(e);
		expect(state).toBe(CircuitState.Open);
		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrowError(CircuitBroken);

		await sleep(resetTimeout);

		await expect(breaker.exec(fn)).resolves.toBe(v);
		expect(state).toBe(CircuitState.HalfOpen);
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrowError(e);
		expect(state).toBe(CircuitState.Open);
		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrowError(CircuitBroken);

		await sleep(resetTimeout);

		await expect(breaker.exec(fn)).resolves.toBe(v);
		expect(state).toBe(CircuitState.HalfOpen);
		await expect(breaker.exec(fn)).resolves.toBe(v);
		expect(state).toBe(CircuitState.Closed);
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrowError(e);
		expect(state).toBe(CircuitState.Closed);
		await expect(breaker.exec(fn)).rejects.toThrowError(e);
		expect(state).toBe(CircuitState.Open);
		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrowError(CircuitBroken);

		await sleep(resetTimeout);

		await Promise.all([
			expect(breaker.exec(fn)).resolves.toBe(v),
			expect(breaker.exec(fn)).resolves.toBe(v),
			expect(breaker.exec(fn)).rejects.toThrowError(CircuitBroken)
		]);
		expect(state).toBe(CircuitState.Closed);
	});
});

describe('exec', () => {
	const isBreakable = (err: unknown): boolean => {
		return err instanceof CircuitError;
	};
	const breaker = new CircuitBreaker({ errorThreshold: 2, resetTimeout, successThreshold: 2, isBreakable });
	const fn = jest.fn();
	const v = 42;
	const e = new Error('Some error');
	const err = new CircuitError('Breakable error');

	it('should not count error if function throws error which is not breakable', async () => {
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrowError(e);
		await expect(breaker.exec(fn)).rejects.toThrowError(e);

		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).resolves.toBe(v);

		fn.mockRejectedValue(err);
		await expect(breaker.exec(fn)).rejects.toThrowError(err);
		await expect(breaker.exec(fn)).rejects.toThrowError(err);

		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrowError(CircuitBroken);
	});
});

describe('Breakable', () => {
	const breaker = new CircuitBreaker({ errorThreshold: 2, resetTimeout, successThreshold: 2 });
	const e = new Error('Some error');

	class T {
		private i = 0;

		@CircuitBreaker.Breakable(breaker)
		public test(x: number, y: number): Promise<number> {
			this.i++;
			return this.i === 1 ? Promise.resolve((this.i + x) * y) : Promise.reject(e);
		}
	}

	const t = new T();
	const x = 2;
	const y = 3;

	it('should decorate a class method with circuit breaker logic', async () => {
		await expect(t.test(x, y)).resolves.toBe(9);
		await expect(t.test(x, y)).rejects.toThrowError(e);
		await expect(t.test(x, y)).rejects.toThrowError(e);
		await expect(t.test(x, y)).rejects.toThrowError(CircuitBroken);
	});
});
