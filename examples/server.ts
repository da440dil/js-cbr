import http from 'node:http';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { fixedWindow, CircuitState } from '../src';

const circuit = fixedWindow({ state: CircuitState.HalfOpen, windowSize: 10000, resetTimeout: 1000 });

circuit.on('state', (state) => {
	console.log(`STATE: ${state}`);
});

async function main() {
	let x = 0;
	const server = http.createServer((_, res) => {
		if (!circuit.request()) {
			res.writeHead(503, { 'Retry-After': String(Math.ceil(circuit.ttl() / 1000)) }).end();
			return;
		}
		res.on('finish', onResponseFinished);
		res.on('error', onResponseFinished);

		// { 0 => 200, 1 => 418, 2 => 200, ... => 418 }
		res.writeHead(x > 2 || x % 2 ? 418 : 200).end(`{ x: ${x++} }`);
	});
	server.listen(3000);
	await once(server, 'listening');

	const get = async () => {
		const res = await fetch('http://localhost:3000');
		if (res.status === 503) {
			console.log(`RESPONSE: { status: ${res.status}, 'Retry-After': ${res.headers.get('Retry-After')} }`);
			return;
		}
		const text = await res.text();
		console.log(`RESPONSE: { status: ${res.status}, text: ${text} }`);
	};
	await Promise.all([get(), get(), get()]);
	console.log(`TIMEOUT ${circuit.resetTimeout}ms`);
	await setTimeout(circuit.resetTimeout);
	await Promise.all([get(), get(), get()]);
	// Output:
	// STATE: 0
	// RESPONSE: { status: 200, text: { x: 0 } }
	// STATE: 1
	// RESPONSE: { status: 418, text: { x: 1 } }
	// RESPONSE: { status: 503, 'Retry-After': 1 }
	// TIMEOUT 1000ms
	// STATE: 2
	// STATE: 0
	// STATE: 1
	// RESPONSE: { status: 200, text: { x: 2 } }
	// RESPONSE: { status: 418, text: { x: 3 } }
	// RESPONSE: { status: 503, 'Retry-After': 1 }
	// STATE: 2

	server.close();
	await once(server, 'close');
}

main().catch(console.error);

function onResponseFinished(this: http.ServerResponse, err?: Error) {
	this.removeListener('finish', onResponseFinished);
	this.removeListener('error', onResponseFinished);
	if (err) {
		circuit.error();
		return;
	}
	if (this.statusCode === 418) {
		circuit.error();
		return;
	}
	if (this.statusCode < 400) {
		circuit.success();
	}
}
