from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from heuristic_solver import greedy_schedule, local_search, evaluate_max_agent_cost, simulated_annealing
from ilp_solver import minimize_max_avg_cost
from pydantic import BaseModel
import time

class Task(BaseModel):
    id: int
    size: int
    dependencies: list[int]

class Agent(BaseModel):
    id: int
    color: str
    tasks: list[Task]

class Resource(BaseModel):
    id: int
    size: int

class HeuristicParams(BaseModel):
    maxIterations: int = 1000
    maxMoves: int = 100
    temperature: float = 1.0
    coolingRate: float = 0.99

class ScheduleRequest(BaseModel):
    resources: list[Resource]
    agents: list[Agent]
    parameters: HeuristicParams | None = None 



def convert_input(request: ScheduleRequest):
    resources = [res.size for res in request.resources]
    agent_tasks = [[task.size for task in agent.tasks] for agent in request.agents]
    agent_colors = [agent.color for agent in request.agents]

    dependencies = []
    for agent in request.agents:
        agent_deps = []
        for task in agent.tasks:
            agent_deps.append(set(task.dependencies)) 
        dependencies.append(agent_deps)

    return resources, agent_tasks, dependencies, agent_colors

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development).  **IMPORTANT: Change this for production!**
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

@app.post("/api/schedule/ilp")
def get_ilp_schedule(request: ScheduleRequest):
    try:
        resources, agent_tasks, dependencies, agent_colors = convert_input(request)
        start_time = time.time()
        solution = minimize_max_avg_cost(resources, agent_tasks, dependencies)
        elapsed_time = time.time() - start_time
        return {
            "method": "ILP",
            "solution": solution,
            "z": evaluate_max_agent_cost(solution, len(agent_tasks)),
            "time": elapsed_time,
            "colors": agent_colors,
            "resources" : resources,
            "tasks": agent_tasks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedule/greedy")
def get_greedy_schedule(request: ScheduleRequest):
    try:
        resources, agent_tasks, dependencies, agent_colors = convert_input(request)
        start_time = time.time()
        solution = greedy_schedule(resources, agent_tasks, dependencies)
        elapsed_time = time.time() - start_time

        return {
            "method": "Greedy",
            "solution": solution,
            "z": evaluate_max_agent_cost(solution, len(agent_tasks)),
            "time": elapsed_time,
            "colors": agent_colors,
            "resources" : resources,
            "tasks": agent_tasks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedule/local_search")
def get_local_search_schedule(request: ScheduleRequest):
    try:
        resources, agent_tasks, dependencies, agent_colors = convert_input(request)
        params = request.parameters or HeuristicParams()

        start_time = time.time()
        solution = local_search(
            resources, 
            agent_tasks, 
            dependencies, 
            max_iter=params.maxIterations, 
            candidate_moves=params.maxMoves, 
        )
        elapsed_time = time.time() - start_time

        return {
            "method": "Local Search",
            "solution": solution,
            "z": evaluate_max_agent_cost(solution, len(agent_tasks)),
            "time": elapsed_time,
            "colors": agent_colors,
            "resources": resources,
            "tasks": agent_tasks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedule/simulated_annealing")
def get_simulated_annealing_schedule(request: ScheduleRequest):
    try:
        resources, agent_tasks, dependencies, agent_colors = convert_input(request)
        params = request.parameters or HeuristicParams()

        start_time = time.time()
        solution = simulated_annealing(
            resources, 
            agent_tasks, 
            dependencies, 
            max_iter=params.maxIterations, 
            candidate_moves=params.maxMoves, 
            initial_temperature=params.temperature, 
            cooling_rate=params.coolingRate
        )
        elapsed_time = time.time() - start_time

        return {
            "method": "Simulated Annealing",
            "solution": solution,
            "z": evaluate_max_agent_cost(solution, len(agent_tasks)),
            "time": elapsed_time,
            "colors": agent_colors,
            "resources": resources,
            "tasks": agent_tasks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
