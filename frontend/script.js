class SleepClockManager {
    constructor() {
        // Usar la URL de Render en producción, localhost en desarrollo
        this.baseURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:8000' 
            : 'https://reloj-estructuraslistascirculares.onrender.com'; // Reemplaza con tu URL real de Render

        this.audioContext = null;
        this.alarmAudio = document.getElementById('alarmAudio');
        this.currentAlarm = null;
        this.isAlarmPlaying = false;
        this.alarmInterval = null;
    this.editingAlarmId = null;
    this.timeFormat = '24h'; // '24h' or '12h'

        this.init();
    }

    async init() {
        if (await this.testConnection()) {
            this.setupEventListeners();
            this.startClock();
            this.startWorldClocks(); // Iniciar relojes mundiales en tiempo real
            this.loadTimezones();
            this.loadAlarms();

            // Check for alarms every 30 seconds
            setInterval(() => this.checkAlarms(), 30000);
        } else {
            this.showError('Cannot connect to server. Make sure the Python server is running on port 8000.');
        }
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/time`, { 
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            console.error('Server connection failed:', error);
            return false;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff6b6b;
            color: white;
            padding: 1rem 2rem;
            border-radius: 5px;
            z-index: 1000;
            text-align: center;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }

    setupEventListeners() {
        // Alarm form
        document.getElementById('alarmForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAlarm();
        });

        // Edit alarm form
        document.getElementById('editAlarmForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateAlarm();
        });

        // Sleep schedule form
        document.getElementById('sleepForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.setSleepSchedule();
        });

        // Add timezone
        document.getElementById('addTimezoneBtn').addEventListener('click', () => {
            this.addTimezone();
        });

        // Clear form button
        document.getElementById('clearFormBtn').addEventListener('click', () => {
            this.clearAlarmForm();
        });

        // Cancel edit button
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Refresh alarms button
        document.getElementById('refreshAlarmsBtn').addEventListener('click', () => {
            this.loadAlarms();
        });

        // Test alarm button
        document.getElementById('testAlarmBtn').addEventListener('click', () => {
            this.testAlarmSound();
        });

        // Stop alarm button
        document.getElementById('stopAlarmBtn').addEventListener('click', () => {
            this.stopAlarm();
        });

        // Dismiss alarm notification
        document.getElementById('dismissAlarmBtn').addEventListener('click', () => {
            this.dismissAlarm();
        });

        // Modal close buttons
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('closeEditModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        // Close modal when clicking outside
        document.getElementById('editAlarmModal').addEventListener('click', (e) => {
            if (e.target.id === 'editAlarmModal') {
                this.closeEditModal();
            }
        });

        // Tab navigation
        this.setupTabNavigation();

        // Time format toggle (si existe en el HTML)
        const timeFormatToggle = document.getElementById('timeFormatToggle');
        if (timeFormatToggle) {
            timeFormatToggle.addEventListener('change', (e) => {
                this.timeFormat = e.target.checked ? '12h' : '24h';
                this.updateAllClocks();
            });
        }
    }

    async saveAlarm() {
        const alarmId = document.getElementById('alarmId').value;
        const alarmName = document.getElementById('alarmName').value;
        const alarmTime = document.getElementById('alarmTime').value;
        const alarmSound = document.getElementById('alarmSound').files[0];

        if (!alarmName || !alarmTime) {
            this.showError('Please fill in all required fields');
            return;
        }

        const [hours, minutes] = alarmTime.split(':').map(Number);

        try {
            let response;
            if (alarmId) {
                // Update existing alarm
                response = await fetch(`${this.baseURL}/update-alarm`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: alarmId,
                        name: alarmName,
                        time: [hours, minutes],
                        sound_file: alarmSound ? alarmSound.name : 'default'
                    })
                });
            } else {
                // Create new alarm
                response = await fetch(`${this.baseURL}/set-alarm`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: alarmName,
                        time: [hours, minutes],
                        sound_file: alarmSound ? alarmSound.name : 'default',
                        is_sleep_alarm: false
                    })
                });
            }

            const result = await response.json();

            if (response.ok) {
                this.showAlarmSuccess(alarmId ? 'updated' : 'created');
                this.clearAlarmForm();
                this.loadAlarms();
            } else {
                this.showError(`Failed to ${alarmId ? 'update' : 'create'} alarm: ${result.message}`);
            }
        } catch (error) {
            console.error(`Error ${alarmId ? 'updating' : 'creating'} alarm:`, error);
            this.showError(`Error ${alarmId ? 'updating' : 'creating'} alarm. Check console for details.`);
        }
    }

    async updateAlarm() {
        const alarmId = document.getElementById('editAlarmId').value;
        const alarmName = document.getElementById('editAlarmName').value;
        const alarmTime = document.getElementById('editAlarmTime').value;
        const alarmSound = document.getElementById('editAlarmSound').files[0];

        if (!alarmName || !alarmTime) {
            this.showError('Please fill in all required fields');
            return;
        }

        const [hours, minutes] = alarmTime.split(':').map(Number);

        try {
            const response = await fetch(`${this.baseURL}/update-alarm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: alarmId,
                    name: alarmName,
                    time: [hours, minutes],
                    sound_file: alarmSound ? alarmSound.name : 'default'
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlarmSuccess('updated');
                this.closeEditModal();
                this.loadAlarms();
            } else {
                this.showError(`Failed to update alarm: ${result.message}`);
            }
        } catch (error) {
            console.error('Error updating alarm:', error);
            this.showError('Error updating alarm. Check console for details.');
        }
    }

    async toggleAlarm(alarmId, currentStatus) {
        try {
            const response = await fetch(`${this.baseURL}/update-alarm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: alarmId,
                    is_active: !currentStatus
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.loadAlarms();
            } else {
                this.showError(`Failed to toggle alarm: ${result.message}`);
            }
        } catch (error) {
            console.error('Error toggling alarm:', error);
            this.showError('Error toggling alarm. Check console for details.');
        }
    }

    async deleteAlarm(alarmId) {
        if (!confirm('Are you sure you want to delete this alarm?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/remove-alarm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: alarmId })
            });

            const result = await response.json();

            if (response.ok) {
                this.loadAlarms();
                this.showAlarmSuccess('deleted');
            } else {
                this.showError(`Failed to delete alarm: ${result.message}`);
            }
        } catch (error) {
            console.error('Error deleting alarm:', error);
            this.showError('Error deleting alarm. Check console for details.');
        }
    }

    editAlarm(alarm) {
        document.getElementById('alarmId').value = alarm.id;
        document.getElementById('alarmName').value = alarm.name;
        document.getElementById('alarmTime').value = `${alarm.time[0].toString().padStart(2, '0')}:${alarm.time[1].toString().padStart(2, '0')}`;
        
        document.getElementById('submitAlarmBtn').textContent = 'Update Alarm';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        document.getElementById('alarmForm').classList.add('editing');
        
        // Scroll to form
        document.getElementById('alarmForm').scrollIntoView({ behavior: 'smooth' });
    }

    openEditModal(alarm) {
        document.getElementById('editAlarmId').value = alarm.id;
        document.getElementById('editAlarmName').value = alarm.name;
        document.getElementById('editAlarmTime').value = `${alarm.time[0].toString().padStart(2, '0')}:${alarm.time[1].toString().padStart(2, '0')}`;
        
        document.getElementById('editAlarmModal').style.display = 'flex';
    }

    closeEditModal() {
        document.getElementById('editAlarmModal').style.display = 'none';
        document.getElementById('editAlarmForm').reset();
    }

    cancelEdit() {
        this.clearAlarmForm();
        document.getElementById('cancelEditBtn').style.display = 'none';
        document.getElementById('alarmForm').classList.remove('editing');
        document.getElementById('submitAlarmBtn').textContent = 'Add Alarm';
    }

    clearAlarmForm() {
        document.getElementById('alarmForm').reset();
        document.getElementById('alarmId').value = '';
        document.getElementById('cancelEditBtn').style.display = 'none';
        document.getElementById('alarmForm').classList.remove('editing');
        document.getElementById('submitAlarmBtn').textContent = 'Add Alarm';
    }

    showAlarmSuccess(action = 'created') {
        const successMsg = document.getElementById('alarmSuccessMessage');
        successMsg.textContent = `Alarm ${action} successfully!`;
        successMsg.style.display = 'block';
        
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
    }

    async loadAlarms() {
        try {
            const response = await fetch(`${this.baseURL}/alarms`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const alarms = await response.json();
            
            const alarmsList = document.getElementById('alarmsListItems');
            const alarmsCount = document.getElementById('alarmsCount');
            
            alarmsList.innerHTML = '';
            alarmsCount.textContent = alarms.length;
            
            if (alarms.length === 0) {
                alarmsList.innerHTML = '<li class="empty-alarms">No alarms set. Create your first alarm above!</li>';
                return;
            }
            
            alarms.forEach(alarm => {
                const li = document.createElement('li');
                li.className = 'alarm-item';
                const timeStr = `${alarm.time[0].toString().padStart(2, '0')}:${alarm.time[1].toString().padStart(2, '0')}`;
                const alarmName = alarm.name || 'Unnamed Alarm';
                const soundName = alarm.sound_file || 'default';
                const isActive = alarm.is_active !== false; // Default to true
                
                li.innerHTML = `
                    <div class="alarm-item-header">
                        <div class="alarm-main-info">
                            <div class="alarm-name">${alarmName}</div>
                            <div class="alarm-time">${timeStr}</div>
                            <div class="alarm-status">
                                <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                                    ${isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </div>
                            <div class="alarm-sound">Sound: ${soundName}</div>
                        </div>
                        <div class="alarm-actions">
                            <button class="btn-test" data-sound="${soundName}">Test</button>
                            <button class="btn-edit" data-alarm-id="${alarm.id}">Edit</button>
                            <button class="btn-toggle" data-alarm-id="${alarm.id}" data-current-status="${isActive}">
                                ${isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button class="btn-delete" data-alarm-id="${alarm.id}">Delete</button>
                        </div>
                    </div>
                `;
                
                alarmsList.appendChild(li);
            });
            
            // Add event listeners to action buttons
            document.querySelectorAll('.btn-test').forEach(button => {
                button.addEventListener('click', (e) => {
                    const soundFile = e.target.getAttribute('data-sound');
                    this.testAlarmSound(soundFile);
                    e.stopPropagation();
                });
            });
            
            document.querySelectorAll('.btn-edit').forEach(button => {
                button.addEventListener('click', (e) => {
                    const alarmId = e.target.getAttribute('data-alarm-id');
                    const alarm = this.findAlarmById(alarmId, alarms);
                    if (alarm) {
                        this.openEditModal(alarm);
                    }
                    e.stopPropagation();
                });
            });
            
            document.querySelectorAll('.btn-toggle').forEach(button => {
                button.addEventListener('click', (e) => {
                    const alarmId = e.target.getAttribute('data-alarm-id');
                    const currentStatus = e.target.getAttribute('data-current-status') === 'true';
                    this.toggleAlarm(alarmId, currentStatus);
                    e.stopPropagation();
                });
            });
            
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', (e) => {
                    const alarmId = e.target.getAttribute('data-alarm-id');
                    this.deleteAlarm(alarmId);
                    e.stopPropagation();
                });
            });
            
        } catch (error) {
            console.error('Error loading alarms:', error);
            document.getElementById('alarmsListItems').innerHTML = 
                '<li class="empty-alarms">Error loading alarms</li>';
        }
    }

    findAlarmById(alarmId, alarms) {
        return alarms.find(alarm => alarm.id === alarmId);
    }

    setupTabNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and tabs
                navButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(tab => tab.classList.remove('active'));
                
                // Add active class to clicked button and corresponding tab
                button.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
                
                // Load data for the active tab if needed
                if (targetTab === 'worldtime') {
                    this.loadTimezones();
                } else if (targetTab === 'alarms') {
                    this.loadAlarms();
                }
            });
        });
    }

    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        
        // Update world clocks every minute
        setInterval(() => this.loadTimezones(), 60000);
    }

    updateClock() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // Update digital clock using selected format (12h/24h)
        const timeDisplay = this.formatTime(hours, minutes, seconds);
        const digitalClockEl = document.getElementById('digitalClock');
        if (digitalClockEl) {
            digitalClockEl.innerHTML = `
                ${timeDisplay.time}
                ${timeDisplay.period ? `<span class="time-period">${timeDisplay.period}</span>` : ''}
            `;
        }
        
        // Update analog clock
        this.drawAnalogClock(hours, minutes, seconds);
    }

    drawAnalogClock(hours, minutes, seconds) {
        const canvas = document.getElementById('analogClock');
        if (!canvas.getContext) return;
        
        const ctx = canvas.getContext('2d');
        const radius = canvas.width / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw clock face
        ctx.beginPath();
        ctx.arc(radius, radius, radius - 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#2C3E50';
        ctx.fill();
        ctx.strokeStyle = '#4FC3F7';
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Draw hour marks
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            const angle = (i - 3) * (Math.PI * 2) / 12;
            const x1 = radius + Math.cos(angle) * (radius - 20);
            const y1 = radius + Math.sin(angle) * (radius - 20);
            const x2 = radius + Math.cos(angle) * (radius - 30);
            const y2 = radius + Math.sin(angle) * (radius - 30);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        // Draw numbers
        ctx.font = '16px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 1; i <= 12; i++) {
            const angle = (i - 3) * (Math.PI * 2) / 12;
            const x = radius + Math.cos(angle) * (radius - 45);
            const y = radius + Math.sin(angle) * (radius - 45);
            ctx.fillText(i.toString(), x, y);
        }
        
        // Draw hour hand
        const hourAngle = (hours % 12 + minutes / 60) * (Math.PI * 2) / 12 - Math.PI / 2;
        this.drawHand(ctx, radius, hourAngle, radius * 0.5, 6, '#FFFFFF');
        
        // Draw minute hand
        const minuteAngle = (minutes + seconds / 60) * (Math.PI * 2) / 60 - Math.PI / 2;
        this.drawHand(ctx, radius, minuteAngle, radius * 0.7, 4, '#4FC3F7');
        
        // Draw second hand
        const secondAngle = seconds * (Math.PI * 2) / 60 - Math.PI / 2;
        this.drawHand(ctx, radius, secondAngle, radius * 0.8, 2, '#81C784');
        
        // Draw center circle
        ctx.beginPath();
        ctx.arc(radius, radius, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#81C784';
        ctx.fill();
    }

    drawHand(ctx, radius, angle, length, width, color) {
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        ctx.restore();
    }

    async setAlarm() {
        const alarmName = document.getElementById('alarmName').value;
        const alarmTime = document.getElementById('alarmTime').value;
        const alarmSound = document.getElementById('alarmSound').files[0];
        
        if (!alarmName || !alarmTime) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        const [hours, minutes] = alarmTime.split(':').map(Number);
        
        try {
            const response = await fetch(`${this.baseURL}/set-alarm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: alarmName,
                    time: [hours, minutes],
                    sound_file: alarmSound ? alarmSound.name : 'default',
                    is_sleep_alarm: false
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showAlarmSuccess();
                this.clearAlarmForm();
                this.loadAlarms();
            } else {
                this.showError(`Failed to set alarm: ${result.message}`);
            }
        } catch (error) {
            console.error('Error setting alarm:', error);
            this.showError('Error setting alarm. Check console for details.');
        }
    }

    showAlarmSuccess() {
        const successMsg = document.getElementById('alarmSuccessMessage');
        successMsg.style.display = 'block';
        
        // Hide success message after 3 seconds
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
    }

    clearAlarmForm() {
        document.getElementById('alarmForm').reset();
    }

    async loadAlarms() {
        try {
            const response = await fetch(`${this.baseURL}/alarms`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const alarms = await response.json();
            
            const alarmsList = document.getElementById('alarmsListItems');
            const alarmsCount = document.getElementById('alarmsCount');
            
            alarmsList.innerHTML = '';
            alarmsCount.textContent = alarms.length;
            
            if (alarms.length === 0) {
                alarmsList.innerHTML = '<li class="empty-alarms">No alarms set. Create your first alarm above!</li>';
                return;
            }
            
            alarms.forEach(alarm => {
                const li = document.createElement('li');
                const timeStr = `${alarm.time[0].toString().padStart(2, '0')}:${alarm.time[1].toString().padStart(2, '0')}`;
                const alarmName = alarm.name || 'Unnamed Alarm';
                const soundName = alarm.sound_file || 'default';
                
                li.innerHTML = `
                    <div class="alarm-info">
                        <div class="alarm-name">${alarmName}</div>
                        <div class="alarm-time">${timeStr}</div>
                        <div class="alarm-sound">Sound: ${soundName}</div>
                    </div>
                    <div class="alarm-actions">
                        <button class="test-alarm-btn" data-sound="${soundName}">Test</button>
                        <button class="remove-alarm" data-time='[${alarm.time}]'>Remove</button>
                    </div>
                `;
                
                alarmsList.appendChild(li);
            });
            
            // Add event listeners to action buttons
            document.querySelectorAll('.test-alarm-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const soundFile = e.target.getAttribute('data-sound');
                    this.testAlarmSound(soundFile);
                });
            });
            
            document.querySelectorAll('.remove-alarm').forEach(button => {
                button.addEventListener('click', (e) => {
                    const time = JSON.parse(e.target.getAttribute('data-time'));
                    this.removeAlarm(time);
                });
            });
            
        } catch (error) {
            console.error('Error loading alarms:', error);
            document.getElementById('alarmsListItems').innerHTML = 
                '<li class="empty-alarms">Error loading alarms</li>';
        }
    }

    async removeAlarm(time) {
        try {
            const response = await fetch(`${this.baseURL}/remove-alarm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ time })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.loadAlarms();
            } else {
                this.showError(`Failed to remove alarm: ${result.message}`);
            }
        } catch (error) {
            console.error('Error removing alarm:', error);
            this.showError('Error removing alarm. Check console for details.');
        }
    }

    testAlarmSound(soundFile = 'default') {
        this.playAlarm(soundFile, true);
        
        // Enable stop button
        document.getElementById('stopAlarmBtn').disabled = false;
        
        // Show test notification
        this.showAlarmNotification('Test Alarm', 'Testing alarm sound...');
    }

    stopAlarm() {
        this.stopAlarmSound();
        document.getElementById('stopAlarmBtn').disabled = true;
        this.hideAlarmNotification();
    }

    dismissAlarm() {
        this.stopAlarmSound();
        this.hideAlarmNotification();
    }

    playAlarm(soundFile, isTest = false) {
        this.isAlarmPlaying = true;
        
        if (soundFile && soundFile !== 'default') {
            // In a real implementation, you would use the actual sound file
            this.playDefaultAlarm();
        } else {
            this.playDefaultAlarm();
        }
        
        if (!isTest) {
            this.showAlarmNotification('Alarm!', 'Your alarm is ringing!');
        }
    }

    stopAlarmSound() {
        this.isAlarmPlaying = false;
        this.alarmAudio.pause();
        this.alarmAudio.currentTime = 0;
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
    }

    showAlarmNotification(title, message) {
        const notification = document.getElementById('activeAlarmNotification');
        const titleElement = document.getElementById('alarmNotificationTitle');
        const timeElement = document.getElementById('alarmNotificationTime');
        
        titleElement.textContent = title;
        timeElement.textContent = message;
        notification.style.display = 'block';
    }

    hideAlarmNotification() {
        const notification = document.getElementById('activeAlarmNotification');
        notification.style.display = 'none';
    }

    playDefaultAlarm() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        // Create a more interesting alarm pattern
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.6);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
        
        oscillator.start();
        
        // Stop after 5 seconds for test, continuous for real alarm
        if (this.isAlarmPlaying) {
            this.alarmInterval = setTimeout(() => {
                if (this.isAlarmPlaying) {
                    oscillator.stop();
                    this.playDefaultAlarm(); // Restart for continuous ringing
                }
            }, 5000);
        } else {
            setTimeout(() => {
                oscillator.stop();
            }, 5000);
        }
    }

    // Simulate alarm checking (in real implementation, this would come from backend)
    checkAlarms() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // This is a simulation - in real implementation, the backend would trigger this
        console.log(`Checking alarms at ${currentTime}`);
        
        // Simulate an alarm trigger for demo purposes
        // Remove this in production
        this.simulateAlarmTrigger(now);
    }

    simulateAlarmTrigger(now) {
        // For demo: trigger alarm at current time + 1 minute
        const demoTime = new Date(now.getTime() + 60000);
        const demoTimeStr = `${demoTime.getHours().toString().padStart(2, '0')}:${demoTime.getMinutes().toString().padStart(2, '0')}`;
        
        // Check if any alarm matches the demo time
        const alarmsList = document.getElementById('alarmsListItems');
        const alarmItems = alarmsList.querySelectorAll('.alarm-time');
        
        alarmItems.forEach(alarmTimeElement => {
            const alarmTime = alarmTimeElement.textContent;
            if (alarmTime === demoTimeStr && !this.isAlarmPlaying) {
                const alarmName = alarmTimeElement.previousElementSibling.textContent;
                this.playAlarm('default');
                this.showAlarmNotification('Alarm!', `${alarmName} - It's ${alarmTime}`);
            }
        });
    }

    async setSleepSchedule() {
        const bedtime = document.getElementById('bedTime').value;
        const wakeTime = document.getElementById('wakeTime').value;
        const bedtimeSound = document.getElementById('bedtimeSound').files[0];
        const wakeupSound = document.getElementById('wakeupSound').files[0];
        
        if (!bedtime || !wakeTime) {
            this.showError('Please select both bedtime and wake-up time');
            return;
        }
        
        const [bedHours, bedMinutes] = bedtime.split(':').map(Number);
        const [wakeHours, wakeMinutes] = wakeTime.split(':').map(Number);
        
        try {
            const response = await fetch(`${this.baseURL}/set-sleep-schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bedtime: [bedHours, bedMinutes],
                    wakeup_time: [wakeHours, wakeMinutes],
                    bedtime_sound: bedtimeSound ? bedtimeSound.name : 'default_bedtime',
                    wakeup_sound: wakeupSound ? wakeupSound.name : 'default_wakeup'
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('Sleep schedule saved successfully!');
                this.loadAlarms();
            } else {
                this.showError(`Failed to save sleep schedule: ${result.message}`);
            }
        } catch (error) {
            console.error('Error setting sleep schedule:', error);
            this.showError('Error setting sleep schedule. Check console for details.');
        }
    }

    async loadTimezones() {
        try {
            const response = await fetch(`${this.baseURL}/timezones`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const timezones = await response.json();
            
            const worldClockDisplay = document.getElementById('worldClockDisplay');
            worldClockDisplay.innerHTML = '';
            
            timezones.forEach(tz => {
                const card = document.createElement('div');
                card.className = 'timezone-card';
                card.innerHTML = `
                    <div class="timezone-name">${tz.name}</div>
                    <div class="timezone-time">${tz.current_time}</div>
                    <div class="timezone-offset">UTC${tz.offset >= 0 ? '+' : ''}${tz.offset}</div>
                `;
                worldClockDisplay.appendChild(card);
            });
        } catch (error) {
            console.error('Error loading timezones:', error);
            document.getElementById('worldClockDisplay').innerHTML = '<div class="error">Error loading timezones</div>';
        }
    }

    async addTimezone() {
        const selector = document.getElementById('timezoneSelector');
        const selectedTimezone = selector.value;
        
        // For now, we'll just reload the timezones to show the current selection
        this.loadTimezones();
        alert(`Timezone ${selectedTimezone} displayed`);
    }

    // Iniciar relojes mundiales en tiempo real
    startWorldClocks() {
        // Actualizar inmediatamente
        this.updateWorldClocks();
        // Actualizar cada segundo para movimiento suave
        setInterval(() => this.updateWorldClocks(), 1000);
    }

    // Actualizar relojes mundiales
    updateWorldClocks() {
        const now = new Date();
        const timezones = [
            { name: "UTC", offset: 0 },
            { name: "New York", offset: -5 },
            { name: "London", offset: 0 },
            { name: "Tokyo", offset: 9 },
            { name: "Bogota", offset: -5 },
            { name: "Paris", offset: 1 },
            { name: "Sydney", offset: 11 },
            { name: "Moscow", offset: 3 },
            { name: "Dubai", offset: 4 },
            { name: "Los Angeles", offset: -8 }
        ];

        const worldClockDisplay = document.getElementById('worldClockDisplay');
        if (!worldClockDisplay) return;

        worldClockDisplay.innerHTML = '';

        timezones.forEach(tz => {
            const tzTime = this.calculateTimezoneTime(now, tz.offset);
            const card = document.createElement('div');
            card.className = 'timezone-card';
            
            const timeDisplay = this.formatTime(tzTime.hours, tzTime.minutes, tzTime.seconds);
            
            card.innerHTML = `
                <div class="timezone-name">${tz.name}</div>
                <div class="timezone-time">${timeDisplay.time}</div>
                <div class="timezone-period">${timeDisplay.period}</div>
                <div class="timezone-offset">UTC${tz.offset >= 0 ? '+' : ''}${tz.offset}</div>
                <div class="world-analog-clock">
                    <canvas id="worldClock-${tz.name.replace(/\s+/g, '')}" width="80" height="80"></canvas>
                </div>
            `;
            
            worldClockDisplay.appendChild(card);
            
            // Dibujar reloj analógico para esta zona horaria
            this.drawWorldAnalogClock(`worldClock-${tz.name.replace(/\s+/g, '')}`, tzTime.hours, tzTime.minutes, tzTime.seconds);
        });
    }

    // Calcular hora para zona horaria
    calculateTimezoneTime(now, offset) {
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const tzDate = new Date(utc + (3600000 * offset));
        
        return {
            hours: tzDate.getHours(),
            minutes: tzDate.getMinutes(),
            seconds: tzDate.getSeconds()
        };
    }

    // Formatear hora según el formato seleccionado
    formatTime(hours, minutes, seconds) {
        if (this.timeFormat === '12h') {
            const period = hours >= 12 ? 'PM' : 'AM';
            const twelveHour = hours % 12 || 12;
            return {
                time: `${twelveHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                period: period
            };
        } else {
            return {
                time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                period: ''
            };
        }
    }

    // Dibujar reloj analógico mundial
    drawWorldAnalogClock(canvasId, hours, minutes, seconds) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !canvas.getContext) return;
        
        const ctx = canvas.getContext('2d');
        const radius = canvas.width / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw clock face
        ctx.beginPath();
        ctx.arc(radius, radius, radius - 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#2C3E50';
        ctx.fill();
        ctx.strokeStyle = '#4FC3F7';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw hour hand
        const hourAngle = (hours % 12 + minutes / 60) * (Math.PI * 2) / 12 - Math.PI / 2;
        this.drawWorldHand(ctx, radius, hourAngle, radius * 0.4, 3, '#FFFFFF');
        
        // Draw minute hand
        const minuteAngle = (minutes + seconds / 60) * (Math.PI * 2) / 60 - Math.PI / 2;
        this.drawWorldHand(ctx, radius, minuteAngle, radius * 0.6, 2, '#4FC3F7');
        
        // Draw second hand
        const secondAngle = seconds * (Math.PI * 2) / 60 - Math.PI / 2;
        this.drawWorldHand(ctx, radius, secondAngle, radius * 0.7, 1, '#81C784');
        
        // Draw center circle
        ctx.beginPath();
        ctx.arc(radius, radius, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#81C784';
        ctx.fill();
    }

    drawWorldHand(ctx, radius, angle, length, width, color) {
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        ctx.restore();
    }

    // Actualizar todos los relojes
    updateAllClocks() {
        this.updateClock(); // Reloj principal
        this.updateWorldClocks(); // Relojes mundiales
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SleepClockManager();
});