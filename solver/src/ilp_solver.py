import pulp

def minimize_max_avg_cost(K, N, T, c, task_sizes, dependencies):
    """
    Parameters:
        K: Number of agents (int)
        N: List with number of tasks for each agent (list of int)
        T: Number of time instants (int)
        c: List of resource capacities at each time t (list of int)
        task_sizes: List of lists, where task_sizes[k][i] is the size of task i for agent k
        dependencies: List of lists of sets, where dependencies[k][i] is the set of indices
                      of tasks that must be completed before task i for agent k
    """
    
    # Create the problem
    problem = pulp.LpProblem("Minimize_Max_Avg_Cost", pulp.LpMinimize)

    # Decision variables: x[k][i][t] is 1 if task i of agent k is completed at time t
    x = {
        (k, i, t): pulp.LpVariable(f"x_{k}_{i}_{t}", cat="Binary")
        for k in range(K)
        for i in range(N[k])
        for t in range(1, T + 1)
    }

    # Auxiliary variable for the maximum average cost
    z = pulp.LpVariable("z", lowBound=0)

    # Objective: Minimize the maximum average cost
    problem += z

    # Constraints
    # (1) Each task is executed exactly once
    for k in range(K):
        for i in range(N[k]):
            problem += pulp.lpSum(x[k, i, t] for t in range(1, T + 1)) == 1

    # (2) Task dependencies
    for k in range(K):
        for i in range(N[k]):
            for t in range(1, T + 1):
                for dep in dependencies[k][i]:
                    problem += (
                        pulp.lpSum(x[k, dep, t_prime] for t_prime in range(1, t + 1)) >= x[k, i, t]
                    )

    # (3) Resource capacity constraints
    for t in range(1, T + 1):
        problem += (
            pulp.lpSum(
                task_sizes[k][i] * x[k, i, t]
                for k in range(K)
                for i in range(N[k])
            )
            <= c[t - 1]
        )

    # (4) Maximum average cost definition
    for k in range(K):
        avg_cost_k = (
            1 / N[k]
            * pulp.lpSum(
                t * x[k, i, t]
                for i in range(N[k])
                for t in range(1, T + 1)
            )
        )
        problem += z >= avg_cost_k

    # Solve the problem
    problem.solve()

    # Output results
    status = pulp.LpStatus[problem.status]
    if status != "Optimal":
        print(f"Solver did not find an optimal solution: {status}")
        return None

    solution = {
        "z": pulp.value(z),
        "x": {
            (k, i, t): pulp.value(x[k, i, t])
            for k in range(K)
            for i in range(N[k])
            for t in range(1, T + 1)
        },
    }
    return solution


resources = [15, 8, 5]  # Resource capacities per time slot.
    
agent_tasks = [
    [1, 5, 1, 1, 1, 1, 1, 1],  # Agent 0 task sizes.
    [5, 6, 1],                # Agent 1 task sizes.
]

dependencies = [
    # Agent 0 dependencies.
    [{}, {}, {}, {0, 1, 2}, {}, {}, {3, 4, 5}, {6}],
    # Agent 1 dependencies.
    [{}, {0}, {1}],
]

K = len(agent_tasks)
N = [len(tasks) for tasks in agent_tasks]
T = len(resources)

solution = minimize_max_avg_cost(K, N, T, resources, agent_tasks, dependencies)

if solution:
    print(f"Minimum maximum average cost: {solution['z']}")
    print("Task execution schedule:")
    for (k, i, t), value in solution["x"].items():
        if value == 1:
            print(f"Agent {k}, Task {i}, Time {t}")
