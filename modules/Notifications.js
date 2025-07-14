/**
 * 通知系統模組
 * 處理瀏覽器通知和權限管理
 */
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.isSupported = 'Notification' in window;
    }

    /**
     * 請求通知權限
     * @returns {Promise<boolean>} 是否獲得權限
     */
    async requestPermission() {
        if (!this.isSupported) {
            return false;
        }

        try {
            this.permission = await Notification.requestPermission();
            return this.permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    /**
     * 顯示通知
     * @param {string} title - 通知標題
     * @param {string} body - 通知內容
     * @param {Object} options - 通知選項
     * @returns {Notification|null} 通知實例或null
     */
    show(title, body, options = {}) {
        // 如果支援通知且有權限
        if (this.isSupported && this.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: options.icon || '/favicon.ico',
                badge: options.badge || '/favicon.ico',
                tag: options.tag || 'pomodoro',
                requireInteraction: options.requireInteraction || false,
                ...options
            });

            // 自動關閉通知
            const autoCloseTime = options.autoClose || 5000;
            if (autoCloseTime > 0) {
                setTimeout(() => {
                    notification.close();
                }, autoCloseTime);
            }

            // 點擊事件處理
            if (options.onClick) {
                notification.onclick = options.onClick;
            }

            return notification;
        } else {
            // 降級到 alert
            this.showFallback(title, body);
            return null;
        }
    }

    /**
     * 降級通知方法
     * @param {string} title - 標題
     * @param {string} body - 內容
     */
    showFallback(title, body) {
        alert(`${title}\n${body}`);
    }

    /**
     * 顯示工作時段結束通知
     */
    showWorkEndNotification() {
        this.show(
            '⏰ 工作時段結束',
            '休息時間到了！離開螢幕，放鬆一下眼睛吧。',
            { tag: 'work-end' }
        );
    }

    /**
     * 顯示休息結束通知
     */
    showBreakEndNotification() {
        this.show(
            '💪 休息結束',
            '是時候開始新的工作時段了！保持專注，你可以做到的！',
            { tag: 'break-end' }
        );
    }

    /**
     * 顯示長休息通知
     */
    showLongBreakNotification() {
        this.show(
            '🎉 恭喜完成 4 個工作時段！',
            '現在進入 15 分鐘的長休息時間，好好放鬆一下吧！',
            { tag: 'long-break' }
        );
    }

    /**
     * 顯示設定保存通知
     */
    showSettingsSavedNotification() {
        this.show(
            '⚙️ 設定已保存',
            '時間設定已成功更新並應用！',
            { tag: 'settings', autoClose: 3000 }
        );
    }

    /**
     * 顯示設定重置通知
     */
    showSettingsResetNotification() {
        this.show(
            '🔄 設定已重置',
            '所有時間設定已重置為預設值！',
            { tag: 'settings', autoClose: 3000 }
        );
    }

    /**
     * 檢查是否支援通知
     * @returns {boolean}
     */
    isNotificationSupported() {
        return this.isSupported;
    }

    /**
     * 獲取當前權限狀態
     * @returns {string}
     */
    getPermissionStatus() {
        return this.permission;
    }
}

// 創建全域實例
const notificationManager = new NotificationManager();

// 導出實例
window.NotificationManager = notificationManager;