import http from 'node:http';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { Circuit, Breakable } from '../src';

// Create circuit which uses "Fixed Window" algorithm to store counters for 10s,
// switches from "Closed" to "Open" state on first error, from "Open" to "HalfOpen" state after 100ms,
// from "HalfOpen" to "Closed" state on first success.
const circuit = Circuit.fixed({ windowSize: 10000, errorThreshold: 1, resetTimeout: 100, successThreshold: 1 });

circuit.on('state', (state) => {
	console.log(`STATE: ${state}`);
});

class Client {
	// Decorate class method with circuit breaker logic.
	@Breakable(circuit)
	public async get(): Promise<string> {
		const res = await fetch('http://localhost:3000');
		if (res.status !== 200) {
			throw new Error(`Failed with status ${res.status}`);
		}
		return res.text();
	}
}

async function main() {
	let x = 0;
	const server = http.createServer((_, res) => {
		// { 0 => 200, 1 => 418, 2 => 200, ... => 418 }
		res.writeHead(x > 2 || x % 2 ? 418 : 200).end(`{ x: ${x++} }`);
	});
	server.listen(3000);
	await once(server, 'listening');

	const client = new Client();
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
	// Output:
	// DATA: { x: 0 }
	// STATE: 1
	// ERROR: Error: Failed with status 418
	// ERROR: CircuitError: Circuit broken
	// STATE: 2
	// STATE: 0
	// DATA: { x: 2 }

	server.close();
	await once(server, 'close');
}

main().catch(console.error);
