/**
 * 計時器核心邏輯模組
 * 處理番茄鐘的核心計時功能
 */
class TimerManager {
    constructor(settingsManager, notificationManager) {
        this.settings = settingsManager;
        this.notifications = notificationManager;
        
        // 計時器狀態
        this.timer = null;
        this.isRunning = false;
        this.isWorking = true;
        this.currentTime = 0;
        this.cycleCount = 0;
        this.completedSessions = 0;
        this.currentTaskId = null;
        
        // 高精度計時器
        this.startTime = null;
        this.pausedTime = 0;
        this.originalDuration = 0;
        
        // 統計相關
        this.currentFocusStart = null;
        
        // 初始化
        this.initializeTimer();
        this.setupEventListeners();
    }

    /**
     * 初始化計時器
     */
    initializeTimer() {
        this.currentTime = this.settings.getTimeInSeconds('work');
        this.updateDisplay();
        this.updateSessionDisplay();
    }

    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        // 監聽設定更新事件
        document.addEventListener('settingsUpdated', () => {
            this.handleSettingsUpdate();
        });

        // 監聽按鈕事件
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');

        if (startBtn) startBtn.addEventListener('click', () => this.start());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
        if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
    }

    /**
     * 開始計時器
     */
    start() {
        if (this.isRunning) {
            return;
        }

        if (this.timer) {
            clearInterval(this.timer);
        }

        this.isRunning = true;
        
        // 記錄專注開始時間
        if (this.isWorking) {
            this.currentFocusStart = Date.now();
        }

        // 高精度計時器初始化
        if (this.startTime === null) {
            // 第一次開始
            this.startTime = Date.now();
            this.originalDuration = this.currentTime;
            this.pausedTime = 0;
        } else {
            // 從暫停狀態重新開始
            this.startTime = Date.now();
        }

        this.timer = setInterval(() => this.tick(), 100); // 更高頻率更新
        this.triggerStateChanged();
    }

    /**
     * 暫停計時器
     */
    pause() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        // 計算已暫停的時間
        if (this.startTime) {
            this.pausedTime += Date.now() - this.startTime;
        }
        
        this.isRunning = false;
        this.triggerStateChanged();
    }

    /**
     * 重置計時器
     */
    reset() {
        this.pause();
        this.currentTime = this.isWorking ? 
            this.settings.getTimeInSeconds('work') : 
            this.settings.getTimeInSeconds('break');
        this.completedSessions = 0;
        
        // 重置高精度計時器變數
        this.startTime = null;
        this.pausedTime = 0;
        this.originalDuration = 0;
        
        this.updateDisplay();
        this.updateSessionDisplay();
        this.triggerStateChanged();
    }

    /**
     * 計時器滴答
     */
    tick() {
        if (!this.isRunning) return;
        
        // 使用高精度時間計算
        const elapsed = (Date.now() - this.startTime + this.pausedTime) / 1000;
        const remainingTime = Math.max(0, this.originalDuration - elapsed);
        
        this.currentTime = Math.ceil(remainingTime);
        this.updateDisplay();

        if (this.currentTime === 0) {
            this.handleTimeUp();
        }
    }

    /**
     * 處理時間到
     */
    handleTimeUp() {
        if (this.isWorking) {
            // 工作時段結束
            this.handleWorkPeriodEnd();
        } else {
            // 休息時段結束
            this.handleBreakPeriodEnd();
        }
    }

    /**
     * 處理工作時段結束
     */
    handleWorkPeriodEnd() {
        // 更新任務番茄數
        if (this.currentTaskId) {
            this.triggerTaskCompleted(this.currentTaskId);
        }

        this.completedSessions++;
        this.cycleCount++;
        
        // 更新統計
        this.updateStats();

        // 檢查是否需要長休息
        if (this.completedSessions >= this.settings.getSessionsBeforeLongBreak()) {
            this.currentTime = this.settings.getTimeInSeconds('longBreak');
            this.completedSessions = 0;
            this.notifications.showLongBreakNotification();
        } else {
            this.currentTime = this.settings.getTimeInSeconds('break');
            this.notifications.showWorkEndNotification();
        }

        this.isWorking = false;
        this.updateDisplay();
        this.updateCycleCount();
        this.updateSessionDisplay();
    }

    /**
     * 處理休息時段結束
     */
    handleBreakPeriodEnd() {
        this.isWorking = true;
        this.currentTime = this.settings.getTimeInSeconds('work');
        this.notifications.showBreakEndNotification();
        this.updateDisplay();
    }

    /**
     * 更新顯示
     */
    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            timeDisplay.textContent = timeString;
        }

        // 更新頁面標題
        document.title = `${timeString} - 番茄鐘`;
    }

    /**
     * 更新週期計數顯示
     */
    updateCycleCount() {
        const cycleCountElement = document.getElementById('cycle-count');
        if (cycleCountElement) {
            cycleCountElement.textContent = this.cycleCount;
        }
    }

    /**
     * 更新工作時段顯示
     */
    updateSessionDisplay() {
        const remainingSessions = this.settings.getSessionsBeforeLongBreak() - this.completedSessions;
        const sessionsCountElement = document.getElementById('sessions-count');
        if (sessionsCountElement) {
            sessionsCountElement.textContent = `距離長休息還有 ${remainingSessions} 個工作時段`;
        }
    }

    /**
     * 更新統計
     */
    updateStats() {
        // 觸發統計更新事件
        const event = new CustomEvent('pomodoroCompleted', {
            detail: {
                focusTime: this.currentFocusStart ? 
                    Math.floor((Date.now() - this.currentFocusStart) / 1000 / 60) : 0,
                completedAt: new Date()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 處理設定更新
     */
    handleSettingsUpdate() {
        // 如果計時器正在運行，不自動重置
        if (!this.isRunning) {
            this.reset();
        }
    }

    /**
     * 開始特定任務
     * @param {string} taskId - 任務ID
     */
    startTask(taskId) {
        this.currentTaskId = taskId;
        
        // 重置並開始計時器
        this.reset();
        this.start();
        
        // 觸發任務開始事件
        this.triggerTaskStarted(taskId);
    }

    /**
     * 觸發狀態變更事件
     */
    triggerStateChanged() {
        const event = new CustomEvent('timerStateChanged', {
            detail: {
                isRunning: this.isRunning,
                isWorking: this.isWorking,
                currentTime: this.currentTime,
                cycleCount: this.cycleCount,
                completedSessions: this.completedSessions
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * 觸發任務開始事件
     * @param {string} taskId
     */
    triggerTaskStarted(taskId) {
        const event = new CustomEvent('taskStarted', {
            detail: { taskId }
        });
        document.dispatchEvent(event);
    }

    /**
     * 觸發任務完成事件
     * @param {string} taskId
     */
    triggerTaskCompleted(taskId) {
        const event = new CustomEvent('taskPomodoroCompleted', {
            detail: { taskId }
        });
        document.dispatchEvent(event);
    }

    /**
     * 獲取當前狀態
     * @returns {Object}
     */
    getState() {
        return {
            isRunning: this.isRunning,
            isWorking: this.isWorking,
            currentTime: this.currentTime,
            cycleCount: this.cycleCount,
            completedSessions: this.completedSessions,
            currentTaskId: this.currentTaskId
        };
    }

    /**
     * 檢查是否正在運行
     * @returns {boolean}
     */
    isTimerRunning() {
        return this.isRunning;
    }

    /**
     * 檢查是否在工作時段
     * @returns {boolean}
     */
    isWorkPeriod() {
        return this.isWorking;
    }

    /**
     * 獲取剩餘時間（秒）
     * @returns {number}
     */
    getRemainingTime() {
        return this.currentTime;
    }

    /**
     * 獲取完成的週期數
     * @returns {number}
     */
    getCompletedCycles() {
        return this.cycleCount;
    }

    /**
     * 銷毀計時器
     */
    destroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.isRunning = false;
    }
}

// 導出類別
window.TimerManager = TimerManager;