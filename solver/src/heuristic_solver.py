import networkx as nx
import random
import math

def create_agents_dag(agent_tasks: list[list[int]], dependencies: list[list[set[int]]]) -> list[nx.DiGraph]:
    agents_dag = []
    for i, tasks in enumerate(agent_tasks):
        agent_dag = nx.DiGraph()
        # Add tasks as nodes with the size attribute.
        for idx, size in enumerate(tasks):
            agent_dag.add_node(idx, size=size)
        # Add dependency edges.
        for j, deps in enumerate(dependencies[i]):
            for dep in deps:
                agent_dag.add_edge(dep, j)
        agents_dag.append(agent_dag)
    return agents_dag

def greedy_schedule(resources: list[int], agent_tasks: list[list[int]], dependencies: list[list[set[int]]]) -> list[list[tuple[int, int]]]:
    agents_dag = create_agents_dag(agent_tasks, dependencies)

    num_agents = len(agents_dag)
    schedule = [[] for _ in range(len(resources))]

    ready = [set() for _ in range(num_agents)]
    remaining_indegree = [dict() for _ in range(num_agents)]

    for i, dag in enumerate(agents_dag):
        for node in dag.nodes():
            indeg = dag.in_degree(node)
            remaining_indegree[i][node] = indeg
            if indeg == 0:
                ready[i].add(node)

    for t, cap in enumerate(resources):
        available_capacity = cap
        while True:
            candidate_tasks = []
            for i in range(num_agents):
                for task in ready[i]:
                    task_size = agents_dag[i].nodes[task]['size']
                    if task_size <= available_capacity:
                        candidate_tasks.append((i, task, task_size))
            if not candidate_tasks:
                break

            # Greedy choice: choose the task with the largest size among candidates.
            candidate_tasks.sort(key=lambda x: x[2], reverse=True)
            chosen_agent, chosen_task, chosen_size = candidate_tasks[0]

            schedule[t].append((chosen_agent, chosen_task))
            available_capacity -= chosen_size
            ready[chosen_agent].remove(chosen_task)

            for succ in agents_dag[chosen_agent].successors(chosen_task):
                remaining_indegree[chosen_agent][succ] -= 1
                if remaining_indegree[chosen_agent][succ] == 0:
                    ready[chosen_agent].add(succ)

    return schedule

def evaluate_max_agent_cost(schedule: list[list[tuple[int, int]]], num_agents: int) -> float:
    """
    Computes the maximum average cost over agents.
    For each agent k, the cost is defined as:
      C̄ₖ = (1/Nₖ) * sum_{i in tasks of k} (time_slot at which task i is completed).
    We assume time slots are 1-indexed in the cost calculation.
    """
    agent_costs = [0] * num_agents
    task_counts = [0] * num_agents
    
    for t, tasks in enumerate(schedule, start=1):
        for agent, task in tasks:
            agent_costs[agent] += t
            task_counts[agent] += 1

    avg_costs = [(agent_costs[k] / task_counts[k]) if task_counts[k] > 0 else float('inf')
                 for k in range(num_agents)]
    return max(avg_costs)

def is_feasible(schedule: list[list[tuple[int, int]]], agents_dag: list[nx.DiGraph], resources: list[int]) -> bool:
    """
    Checks two types of feasibility:
      1. Capacity: In each time slot, the sum of task sizes must not exceed the resource capacity.
      2. Dependencies: For each agent, if task u must precede task v then u must be scheduled before v.
         We use the order in the schedule (time slot index and position in the slot) to check this.
    """
    # Check capacity constraints.
    for t, tasks in enumerate(schedule):
        total = 0
        for agent, task in tasks:
            total += agents_dag[agent].nodes[task]['size']
        if total > resources[t]:
            return False

    # Build a mapping for each agent: task -> (time_slot, order_in_slot)
    agent_positions = {agent: {} for agent in range(len(agents_dag))}
    for t, tasks in enumerate(schedule):
        for idx, (agent, task) in enumerate(tasks):
            # Each task should appear only once.
            if task in agent_positions[agent]:
                return False
            agent_positions[agent][task] = (t, idx)

    # Check dependency ordering.
    for agent, dag in enumerate(agents_dag):
        for u, v in dag.edges():
            if u not in agent_positions[agent] or v not in agent_positions[agent]:
                # A task not scheduled implies infeasibility.
                return False
            t_u, idx_u = agent_positions[agent][u]
            t_v, idx_v = agent_positions[agent][v]
            # We require that u is scheduled before v.
            if t_u > t_v or (t_u == t_v and idx_u >= idx_v):
                return False

    return True

def local_search(resources: list[int], agent_tasks: list[list[int]], dependencies: list[list[set[int]]],
                 max_iter: int = 100000,
                 candidate_moves: int = 500,
                 seed: int | None = None) -> list[list[tuple[int, int]]]:
    """
    Uses a heuristic local search to improve the schedule.
    The objective is to minimize the maximum average cost among agents.
    In each iteration, we generate candidate modifications (swaps or moves) and accept
    the best candidate that is feasible. We continue until no improvement is seen
    in a given number of consecutive candidate moves.
    """
    schedule = greedy_schedule(resources, agent_tasks, dependencies)
    agents_dag = create_agents_dag(agent_tasks, dependencies)
    num_agents = len(agents_dag)
    best_schedule = [row[:] for row in schedule]
    best_cost = evaluate_max_agent_cost(best_schedule, num_agents)
    
    no_improve_count = 0

    random.seed(seed)

    for _ in range(max_iter):
        # Make a copy of the current best schedule.
        candidate_schedule = [row[:] for row in best_schedule]

        move_choice = random.random()
        
        # --- 1. One-task swap move ---
        if move_choice < 0.33:
            # Choose two time slots at random.
            t1 = random.randint(0, len(candidate_schedule)-1)
            t2 = random.randint(0, len(candidate_schedule)-1)
            if t1 == t2:
                continue
            
            # Swap one task from t1 with one task from t2.
            if candidate_schedule[t1] and candidate_schedule[t2]:
                idx1 = random.randint(0, len(candidate_schedule[t1]) - 1)
                idx2 = random.randint(0, len(candidate_schedule[t2]) - 1)
                candidate_schedule[t1][idx1], candidate_schedule[t2][idx2] = (
                    candidate_schedule[t2][idx2], candidate_schedule[t1][idx1])
            else:
                continue
        
        # --- 2. One-task move (relocation) ---
        elif move_choice < 0.66:
            # Move a task from a later time slot to an earlier one.
            t_from = random.randint(1, len(candidate_schedule)-1)
            if not candidate_schedule[t_from]:
                continue
            idx = random.randint(0, len(candidate_schedule[t_from]) - 1)
            task = candidate_schedule[t_from].pop(idx)
            t_to = random.randint(0, t_from-1)
            insert_idx = random.randint(0, len(candidate_schedule[t_to]))
            candidate_schedule[t_to].insert(insert_idx, task)
        
        # --- 3. Multi-swap move: swap one task with a group of tasks ---
        else:
            # Select a time slot with at least one task.
            t_from = random.randint(0, len(candidate_schedule)-1)
            if not candidate_schedule[t_from]:
                continue
            idx_from = random.randint(0, len(candidate_schedule[t_from]) - 1)
            task_from = candidate_schedule[t_from][idx_from]
            agent_from, task_id_from = task_from
            size_from = agents_dag[agent_from].nodes[task_id_from]['size']
            
            # Choose a different time slot that has at least 2 tasks.
            valid_slots = [t for t in range(len(candidate_schedule)) 
                        if t != t_from and len(candidate_schedule[t]) >= 2]
            if not valid_slots:
                continue
            t_to = random.choice(valid_slots)
            tasks_in_t_to = candidate_schedule[t_to]
            
            # Try to find a group of at least 2 tasks in t_to whose sizes sum to size_from.
            found_group = None
            for _ in range(50):  # try up to 50 random groups
                # Randomly choose a group size between 2 and all tasks in t_to.
                group_size = random.randint(2, len(tasks_in_t_to))
                candidate_indices = random.sample(range(len(tasks_in_t_to)), group_size)
                total_size = 0
                for idx in candidate_indices:
                    agent, task_id = tasks_in_t_to[idx]
                    total_size += agents_dag[agent].nodes[task_id]['size']
                if total_size == size_from:
                    found_group = candidate_indices
                    break
            if found_group is None:
                continue  # no matching group found; skip this move
            
            # Perform the swap: remove the chosen task from t_from and the group from t_to,
            # then swap them.
            group_tasks = [candidate_schedule[t_to][i] for i in sorted(found_group, reverse=True)]
            for i in sorted(found_group, reverse=True):
                candidate_schedule[t_to].pop(i)
            candidate_schedule[t_from].pop(idx_from)
            # Insert the group tasks into t_from at the former position.
            for task in group_tasks:
                candidate_schedule[t_from].insert(idx_from, task)
            # Insert the single task into t_to at a random position.
            insert_idx = random.randint(0, len(candidate_schedule[t_to]))
            candidate_schedule[t_to].insert(insert_idx, task_from)

        
        # Only consider candidates that are feasible.
        if not is_feasible(candidate_schedule, agents_dag, resources):
            continue
        
        candidate_cost = evaluate_max_agent_cost(candidate_schedule, num_agents)
        
        # Accept the candidate if it improves the maximum agent cost.
        if candidate_cost < best_cost:
            best_schedule = candidate_schedule
            best_cost = candidate_cost
            no_improve_count = 0
        else:
            no_improve_count += 1
        
        # Stop if no improvement has been found for a while.
        if no_improve_count >= candidate_moves:
            break

    return best_schedule
    


def simulated_annealing(resources: list[int], agent_tasks: list[list[int]], dependencies: list[list[set[int]]],
                 max_iter: int = 100000,
                 candidate_moves: int = 500,
                 initial_temperature: float = 1.0,
                 cooling_rate: float = 0.99,
                 seed: int | None = None) -> list[list[tuple[int, int]]]:
    """
    Uses a simulated annealing based local search to improve the schedule.
    The objective is to minimize the maximum average cost among agents.
    
    In each iteration, candidate modifications are generated (including:
      - one-task swaps (swapping a task between two time slots or within a slot),
      - one-task moves (moving a task from a later slot to an earlier slot),
      - multi-swap moves (swapping one task with a group of tasks whose total size is equal)
    and accepted with a probability that allows pejorative (worsening) moves.
    """
    # Initial schedule from the greedy algorithm.
    schedule = greedy_schedule(resources, agent_tasks, dependencies)
    agents_dag = create_agents_dag(agent_tasks, dependencies)
    num_agents = len(agents_dag)
    
    current_schedule = schedule
    best_schedule = [row[:] for row in schedule]
    best_cost = evaluate_max_agent_cost(best_schedule, num_agents)
    current_cost = best_cost
    
    no_improve_count = 0
    T = initial_temperature  # initial temperature for simulated annealing

    random.seed(seed)
    
    for iteration in range(max_iter):
        # Make a deep copy of the current schedule.
        candidate_schedule = [row[:] for row in current_schedule]

        move_choice = random.random()
        
        # --- 1. One-task swap move ---
        if move_choice < 0.33:
            # Choose two time slots at random.
            t1 = random.randint(0, len(candidate_schedule)-1)
            t2 = random.randint(0, len(candidate_schedule)-1)
            if t1 == t2:
                continue

            # Swap one task from t1 with one task from t2.
            if candidate_schedule[t1] and candidate_schedule[t2]:
                idx1 = random.randint(0, len(candidate_schedule[t1]) - 1)
                idx2 = random.randint(0, len(candidate_schedule[t2]) - 1)
                candidate_schedule[t1][idx1], candidate_schedule[t2][idx2] = (
                    candidate_schedule[t2][idx2], candidate_schedule[t1][idx1])
            else:
                continue
        
        # --- 2. One-task move (relocation) ---
        elif move_choice < 0.66:
            # Move a task from a later time slot to an earlier one.
            t_from = random.randint(1, len(candidate_schedule)-1)
            if not candidate_schedule[t_from]:
                continue
            idx = random.randint(0, len(candidate_schedule[t_from]) - 1)
            task = candidate_schedule[t_from].pop(idx)
            t_to = random.randint(0, t_from-1)
            insert_idx = random.randint(0, len(candidate_schedule[t_to]))
            candidate_schedule[t_to].insert(insert_idx, task)
        
        # --- 3. Multi-swap move: swap one task with a group of tasks ---
        else:
            # Select a time slot with at least one task.
            t_from = random.randint(0, len(candidate_schedule)-1)
            if not candidate_schedule[t_from]:
                continue
            idx_from = random.randint(0, len(candidate_schedule[t_from]) - 1)
            task_from = candidate_schedule[t_from][idx_from]
            agent_from, task_id_from = task_from
            size_from = agents_dag[agent_from].nodes[task_id_from]['size']
            
            # Choose a different time slot that has at least 2 tasks.
            valid_slots = [t for t in range(len(candidate_schedule)) 
                        if t != t_from and len(candidate_schedule[t]) >= 2]
            if not valid_slots:
                continue
            t_to = random.choice(valid_slots)
            tasks_in_t_to = candidate_schedule[t_to]
            
            # Try to find a group of at least 2 tasks in t_to whose sizes sum to size_from.
            found_group = None
            for _ in range(50):  # try up to 50 random groups
                # Randomly choose a group size between 2 and all tasks in t_to.
                group_size = random.randint(2, len(tasks_in_t_to))
                candidate_indices = random.sample(range(len(tasks_in_t_to)), group_size)
                total_size = 0
                for idx in candidate_indices:
                    agent, task_id = tasks_in_t_to[idx]
                    total_size += agents_dag[agent].nodes[task_id]['size']
                if total_size == size_from:
                    found_group = candidate_indices
                    break
            if found_group is None:
                continue  # no matching group found; skip this move
            
            # Perform the swap: remove the chosen task from t_from and the group from t_to,
            # then swap them.
            group_tasks = [candidate_schedule[t_to][i] for i in sorted(found_group, reverse=True)]
            for i in sorted(found_group, reverse=True):
                candidate_schedule[t_to].pop(i)
            candidate_schedule[t_from].pop(idx_from)
            # Insert the group tasks into t_from at the former position.
            for task in group_tasks:
                candidate_schedule[t_from].insert(idx_from, task)
            # Insert the single task into t_to at a random position.
            insert_idx = random.randint(0, len(candidate_schedule[t_to]))
            candidate_schedule[t_to].insert(insert_idx, task_from)

        
        # Only proceed if the candidate schedule is feasible.
        if not is_feasible(candidate_schedule, agents_dag, resources):
            continue
        
        candidate_cost = evaluate_max_agent_cost(candidate_schedule, num_agents)
        delta = candidate_cost - current_cost
        
        # --- Acceptance criterion: simulated annealing ---
        if delta < 0 or random.random() < math.exp(-delta / T):
            # Accept the candidate move.
            current_schedule = candidate_schedule
            current_cost = candidate_cost
            # Update the best found solution if improved.
            if candidate_cost < best_cost:
                best_schedule = candidate_schedule
                best_cost = candidate_cost
                no_improve_count = 0
            else:
                no_improve_count += 1
        else:
            no_improve_count += 1
        
        # Cool down the temperature.
        T *= cooling_rate
        
        # Optionally, stop if no improvement has been seen for a number of moves.
        if no_improve_count >= candidate_moves:
            break
    
    return best_schedule

    
