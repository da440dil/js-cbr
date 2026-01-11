import { Circuit } from './Circuit';
import { Breaker } from './Breaker';
import { CircuitError } from './CircuitError';

const windowSize = 1000;
const errorThreshold = 2;
const resetTimeout = 100;
const successThreshold = 2;

describe('Breaker', () => {
	beforeAll(() => {
		jest.useFakeTimers();
		jest.setSystemTime(1612126800142);
	});

	afterAll(() => {
		jest.useRealTimers();
		jest.clearAllTimers();
	});

	const fn = jest.fn();
	const v = 42;
	const e = new Error('Some error');

	describe('with default', () => {
		let circuit: Circuit;
		let breaker: Breaker;
		beforeAll(() => {
			circuit = Circuit.fixedWindow({ windowSize, errorThreshold, resetTimeout, successThreshold });
			breaker = new Breaker(circuit);
		});
		afterAll(() => {
			circuit.destroy();
		});

		it('should execute function with circuit breaker logic', async () => {
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).resolves.toBe(v);
			fn.mockRejectedValue(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await expect(breaker.exec(fn)).resolves.toBe(v);
			fn.mockRejectedValue(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await expect(breaker.exec(fn)).resolves.toBe(v);
			await expect(breaker.exec(fn)).resolves.toBe(v);
			fn.mockRejectedValue(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await Promise.all([
				expect(breaker.exec(fn)).resolves.toBe(v),
				expect(breaker.exec(fn)).resolves.toBe(v),
				expect(breaker.exec(fn)).rejects.toThrow('Request rate limit exceeded')
			]);
		});
	});

	describe('with timeout', () => {
		let circuit: Circuit;
		let breaker: Breaker;
		beforeAll(() => {
			circuit = Circuit.fixedWindow({ windowSize, errorThreshold, resetTimeout, successThreshold });
			breaker = new Breaker(circuit, { timeout: resetTimeout });
		});
		afterAll(() => {
			circuit.destroy();
		});

		it('should throw if request timeout exceeded', async () => {
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).resolves.toBe(v);
			fn.mockRejectedValue(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await expect(breaker.exec(fn)).resolves.toBe(v);
			fn.mockImplementation((signal: AbortSignal) => new Promise<void>((resolve) => {
				signal.addEventListener('abort', () => resolve());
				jest.advanceTimersByTime(resetTimeout);
			}));
			await expect(breaker.exec(fn)).rejects.toThrow('Request timeout exceeded');
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await expect(breaker.exec(fn)).resolves.toBe(v);
			await expect(breaker.exec(fn)).resolves.toBe(v);
			fn.mockRejectedValue(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			await expect(breaker.exec(fn)).rejects.toThrow(e);
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await Promise.all([
				expect(breaker.exec(fn)).resolves.toBe(v),
				expect(breaker.exec(fn)).resolves.toBe(v),
				expect(breaker.exec(fn)).rejects.toThrow('Request rate limit exceeded')
			]);
		});
	});

	describe('with signal', () => {
		let circuit: Circuit;
		let breaker: Breaker;
		beforeAll(() => {
			circuit = Circuit.fixedWindow({ windowSize, errorThreshold, resetTimeout, successThreshold });
			breaker = new Breaker(circuit);
		});
		afterAll(() => {
			circuit.destroy();
		});

		it('should throw if signal aborted', async () => {
			const controller = new AbortController();
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn, controller.signal)).resolves.toBe(v);
			fn.mockRejectedValue(e);
			await expect(breaker.exec(fn, controller.signal)).rejects.toThrow(e);
			await expect(breaker.exec(fn, controller.signal)).rejects.toThrow(e);
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn, controller.signal)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await expect(breaker.exec(fn, controller.signal)).resolves.toBe(v);
			fn.mockImplementation((signal: AbortSignal) => new Promise<void>((resolve) => {
				signal.addEventListener('abort', () => resolve());
				controller.abort(new Error('Aborted'));
				jest.advanceTimersByTime(resetTimeout);
			}));
			await expect(breaker.exec(fn, controller.signal)).rejects.toThrow('Aborted');
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn, controller.signal)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);
			const controller2 = new AbortController();

			await expect(breaker.exec(fn, controller2.signal)).resolves.toBe(v);
			await expect(breaker.exec(fn, controller2.signal)).resolves.toBe(v);
			fn.mockRejectedValue(e);
			await expect(breaker.exec(fn, controller2.signal)).rejects.toThrow(e);
			await expect(breaker.exec(fn, controller2.signal)).rejects.toThrow(e);
			fn.mockResolvedValue(v);
			await expect(breaker.exec(fn, controller2.signal)).rejects.toThrow('Circuit broken');

			jest.advanceTimersByTime(resetTimeout);

			await Promise.all([
				expect(breaker.exec(fn, controller2.signal)).resolves.toBe(v),
				expect(breaker.exec(fn, controller2.signal)).resolves.toBe(v),
				expect(breaker.exec(fn, controller2.signal)).rejects.toThrow('Request rate limit exceeded')
			]);
		});
	});
});

describe('with override isBreakable', () => {
	class BreakerType extends Breaker {
		public override isBreakable(err: unknown): boolean {
			return err instanceof TypeError;
		}
	}

	const circuit = Circuit.fixedWindow({ windowSize: 1000, errorThreshold: 2, resetTimeout, successThreshold: 2 });
	const breaker = new BreakerType(circuit);
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

describe('with isBreakable', () => {
	const circuit = Circuit.fixedWindow({ windowSize: 1000, errorThreshold: 2, resetTimeout, successThreshold: 2 });
	const isBreakable = (err: unknown): boolean => err instanceof TypeError;
	const breaker = new Breaker(circuit, { isBreakable });
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
