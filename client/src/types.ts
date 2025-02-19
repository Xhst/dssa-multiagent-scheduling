export type Resource = {
  id: number;
  size: number;
};

export type Agent = {
  id: number;
  color: string;
  tasks: Task[];
};

export type Task = {
  id: number;
  size: number;
  dependencies: number[];
}

export type SolvingMethod = "greedy" | "ilp" | "local_search" | "simulated_annealing";

export type HeuristicParams = {
  maxIterations?: number;
  maxMoves?: number;
  temperature?: number;
  coolingRate?: number;
};

export type Solution = {
  method: string,
  solution: [[number, number][]];
  z: number;
  time: number;
  colors: string[];
  resources: number[];
  tasks: number[][];
};