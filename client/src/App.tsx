import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import ResourceComp from "./components/Resource";
import AgentComp from "./components/Agent";
import { Agent, Resource, SolvingMethod, Solution, HeuristicParams } from "./types";

const url = "http://localhost:8000";

async function solve(resources: Resource[], agents: Agent[], solvingMethod: SolvingMethod = "greedy", parameters: HeuristicParams = {}) {
  try {
    const data = JSON.stringify({ resources, agents, parameters });
    const response = await axios.post(`${url}/api/schedule/${solvingMethod}`, data, {
      headers: {
          'Content-Type': 'application/json'
      }
  });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
  }
  return null;
}

function App() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [solvingMethod, setSolvingMethod] = useState<SolvingMethod>("greedy");
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(false);
  const [parameters, setParameters] = useState<HeuristicParams>({
    maxIterations: 1000,
    maxMoves: 100,
    temperature: 1,
    coolingRate: 0.99,
  });

  const handleSolve = async () => {
    setLoading(true);
    const response = await solve(resources, agents, solvingMethod, parameters);
    if (response && response.solution && response.tasks) {
      const sol: Solution = {
        method: response.method,
        solution: response.solution,
        z: response.z,
        time: response.time,
        colors: agents.map((agent) => agent.color),
        resources: resources.map((resource) => resource.size),
        tasks: response.tasks,
      };
      setSolution(sol);
      setLoading(false);
    }
  };

  const handleParameterChange = (param: keyof HeuristicParams, value: number) => {
    setParameters((prev) => ({ ...prev, [param]: value }));
  };

  useEffect(() => {
  }, [resources, agents]);

  const addResource = () => {
    const newResource = {
      id: resources.length,  // Nuovo id consecutivo
      size: 0, // Partiamo con una dimensione di 0
    };
    setResources([...resources, newResource]);
  };

  const removeResource = (id: number) => {
    const newResources = resources.filter((resource) => resource.id !== id);
    // Ricalcoliamo gli ID in modo che siano consecutivi
    const updatedResources = newResources.map((resource, index) => ({
      ...resource,
      id: index,  // Ricalcoliamo gli ID in base all'indice
    }));
    setResources(updatedResources);
  };

  // Funzione per aggiornare la dimensione di una risorsa
  const handleSizeChange = (id: number, newSize: number) => {
    setResources(
      resources.map((resource) =>
        resource.id === id ? { ...resource, size: newSize } : resource
      )
    );
  };

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const addAgent = () => {
    const newAgent = {
      id: agents.length,
      color: getRandomColor(),
      tasks : [],
    };
    setAgents([...agents, newAgent]);
  };

  const removeAgent = (id: number) => {
    const newAgents = agents.filter((agent) => agent.id !== id);
    // Ricalcoliamo gli ID in modo che siano consecutivi
    const updatedAgents = newAgents.map((agent, index) => ({
      ...agent,
      id: index,  // Ricalcoliamo gli ID in base all'indice
    }));
    setAgents(updatedAgents);
  };

  const handleAgentChange = (agent: Agent) => {
    setAgents(
      agents.map((a) =>
        a.id === agent.id ? agent : a
      )
    );
  };

  return (
    <div className="container my-4">
      <h2 className="text-secondary fs-4">Decision Support Systems and Analytics</h2>
      <h1 className="fs-3">Multi-Agent Task Scheduling with Priority Constraints and Limited Resources</h1>
      <hr />

      <div className="row">
        {/* Sezione Risorse */}
        <div className="col-md-4">
          <button className="btn btn-primary mb-3" onClick={addResource}>
            Add Resource
          </button>
          <div>
          {resources.map((resource) => (
              <ResourceComp
                key={resource.id}
                id={resource.id}
                size={resource.size}
                onSizeChange={handleSizeChange}
                onRemove={removeResource}
              />
            ))}
          </div>
        </div>

        {/* Sezione Agenti */}
        <div className="col-md-8">
          <button className="btn btn-secondary mb-3" onClick={addAgent}>
            Add Agent
          </button>
            {agents.map((agent) => (
              <AgentComp
                key={agent.id}
                id={agent.id}
                defaultColor={agent.color}
                onChange={handleAgentChange}
                onRemove={removeAgent}
              />
            ))}
        </div>
      </div>
      <div className="input-group my-3 w-50">
        <label className="input-group-text">Solving Method</label>
        <select className="form-select" aria-label="Solving method" value={solvingMethod} onChange={(e) => setSolvingMethod(e.target.value as SolvingMethod)}>
          <option value="greedy">Greedy</option>
          <option value="ilp">Integer Linear Programming</option>
          <option value="local_search">Local Search</option>
          <option value="simulated_annealing">Simulated Annealing</option>
        </select>
        <button className="btn btn-success" onClick={handleSolve}>
          {loading == true ? (
            <>
            <span className="spinner-border spinner-grow-sm" aria-hidden="true"></span>
            <span role="status">&nbsp;&nbsp;Solving...</span>
            </>
          ) : (
            "Solve"
          )}
        </button>
      </div>

      {(solvingMethod == "local_search" || solvingMethod == "simulated_annealing") && (
        <div className="mb-3">
          <div className="row">
            <div className="col-6">
              <label>Max Iterations</label>
              <input type="number" className="form-control" value={parameters.maxIterations} onChange={(e) => handleParameterChange("maxIterations", Number(e.target.value))} />
            </div>
            <div className="col-6">
              <label>Max Moves Without Improvement</label>
              <input type="number" className="form-control" value={parameters.maxMoves} onChange={(e) => handleParameterChange("maxMoves", Number(e.target.value))} />
            </div>
          {solvingMethod === "simulated_annealing" && (
            <>
              <div className="col-6">
                <label>Temperature</label>
                <input type="number" className="form-control" value={parameters.temperature} onChange={(e) => handleParameterChange("temperature", Number(e.target.value))} />
              </div>
              <div className="col-6">
                <label>Cooling Rate</label>
                <input type="number" className="form-control" value={parameters.coolingRate} onChange={(e) => handleParameterChange("coolingRate", Number(e.target.value))} />
              </div>
            </>
          )}
        </div>
        </div>
      )}

      <hr className="my-5" />
      {solution ? (
        <>
          <h5 className="d-block py-3 mb-3">Solution ({solution.method}) generated in {solution.time} seconds with a score of {solution.z}</h5>
          <h4>{solution.colors.map((color, index) => (
            <span className="badge me-2 mb-2" style={{ backgroundColor: color }} key={index}>
              Agent {index}
            </span>
          ))}</h4>
          <div id="container" className="rectangle-container pb-5 mb-5">
            <div className="d-flex gap-3 pb-5">
              {solution.solution.map((assignments, resourceIndex) => (
                <div key={resourceIndex} className="rectangle" style={{ 
                  width: "100px", 
                  height: `${solution.resources[resourceIndex] * 30 + 33}px`, 
                  border: "1px solid black", 
                  position: "relative",
                  alignItems: "center",
                  backgroundColor: "#f8f9fa",
                  paddingTop: "33px",
                }}>
                  <div className="w-100 p-1" style={{ 
                    height: "33px", 
                    backgroundColor: "#e9ecef", 
                    fontWeight: "bold",
                    position: "absolute",
                    left: "0",
                    top: "0",
                    textAlign: "center",
                    borderBottom: "1px solid black",
                  }}>Resource {resourceIndex}</div>
                  {assignments.map(([agentId, taskId], index) => (
                    <div 
                      key={index} 
                      className="inner-rectangle w-100 d-flex justify-content-center" 
                      style={{
                        height: `${solution.tasks[agentId][taskId] * 30}px`,
                        backgroundColor: solution.colors[agentId],
                        color: "white",
                        alignItems: "center",
                        border: "1px solid white"
                      }}
                    >
                      {solution.tasks[agentId][taskId]}
                    </div>
                  ))}
                </div>
                
              ))}
            </div>
          </div>
        </>
      ) : (
        <p>No solution available yet.</p>
      )}
    </div>
  );
}

export default App;
