# Multi-Agent Task Scheduling with Priority Constraints and Limited Resources
Project for the course of Decision Support Systems and Analytics at Roma Tre University.

## Problem definition
There are $K$ agents, which must execute tasks of a certain size. The tasks are not shared among the agents; each has its own set of tasks. The tasks have dependencies that form a Directed Acyclic Graph (DAG); tasks with unresolved dependencies cannot be executed. 
At instants of time $t = 1, \dots , T$ resources arrive with capacity $c_1, \dots , c_2$, which are needed to solve the tasks. The tasks performed using a certain resource must have the sum of the dimensions less than or equal to the capacity of the resource.
The goal is to minimize the maximum average cost of execution.

## Mathematical Model
### Decision Variables
$x_{k,i,t}$ is a binary variable that is 1 if the $i$-th task of agent $k$ is completed at time $t$.
### Objective Function
We want to minimize the maximum average task completion cost among all agents, wich is defined for agent $k$ as:

$$ \bar{C_k} = \frac{1}{N_k} \sum_{i=1}^{N_k} \sum_{t=1}^{T} t \cdot x_{k,i,t} $$

where $N_k$ is the number of tasks assigned to agent $k$.

We introduce an auxiliary variable $z$ representing the maximum average cost among all agents. The goal is to minimize $z$.

$$ \min z $$

### Constraints
#### Task Assignment Constraints
$$ \sum_{t=1}^{T} x_{k,i,t} = 1 \quad \forall k = 1, \ldots, K; \forall i = 1, \ldots, N_k $$
#### Precedence Constraints
$$x_{k,i,t} \leq \sum_{\tau = 1}^{t} x_{k,j,\tau} \quad \forall  k = 1, \ldots, K; \forall i = 1, \ldots, N_k; \forall t = 1, \ldots, T; \forall j \in Dep_{k,i} $$

where $Dep_{k,i}$ is the set of tasks that must be completed before the task $i$ for agent $k$.
#### Capacity Constraints
$$\sum_{k=1}^{K} \sum_{i=1}^{N_k} d_{k,i} \cdot x_{k,i,t} \leq c_t \quad \forall t = 1, \ldots, T$$
#### Constraints on Maximum Average Cost
$$\sum_{i=1}^{N_k} \sum_{t=1}^{T} t \cdot x_{k,i,t} \leq N_k \cdot z \quad \forall k = 1, \ldots, K$$
#### Constraints for binary variables
$$x_{k,i,t} \in \\{0, 1\\} \quad \forall k = 1, \ldots, K; \forall i = 1, \ldots, N_k; \forall t = 1, \ldots, T$$

## Build
To build the client run `npm run build`.

To start the solver (used only for ILP solver) `uvicorn app:app --host 0.0.0.0 --port 8000 --reload`

