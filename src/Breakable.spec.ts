import { Circuit } from './Circuit';
import { CircuitError } from './CircuitError';
import { Breakable } from './Breakable';

describe('Breakable', () => {
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

	const circuit = Circuit.fixed({ windowSize: 1000, errorThreshold: 2, resetTimeout: 100 });
	const e = new Error('Some error');

	class T {
		private i = 0;

		@Breakable(circuit)
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
		await expect(t.test(x, y)).rejects.toThrow(e);
		await expect(t.test(x, y)).rejects.toThrow(e);
		await expect(t.test(x, y)).rejects.toThrow(CircuitError);
	});
});
