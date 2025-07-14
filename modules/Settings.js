/**
 * 時間設定管理模組
 * 處理用戶自訂時間設定的邏輯
 */
class SettingsManager {
    constructor(storageManager, notificationManager) {
        this.storage = storageManager;
        this.notifications = notificationManager;
        
        // 預設設定
        this.defaultSettings = {
            workTime: 25,
            breakTime: 5,
            longBreakTime: 15,
            sessionsBeforeLongBreak: 4
        };

        // 當前設定
        this.settings = { ...this.defaultSettings };
        
        // 驗證規則
        this.validationRules = {
            workTime: { min: 1, max: 60 },
            breakTime: { min: 1, max: 30 },
            longBreakTime: { min: 1, max: 60 },
            sessionsBeforeLongBreak: { min: 2, max: 10 }
        };

        // 載入保存的設定
        this.loadSettings();
    }

    /**
     * 載入設定
     */
    loadSettings() {
        const savedSettings = this.storage.loadTimeSettings();
        this.settings = { ...this.defaultSettings, ...savedSettings };
        this.updateUI();
    }

    /**
     * 保存設定
     * @returns {boolean} 是否成功
     */
    saveSettings() {
        // 從 UI 獲取設定值
        const newSettings = this.getSettingsFromUI();
        
        // 驗證設定
        const validation = this.validateSettings(newSettings);
        if (!validation.isValid) {
            alert(`設定錯誤: ${validation.errors.join(', ')}`);
            return false;
        }

        // 更新設定
        this.settings = newSettings;
        
        // 保存到本地儲存
        const success = this.storage.saveTimeSettings(this.settings);
        
        if (success) {
            this.notifications.showSettingsSavedNotification();
            // 觸發設定更新事件
            this.triggerSettingsUpdated();
        } else {
            alert('保存設定失敗！');
        }

        return success;
    }

    /**
     * 重置設定為預設值
     */
    resetSettings() {
        this.settings = { ...this.defaultSettings };
        this.updateUI();
        
        // 自動保存
        const success = this.storage.saveTimeSettings(this.settings);
        
        if (success) {
            this.notifications.showSettingsResetNotification();
            this.triggerSettingsUpdated();
        }
    }

    /**
     * 從 UI 獲取設定值
     * @returns {Object}
     */
    getSettingsFromUI() {
        return {
            workTime: parseInt(document.getElementById('work-time')?.value || this.defaultSettings.workTime),
            breakTime: parseInt(document.getElementById('break-time')?.value || this.defaultSettings.breakTime),
            longBreakTime: parseInt(document.getElementById('long-break-time')?.value || this.defaultSettings.longBreakTime),
            sessionsBeforeLongBreak: parseInt(document.getElementById('sessions-before-long-break')?.value || this.defaultSettings.sessionsBeforeLongBreak)
        };
    }

    /**
     * 更新 UI 顯示
     */
    updateUI() {
        const elements = {
            'work-time': this.settings.workTime,
            'break-time': this.settings.breakTime,
            'long-break-time': this.settings.longBreakTime,
            'sessions-before-long-break': this.settings.sessionsBeforeLongBreak
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
    }

    /**
     * 驗證設定
     * @param {Object} settings - 要驗證的設定
     * @returns {Object} 驗證結果
     */
    validateSettings(settings) {
        const errors = [];

        Object.entries(this.validationRules).forEach(([key, rule]) => {
            const value = settings[key];
            
            if (isNaN(value)) {
                errors.push(`${this.getFieldName(key)} 必須是數字`);
            } else if (value < rule.min || value > rule.max) {
                errors.push(`${this.getFieldName(key)} 必須在 ${rule.min}-${rule.max} 之間`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 獲取欄位的中文名稱
     * @param {string} fieldKey
     * @returns {string}
     */
    getFieldName(fieldKey) {
        const names = {
            workTime: '工作時間',
            breakTime: '短休息時間',
            longBreakTime: '長休息時間',
            sessionsBeforeLongBreak: '長休息前工作時段數'
        };
        return names[fieldKey] || fieldKey;
    }

    /**
     * 觸發設定更新事件
     */
    triggerSettingsUpdated() {
        const event = new CustomEvent('settingsUpdated', {
            detail: { settings: this.settings }
        });
        document.dispatchEvent(event);
    }

    /**
     * 初始化事件監聽器
     */
    initEventListeners() {
        const saveButton = document.getElementById('save-settings');
        const resetButton = document.getElementById('reset-settings');

        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveSettings());
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetSettings());
        }
    }

    /**
     * 獲取當前設定
     * @returns {Object}
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * 獲取特定設定值（秒為單位）
     * @param {string} type - 設定類型 (work, break, longBreak)
     * @returns {number}
     */
    getTimeInSeconds(type) {
        const timeMap = {
            work: this.settings.workTime,
            break: this.settings.breakTime,
            longBreak: this.settings.longBreakTime
        };

        return (timeMap[type] || 0) * 60;
    }

    /**
     * 獲取長休息前的工作時段數
     * @returns {number}
     */
    getSessionsBeforeLongBreak() {
        return this.settings.sessionsBeforeLongBreak;
    }

    /**
     * 檢查設定是否為預設值
     * @returns {boolean}
     */
    isDefaultSettings() {
        return JSON.stringify(this.settings) === JSON.stringify(this.defaultSettings);
    }

    /**
     * 導出設定為 JSON
     * @returns {string}
     */
    exportSettings() {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * 從 JSON 導入設定
     * @param {string} jsonString
     * @returns {boolean} 是否成功
     */
    importSettings(jsonString) {
        try {
            const importedSettings = JSON.parse(jsonString);
            const validation = this.validateSettings(importedSettings);
            
            if (validation.isValid) {
                this.settings = importedSettings;
                this.updateUI();
                this.storage.saveTimeSettings(this.settings);
                this.triggerSettingsUpdated();
                return true;
            } else {
                alert(`導入失敗: ${validation.errors.join(', ')}`);
                return false;
            }
        } catch (error) {
            alert('導入失敗：JSON 格式錯誤');
            return false;
        }
    }
}

// 導出類別
window.SettingsManager = SettingsManager;