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
        this.currentChartType = 'daily';
        
        // DOM 元素快取
        this.elements = {
            todoList: null,
            todoInput: null,
            addTodoBtn: null,
            todayCycles: null,
            weekCycles: null,
            maxFocusTime: null,
            statsChart: null
        };
        
        // 錯誤處理系統
        this.setupErrorHandling();
        
        // 初始化應用
        this.init();
    }

    // 初始化 DOM 元素快取
    initDOMCache() {
        this.elements.todoList = document.getElementById('todo_list');
        this.elements.todoInput = document.getElementById('todo_input');
        this.elements.addTodoBtn = document.getElementById('add_todo');
        this.elements.todayCycles = document.getElementById('today_cycles');
        this.elements.weekCycles = document.getElementById('week_cycles');
        this.elements.maxFocusTime = document.getElementById('max_focus_time');
        this.elements.statsChart = document.getElementById('statsChart');
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
            // 初始化 DOM 元素快取
            this.initDOMCache();
            
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
        this.elements.addTodoBtn?.addEventListener('click', () => {
            const text = this.elements.todoInput.value.trim();
            if (text) {
                this.addTodo(text);
                this.elements.todoInput.value = '';
            }
        });

        this.elements.todoInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = e.target.value.trim();
                if (text) {
                    this.addTodo(text);
                    e.target.value = '';
                }
            }
        });

        // 統計按鈕
        document.getElementById('daily_stats')?.addEventListener('click', () => {
            this.updateChart('daily');
        });

        document.getElementById('weekly_stats')?.addEventListener('click', () => {
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

        // 監聽計時器開始事件，記錄專注開始時間
        document.addEventListener('timerStarted', (e) => {
            if (e.detail.isWorking) {
                this.pomodoroStats.currentFocusStart = Date.now();
            }
        });

        // 監聽計時器暫停事件，更新最長專注時間
        document.addEventListener('timerPaused', (e) => {
            if (e.detail.isWorking && this.pomodoroStats.currentFocusStart) {
                const currentFocusTime = Math.floor((Date.now() - this.pomodoroStats.currentFocusStart) / 1000 / 60);
                this.pomodoroStats.maxFocusTime = Math.max(this.pomodoroStats.maxFocusTime, currentFocusTime);
                this.pomodoroStats.currentFocusStart = null;
                this.saveStats();
                this.updateStatsDisplay();
            }
        });

        // Timer state is now managed by the Timer class

        // 設定初始化
        this.settings.initEventListeners();
        
        // 無障礙功能初始化
        this.initAccessibility();
    }

    // 初始化無障礙功能
    initAccessibility() {
        // 設定焦點陷阱
        this.setupFocusTrap();
        
        // 設定鍵盤導航
        this.setupKeyboardNavigation();
        
        // 設定 ARIA 即時區域更新
        this.setupAriaLiveRegions();
    }

    // 設定焦點陷阱
    setupFocusTrap() {
        // 確保模態對話框等元素的焦點管理
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.manageFocusOrder(e);
            }
        });
    }

    // 管理焦點順序
    manageFocusOrder(event) {
        const focusableElements = this.getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    // 獲取可聚焦的元素
    getFocusableElements() {
        return Array.from(document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.disabled && el.offsetParent !== null);
    }

    // 設定鍵盤導航
    setupKeyboardNavigation() {
        // 增強現有的鍵盤快捷鍵
        document.addEventListener('keydown', (event) => {
            // 如果用戶正在輸入，不執行額外的快捷鍵
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            const key = event.key.toLowerCase();
            
            switch(key) {
                case 'f':
                    // F 鍵 - 聚焦到待辦事項輸入框
                    event.preventDefault();
                    const todoInput = document.getElementById('todo_input');
                    if (todoInput) {
                        todoInput.focus();
                        this.announceToScreenReader('已聚焦到待辦事項輸入框');
                    }
                    break;
                    
                case 's':
                    // S 鍵 - 聚焦到設定區域
                    event.preventDefault();
                    const settingsSection = document.getElementById('work_time');
                    if (settingsSection) {
                        settingsSection.focus();
                        this.announceToScreenReader('已聚焦到設定區域');
                    }
                    break;
                    
                case 't':
                    // T 鍵 - 聚焦到計時器
                    event.preventDefault();
                    const timerDisplay = document.getElementById('time_display');
                    if (timerDisplay) {
                        timerDisplay.focus();
                        this.announceToScreenReader('已聚焦到計時器顯示');
                    }
                    break;
                    
                case 'escape':
                    // ESC 鍵 - 返回到主要內容
                    event.preventDefault();
                    const mainContent = document.getElementById('main-content');
                    if (mainContent) {
                        mainContent.focus();
                        this.announceToScreenReader('已返回到主要內容');
                    }
                    break;
            }
        });
    }

    // 設定 ARIA 即時區域更新
    setupAriaLiveRegions() {
        // 計時器狀態更新
        this.timerStatusRegion = document.getElementById('timer-status');
        
        // 創建通知區域
        if (!document.getElementById('sr-announcements')) {
            const announcementRegion = document.createElement('div');
            announcementRegion.id = 'sr-announcements';
            announcementRegion.className = 'sr_only';
            announcementRegion.setAttribute('aria-live', 'assertive');
            announcementRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(announcementRegion);
        }
    }

    // 向螢幕閱讀器宣告訊息
    announceToScreenReader(message) {
        const announcementRegion = document.getElementById('sr-announcements');
        if (announcementRegion) {
            announcementRegion.textContent = message;
            // 清除訊息，以便下次宣告
            setTimeout(() => {
                announcementRegion.textContent = '';
            }, 1000);
        }
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
        // 輸入驗證和清理
        const sanitizedText = this.sanitizeInput(text);
        if (!sanitizedText || sanitizedText.length === 0) {
            this.showErrorMessage('請輸入有效的待辦事項內容');
            return;
        }
        
        if (sanitizedText.length > 200) {
            this.showErrorMessage('待辦事項內容不能超過200個字符');
            return;
        }
        
        const todo = {
            id: Date.now(),
            text: sanitizedText,
            completed: false,
            pomodoros: 0
        };
        this.todos.push(todo);
        this.renderTodos();
        this.saveTodos();
        
        // 無障礙通知
        this.announceToScreenReader(`已新增待辦事項：${sanitizedText}`);
    }

    // 輸入清理函數
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        // 移除前後空白
        let sanitized = input.trim();
        
        // 移除潛在的 HTML 標籤
        sanitized = sanitized.replace(/<[^>]*>/g, '');
        
        // 移除特殊字符，只保留中文、英文、數字和基本標點符號
        sanitized = sanitized.replace(/[^\u4e00-\u9fa5\w\s\.\,\!\?\-\(\)\[\]]/g, '');
        
        return sanitized;
    }

    deleteTodo(id) {
        const todo = this.todos.find(todo => todo.id === id);
        const todoText = todo ? todo.text : '';
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.renderTodos();
        this.saveTodos();
        
        // 無障礙通知
        this.announceToScreenReader(`已刪除待辦事項：${todoText}`);
    }

    completeTodo(id) {
        const todo = this.todos.find(todo => todo.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.renderTodos();
            this.saveTodos();
            
            // 無障礙通知
            const statusText = todo.completed ? '已完成' : '標記為未完成';
            this.announceToScreenReader(`${statusText}待辦事項：${todo.text}`);
        }
    }

    startTask(id) {
        this.timer.startTask(id);
    }

    updateCurrentTask() {
        const taskElement = document.querySelector('.current_task');
        if (taskElement) {
            taskElement.classList.remove('current_task');
        }
        
        if (this.currentTaskId) {
            const newTaskElement = document.querySelector(`[data-id="${this.currentTaskId}"]`);
            if (newTaskElement) {
                newTaskElement.classList.add('current_task');
            }
        }
    }

    renderTodos() {
        if (!this.elements.todoList) return;
        
        this.elements.todoList.innerHTML = '';

        this.todos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo_item ${todo.completed ? 'completed' : ''}`;
            li.setAttribute('data-id', todo.id);
            
            // 安全的 DOM 操作，防止 XSS 攻擊
            const textSpan = document.createElement('span');
            textSpan.textContent = `${todo.text} (完成番茄數: ${todo.pomodoros})`;
            
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'todo_controls';
            
            // 創建按鈕
            const startBtn = document.createElement('button');
            startBtn.className = 'start_task';
            startBtn.setAttribute('data-id', todo.id);
            startBtn.textContent = '開始';
            
            const completeBtn = document.createElement('button');
            completeBtn.className = 'complete_task';
            completeBtn.setAttribute('data-id', todo.id);
            completeBtn.textContent = todo.completed ? '取消完成' : '完成';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete_task';
            deleteBtn.setAttribute('data-id', todo.id);
            deleteBtn.textContent = '刪除';
            
            // 添加事件監聽器
            startBtn.addEventListener('click', () => this.startTask(todo.id));
            completeBtn.addEventListener('click', () => this.completeTodo(todo.id));
            deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));
            
            // 組裝 DOM
            controlsDiv.appendChild(startBtn);
            controlsDiv.appendChild(completeBtn);
            controlsDiv.appendChild(deleteBtn);
            
            li.appendChild(textSpan);
            li.appendChild(controlsDiv);
            
            this.elements.todoList.appendChild(li);
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
        if (this.elements.todayCycles) {
            this.elements.todayCycles.textContent = this.pomodoroStats.daily[today] || 0;
        }
        
        // 更新本週完成週期
        if (this.elements.weekCycles) {
            this.elements.weekCycles.textContent = this.pomodoroStats.weekly[weekNumber] || 0;
        }
        
        // 更新最長專注時間
        if (this.elements.maxFocusTime) {
            this.elements.maxFocusTime.textContent = `${this.pomodoroStats.maxFocusTime} 分鐘`;
        }
        
        // 更新圖表
        this.updateChart();
    }

    updateChart(type = 'daily') {
        try {
            if (!this.elements.statsChart || typeof Chart === 'undefined') return;
            
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
            
            const chartData = Object.values(data).slice(-7);
            
            // 如果圖表已存在且類型相同，只更新數據
            if (this.currentChart && this.currentChartType === type) {
                this.currentChart.data.labels = labels;
                this.currentChart.data.datasets[0].data = chartData;
                this.currentChart.data.datasets[0].label = type === 'daily' ? '每日完成週期' : '每週完成週期';
                this.currentChart.update('none'); // 使用 'none' 動畫模式提升效能
                return;
            }
            
            // 如果圖表類型改變，銷毀舊圖表
            if (this.currentChart) {
                this.currentChart.destroy();
            }
            
            const ctx = this.elements.statsChart.getContext('2d');
            this.currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: type === 'daily' ? '每日完成週期' : '每週完成週期',
                        data: chartData,
                        backgroundColor: '#4CAF50',
                        borderColor: '#45a049',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 300 // 減少動畫時間
                    },
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
            
            this.currentChartType = type;
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