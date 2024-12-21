// Elements
const resourcesContainer = document.getElementById('resources-container')!;
const addResourceBtn = document.getElementById('add-resource-btn')!;
const agentsContainer = document.getElementById('agents-container')!;
const addAgentBtn = document.getElementById('add-agent-btn')!;

// Counters for dynamic IDs
let resourceCount = 0;
let agentCount = 0;

// Function to add a resource form
addResourceBtn.addEventListener('click', () => {
  resourceCount++;
  const resourceRow = document.createElement('div');
  resourceRow.className = 'input-group mb-2';
  resourceRow.id = `resource-${resourceCount}`;

  resourceRow.innerHTML = `
    <span class="input-group-text">Resource ${resourceCount}</span>
    <input type="number" class="form-control" placeholder="Enter size" required>
    <button class="btn btn-danger" onclick="removeElement('resource-${resourceCount}')">Remove</button>
  `;

  resourcesContainer.appendChild(resourceRow);
});

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

addAgentBtn.addEventListener('click', () => {
  agentCount++;
  const agentRow = document.createElement('div');
  agentRow.className = 'mb-3';
  agentRow.id = `agent-${agentCount}`;

  const defaultColor = getRandomColor();

  agentRow.innerHTML = `
    <div class="d-flex align-items-center mb-2">
      <h6 class="me-2">Agent ${agentCount}</h6>
      <div class="color-indicator" id="color-indicator-${agentCount}" 
        style="width: 16px; height: 16px; border-radius: 50%; background-color: ${defaultColor};"></div>
      <input type="color" id="color-picker-${agentCount}" 
        class="ms-2 form-control form-control-color" value="${defaultColor}" 
        title="Choose agent color">
    </div>
    <div id="tasks-container-${agentCount}" class="mb-2"></div>
    <button class="btn btn-success btn-sm" onclick="addTask(${agentCount})">Add Task</button>
    <button class="btn btn-danger btn-sm" onclick="removeElement('agent-${agentCount}')">Remove Agent</button>
    <hr>
  `;

  const colorPicker = agentRow.querySelector(`#color-picker-${agentCount}`) as HTMLInputElement;
  const colorIndicator = agentRow.querySelector(`#color-indicator-${agentCount}`) as HTMLDivElement;

  colorPicker.addEventListener('input', (event) => {
    const newColor = (event.target as HTMLInputElement).value;
    colorIndicator.style.backgroundColor = newColor;
  });

  agentsContainer.appendChild(agentRow);
});


// Oggetto per tenere traccia dei contatori dei task per ciascun agente
const taskCounts: { [agentId: number]: number } = {};
const taskDependencies: { [taskId: string]: Set<number> } = {};

(window as any).addTask = (agentId: number) => {
  if (!taskCounts[agentId]) {
    taskCounts[agentId] = 0; // Inizializza il contatore se non esiste
  }
  
  taskCounts[agentId]++; // Incrementa il contatore dei task per l'agente specifico
  const tasksContainer = document.getElementById(`tasks-container-${agentId}`)!;

  const taskId = `agent-${agentId}-task-${taskCounts[agentId]}`;
  const taskRow = document.createElement('div');
  taskRow.className = 'input-group mb-2';
  taskRow.id = taskId;

  taskRow.innerHTML = `
    <span class="input-group-text">Task ${taskCounts[agentId]}</span>
    <button class="btn btn-danger" onclick="removeTask(${agentId}, '${taskId}')">Remove</button>
    <input type="number" class="form-control" placeholder="Enter size" required>
    <input type="text" id="${taskId}-dependency-input" class="form-control" placeholder="Add dependency" required>
    <button class="btn btn-primary" onclick="addDependency(${agentId}, '${taskId}')">+</button>
  `;

  const dependenciesContainer = document.createElement('div');
  dependenciesContainer.id = `${taskId}-dependencies`;
  dependenciesContainer.className = 'mt-2';

  tasksContainer.appendChild(taskRow);
  tasksContainer.appendChild(dependenciesContainer);
};

// Funzione per aggiungere una dipendenza
(window as any).addDependency = (agentId: number, taskId: string) => {
  const inputElement = document.getElementById(`${taskId}-dependency-input`) as HTMLInputElement;
  const dependenciesContainer = document.getElementById(`${taskId}-dependencies`)!;

  const dependencyValue = inputElement.value.trim();
  if (!dependencyValue) {
    alert('Please enter a valid dependency.');
    return;
  }

  // Crea un badge per la dipendenza
  const dependencyBadge = document.createElement('span');
  dependencyBadge.className = 'badge bg-secondary text-wrap me-1 d-inline-flex align-items-center';
  dependencyBadge.innerText = `Task ${dependencyValue}`;

  const removeButton = document.createElement('button');
  removeButton.className = 'btn-close btn-close-white ms-1';
  removeButton.setAttribute('aria-label', 'Remove');
  removeButton.style.fontSize = '0.7rem';
  removeButton.addEventListener('click', () => {
    dependencyBadge.remove(); // Rimuove il badge
  });

  dependencyBadge.appendChild(removeButton);
  dependenciesContainer.appendChild(dependencyBadge);

  // Pulisci l'input
  inputElement.value = '';
};

// Funzione per rimuovere un task
(window as any).removeTask = (agentId: number, taskId: string) => {
  const taskElement = document.getElementById(taskId);
  const dependenciesElement = document.getElementById(`${taskId}-dependencies`);

  if (taskElement) {
    taskElement.remove();
  }

  if (dependenciesElement) {
    dependenciesElement.remove();
  }
};

// Funzione per rimuovere un elemento generico
(window as any).removeElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
};

