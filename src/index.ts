import { Circuit, CircuitOptions } from './Circuit';
export type { Circuit, CircuitOptions };

export const fixedWindow = Circuit.fixedWindow;
export const slidingWindow = Circuit.slidingWindow;
export default { fixedWindow, slidingWindow };

export { CircuitState } from './CircuitState';
export { CircuitError } from './CircuitError';
export { Breaker, type BreakerOptions, type ExecFunction } from './Breaker';
export { Breakable } from './Breakable';
