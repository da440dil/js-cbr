# @da440dil/cbr

![GitHub Actions](https://github.com/da440dil/js-cbr/actions/workflows/ci.yml/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/da440dil/js-cbr/badge.svg?branch=main)](https://coveralls.io/github/da440dil/js-cbr?branch=main)

[Circuit breaker](https://martinfowler.com/bliki/CircuitBreaker.html).

[Example](./examples/decorator.ts) decorator ([typescript](https://www.typescriptlang.org/) [version](https://github.com/microsoft/TypeScript/releases/tag/v5.0.2) >= 5):
```typescript
import { promisify } from 'util';
import http from 'http';
import { CircuitBreaker } from '@da440dil/cbr';

// Create the circuit breaker which switches from "Closed" to "Open" state on first error,
// from "Open" to "HalfOpen" state after 100ms, from "HalfOpen" to "Closed" state on first success.
const breaker = new CircuitBreaker({ errorThreshold: 1, resetTimeout: 100, successThreshold: 1 });

class Client {
	private url = 'http://localhost:3000';
	// Decorate the class method with circuit breaker logic.
	@CircuitBreaker.Breakable(breaker)
	public get(): Promise<string> {
		return new Promise((resolve, reject) => {
			const req = http.get(this.url, (res) => {
				if (res.statusCode !== 200) {
					res.resume();
					return reject(new Error(`Failed with statusCode ${String(res.statusCode)}`));
				}
				let data = '';
				res.on('data', (chunk) => { data += chunk; });
				res.on('end', () => { resolve(data); });
			});
			req.on('error', reject);
		});
	}
}
const client = new Client();
const get = async () => {
	try {
		const data = await client.get();
		console.log(`DATA: ${data}`);
	} catch (err) {
		console.log(err instanceof Error ? `ERROR: ${(err).message}` : err);
	}
};

let x = 0;
const server = http.createServer((_, res) => {
	const statusCode = x > 2 || x % 2 ? 418 : 200; // { 0 => 200, 1 => 418, 2 => 200, ... => 418 }
	res.writeHead(statusCode).end(`{ x: ${x} }`);
	x++;
});
server.listen(3000);

async function main() {
	for (let i = 0; i < 3; i++) {
		await get();
	}
	await promisify(setTimeout)(100);
	await get();
	// Output:
	// DATA: { x: 0 }
	// ERROR: Failed with statusCode 418
	// ERROR: Circuit broken
	// DATA: { x: 2 }
}

main().then(() => { process.exit(0); }).catch((err) => { console.error(err); process.exit(1); });
```
```
npm run file examples/decorator.ts
```

[Example](./examples/function.ts) function:
```typescript
import { promisify } from 'util';
import http from 'http';
import { CircuitBreaker } from '@da440dil/cbr';

class Client {
	// Create the circuit breaker which switches from "Closed" to "Open" state on first error,
	// from "Open" to "HalfOpen" state after 100ms, from "HalfOpen" to "Closed" state on first success.
	private breaker = new CircuitBreaker({ errorThreshold: 1, resetTimeout: 100, successThreshold: 1 });
	private url = 'http://localhost:3000';
	public get(): Promise<string> {
		// Execute the function with circuit breaker logic.
		return this.breaker.exec(() => {
			return new Promise((resolve, reject) => {
				const req = http.get(this.url, (res) => {
					if (res.statusCode !== 200) {
						res.resume();
						return reject(new Error(`Failed with statusCode ${String(res.statusCode)}`));
					}
					let data = '';
					res.on('data', (chunk) => { data += chunk; });
					res.on('end', () => { resolve(data); });
				});
				req.on('error', reject);
			});
		});
	}
}
const client = new Client();
const get = async () => {
	try {
		const data = await client.get();
		console.log(`DATA: ${data}`);
	} catch (err) {
		console.log(err instanceof Error ? `ERROR: ${(err).message}` : err);
	}
};

let x = 0;
const server = http.createServer((_, res) => {
	const statusCode = x > 2 || x % 2 ? 418 : 200; // { 0 => 200, 1 => 418, 2 => 200, ... => 418 }
	res.writeHead(statusCode).end(`{ x: ${x} }`);
	x++;
});
server.listen(3000);

async function main() {
	for (let i = 0; i < 3; i++) {
		await get();
	}
	await promisify(setTimeout)(100);
	await get();
	// Output:
	// DATA: { x: 0 }
	// ERROR: Failed with statusCode 418
	// ERROR: Circuit broken
	// DATA: { x: 2 }
}

main().then(() => { process.exit(0); }).catch((err) => { console.error(err); process.exit(1); });
```
```
npm run file examples/function.ts
```
