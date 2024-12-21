# Multi-Agent Task Scheduling with Priority Constraints and Limited Resources
Project for the course of Decision Support Systems and Analytics at Roma Tre University.

### Problem definition
There are $K$ agents, which must execute tasks of a certain size. The tasks are not shared among the agents; each has its own set of tasks. The tasks have dependencies that form a Directed Acyclic Graph (DAG); tasks with unresolved dependencies cannot be executed. 
At instants of time $t = 1, \dots , T$ resources arrive with capacity $c_1, \dots , c_2$, which are needed to solve the tasks. The tasks performed using a certain resource must have the sum of the dimensions less than or equal to the capacity of the resource.
The goal is to minimize the maximum average cost of execution, which is defined as:

$$\bar{C_k} = \frac{1}{N_k} \sum_{i=1}^{N_k} \sum_{t=1}^{T} t \cdot x_{k,i,t}$$

where:
  - $N_k$ is the number of tasks assigned to the agent $k$.
  - $x_{k,i,t}$ is a binary variable that is 1 if the $i$-th task of agent $k$ is completed at time $t$.
