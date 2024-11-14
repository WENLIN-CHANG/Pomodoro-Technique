let timer;
let isWorking = true;
let cycleCount = 0;
let workTime = 25 * 60; // 25 分鐘 (以秒為單位)
let breakTime = 5 * 60; // 5 分鐘 (以秒為單位)
let currentTime = workTime;

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