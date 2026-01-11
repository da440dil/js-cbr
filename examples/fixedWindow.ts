import { fixedWindow } from '../src';
import { main } from './example';

main(fixedWindow({ windowSize: 10000, resetTimeout: 100 })).catch(console.error);
