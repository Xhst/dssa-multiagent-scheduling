import React, { useState, useEffect } from "react";
import { Agent, Task } from "../types";

interface AgentProps {
  id: number;
  defaultColor: string;
  onChange: (agent: Agent) => void;
  onRemove: (id: number) => void;
}

const AgentComp: React.FC<AgentProps> = ({ id, defaultColor, onChange, onRemove }) => {
  const [color, setColor] = useState(defaultColor);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencyInput, setDependencyInput] = useState<{ [key: number]: string }>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    onChange({ id, color, tasks });
  }, [tasks, color]);

  const handleSizeChange = (taskId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(event.target.value);
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, size: newSize } : task
      )
    );
  };

  const addTask = () => {
    setTasks((prevTasks) => {
      const newTask: Task = { id: prevTasks.length, size: 0, dependencies: [] };
      return [...prevTasks, newTask];
    });
  };

  const removeTask = (taskId: number) => {
    setTasks((prevTasks) => {
      const filteredTasks = prevTasks.filter((task) => task.id !== taskId);
      const updatedTasks = filteredTasks.map((task, index) => ({
        ...task,
        id: index,
        dependencies: task.dependencies.filter((dep) => dep !== taskId),
      }));
      return updatedTasks;
    });
  };

  const addDependency = (taskId: number) => {
    const dependencyId = parseInt(dependencyInput[taskId] || "", 10);
    if (!isNaN(dependencyId) && dependencyId >= 0 && dependencyId <= tasks.length - 1 && dependencyId !== taskId) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId && !task.dependencies.includes(dependencyId)
            ? { ...task, dependencies: [...task.dependencies, dependencyId] }
            : task
        )
      );
    }
    setDependencyInput((prev) => ({ ...prev, [taskId]: "" }));
  };

  const removeDependency = (taskId: number, depId: number) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, dependencies: task.dependencies.filter((dep) => dep !== depId) }
          : task
      )
    );
  };

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center mb-2">
        <h6 className="me-2">Agent {id}</h6>
        <div
          className="color-indicator"
          style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: color }}
        ></div>
        <input
          type="color"
          className="ms-2 form-control form-control-color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Choose agent color"
        />
        <button className="btn btn-danger btn-sm" onClick={() => onRemove(id)}>
        Remove Agent
      </button>
        <button className="btn outline-btn ms-2" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? "Show Tasks ▽" : "Hide Tasks ▷"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mb-2">
          {tasks.map((task) => (
            <div key={task.id}>
              <div className="input-group mb-2">
                <span className="input-group-text">Task {task.id}</span>
                <button className="btn btn-danger" onClick={() => removeTask(task.id)}>Remove</button>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Enter size" 
                  onChange={(e) => handleSizeChange(task.id, e)}
                  required 
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Add dependency"
                  value={dependencyInput[task.id] || ""}
                  onChange={(e) => setDependencyInput({ ...dependencyInput, [task.id]: e.target.value })}
                  required
                />
                <button className="btn btn-primary" onClick={() => addDependency(task.id)}>+</button>
              </div>

              <div className="my-2">
                {task.dependencies.map((dependency, index) => (
                  <span key={index} className="badge bg-secondary text-wrap me-1 d-inline-flex align-items-center">
                    Task {dependency}
                    <button
                      className="btn-close btn-close-white ms-1"
                      onClick={() => removeDependency(task.id, dependency)}
                      style={{ fontSize: "0.7rem" }}
                    ></button>
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button className="btn btn-success btn-sm me-2" onClick={addTask} disabled={isCollapsed}>
            Add Task
          </button>
        </div>
      )}
      <hr />
    </div>
  );
};

export default AgentComp;
