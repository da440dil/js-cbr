import { Circuit, CircuitOptions } from './Circuit';
import { CircuitState } from './CircuitState';

beforeAll(() => {
	jest.useFakeTimers();
});

afterAll(() => {
	jest.useRealTimers();
	jest.clearAllTimers();
});

const timestamp = 1612126800142;
beforeEach(() => {
	jest.setSystemTime(timestamp);
});

const windowSize = 10000;
const resetTimeout = 1000;
const successThreshold = 2;

const tests: ({ ctor: (params: CircuitOptions) => Circuit; } & Pick<CircuitOptions, 'errorThreshold' | 'volumeThreshold'>)[] = [
	{ ctor: Circuit.fixedWindow, errorThreshold: 2, volumeThreshold: 1 },
	{ ctor: Circuit.fixedWindow, errorThreshold: 0.5, volumeThreshold: 3 },
	{ ctor: Circuit.slidingWindow, errorThreshold: 2, volumeThreshold: 1 },
	{ ctor: Circuit.slidingWindow, errorThreshold: 0.5, volumeThreshold: 3 }
];

for (const { ctor, errorThreshold, volumeThreshold } of tests) {
	describe(`${ctor.name} with { errorThreshold: ${errorThreshold}, volumeThreshold: ${volumeThreshold} }`, () => {
		let circuit: Circuit;
		beforeAll(() => {
			circuit = ctor({ windowSize, errorThreshold, volumeThreshold, resetTimeout, successThreshold });
		});
		afterAll(() => {
			circuit.destroy();
		});
		it('should switch state', () => {
			const arr: CircuitState[] = [];
			circuit.on('state', (v) => { arr.push(v); });

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			circuit.success();
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(1);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(0);
			expect(circuit.ttl()).toBe(0);
			expect(arr).toEqual([]);

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(1);
			expect(circuit.errorCount()).toBe(0);
			circuit.success();
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(2);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(0);
			expect(circuit.ttl()).toBe(0);
			expect(arr).toEqual([]);

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(2);
			expect(circuit.errorCount()).toBe(0);
			circuit.error();
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(2);
			expect(circuit.errorCount()).toBe(1);
			expect(circuit.expiry()).toBe(0);
			expect(circuit.ttl()).toBe(0);
			expect(arr).toEqual([]);

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(2);
			expect(circuit.errorCount()).toBe(1);
			circuit.error();
			expect(circuit.state()).toBe(CircuitState.Open);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(timestamp + resetTimeout);
			expect(circuit.ttl()).toBe(resetTimeout);
			expect(arr).toEqual([CircuitState.Open]);

			expect(circuit.request()).toBe(false);
			expect(circuit.state()).toBe(CircuitState.Open);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(timestamp + resetTimeout);
			expect(circuit.ttl()).toBe(resetTimeout);

			//----------//

			jest.advanceTimersByTime(resetTimeout);

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.HalfOpen);
			expect(circuit.requestCount()).toBe(1);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen]);
			circuit.error();
			expect(circuit.state()).toBe(CircuitState.Open);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(timestamp + resetTimeout * 2);
			expect(circuit.ttl()).toBe(resetTimeout);
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen, CircuitState.Open]);

			expect(circuit.request()).toBe(false);
			expect(circuit.state()).toBe(CircuitState.Open);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(timestamp + resetTimeout * 2);
			expect(circuit.ttl()).toBe(resetTimeout);

			circuit.success();
			circuit.error();
			expect(circuit.state()).toBe(CircuitState.Open);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(timestamp + resetTimeout * 2);
			expect(circuit.ttl()).toBe(resetTimeout);

			//----------//

			jest.advanceTimersByTime(resetTimeout);

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.HalfOpen);
			expect(circuit.requestCount()).toBe(1);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen, CircuitState.Open, CircuitState.HalfOpen]);
			circuit.success();
			expect(circuit.state()).toBe(CircuitState.HalfOpen);
			expect(circuit.requestCount()).toBe(1);
			expect(circuit.successCount()).toBe(1);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(0);
			expect(circuit.ttl()).toBe(0);

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.HalfOpen);
			expect(circuit.requestCount()).toBe(2);
			expect(circuit.successCount()).toBe(1);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.request()).toBe(false);
			circuit.success();
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(0);
			expect(circuit.ttl()).toBe(0);
			expect(arr).toEqual([CircuitState.Open, CircuitState.HalfOpen, CircuitState.Open, CircuitState.HalfOpen, CircuitState.Closed]);

			//----------//

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
			circuit.success();
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(1);
			expect(circuit.errorCount()).toBe(0);
			expect(circuit.expiry()).toBe(0);
			expect(circuit.ttl()).toBe(0);

			expect(circuit.request()).toBe(true);
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(1);
			expect(circuit.errorCount()).toBe(0);
			circuit.error();
			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(1);
			expect(circuit.errorCount()).toBe(1);
			expect(circuit.expiry()).toBe(0);
			expect(circuit.ttl()).toBe(0);

			jest.advanceTimersByTime(windowSize);

			expect(circuit.state()).toBe(CircuitState.Closed);
			expect(circuit.requestCount()).toBe(0);
			expect(circuit.successCount()).toBe(0);
			expect(circuit.errorCount()).toBe(0);
		});
	});
}
