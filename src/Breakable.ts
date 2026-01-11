import { Circuit } from './Circuit';
import { Breaker } from './Breaker';

/** Decorate a class method with circuit breaker logic. */
export const Breakable = <This, Args extends unknown[], Return>(circuit: Circuit) => {
	const breaker = new Breaker(circuit);
	return (
		fn: (this: This, ...args: Args) => Promise<Return>,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_ctx: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>
	) => {
		return function breakable(this: This, ...args: Args): Promise<Return> {
			return breaker.exec(() => fn.apply(this, args));
		};
	};
};
