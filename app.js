let timer;
let isWorking = true;
let cycleCount = 0;
let workTime = 25 * 60; // 25 分鐘 (以秒為單位)
let breakTime = 5 * 60; // 5 分鐘 (以秒為單位)
let currentTime = workTime;
let todos = [];
let currentTaskId = null;
let isRunning = false;
let pomodoroStats = {
    daily: {},
    weekly: {},
    maxFocusTime: 0,
    currentFocusStart: null
};
const longBreakTime = 15 * 60; // 15分鐘的長休息
const sessionsBeforeLongBreak = 4; // 4個工作時段後進行長休息
let completedSessions = 0; // 追蹤完成的工作時段數

document.getElementById('start-btn').addEventListener('click', startTimer);
document.getElementById('pause-btn').addEventListener('click', pauseTimer);
document.getElementById('reset-btn').addEventListener('click', resetTimer);

function startTimer() {
    if (isRunning) {
        return;
    }
    if (timer) {
        clearInterval(timer);
    }
    isRunning = true;
    pomodoroStats.currentFocusStart = Date.now();
    timer = setInterval(updateTimer, 1000);
}

function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
}

function resetTimer() {
    pauseTimer();
    currentTime = isWorking ? workTime : breakTime;
    updateTimerDisplay();
    isRunning = false;
    completedSessions = 0; // 重置完成的工作時段計數
    updateSessionDisplay(); // 更新顯示
}

function updateTimer() {
    currentTime--;
    updateTimerDisplay();

    if (currentTime === 0) {
        if (isWorking) {
            // 工作時段結束
            if (currentTaskId) {
                const currentTask = todos.find(todo => todo.id === currentTaskId);
                if (currentTask) {
                    currentTask.pomodoros++;
                    saveTodos();
                    renderTodos();
                }
            }
            
            completedSessions++; // 增加完成的工作時段計數
            
            // 檢查是否需要進行長休息
            if (completedSessions >= sessionsBeforeLongBreak) {
                currentTime = longBreakTime;
                completedSessions = 0; // 重置計數
                alert('恭喜完成 4 個工作時段！現在進入 15 分鐘的長休息。');
            } else {
                currentTime = breakTime;
                alert('休息時間到了!');
            }
            
            isWorking = false;
            cycleCount++;
            updateCycleCount();
            updateSessionDisplay(); // 新增：更新顯示
            
        } else {
            // 休息時段結束
            isWorking = true;
            currentTime = workTime;
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
    // 如果有正在運行的計時器，先停止它
    if (timer) {
        clearInterval(timer);
    }
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

function loadStats() {
    const savedStats = localStorage.getItem('pomodoroStats');
    if (savedStats) {
        pomodoroStats = JSON.parse(savedStats);
        updateStatsDisplay();
    }
}

function saveStats() {
    localStorage.setItem('pomodoroStats', JSON.stringify(pomodoroStats));
}

function updateStats() {
    const today = new Date().toLocaleDateString();
    const weekNumber = getWeekNumber(new Date());
    
    // 更新每日統計
    pomodoroStats.daily[today] = (pomodoroStats.daily[today] || 0) + 1;
    
    // 更新每週統計
    pomodoroStats.weekly[weekNumber] = (pomodoroStats.weekly[weekNumber] || 0) + 1;
    
    // 更新最長專注時間
    const currentFocusTime = Math.floor((Date.now() - pomodoroStats.currentFocusStart) / 1000 / 60);
    pomodoroStats.maxFocusTime = Math.max(pomodoroStats.maxFocusTime, currentFocusTime);
    
    saveStats();
    updateStatsDisplay();
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function updateStatsDisplay() {
    const today = new Date().toLocaleDateString();
    const weekNumber = getWeekNumber(new Date());
    
    // 更新今日完成週期
    document.getElementById('today-cycles').textContent = pomodoroStats.daily[today] || 0;
    
    // 更新本週完成週期
    document.getElementById('week-cycles').textContent = pomodoroStats.weekly[weekNumber] || 0;
    
    // 更新最長專注時間
    document.getElementById('max-focus-time').textContent = 
        `${pomodoroStats.maxFocusTime} 分鐘`;
    
    // 更新圖表
    updateChart();
}

function updateChart(type = 'daily') {
    const ctx = document.getElementById('statsChart').getContext('2d');
    const data = type === 'daily' ? pomodoroStats.daily : pomodoroStats.weekly;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data).slice(-7),
            datasets: [{
                label: type === 'daily' ? '每日完成週期' : '每週完成週期',
                data: Object.values(data).slice(-7),
                backgroundColor: '#4CAF50',
                borderColor: '#45a049',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 添加新函數：更新工作時段顯示
function updateSessionDisplay() {
    const remainingSessions = sessionsBeforeLongBreak - completedSessions;
    document.getElementById('sessions-count').textContent = `距離長休息還有 ${remainingSessions} 個工作時段`;
}

document.addEventListener('DOMContentLoaded', function() {
    // 載入已保存的待辦事項
    loadTodos();
    
    // 添加待辦事項的事件監聽
    document.getElementById('add-todo').addEventListener('click', function() {
        const input = document.getElementById('todo-input');
        const text = input.value.trim();
        
        if (text) {
            addTodo(text);
            input.value = '';
        }
    });

    // 為輸入框添加按下 Enter 鍵的事件
    document.getElementById('todo-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const text = this.value.trim();
            if (text) {
                addTodo(text);
                this.value = '';
            }
        }
    });

    loadStats();
    
    // 添加統計按鈕事件監聽器
    document.getElementById('daily-stats').addEventListener('click', () => {
        updateChart('daily');
    });
    
    document.getElementById('weekly-stats').addEventListener('click', () => {
        updateChart('weekly');
    });

    updateSessionDisplay(); // 初始化工作時段顯示
});