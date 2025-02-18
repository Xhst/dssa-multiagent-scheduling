from heuristic_solver import greedy_schedule, local_search, evaluate_max_agent_cost, simulated_annealing
from ilp_solver import minimize_max_avg_cost
import time

resources = [4,5,2,7,3,10,7,8,5,10]

agent_tasks = [
    [5,2,1,1,1,1,2,1],
    [1,1],
    [2,3,1],
    [3,1,1],
    [1,1,1,1,1,1],
    [2,2],
    [2,1,3,1,1,1],
]

dependencies = [
    [{}, {0}, {0}, {1}, {}, {0,1,2}, {5}, {}],
    [{}, {}],
    [{}, {0}, {1}],
    [{}, {0}, {1}],
    [{}, {0}, {1}, {2}, {3}, {4}],
    [{}, {0}],
    [{}, {}, {0,1}, {}, {}, {2,3,4}],
]

start_time = time.time()
solution = greedy_schedule(resources, agent_tasks, dependencies)
elapsed_time = time.time() - start_time
print(f"Greedy ({elapsed_time}): {evaluate_max_agent_cost(solution, len(agent_tasks))}")

iters = [1000, 10_000, 100_000]
candidate_moves = [100, 500, 1000]

for iter in iters:
    for cm in candidate_moves:
        start_time = time.time()
        solution = local_search(resources, agent_tasks, dependencies, seed=515125, max_iter=iter, candidate_moves=cm)
        elapsed_time = time.time() - start_time
        print(f"Local Search [iter:{iter},cm:{cm}] ({elapsed_time}): {evaluate_max_agent_cost(solution, len(agent_tasks))}")
    
for iter in iters:
    for cm in candidate_moves:
        start_time = time.time()
        solution = simulated_annealing(resources, agent_tasks, dependencies, seed=515125, max_iter=iter, candidate_moves=cm)
        elapsed_time = time.time() - start_time
        print(f"Simulated Annealing [iter:{iter},cm:{cm}] ({elapsed_time}): {evaluate_max_agent_cost(solution, len(agent_tasks))}")

start_time = time.time()
solution = minimize_max_avg_cost(resources, agent_tasks, dependencies)
elapsed_time = time.time() - start_time
print(f"ILP ({elapsed_time}): {evaluate_max_agent_cost(solution, len(agent_tasks))}")
