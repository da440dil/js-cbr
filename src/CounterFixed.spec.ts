import { CounterFixed } from './CounterFixed';

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

const size = 1000;
const key1 = 'key1';
const key2 = 'key2';

it('should count', () => {
	const counter = new CounterFixed(size);

	expect(counter.get(key1)).toBe(0);
	expect(counter.get(key2)).toBe(0);

	counter.count(key1);
	expect(counter.get(key1)).toBe(1);
	expect(counter.get(key2)).toBe(0);

	counter.count(key1);
	expect(counter.get(key1)).toBe(2);
	expect(counter.get(key2)).toBe(0);

	counter.count(key2);
	expect(counter.get(key1)).toBe(2);
	expect(counter.get(key2)).toBe(1);

	counter.reset();
	expect(counter.get(key1)).toBe(0);
	expect(counter.get(key2)).toBe(0);

	counter.count(key1);
	counter.count(key2);
	counter.count(key2);
	expect(counter.get(key1)).toBe(1);
	expect(counter.get(key2)).toBe(2);

	jest.advanceTimersByTime(size - 1);
	counter.tidy();
	expect(counter.get(key1)).toBe(1);
	expect(counter.get(key2)).toBe(2);

	jest.advanceTimersByTime(1);
	counter.tidy();
	expect(counter.get(key1)).toBe(0);
	expect(counter.get(key2)).toBe(0);
});
