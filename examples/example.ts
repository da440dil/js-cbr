import http from 'node:http';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { Circuit, Breaker, BreakerOptions } from '../src';

export async function main(circuit: Circuit, options?: BreakerOptions) {
	circuit.on('state', (state) => {
		console.log(`STATE: ${state}`);
	});

	let x = 0;
	const server = http.createServer((_, res) => {
		// { 0 => 200, 1 => 418, 2 => 200, ... => 418 }
		res.writeHead(x > 2 || x % 2 ? 418 : 200).end(`{ x: ${x++} }`);
	});
	server.listen(3000);
	await once(server, 'listening');

	const client = new Client(new Breaker(circuit, options));
	for (let i = 0; i < 3; i++) {
		try {
			const data = await client.get();
			console.log(`DATA: ${data}`);
		} catch (err) {
			console.log(`ERROR: ${err}`);
		}
	}
	await setTimeout(100);
	const data = await client.get();
	console.log(`DATA: ${data}`);

	server.close();
	await once(server, 'close');
}

class Client {
	private breaker: Breaker;

	constructor(breaker: Breaker) {
		this.breaker = breaker;
	}

	public get(): Promise<string> {
		// Execute function with circuit breaker logic.
		return this.breaker.exec(async (signal) => {
			const res = await fetch('http://localhost:3000', { signal });
			if (res.status !== 200) {
				throw new Error(`Failed with status ${res.status}`);
			}
			return res.text();
		});
	}
}
