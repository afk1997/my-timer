document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const sessionCountEl = document.getElementById('session-count');
    const indicators = document.querySelectorAll('.indicator');
    
    // Timer settings
    const TIMER_SETTINGS = {
        pomodoro: 25 * 60, // 25 minutes in seconds
        shortBreak: 5 * 60, // 5 minutes in seconds
        longBreak: 15 * 60 // 15 minutes in seconds
    };
    
    // State variables
    let currentMode = 'pomodoro';
    let timeLeft = TIMER_SETTINGS[currentMode];
    let isRunning = false;
    let timer = null;
    let sessionsCompleted = 0;
    let currentIndicator = 0;
    
    // Audio feedback
    const timerCompleteSound = new Audio('https://soundbible.com/grab.php?id=2218&type=mp3');
    
    // Initialize timer display
    updateTimerDisplay();
    
    // Apply Pomodoro mode styling by default
    document.body.classList.add('pomodoro-mode');
    
    // Event listeners
    startBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            changeMode(mode);
            
            // Update active button
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope:', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }
    
    // PWA Installation
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Optionally, send to analytics
        console.log('PWA installation prompt available');
    });
    
    // Handle successful installation
    window.addEventListener('appinstalled', () => {
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
        // Optionally, send to analytics
        console.log('PWA was installed');
    });
    
    // Functions
    function toggleTimer() {
        if (!isRunning) {
            // Start the timer
            isRunning = true;
            startBtn.textContent = 'Pause';
            startBtn.classList.add('active');
            
            timer = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                updateProgressBar();
                
                if (timeLeft <= 0) {
                    timerComplete();
                }
            }, 1000);
        } else {
            // Pause the timer
            isRunning = false;
            startBtn.textContent = 'Resume';
            startBtn.classList.remove('active');
            clearInterval(timer);
        }
    }
    
    function resetTimer() {
        clearInterval(timer);
        isRunning = false;
        timeLeft = TIMER_SETTINGS[currentMode];
        updateTimerDisplay();
        updateProgressBar(0);
        startBtn.textContent = 'Start';
        startBtn.classList.remove('active');
    }
    
    function changeMode(mode) {
        // Clear existing mode classes
        document.body.classList.remove('pomodoro-mode', 'short-break-mode', 'long-break-mode');
        
        currentMode = mode;
        timeLeft = TIMER_SETTINGS[mode];
        updateTimerDisplay();
        resetTimer();
        
        // Add new mode class
        if (mode === 'pomodoro') {
            document.body.classList.add('pomodoro-mode');
        } else if (mode === 'shortBreak') {
            document.body.classList.add('short-break-mode');
        } else if (mode === 'longBreak') {
            document.body.classList.add('long-break-mode');
        }
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
        
        // Update page title
        document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} - Pomodoro Timer`;
    }
    
    function updateProgressBar() {
        const timerEl = document.querySelector('.timer');
        const totalTime = TIMER_SETTINGS[currentMode];
        const percentageComplete = ((totalTime - timeLeft) / totalTime) * 100;
        
        timerEl.style.setProperty('--progress', `${percentageComplete}%`);
        
        // Apply the progress to the pseudo-element
        document.documentElement.style.setProperty('--timer-progress', `${percentageComplete}%`);
        timerEl.style.backgroundSize = `${percentageComplete}% 100%`;
    }
    
    function timerComplete() {
        clearInterval(timer);
        isRunning = false;
        timerCompleteSound.play();
        
        // Vibrate for mobile devices if supported
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
        
        // Show notification if allowed
        if (Notification.permission === 'granted') {
            const message = currentMode === 'pomodoro'
                ? 'Time for a break!'
                : 'Break is over. Time to focus!';
            
            new Notification('Pomodoro Timer', {
                body: message,
                icon: 'https://icons.iconarchive.com/icons/paomedia/small-n-flat/1024/clock-icon.png',
            });
        }
        
        if (currentMode === 'pomodoro') {
            // Increment session count
            sessionsCompleted++;
            sessionCountEl.textContent = sessionsCompleted;
            
            // Update indicators
            if (currentIndicator < indicators.length) {
                indicators[currentIndicator].classList.add('completed');
                currentIndicator++;
            }
            
            // After 4 pomodoros, suggest a long break
            if (sessionsCompleted % 4 === 0) {
                changeMode('longBreak');
                document.querySelector('[data-mode="longBreak"]').classList.add('active');
                document.querySelector('[data-mode="pomodoro"]').classList.remove('active');
                document.querySelector('[data-mode="shortBreak"]').classList.remove('active');
                
                // Reset indicators after a full cycle
                if (currentIndicator >= indicators.length) {
                    indicators.forEach(indicator => indicator.classList.remove('completed'));
                    currentIndicator = 0;
                }
            } else {
                changeMode('shortBreak');
                document.querySelector('[data-mode="shortBreak"]').classList.add('active');
                document.querySelector('[data-mode="pomodoro"]').classList.remove('active');
                document.querySelector('[data-mode="longBreak"]').classList.remove('active');
            }
        } else {
            // After a break, go back to pomodoro
            changeMode('pomodoro');
            document.querySelector('[data-mode="pomodoro"]').classList.add('active');
            document.querySelector('[data-mode="shortBreak"]').classList.remove('active');
            document.querySelector('[data-mode="longBreak"]').classList.remove('active');
        }
        
        startBtn.textContent = 'Start';
    }
    
    // Request notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
});

// Apply progress bar animation
document.documentElement.style.setProperty('--timer-progress', '0%');

// Add custom cursor for interactive elements
document.addEventListener('DOMContentLoaded', () => {
    const interactiveElements = document.querySelectorAll('button');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseover', () => {
            document.body.style.cursor = 'pointer';
        });
        
        element.addEventListener('mouseout', () => {
            document.body.style.cursor = 'default';
        });
    });
}); 