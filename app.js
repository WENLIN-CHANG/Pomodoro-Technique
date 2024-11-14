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