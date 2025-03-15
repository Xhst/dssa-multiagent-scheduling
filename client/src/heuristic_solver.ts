/**
 * Heuristic solver for multi-agent scheduling problems.
 */

/**
 * Types and interfaces
 */
interface Node {
    size: number;
  }
  
  interface Graph {
    nodes: Map<number, Node>;
    edges: Map<number, Set<number>>;
    inDegree: Map<number, number>;
  }
  
  type Task = [number, number]; // [agent, taskId]
  export type Schedule = Task[][];
  
  /**
   * Creates a directed acyclic graph representation for each agent's tasks.
   */
  function createAgentsDag(
    agentTasks: number[][],
    dependencies: Set<number>[][]
  ): Graph[] {
    const agentsDag: Graph[] = [];
    
    for (let i = 0; i < agentTasks.length; i++) {
      const tasks = agentTasks[i];
      const graph: Graph = {
        nodes: new Map<number, Node>(),
        edges: new Map<number, Set<number>>(),
        inDegree: new Map<number, number>()
      };
      
      // Add tasks as nodes with the size attribute
      for (let idx = 0; idx < tasks.length; idx++) {
        graph.nodes.set(idx, { size: tasks[idx] });
        graph.edges.set(idx, new Set<number>());
        graph.inDegree.set(idx, 0);
      }
      
      // Add dependency edges
      for (let j = 0; j < dependencies[i].length; j++) {
        const deps = dependencies[i][j];
        for (const dep of deps) {
          if (!graph.edges.has(dep)) {
            graph.edges.set(dep, new Set<number>());
          }
          graph.edges.get(dep)!.add(j);
          graph.inDegree.set(j, (graph.inDegree.get(j) || 0) + 1);
        }
      }
      
      agentsDag.push(graph);
    }
    
    return agentsDag;
  }
  
  /**
   * Generates an initial schedule using a greedy algorithm.
   */
  function greedySchedule(
    resources: number[],
    agentTasks: number[][],
    dependencies: Set<number>[][]
  ): Schedule {
    const agentsDag = createAgentsDag(agentTasks, dependencies);
    const numAgents = agentsDag.length;
    const schedule: Schedule = Array(resources.length).fill(null).map(() => []);
    
    const ready: Set<number>[] = Array(numAgents).fill(null).map(() => new Set<number>());
    const remainingIndegree: Map<number, number>[] = Array(numAgents).fill(null).map(() => new Map<number, number>());
    
    // Initialize ready tasks and in-degrees
    for (let i = 0; i < agentsDag.length; i++) {
      const dag = agentsDag[i];
      for (const [node, inDegree] of dag.inDegree.entries()) {
        remainingIndegree[i].set(node, inDegree);
        if (inDegree === 0) {
          ready[i].add(node);
        }
      }
    }
    
    // Schedule tasks time slot by time slot
    for (let t = 0; t < resources.length; t++) {
      let availableCapacity = resources[t];
      
      while (true) {
        const candidateTasks: [number, number, number][] = []; // [agent, task, size]
        
        for (let i = 0; i < numAgents; i++) {
          for (const task of ready[i]) {
            const taskSize = agentsDag[i].nodes.get(task)!.size;
            if (taskSize <= availableCapacity) {
              candidateTasks.push([i, task, taskSize]);
            }
          }
        }
        
        if (candidateTasks.length === 0) {
          break;
        }
        
        // Greedy choice: choose the task with the largest size among candidates
        candidateTasks.sort((a, b) => b[2] - a[2]);
        const [chosenAgent, chosenTask, chosenSize] = candidateTasks[0];
        
        schedule[t].push([chosenAgent, chosenTask]);
        availableCapacity -= chosenSize;
        ready[chosenAgent].delete(chosenTask);
        
        // Update successors
        const successors = agentsDag[chosenAgent].edges.get(chosenTask) || new Set<number>();
        for (const succ of successors) {
          const newIndegree = remainingIndegree[chosenAgent].get(succ)! - 1;
          remainingIndegree[chosenAgent].set(succ, newIndegree);
          if (newIndegree === 0) {
            ready[chosenAgent].add(succ);
          }
        }
      }
    }
    
    return schedule;
  }
  
  /**
   * Computes the maximum average cost over agents.
   */
  function evaluateMaxAgentCost(schedule: Schedule, numAgents: number): number {
    const agentCosts: number[] = Array(numAgents).fill(0);
    const taskCounts: number[] = Array(numAgents).fill(0);
    
    for (let t = 0; t < schedule.length; t++) {
      const tasks = schedule[t];
      const timeSlot = t + 1; // 1-indexed in cost calculation
      
      for (const [agent, task] of tasks) {
        agentCosts[agent] += timeSlot;
        taskCounts[agent] += 1;
      }
    }
    
    const avgCosts = agentCosts.map((cost, k) => 
      taskCounts[k] > 0 ? cost / taskCounts[k] : Infinity
    );
    
    return Math.max(...avgCosts);
  }
  
  /**
   * Checks if a schedule is feasible regarding capacity and dependency constraints.
   */
  function isFeasible(schedule: Schedule, agentsDag: Graph[], resources: number[]): boolean {
    // Check capacity constraints
    for (let t = 0; t < schedule.length; t++) {
      const tasks = schedule[t];
      let total = 0;
      
      for (const [agent, task] of tasks) {
        total += agentsDag[agent].nodes.get(task)!.size;
      }
      
      if (total > resources[t]) {
        return false;
      }
    }
    
    // Build a mapping for each agent: task -> [time_slot, order_in_slot]
    const agentPositions: Map<number, [number, number]>[] = 
      Array(agentsDag.length).fill(null).map(() => new Map<number, [number, number]>());
    
    for (let t = 0; t < schedule.length; t++) {
      const tasks = schedule[t];
      
      for (let idx = 0; idx < tasks.length; idx++) {
        const [agent, task] = tasks[idx];
        
        // Each task should appear only once
        if (agentPositions[agent].has(task)) {
          return false;
        }
        
        agentPositions[agent].set(task, [t, idx]);
      }
    }
    
    // Check dependency ordering
    for (let agent = 0; agent < agentsDag.length; agent++) {
      const dag = agentsDag[agent];
      
      for (const [u, successors] of dag.edges.entries()) {
        for (const v of successors) {
          if (!agentPositions[agent].has(u) || !agentPositions[agent].has(v)) {
            // A task not scheduled implies infeasibility
            return false;
          }
          
          const [tU, idxU] = agentPositions[agent].get(u)!;
          const [tV, idxV] = agentPositions[agent].get(v)!;
          
          // We require that u is scheduled before v
          if (tU > tV || (tU === tV && idxU >= idxV)) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  /**
   * Uses a heuristic local search to improve the schedule.
   */
  function localSearch(
    resources: number[],
    agentTasks: number[][],
    dependencies: Set<number>[][],
    maxIter: number = 100000,
    candidateMoves: number = 500,
    seed?: number
  ): Schedule {
    // Set random seed if provided
    if (seed !== undefined) {
      // TypeScript/JavaScript doesn't have a built-in way to seed Math.random(),
      // but in a real implementation you would use a seeded PRNG library here
    }
    
    const schedule = greedySchedule(resources, agentTasks, dependencies);
    const agentsDag = createAgentsDag(agentTasks, dependencies);
    const numAgents = agentsDag.length;
    
    let bestSchedule: Schedule = JSON.parse(JSON.stringify(schedule));
    let bestCost = evaluateMaxAgentCost(bestSchedule, numAgents);
    
    let noImproveCount = 0;
    
    for (let iter = 0; iter < maxIter; iter++) {
      // Make a copy of the current best schedule
      const candidateSchedule: Schedule = JSON.parse(JSON.stringify(bestSchedule));
      
      const moveChoice = Math.random();
      
      // --- 1. One-task swap move ---
      if (moveChoice < 0.33) {
        // Choose two time slots at random
        const t1 = Math.floor(Math.random() * candidateSchedule.length);
        const t2 = Math.floor(Math.random() * candidateSchedule.length);
        
        if (t1 === t2) {
          continue;
        }
        
        // Swap one task from t1 with one task from t2
        if (candidateSchedule[t1].length && candidateSchedule[t2].length) {
          const idx1 = Math.floor(Math.random() * candidateSchedule[t1].length);
          const idx2 = Math.floor(Math.random() * candidateSchedule[t2].length);
          
          const temp = candidateSchedule[t1][idx1];
          candidateSchedule[t1][idx1] = candidateSchedule[t2][idx2];
          candidateSchedule[t2][idx2] = temp;
        } else {
          continue;
        }
      }
      
      // --- 2. One-task move (relocation) ---
      else if (moveChoice < 0.66) {
        // Move a task from a later time slot to an earlier one
        const tFrom = Math.floor(Math.random() * (candidateSchedule.length - 1)) + 1;
        
        if (!candidateSchedule[tFrom].length) {
          continue;
        }
        
        const idx = Math.floor(Math.random() * candidateSchedule[tFrom].length);
        const task = candidateSchedule[tFrom].splice(idx, 1)[0];
        
        const tTo = Math.floor(Math.random() * tFrom);
        const insertIdx = Math.floor(Math.random() * (candidateSchedule[tTo].length + 1));
        
        candidateSchedule[tTo].splice(insertIdx, 0, task);
      }
      
      // --- 3. Multi-swap move: swap one task with a group of tasks ---
      else {
        // Select a time slot with at least one task
        const tFrom = Math.floor(Math.random() * candidateSchedule.length);
        
        if (!candidateSchedule[tFrom].length) {
          continue;
        }
        
        const idxFrom = Math.floor(Math.random() * candidateSchedule[tFrom].length);
        const taskFrom = candidateSchedule[tFrom][idxFrom];
        const [agentFrom, taskIdFrom] = taskFrom;
        const sizeFrom = agentsDag[agentFrom].nodes.get(taskIdFrom)!.size;
        
        // Choose a different time slot that has at least 2 tasks
        const validSlots = candidateSchedule
          .map((tasks, t) => ({ t, count: tasks.length }))
          .filter(({ t, count }) => t !== tFrom && count >= 2)
          .map(({ t }) => t);
        
        if (!validSlots.length) {
          continue;
        }
        
        const tTo = validSlots[Math.floor(Math.random() * validSlots.length)];
        const tasksInTTo = candidateSchedule[tTo];
        
        // Try to find a group of at least 2 tasks in t_to whose sizes sum to size_from
        let foundGroup: number[] | null = null;
        
        for (let attempt = 0; attempt < 50; attempt++) {
          // Randomly choose a group size between 2 and all tasks in t_to
          const groupSize = Math.min(
            Math.floor(Math.random() * (tasksInTTo.length - 1)) + 2,
            tasksInTTo.length
          );
          
          // Generate random indices without repetition
          const indices = Array.from({ length: tasksInTTo.length }, (_, i) => i);
          shuffleArray(indices);
          const candidateIndices = indices.slice(0, groupSize);
          
          let totalSize = 0;
          for (const idx of candidateIndices) {
            const [agent, taskId] = tasksInTTo[idx];
            totalSize += agentsDag[agent].nodes.get(taskId)!.size;
          }
          
          if (totalSize === sizeFrom) {
            foundGroup = candidateIndices;
            break;
          }
        }
        
        if (foundGroup === null) {
          continue; // No matching group found; skip this move
        }
        
        // Perform the swap: remove the chosen task from t_from and the group from t_to,
        // then swap them
        foundGroup.sort((a, b) => b - a); // Sort in descending order for removal
        
        const groupTasks = foundGroup.map(i => candidateSchedule[tTo][i]);
        
        for (const i of foundGroup) {
          candidateSchedule[tTo].splice(i, 1);
        }
        
        candidateSchedule[tFrom].splice(idxFrom, 1);
        
        // Insert the group tasks into t_from at the former position
        for (const task of groupTasks) {
          candidateSchedule[tFrom].splice(idxFrom, 0, task);
        }
        
        // Insert the single task into t_to at a random position
        const insertIdx = Math.floor(Math.random() * (candidateSchedule[tTo].length + 1));
        candidateSchedule[tTo].splice(insertIdx, 0, taskFrom);
      }
      
      // Only consider candidates that are feasible
      if (!isFeasible(candidateSchedule, agentsDag, resources)) {
        continue;
      }
      
      const candidateCost = evaluateMaxAgentCost(candidateSchedule, numAgents);
      
      // Accept the candidate if it improves the maximum agent cost
      if (candidateCost < bestCost) {
        bestSchedule = candidateSchedule;
        bestCost = candidateCost;
        noImproveCount = 0;
      } else {
        noImproveCount += 1;
      }
      
      // Stop if no improvement has been found for a while
      if (noImproveCount >= candidateMoves) {
        break;
      }
    }
    
    return bestSchedule;
  }
  
  /**
   * Simulated annealing based local search to improve the schedule.
   */
  function simulatedAnnealing(
    resources: number[],
    agentTasks: number[][],
    dependencies: Set<number>[][],
    maxIter: number = 100000,
    candidateMoves: number = 500,
    initialTemperature: number = 1.0,
    coolingRate: number = 0.99,
    seed?: number
  ): Schedule {
    // Set random seed if provided
    if (seed !== undefined) {
      // TypeScript/JavaScript doesn't have a built-in way to seed Math.random(),
      // but in a real implementation you would use a seeded PRNG library here
    }
    
    // Initial schedule from the greedy algorithm
    const schedule = greedySchedule(resources, agentTasks, dependencies);
    const agentsDag = createAgentsDag(agentTasks, dependencies);
    const numAgents = agentsDag.length;
    
    let currentSchedule: Schedule = JSON.parse(JSON.stringify(schedule));
    let bestSchedule: Schedule = JSON.parse(JSON.stringify(schedule));
    let bestCost = evaluateMaxAgentCost(bestSchedule, numAgents);
    let currentCost = bestCost;
    
    let noImproveCount = 0;
    let T = initialTemperature; // Initial temperature for simulated annealing
    
    for (let iteration = 0; iteration < maxIter; iteration++) {
      // Make a deep copy of the current schedule
      const candidateSchedule: Schedule = JSON.parse(JSON.stringify(currentSchedule));
      
      const moveChoice = Math.random();
      
      // --- 1. One-task swap move ---
      if (moveChoice < 0.33) {
        // Choose two time slots at random
        const t1 = Math.floor(Math.random() * candidateSchedule.length);
        const t2 = Math.floor(Math.random() * candidateSchedule.length);
        
        if (t1 === t2) {
          continue;
        }
        
        // Swap one task from t1 with one task from t2
        if (candidateSchedule[t1].length && candidateSchedule[t2].length) {
          const idx1 = Math.floor(Math.random() * candidateSchedule[t1].length);
          const idx2 = Math.floor(Math.random() * candidateSchedule[t2].length);
          
          const temp = candidateSchedule[t1][idx1];
          candidateSchedule[t1][idx1] = candidateSchedule[t2][idx2];
          candidateSchedule[t2][idx2] = temp;
        } else {
          continue;
        }
      }
      
      // --- 2. One-task move (relocation) ---
      else if (moveChoice < 0.66) {
        // Move a task from a later time slot to an earlier one
        const tFrom = Math.floor(Math.random() * (candidateSchedule.length - 1)) + 1;
        
        if (!candidateSchedule[tFrom].length) {
          continue;
        }
        
        const idx = Math.floor(Math.random() * candidateSchedule[tFrom].length);
        const task = candidateSchedule[tFrom].splice(idx, 1)[0];
        
        const tTo = Math.floor(Math.random() * tFrom);
        const insertIdx = Math.floor(Math.random() * (candidateSchedule[tTo].length + 1));
        
        candidateSchedule[tTo].splice(insertIdx, 0, task);
      }
      
      // --- 3. Multi-swap move: swap one task with a group of tasks ---
      else {
        // Implementation similar to localSearch method...
        // Select a time slot with at least one task
        const tFrom = Math.floor(Math.random() * candidateSchedule.length);
        
        if (!candidateSchedule[tFrom].length) {
          continue;
        }
        
        const idxFrom = Math.floor(Math.random() * candidateSchedule[tFrom].length);
        const taskFrom = candidateSchedule[tFrom][idxFrom];
        const [agentFrom, taskIdFrom] = taskFrom;
        const sizeFrom = agentsDag[agentFrom].nodes.get(taskIdFrom)!.size;
        
        // Choose a different time slot that has at least 2 tasks
        const validSlots = candidateSchedule
          .map((tasks, t) => ({ t, count: tasks.length }))
          .filter(({ t, count }) => t !== tFrom && count >= 2)
          .map(({ t }) => t);
        
        if (!validSlots.length) {
          continue;
        }
        
        const tTo = validSlots[Math.floor(Math.random() * validSlots.length)];
        const tasksInTTo = candidateSchedule[tTo];
        
        // Try to find a group of at least 2 tasks in t_to whose sizes sum to size_from
        let foundGroup: number[] | null = null;
        
        for (let attempt = 0; attempt < 50; attempt++) {
          const groupSize = Math.min(
            Math.floor(Math.random() * (tasksInTTo.length - 1)) + 2,
            tasksInTTo.length
          );
          
          const indices = Array.from({ length: tasksInTTo.length }, (_, i) => i);
          shuffleArray(indices);
          const candidateIndices = indices.slice(0, groupSize);
          
          let totalSize = 0;
          for (const idx of candidateIndices) {
            const [agent, taskId] = tasksInTTo[idx];
            totalSize += agentsDag[agent].nodes.get(taskId)!.size;
          }
          
          if (totalSize === sizeFrom) {
            foundGroup = candidateIndices;
            break;
          }
        }
        
        if (foundGroup === null) {
          continue;
        }
        
        foundGroup.sort((a, b) => b - a);
        
        const groupTasks = foundGroup.map(i => candidateSchedule[tTo][i]);
        
        for (const i of foundGroup) {
          candidateSchedule[tTo].splice(i, 1);
        }
        
        candidateSchedule[tFrom].splice(idxFrom, 1);
        
        for (const task of groupTasks) {
          candidateSchedule[tFrom].splice(idxFrom, 0, task);
        }
        
        const insertIdx = Math.floor(Math.random() * (candidateSchedule[tTo].length + 1));
        candidateSchedule[tTo].splice(insertIdx, 0, taskFrom);
      }
      
      // Only proceed if the candidate schedule is feasible
      if (!isFeasible(candidateSchedule, agentsDag, resources)) {
        continue;
      }
      
      const candidateCost = evaluateMaxAgentCost(candidateSchedule, numAgents);
      const delta = candidateCost - currentCost;
      
      // --- Acceptance criterion: simulated annealing ---
      if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
        // Accept the candidate move
        currentSchedule = candidateSchedule;
        currentCost = candidateCost;
        
        // Update the best found solution if improved
        if (candidateCost < bestCost) {
          bestSchedule = candidateSchedule;
          bestCost = candidateCost;
          noImproveCount = 0;
        } else {
          noImproveCount += 1;
        }
      } else {
        noImproveCount += 1;
      }
      
      // Cool down the temperature
      T *= coolingRate;
      
      // Optionally, stop if no improvement has been seen for a number of moves
      if (noImproveCount >= candidateMoves) {
        break;
      }
    }
    
    return bestSchedule;
  }
  
  /**
   * Helper function to shuffle an array in-place.
   */
  function shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  export {
    createAgentsDag,
    greedySchedule,
    evaluateMaxAgentCost,
    isFeasible,
    localSearch,
    simulatedAnnealing
  };