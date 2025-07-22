import { Circuit } from './Circuit';
import { CircuitBreaker } from './CircuitBreaker';
import { CircuitError } from './CircuitError';

const resetTimeout = 100;

describe('exec', () => {
	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
		jest.clearAllTimers();
	});

	const timestamp = 0;
	beforeEach(() => {
		jest.setSystemTime(timestamp);
	});

	const circuit = Circuit.fixed({ windowSize: 1000, errorThreshold: 2, resetTimeout, successThreshold: 2 });
	const breaker = new CircuitBreaker(circuit);
	const fn = jest.fn();
	const v = 42;
	const e = new Error('Some error');

	it('should execute a function with circuit breaker logic', async () => {
		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).resolves.toBe(v);
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrow(e);
		await expect(breaker.exec(fn)).rejects.toThrow(e);
		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrow(CircuitError);

		jest.advanceTimersByTime(resetTimeout);

		await expect(breaker.exec(fn)).resolves.toBe(v);
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrow(e);
		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrow(CircuitError);

		jest.advanceTimersByTime(resetTimeout);

		await expect(breaker.exec(fn)).resolves.toBe(v);
		await expect(breaker.exec(fn)).resolves.toBe(v);
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrow(e);
		await expect(breaker.exec(fn)).rejects.toThrow(e);
		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrow(CircuitError);

		jest.advanceTimersByTime(resetTimeout);

		await Promise.all([
			expect(breaker.exec(fn)).resolves.toBe(v),
			expect(breaker.exec(fn)).resolves.toBe(v),
			expect(breaker.exec(fn)).rejects.toThrow(CircuitError)
		]);
	});
});

describe('exec', () => {
	class CircuitBreakerType extends CircuitBreaker {
		public override isBreakable(err: unknown): boolean {
			return err instanceof TypeError;
		}
	}

	const circuit = Circuit.fixed({ windowSize: 1000, errorThreshold: 2, resetTimeout, successThreshold: 2 });
	const breaker = new CircuitBreakerType(circuit);
	const fn = jest.fn();
	const v = 42;
	const e = new Error('Some error');
	const err = new TypeError('Breakable error');

	it('should not count error if function throws error which is not breakable', async () => {
		fn.mockRejectedValue(e);
		await expect(breaker.exec(fn)).rejects.toThrow(e);
		await expect(breaker.exec(fn)).rejects.toThrow(e);

		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).resolves.toBe(v);

		fn.mockRejectedValue(err);
		await expect(breaker.exec(fn)).rejects.toThrow(err);
		await expect(breaker.exec(fn)).rejects.toThrow(err);

		fn.mockResolvedValue(v);
		await expect(breaker.exec(fn)).rejects.toThrow(CircuitError);
	});
});
