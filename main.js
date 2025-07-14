/**
 * 番茄鐘應用主檔案
 * 使用模組化架構組合各個功能
 */

// 全域變數 (保持向後兼容)
let timer;
let isWorking = true;
let cycleCount = 0;
let workTime = 25 * 60;
let breakTime = 5 * 60;
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
let longBreakTime = 15 * 60;
let sessionsBeforeLongBreak = 4;
let completedSessions = 0;
let timeSettings = {
    workTime: 25,
    breakTime: 5,
    longBreakTime: 15,
    sessionsBeforeLongBreak: 4
};

// 應用管理器
class PomodoroApp {
    constructor() {
        // 初始化模組管理器
        this.storage = window.StorageManager;
        this.notifications = window.NotificationManager;
        this.settings = new window.SettingsManager(this.storage, this.notifications);
        this.timer = new window.TimerManager(this.settings, this.notifications);
        
        // 圖表實例
        this.currentChart = null;
        
        // 初始化應用
        this.init();
    }

    async init() {
        // 請求通知權限
        await this.notifications.requestPermission();
        
        // 載入保存的數據
        this.loadData();
        
        // 設置事件監聽器
        this.setupEventListeners();
        
        // 初始化快捷鍵
        this.setupKeyboardShortcuts();
        
        // 更新顯示
        this.updateDisplays();
    }

    loadData() {
        // 載入待辦事項
        todos = this.storage.loadTodos();
        this.renderTodos();
        
        // 載入統計數據
        pomodoroStats = this.storage.loadStats();
        this.updateStatsDisplay();
        
        // 設定管理器會自動載入時間設定
    }

    setupEventListeners() {
        // 待辦事項相關
        document.getElementById('add-todo')?.addEventListener('click', () => {
            const input = document.getElementById('todo-input');
            const text = input.value.trim();
            if (text) {
                this.addTodo(text);
                input.value = '';
            }
        });

        document.getElementById('todo-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = e.target.value.trim();
                if (text) {
                    this.addTodo(text);
                    e.target.value = '';
                }
            }
        });

        // 統計按鈕
        document.getElementById('daily-stats')?.addEventListener('click', () => {
            this.updateChart('daily');
        });

        document.getElementById('weekly-stats')?.addEventListener('click', () => {
            this.updateChart('weekly');
        });

        // 計時器事件
        document.addEventListener('pomodoroCompleted', (e) => {
            this.updateStats();
        });

        document.addEventListener('taskPomodoroCompleted', (e) => {
            const taskId = e.detail.taskId;
            const task = todos.find(todo => todo.id === taskId);
            if (task) {
                task.pomodoros++;
                this.saveTodos();
                this.renderTodos();
            }
        });

        document.addEventListener('taskStarted', (e) => {
            currentTaskId = e.detail.taskId;
            this.updateCurrentTask();
        });

        document.addEventListener('timerStateChanged', (e) => {
            const state = e.detail;
            isRunning = state.isRunning;
            isWorking = state.isWorking;
            currentTime = state.currentTime;
            cycleCount = state.cycleCount;
            completedSessions = state.completedSessions;
        });

        // 設定初始化
        this.settings.initEventListeners();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // 如果用戶正在輸入框中輸入，則不執行快捷鍵
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const key = event.key.toLowerCase();
            
            switch(key) {
                case ' ': // 空格鍵 - 開始/暫停
                    event.preventDefault();
                    if (this.timer.isTimerRunning()) {
                        this.timer.pause();
                    } else {
                        this.timer.start();
                    }
                    break;
                    
                case 'r': // R鍵 - 重置
                    event.preventDefault();
                    this.timer.reset();
                    break;
                    
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    // 數字鍵 - 快速開始對應的待辦事項
                    event.preventDefault();
                    const index = parseInt(key) - 1;
                    if (todos[index] && !todos[index].completed) {
                        this.startTask(todos[index].id);
                    }
                    break;
            }
        });
    }

    // 待辦事項管理
    addTodo(text) {
        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            pomodoros: 0
        };
        todos.push(todo);
        this.renderTodos();
        this.saveTodos();
    }

    deleteTodo(id) {
        todos = todos.filter(todo => todo.id !== id);
        this.renderTodos();
        this.saveTodos();
    }

    completeTodo(id) {
        const todo = todos.find(todo => todo.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.renderTodos();
            this.saveTodos();
        }
    }

    startTask(id) {
        this.timer.startTask(id);
    }

    updateCurrentTask() {
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

    renderTodos() {
        const todoList = document.getElementById('todo-list');
        if (!todoList) return;
        
        todoList.innerHTML = '';

        todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.setAttribute('data-id', todo.id);
            
            li.innerHTML = `
                <span>${todo.text} (完成番茄數: ${todo.pomodoros})</span>
                <div class="todo-controls">
                    <button class="start-task" onclick="app.startTask(${todo.id})">開始</button>
                    <button class="complete-task" onclick="app.completeTodo(${todo.id})">${todo.completed ? '取消完成' : '完成'}</button>
                    <button class="delete-task" onclick="app.deleteTodo(${todo.id})">刪除</button>
                </div>
            `;
            
            todoList.appendChild(li);
        });
        this.updateCurrentTask();
    }

    saveTodos() {
        this.storage.saveTodos(todos);
    }

    // 統計功能
    updateStats() {
        const today = new Date().toLocaleDateString();
        const weekNumber = this.getWeekNumber(new Date());
        
        // 更新每日統計
        pomodoroStats.daily[today] = (pomodoroStats.daily[today] || 0) + 1;
        
        // 更新每週統計
        pomodoroStats.weekly[weekNumber] = (pomodoroStats.weekly[weekNumber] || 0) + 1;
        
        // 更新最長專注時間
        if (pomodoroStats.currentFocusStart) {
            const currentFocusTime = Math.floor((Date.now() - pomodoroStats.currentFocusStart) / 1000 / 60);
            pomodoroStats.maxFocusTime = Math.max(pomodoroStats.maxFocusTime, currentFocusTime);
        }
        
        this.saveStats();
        this.updateStatsDisplay();
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    updateStatsDisplay() {
        const today = new Date().toLocaleDateString();
        const weekNumber = this.getWeekNumber(new Date());
        
        // 更新今日完成週期
        const todayCycles = document.getElementById('today-cycles');
        if (todayCycles) {
            todayCycles.textContent = pomodoroStats.daily[today] || 0;
        }
        
        // 更新本週完成週期
        const weekCycles = document.getElementById('week-cycles');
        if (weekCycles) {
            weekCycles.textContent = pomodoroStats.weekly[weekNumber] || 0;
        }
        
        // 更新最長專注時間
        const maxFocusTime = document.getElementById('max-focus-time');
        if (maxFocusTime) {
            maxFocusTime.textContent = `${pomodoroStats.maxFocusTime} 分鐘`;
        }
        
        // 更新圖表
        this.updateChart();
    }

    updateChart(type = 'daily') {
        const canvas = document.getElementById('statsChart');
        if (!canvas || typeof Chart === 'undefined') return;
        
        // 銷毀現有圖表
        if (this.currentChart) {
            this.currentChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const data = type === 'daily' ? pomodoroStats.daily : pomodoroStats.weekly;
        
        this.currentChart = new Chart(ctx, {
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

    saveStats() {
        this.storage.saveStats(pomodoroStats);
    }

    updateDisplays() {
        this.updateStatsDisplay();
    }
}

// 向後兼容的函數
function startTimer() {
    if (window.app) {
        window.app.timer.start();
    }
}

function pauseTimer() {
    if (window.app) {
        window.app.timer.pause();
    }
}

function resetTimer() {
    if (window.app) {
        window.app.timer.reset();
    }
}

function startTask(id) {
    if (window.app) {
        window.app.startTask(id);
    }
}

function deleteTodo(id) {
    if (window.app) {
        window.app.deleteTodo(id);
    }
}

function completeTodo(id) {
    if (window.app) {
        window.app.completeTodo(id);
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', function() {
    window.app = new PomodoroApp();
});