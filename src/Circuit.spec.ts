import { Circuit, CircuitParams } from './Circuit';
import { CircuitState } from './CircuitState';

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

const windowSize = 10000;
const resetTimeout = 1000;
const successThreshold = 2;

const tests: ({ ctor: (params: CircuitParams) => Circuit; } & Pick<CircuitParams, 'errorThreshold' | 'volumeThreshold'>)[] = [
	{ ctor: Circuit.fixed, errorThreshold: 2, volumeThreshold: 1 },
	{ ctor: Circuit.fixed, errorThreshold: 0.5, volumeThreshold: 3 },
	{ ctor: Circuit.sliding, errorThreshold: 2, volumeThreshold: 1 },
	{ ctor: Circuit.sliding, errorThreshold: 0.5, volumeThreshold: 3 }
];

for (const { ctor, errorThreshold, volumeThreshold } of tests) {
	describe(`${ctor.name} with { errorThreshold: ${errorThreshold}, volumeThreshold: ${volumeThreshold} }`, () => {
		it('should switch state', () => {
			const circuit = ctor({ windowSize, errorThreshold, volumeThreshold, resetTimeout, successThreshold });
			const arr: CircuitState[] = [];
			circuit.on('state', (v) => { arr.push(v); });

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 0, errorCount: 0
			});
			circuit.success();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 1, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(0);
			expect(arr).toEqual([]);

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 1, errorCount: 0
			});
			circuit.success();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 2, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(0);
			expect(arr).toEqual([]);

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 2, errorCount: 0
			});
			circuit.error();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 2, errorCount: 1
			});
			expect(circuit.maxAge()).toBe(0);
			expect(arr).toEqual([]);

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 2, errorCount: 1
			});
			circuit.error();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Open, requestCount: 0, successCount: 0, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(1);
			expect(arr).toEqual([CircuitState.Open]);

			expect(circuit.request()).toBe(false);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Open, requestCount: 0, successCount: 0, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(1);

			//----------//

			jest.advanceTimersByTime(resetTimeout);

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.HalfOpen, requestCount: 1, successCount: 0, errorCount: 0
			});
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen]);
			circuit.error();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Open, requestCount: 0, successCount: 0, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(1);
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen, CircuitState.Open]);

			expect(circuit.request()).toBe(false);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Open, requestCount: 0, successCount: 0, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(1);

			circuit.success();
			circuit.error();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Open, requestCount: 0, successCount: 0, errorCount: 0
			});

			//----------//

			jest.advanceTimersByTime(resetTimeout);

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.HalfOpen, requestCount: 1, successCount: 0, errorCount: 0
			});
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen, CircuitState.Open, CircuitState.HalfOpen]);
			circuit.success();
			expect(circuit.stats()).toEqual({
				state: CircuitState.HalfOpen, requestCount: 1, successCount: 1, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(0);

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.HalfOpen, requestCount: 2, successCount: 1, errorCount: 0
			});
			expect(circuit.request()).toBe(false);
			circuit.success();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 0, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(0);
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen, CircuitState.Open, CircuitState.HalfOpen, CircuitState.Closed]);

			//----------//

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 0, errorCount: 0
			});
			circuit.success();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 1, errorCount: 0
			});
			expect(circuit.maxAge()).toBe(0);

			expect(circuit.request()).toBe(true);
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 1, errorCount: 0
			});
			circuit.error();
			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 1, errorCount: 1
			});
			expect(circuit.maxAge()).toBe(0);

			jest.advanceTimersByTime(windowSize);

			expect(circuit.stats()).toEqual({
				state: CircuitState.Closed, requestCount: 0, successCount: 0, errorCount: 0
			});
		});
	});
}
