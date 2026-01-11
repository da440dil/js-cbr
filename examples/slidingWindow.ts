import { slidingWindow } from '../src';
import { main } from './example';

main(slidingWindow({ windowSize: 10000, resetTimeout: 100 })).catch(console.error);
