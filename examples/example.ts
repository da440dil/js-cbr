import http from 'node:http';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { Circuit, CircuitBreaker } from '../src';

class Client {
	private breaker: CircuitBreaker;

	constructor(breaker: CircuitBreaker) {
		this.breaker = breaker;
	}

	public get(): Promise<string> {
		// Execute function with circuit breaker logic.
		return this.breaker.exec(async () => {
			const res = await fetch('http://localhost:3000');
			if (res.status !== 200) {
				throw new Error(`Failed with status ${res.status}`);
			}
			return res.text();
		});
	}
}

export async function main(circuit: Circuit) {
	let x = 0;
	const server = http.createServer((_, res) => {
		// { 0 => 200, 1 => 418, 2 => 200, ... => 418 }
		res.writeHead(x > 2 || x % 2 ? 418 : 200).end(`{ x: ${x++} }`);
	});
	server.listen(3000);
	await once(server, 'listening');

	circuit.on('state', (state) => {
		console.log(`STATE: ${state}`);
	});

	const client = new Client(new CircuitBreaker(circuit));
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
