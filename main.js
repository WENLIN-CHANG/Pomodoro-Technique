/**
 * 番茄鐘應用主檔案
 * 使用模組化架構組合各個功能
 */

// 應用級別的狀態管理現在由 PomodoroApp 類別處理

// 應用管理器
class PomodoroApp {
    constructor() {
        // 初始化模組管理器
        this.storage = window.StorageManager;
        this.notifications = window.NotificationManager;
        this.settings = new window.SettingsManager(this.storage, this.notifications);
        this.timer = new window.TimerManager(this.settings, this.notifications);
        
        // 應用狀態
        this.todos = [];
        this.currentTaskId = null;
        this.pomodoroStats = {
            daily: {},
            weekly: {},
            maxFocusTime: 0,
            currentFocusStart: null
        };
        
        // 圖表實例
        this.currentChart = null;
        
        // 錯誤處理系統
        this.setupErrorHandling();
        
        // 初始化應用
        this.init();
    }

    setupErrorHandling() {
        // 全域錯誤處理器
        window.addEventListener('error', (event) => {
            this.handleError(event.error, '應用程式發生未預期的錯誤');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, '非同步操作失敗');
        });
    }

    handleError(error, userMessage = '操作失敗') {
        console.error('Error:', error);
        
        // 顯示用戶友好的錯誤訊息
        this.showErrorMessage(userMessage);
        
        // 可以在這裡添加錯誤報告功能
        // this.reportError(error, userMessage);
    }

    showErrorMessage(message) {
        // 創建或更新錯誤顯示元素
        let errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-message';
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 12px;
                border-radius: 4px;
                z-index: 1000;
                max-width: 300px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // 自動隱藏錯誤訊息
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccessMessage(message) {
        // 創建或更新成功顯示元素
        let successDiv = document.getElementById('success-message');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'success-message';
            successDiv.className = 'success-message';
            successDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #44aa44;
                color: white;
                padding: 12px;
                border-radius: 4px;
                z-index: 1000;
                max-width: 300px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(successDiv);
        }
        
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        // 自動隱藏成功訊息
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }

    async init() {
        try {
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
            
            this.showSuccessMessage('應用程式初始化成功');
        } catch (error) {
            this.handleError(error, '應用程式初始化失敗');
        }
    }

    loadData() {
        try {
            // 載入待辦事項
            this.todos = this.storage.loadTodos();
            this.renderTodos();
            
            // 載入統計數據
            this.pomodoroStats = this.storage.loadStats();
            this.updateStatsDisplay();
            
            // 設定管理器會自動載入時間設定
        } catch (error) {
            this.handleError(error, '載入數據失敗，將使用預設設定');
            // 使用預設數據
            this.todos = [];
            this.pomodoroStats = {
                daily: {},
                weekly: {},
                maxFocusTime: 0,
                currentFocusStart: null
            };
            this.renderTodos();
            this.updateStatsDisplay();
        }
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
            const task = this.todos.find(todo => todo.id === taskId);
            if (task) {
                task.pomodoros++;
                this.saveTodos();
                this.renderTodos();
            }
        });

        document.addEventListener('taskStarted', (e) => {
            this.currentTaskId = e.detail.taskId;
            this.updateCurrentTask();
        });

        // Timer state is now managed by the Timer class

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
                    if (this.todos[index] && !this.todos[index].completed) {
                        this.startTask(this.todos[index].id);
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
        this.todos.push(todo);
        this.renderTodos();
        this.saveTodos();
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.renderTodos();
        this.saveTodos();
    }

    completeTodo(id) {
        const todo = this.todos.find(todo => todo.id === id);
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
        
        if (this.currentTaskId) {
            const newTaskElement = document.querySelector(`[data-id="${this.currentTaskId}"]`);
            if (newTaskElement) {
                newTaskElement.classList.add('current-task');
            }
        }
    }

    renderTodos() {
        const todoList = document.getElementById('todo-list');
        if (!todoList) return;
        
        todoList.innerHTML = '';

        this.todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            li.setAttribute('data-id', todo.id);
            
            li.innerHTML = `
                <span>${todo.text} (完成番茄數: ${todo.pomodoros})</span>
                <div class="todo-controls">
                    <button class="start-task" data-id="${todo.id}">開始</button>
                    <button class="complete-task" data-id="${todo.id}">${todo.completed ? '取消完成' : '完成'}</button>
                    <button class="delete-task" data-id="${todo.id}">刪除</button>
                </div>
            `;
            
            // 添加事件監聽器
            const startBtn = li.querySelector('.start-task');
            const completeBtn = li.querySelector('.complete-task');
            const deleteBtn = li.querySelector('.delete-task');
            
            startBtn.addEventListener('click', () => this.startTask(todo.id));
            completeBtn.addEventListener('click', () => this.completeTodo(todo.id));
            deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));
            
            todoList.appendChild(li);
        });
        this.updateCurrentTask();
    }

    saveTodos() {
        try {
            this.storage.saveTodos(this.todos);
        } catch (error) {
            this.handleError(error, '儲存待辦事項失敗');
        }
    }

    // 統計功能
    updateStats() {
        const today = new Date().toLocaleDateString();
        const weekNumber = this.getWeekNumber(new Date());
        
        // 更新每日統計
        this.pomodoroStats.daily[today] = (this.pomodoroStats.daily[today] || 0) + 1;
        
        // 更新每週統計
        this.pomodoroStats.weekly[weekNumber] = (this.pomodoroStats.weekly[weekNumber] || 0) + 1;
        
        // 更新最長專注時間
        if (this.pomodoroStats.currentFocusStart) {
            const currentFocusTime = Math.floor((Date.now() - this.pomodoroStats.currentFocusStart) / 1000 / 60);
            this.pomodoroStats.maxFocusTime = Math.max(this.pomodoroStats.maxFocusTime, currentFocusTime);
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
            todayCycles.textContent = this.pomodoroStats.daily[today] || 0;
        }
        
        // 更新本週完成週期
        const weekCycles = document.getElementById('week-cycles');
        if (weekCycles) {
            weekCycles.textContent = this.pomodoroStats.weekly[weekNumber] || 0;
        }
        
        // 更新最長專注時間
        const maxFocusTime = document.getElementById('max-focus-time');
        if (maxFocusTime) {
            maxFocusTime.textContent = `${this.pomodoroStats.maxFocusTime} 分鐘`;
        }
        
        // 更新圖表
        this.updateChart();
    }

    updateChart(type = 'daily') {
        try {
            const canvas = document.getElementById('statsChart');
            if (!canvas || typeof Chart === 'undefined') return;
            
            // 銷毀現有圖表
            if (this.currentChart) {
                this.currentChart.destroy();
            }
            
            const ctx = canvas.getContext('2d');
            const data = type === 'daily' ? this.pomodoroStats.daily : this.pomodoroStats.weekly;
        
        // 處理標籤格式
        let labels = Object.keys(data).slice(-7);
        if (type === 'daily') {
            // 將日期格式從 "YYYY/MM/DD" 轉換為 "MM/DD"
            labels = labels.map(dateStr => {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    // 如果日期格式不標準，嘗試其他格式
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        return `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
                    }
                    return dateStr;
                }
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                return `${month}/${day}`;
            });
        }
        
        this.currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
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
        } catch (error) {
            this.handleError(error, '更新圖表失敗');
        }
    }

    saveStats() {
        try {
            this.storage.saveStats(this.pomodoroStats);
        } catch (error) {
            this.handleError(error, '儲存統計數據失敗');
        }
    }

    updateDisplays() {
        this.updateStatsDisplay();
    }
}

// 向後兼容的函數已移除 - 現在使用統一的事件監聽器架構

// 初始化應用
document.addEventListener('DOMContentLoaded', function() {
    window.app = new PomodoroApp();
});