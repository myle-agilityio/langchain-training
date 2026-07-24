import './config/env.js';
import { buildGraph } from './graphs/index.js';

export const graph = await buildGraph();
