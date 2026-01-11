import { CounterFixed } from './CounterFixed';

beforeAll(() => {
	jest.useFakeTimers();
	jest.setSystemTime(1612126800142);
});
afterAll(() => {
	jest.useRealTimers();
	jest.clearAllTimers();
});

const size = 1000;
const counter = new CounterFixed(size);

beforeAll(() => {
	counter.start();
});
afterAll(() => {
	counter.stop();
});

const key1 = 'key1';
const key2 = 'key2';

it('should count', () => {
	expect(counter.get(key1)).toBe(0);
	expect(counter.get(key2)).toBe(0);

	counter.incr(key1);
	counter.incr(key1);
	counter.incr(key2);
	expect(counter.get(key1)).toBe(2);
	expect(counter.get(key2)).toBe(1);

	jest.advanceTimersByTime(size - 1);
	expect(counter.get(key1)).toBe(2);
	expect(counter.get(key2)).toBe(1);

	jest.advanceTimersByTime(1);
	expect(counter.get(key1)).toBe(0);
	expect(counter.get(key2)).toBe(0);

	counter.incr(key1);
	counter.incr(key2);
	counter.incr(key2);
	expect(counter.get(key1)).toBe(1);
	expect(counter.get(key2)).toBe(2);

	jest.advanceTimersByTime(size - 1);
	expect(counter.get(key1)).toBe(1);
	expect(counter.get(key2)).toBe(2);

	jest.advanceTimersByTime(1);
	expect(counter.get(key1)).toBe(0);
	expect(counter.get(key2)).toBe(0);

	counter.incr(key1);
	counter.incr(key1);
	counter.incr(key2);
	expect(counter.get(key1)).toBe(2);
	expect(counter.get(key2)).toBe(1);

	counter.reset();
	expect(counter.get(key1)).toBe(0);
	expect(counter.get(key2)).toBe(0);
});
