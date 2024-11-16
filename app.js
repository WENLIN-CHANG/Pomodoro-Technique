let timer;
let isWorking = true;
let cycleCount = 0;
let workTime = 25 * 60; // 25 分鐘 (以秒為單位)
let breakTime = 5 * 60; // 5 分鐘 (以秒為單位)
let currentTime = workTime;
let todos = [];
let currentTaskId = null;

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('pause-btn').addEventListener('click', pauseTimer);
document.getElementById('reset-btn').addEventListener('click', resetTimer);

function startTimer() {
    timer = setInterval(updateTimer, 1000);
}

function pauseTimer() {
    clearInterval(timer);
}

function resetTimer() {
    pauseTimer();
    currentTime = isWorking ? workTime : breakTime;
    updateTimerDisplay();
    isWorking = true;
    cycleCount = 0;
    updateCycleCount();
}

function updateTimer() {
    currentTime--;
    updateTimerDisplay();

    if (currentTime === 0) {
        if (isWorking) {
            isWorking = false;
            currentTime = breakTime;
            alert('休息時間到了!');
        } else {
            isWorking = true;
            currentTime = workTime;
            cycleCount++;
            updateCycleCount();
            alert('工作時間到了!');
        }
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    document.getElementById('time-display').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateCycleCount() {
    document.getElementById('cycle-count').textContent = cycleCount;
}

function addTodo(text) {
    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        pomodoros: 0
    };
    todos.push(todo);
    renderTodos();
    saveTodos();
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    renderTodos();
    saveTodos();
}

function completeTodo(id) {
    const todo = todos.find(todo => todo.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        renderTodos();
        saveTodos();
    }
}

function startTask(id) {
    currentTaskId = id;
    resetTimer();
    startTimer();
    updateCurrentTask();
}

function updateCurrentTask() {
    const taskElement = document.querySelector('.current-task');
    if (taskElement) {
        taskElement.classList.remove('current-task');
    }
    
    if (currentTaskId) {
        const newTaskElement = document.querySelector(`[data-id="${currentTaskId}"]`);
        if (newTaskElement) {
            newTaskElement.classList.add('current-task');
        }
    }
}

function renderTodos() {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', todo.id);
        
        li.innerHTML = `
            <span>${todo.text} (完成番茄數: ${todo.pomodoros})</span>
            <div class="todo-controls">
                <button class="start-task" onclick="startTask(${todo.id})">開始</button>
                <button class="complete-task" onclick="completeTodo(${todo.id})">${todo.completed ? '取消完成' : '完成'}</button>
                <button class="delete-task" onclick="deleteTodo(${todo.id})">刪除</button>
            </div>
        `;
        
        todoList.appendChild(li);
    });
    updateCurrentTask();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
        renderTodos();
    }
}