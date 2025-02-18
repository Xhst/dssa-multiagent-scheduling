import pulp

def minimize_max_avg_cost(c, task_sizes, dependencies):
    """
    Parameters:
        c: List of resource capacities at each time t (list of int)
        task_sizes: List of lists, where task_sizes[k][i] is the size of task i for agent k
        dependencies: List of lists of sets, where dependencies[k][i] is the set of indices
                      of tasks that must be completed before task i for agent k
    """
    
    K = len(task_sizes)
    N = [len(tasks) for tasks in task_sizes]
    T = len(c)

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
    problem.solve(pulp.PULP_CBC_CMD(msg=0))

    # Output results
    status = pulp.LpStatus[problem.status]
    if status != "Optimal":
        print(f"Solver did not find an optimal solution: {status}")
        return None

    schedule = [[] for _ in range(T)]  # Create an empty schedule for each time slot

    for (k, i, t), value in x.items():
        if pulp.value(value) == 1:
            schedule[t - 1].append([k, i])

    return schedule




