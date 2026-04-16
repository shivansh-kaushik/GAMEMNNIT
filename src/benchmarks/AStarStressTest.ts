/**
 * A* Pathfinding Benchmark Suite
 * Automated performance stress testing for the campus navigation graph.
 */

import { aStar } from '../navigation/astar';
import { buildGraphFromGeoJSON } from '../navigation/graphGenerator';
import pathData from '../data/mnnit_paths.json';

// Pre-build the production graph for benchmarking
const graph = buildGraphFromGeoJSON(pathData as any);
const { nodes, edges } = graph;

interface BenchmarkResult {
  iterations: number;
  meanMs: number;
  stdDevMs: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

/**
 * benchmarkNavigation
 * Runs 'n' random point-to-point navigation queries on the production campus graph.
 */
export function benchmarkNavigation(n: number = 250): BenchmarkResult {
  const nodeIds = Object.keys(nodes);
  const times: number[] = [];

  if (nodeIds.length === 0) {
      return { iterations: 0, meanMs: 0, stdDevMs: 0, p99Ms: 0, minMs: 0, maxMs: 0 };
  }

  for (let i = 0; i < n; i++) {
    const startNode = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    const endNode = nodeIds[Math.floor(Math.random() * nodeIds.length)];

    const startTime = performance.now();
    aStar(startNode, endNode, nodes, edges);
    const endTime = performance.now();

    times.push(endTime - startTime);
  }

  const mean = times.reduce((a, b) => a + b) / n;
  const stdDev = Math.sqrt(times.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
  const sortedTimes = [...times].sort((a, b) => a - b);
  const p99 = sortedTimes[Math.floor(n * 0.99)];
  const min = sortedTimes[0];
  const max = sortedTimes[n - 1];

  return {
    iterations: n,
    meanMs: Number(mean.toFixed(4)),
    stdDevMs: Number(stdDev.toFixed(4)),
    p99Ms: Number(p99.toFixed(4)),
    minMs: Number(min.toFixed(4)),
    maxMs: Number(max.toFixed(4))
  };
}

if (typeof window !== 'undefined') {
  (window as any).benchmarkNavigation = benchmarkNavigation;
}
