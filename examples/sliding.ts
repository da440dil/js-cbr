import { Circuit } from '../src';
import { main } from './example';

main(Circuit.sliding({ windowSize: 10000, errorThreshold: 1, resetTimeout: 100, successThreshold: 1 })).catch(console.error);
