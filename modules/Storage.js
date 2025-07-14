/**
 * 本地儲存管理模組
 * 統一處理 localStorage 操作和錯誤處理
 */
class StorageManager {
    constructor() {
        this.isSupported = this.checkLocalStorageSupport();
        this.prefix = 'pomodoro_';
    }

    /**
     * 檢查是否支援 localStorage
     * @returns {boolean}
     */
    checkLocalStorageSupport() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('localStorage not supported:', error);
            return false;
        }
    }

    /**
     * 獲取完整的鍵名
     * @param {string} key - 鍵名
     * @returns {string}
     */
    getFullKey(key) {
        return this.prefix + key;
    }

    /**
     * 儲存數據
     * @param {string} key - 鍵名
     * @param {any} value - 值
     * @returns {boolean} 是否成功
     */
    set(key, value) {
        if (!this.isSupported) {
            console.warn('localStorage not supported, data not saved');
            return false;
        }

        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(this.getFullKey(key), serializedValue);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    /**
     * 獲取數據
     * @param {string} key - 鍵名
     * @param {any} defaultValue - 預設值
     * @returns {any}
     */
    get(key, defaultValue = null) {
        if (!this.isSupported) {
            return defaultValue;
        }

        try {
            const item = localStorage.getItem(this.getFullKey(key));
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    /**
     * 刪除數據
     * @param {string} key - 鍵名
     * @returns {boolean} 是否成功
     */
    remove(key) {
        if (!this.isSupported) {
            return false;
        }

        try {
            localStorage.removeItem(this.getFullKey(key));
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    /**
     * 清除所有應用相關數據
     * @returns {boolean} 是否成功
     */
    clear() {
        if (!this.isSupported) {
            return false;
        }

        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    /**
     * 檢查鍵是否存在
     * @param {string} key - 鍵名
     * @returns {boolean}
     */
    has(key) {
        if (!this.isSupported) {
            return false;
        }

        return localStorage.getItem(this.getFullKey(key)) !== null;
    }

    /**
     * 獲取所有應用相關的鍵
     * @returns {string[]}
     */
    getAllKeys() {
        if (!this.isSupported) {
            return [];
        }

        const keys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key.substring(this.prefix.length));
                }
            }
        } catch (error) {
            console.error('Error getting all keys:', error);
        }

        return keys;
    }

    /**
     * 獲取儲存使用量資訊
     * @returns {Object}
     */
    getStorageInfo() {
        if (!this.isSupported) {
            return { supported: false };
        }

        try {
            const used = new Blob(Object.values(localStorage)).size;
            return {
                supported: true,
                used: used,
                usedFormatted: this.formatBytes(used)
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { supported: true, error: error.message };
        }
    }

    /**
     * 格式化字節數
     * @param {number} bytes
     * @returns {string}
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 儲存待辦事項
     * @param {Array} todos
     */
    saveTodos(todos) {
        return this.set('todos', todos);
    }

    /**
     * 載入待辦事項
     * @returns {Array}
     */
    loadTodos() {
        return this.get('todos', []);
    }

    /**
     * 儲存統計數據
     * @param {Object} stats
     */
    saveStats(stats) {
        return this.set('stats', stats);
    }

    /**
     * 載入統計數據
     * @returns {Object}
     */
    loadStats() {
        return this.get('stats', {
            daily: {},
            weekly: {},
            maxFocusTime: 0,
            currentFocusStart: null
        });
    }

    /**
     * 儲存時間設定
     * @param {Object} settings
     */
    saveTimeSettings(settings) {
        return this.set('timeSettings', settings);
    }

    /**
     * 載入時間設定
     * @returns {Object}
     */
    loadTimeSettings() {
        return this.get('timeSettings', {
            workTime: 25,
            breakTime: 5,
            longBreakTime: 15,
            sessionsBeforeLongBreak: 4
        });
    }
}

// 創建全域實例
const storageManager = new StorageManager();

// 導出實例
window.StorageManager = storageManager;