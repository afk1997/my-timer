document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Farcaster SDK
    let sdk;
    try {
        sdk = window.farcasterSdk;
        if (!sdk) {
            console.error('Farcaster SDK not found');
            return;
        }
    } catch (err) {
        console.error('Error initializing Farcaster SDK:', err);
        return;
    }
    
    // DOM Elements
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const sessionCountEl = document.getElementById('session-count');
    const indicators = document.querySelectorAll('.indicator');
    
    // Sound settings elements
    const soundToggleBtn = document.getElementById('sound-toggle');
    const soundSettings = document.querySelector('.sound-settings');
    const completionSoundCheckbox = document.getElementById('completion-sound');
    const tickSoundCheckbox = document.getElementById('tick-sound');
    const countdownSoundCheckbox = document.getElementById('countdown-sound');
    const volumeControl = document.getElementById('volume');
    
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
    
    // Sound settings
    let soundEnabled = true;
    let completionSoundEnabled = true;
    let tickSoundEnabled = true;
    let countdownSoundEnabled = true;
    let volume = 0.7;
    
    // Audio feedback
    const timerCompleteSound = new Audio('https://soundbible.com/grab.php?id=2218&type=mp3');
    const tickSound = new Audio('https://soundbible.com/grab.php?id=1598&type=mp3');
    const finalCountdownSound = new Audio('https://soundbible.com/grab.php?id=2156&type=mp3');
    
    // Adjust volumes
    timerCompleteSound.volume = volume;
    tickSound.volume = volume * 0.4; // Tick sound a bit quieter
    finalCountdownSound.volume = volume * 0.7;
    
    // Initialize everything first
    function init() {
        updateTimerDisplay();
        document.body.classList.add('pomodoro-mode');
        
        // Load sounds
        timerCompleteSound.load();
        tickSound.load();
        finalCountdownSound.load();
        
        // Customize UI based on context if needed
        if (sdk?.context?.user) {
            console.log('User context:', sdk.context.user);
            if (sdk.context.user.displayName) {
                document.querySelector('h1').textContent = `${sdk.context.user.displayName}'s Timer`;
            }
        }
        
        // Apply safe area insets if provided
        if (sdk?.context?.client?.safeAreaInsets) {
            const { top, bottom, left, right } = sdk.context.client.safeAreaInsets;
            document.querySelector('.container').style.paddingTop = `${top}px`;
            document.querySelector('.container').style.paddingBottom = `${bottom}px`;
            document.querySelector('.container').style.paddingLeft = `${left}px`;
            document.querySelector('.container').style.paddingRight = `${right}px`;
        }
        
        // Setup Farcaster event listeners
        setupFarcasterEvents();
        
        // Finally tell the client we're ready
        sdk.actions.ready()
            .then(() => console.log('App is ready'))
            .catch(err => console.error('Error calling ready():', err));
    }
    
    function setupFarcasterEvents() {
        if (!sdk) return;
        
        sdk.on('frameAdded', () => {
            console.log('User added the frame');
            // Save to localStorage that user has added the frame
            localStorage.setItem('frameAdded', 'true');
        });
        
        sdk.on('frameRemoved', () => {
            console.log('User removed the frame');
            localStorage.removeItem('frameAdded');
        });
        
        sdk.on('notificationsEnabled', () => {
            console.log('Notifications enabled');
            localStorage.setItem('notificationsEnabled', 'true');
        });
        
        sdk.on('notificationsDisabled', () => {
            console.log('Notifications disabled');
            localStorage.removeItem('notificationsEnabled');
        });
    }
    
    // Initialize the app
    init();
    
    // Event listeners
    startBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    // Sound toggle button
    soundToggleBtn.addEventListener('click', () => {
        soundSettings.classList.toggle('active');
    });
    
    // Close sound settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!soundSettings.contains(e.target) && e.target !== soundToggleBtn) {
            soundSettings.classList.remove('active');
        }
    });
    
    // Sound settings changes
    completionSoundCheckbox.addEventListener('change', () => {
        completionSoundEnabled = completionSoundCheckbox.checked;
    });
    
    tickSoundCheckbox.addEventListener('change', () => {
        tickSoundEnabled = tickSoundCheckbox.checked;
    });
    
    countdownSoundCheckbox.addEventListener('change', () => {
        countdownSoundEnabled = countdownSoundCheckbox.checked;
    });
    
    volumeControl.addEventListener('input', () => {
        volume = parseFloat(volumeControl.value);
        timerCompleteSound.volume = volume;
        tickSound.volume = volume * 0.4;
        finalCountdownSound.volume = volume * 0.7;
    });
    
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            changeMode(mode);
            
            // Update active button
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
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
                
                // Play tick sound at specific intervals
                if (timeLeft > 0 && timeLeft <= 5 && countdownSoundEnabled) {
                    // Play countdown sound for last 5 seconds
                    playSound(finalCountdownSound);
                } else if (timeLeft > 0 && timeLeft % 60 === 0 && tickSoundEnabled) {
                    // Play tick sound every minute
                    playSound(tickSound);
                }
                
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
    
    function playSound(sound) {
        if (!soundEnabled) return;
        
        // Create a new audio element each time to allow overlapping sounds
        const soundClone = sound.cloneNode();
        soundClone.play().catch(error => {
            console.log('Audio playback error:', error);
        });
    }
    
    function timerComplete() {
        clearInterval(timer);
        isRunning = false;
        
        // Play completion sound with error handling
        if (completionSoundEnabled) {
            playSound(timerCompleteSound);
        }
        
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