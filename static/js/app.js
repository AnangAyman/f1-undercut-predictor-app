class F1UndercutApp {
    constructor() {
        this.currentYear = null;
        this.currentRound = null;
        this.currentLap = null;
        this.chaserDriver = null;
        this.defenderDriver = null;
        this.standings = [];
        this.recommendedLapNumbers = []; // New: Store recommended lap numbers
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // Year selection
        document.getElementById('yearSelect').addEventListener('change', (e) => {
            this.currentYear = e.target.value;
            if (this.currentYear) {
                this.loadEvents(this.currentYear);
            }
        });
        
        // Event selection
        document.getElementById('eventSelect').addEventListener('change', (e) => {
            this.currentRound = e.target.value;
            if (this.currentYear && this.currentRound) {
                this.loadLaps(this.currentYear, this.currentRound);
            }
        });
        
        // Lap slider
        document.getElementById('lapSlider').addEventListener('input', (e) => {
            this.currentLap = parseInt(e.target.value);
            document.getElementById('lapValue').textContent = this.currentLap;
            document.getElementById('currentLapDisplay').textContent = this.currentLap;
            
            // Update lap value color based on whether it's a recommended lap
            this.updateLapValueColor();
            
            if (this.currentYear && this.currentRound && this.currentLap) {
                this.loadStandings(this.currentYear, this.currentRound, this.currentLap);
            }
        });
        
        // Driver selection
        document.getElementById('chaserSelect').addEventListener('change', (e) => {
            this.chaserDriver = e.target.value;
            this.updateSelectedDrivers();
        });
        
        document.getElementById('defenderSelect').addEventListener('change', (e) => {
            this.defenderDriver = e.target.value;
            this.updateSelectedDrivers();
        });
        
        // Predict button
        document.getElementById('predictBtn').addEventListener('click', () => {
            this.predictUndercut();
        });
        
        // Predict Best Timing button
        document.getElementById('predictTimingBtn').addEventListener('click', () => {
            this.predictBestTiming();
        });
    }
    
    showLoadingInSelect(selectId) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Loading...</option>';
        select.disabled = true;
    }
    
    showLoadingInPanel(panelId) {
        const panel = document.getElementById(panelId);
        
        // Clear existing content
        panel.innerHTML = '';
        
        panel.classList.add('loading-overlay');
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '<div class="spinner"></div>';
        panel.appendChild(spinner);
    }
    
    hideLoadingInPanel(panelId) {
        const panel = document.getElementById(panelId);
        panel.classList.remove('loading-overlay');
        
        const spinner = panel.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
    
    async loadEvents(year) {
        try {
            console.log(`Loading events for ${year}...`);
            this.showLoadingInSelect('eventSelect');
            
            const response = await fetch(`/api/events/${year}`);
            const data = await response.json();
            
            const eventSelect = document.getElementById('eventSelect');
            eventSelect.innerHTML = '<option value="">Select Race</option>';
            
            if (data.events && data.events.length > 0) {
                data.events.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.RoundNumber;
                    option.textContent = `${event.RoundNumber}. ${event.EventName}`;
                    eventSelect.appendChild(option);
                });
                eventSelect.disabled = false;
            } else {
                this.showError('No races found for this year');
            }
            
            this.clearSelections();
        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load races');
        }
    }
    
    async loadLaps(year, round) {
        try {
            console.log(`Loading laps for ${year} Round ${round}...`);
            this.showLoadingInPanel('standingsList');
            
            const response = await fetch(`/api/laps/${year}/${round}`);
            const data = await response.json();
            
            this.hideLoadingInPanel('standingsList');
            
            if (data.laps && data.laps.length > 0) {
                const slider = document.getElementById('lapSlider');
                
                // Filter laps to only include laps >= 1
                const validLaps = data.laps.filter(lap => lap >= 1);
                
                if (validLaps.length > 0) {
                    // Always start at lap 1, or the minimum lap that's at least 1
                    const minLap = Math.max(1, Math.min(...validLaps));
                    const maxLap = Math.max(...validLaps);
                    
                    slider.min = minLap;
                    slider.max = maxLap;
                    slider.value = minLap;  // This will be 1 or the smallest lap >= 1
                    slider.disabled = false;
                    
                    this.currentLap = parseInt(slider.value);
                    document.getElementById('lapValue').textContent = this.currentLap;
                    document.getElementById('currentLapDisplay').textContent = this.currentLap;
                    
                    // Reset recommended lap highlighting when loading new race
                    this.recommendedLapNumbers = [];
                    this.updateLapValueColor();
                    
                    this.loadStandings(year, round, this.currentLap);
                } else {
                    this.showError('No valid lap data available (all laps are below 1)');
                }
            } else {
                this.showError('No pit stop data available for this race');
            }
        } catch (error) {
            console.error('Error loading laps:', error);
            this.hideLoadingInPanel('standingsList');
            this.showError('Failed to load lap data');
        }
    }
    
    async loadStandings(year, round, lap) {
        try {
            console.log(`Loading standings for ${year} Round ${round} Lap ${lap}...`);
            this.showLoadingInPanel('standingsList');
            
            const response = await fetch(`/api/standings/${year}/${round}/${lap}`);
            const data = await response.json();
            
            this.hideLoadingInPanel('standingsList');
            
            this.standings = data.standings || [];
            this.updateStandingsList();
            this.updateDriverSelects();
        } catch (error) {
            console.error('Error loading standings:', error);
            this.hideLoadingInPanel('standingsList');
            this.showError('Failed to load driver standings');
        }
    }
    
    updateStandingsList() {
        const standingsList = document.getElementById('standingsList');
        
        if (!this.standings || this.standings.length === 0) {
            standingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No standings data available</p>
                </div>
            `;
            return;
        }
        
        standingsList.innerHTML = '';
        
        this.standings.forEach(driver => {
            const item = document.createElement('div');
            item.className = 'standing-item';
            
            if (driver.driver === this.chaserDriver || driver.driver === this.defenderDriver) {
                item.classList.add('selected');
            }
            
            // Added gap-time div
            item.innerHTML = `
                <div class="position">${driver.position}</div>
                <div class="driver-info">
                    <div class="driver-code">${driver.driver}</div>
                    <div class="driver-team">${driver.team}</div>
                </div>
                <div class="gap-time">${driver.gap || '--'}</div>
                <div class="tyre-compound tyre-${driver.compound}">${driver.compound}</div>
            `;
            
            item.addEventListener('click', () => {
                this.selectDriver(driver.driver);
            });
            
            standingsList.appendChild(item);
        });
    }
    
    updateDriverSelects() {
        const chaserSelect = document.getElementById('chaserSelect');
        const defenderSelect = document.getElementById('defenderSelect');
        
        chaserSelect.innerHTML = '<option value="">Select Chaser</option>';
        defenderSelect.innerHTML = '<option value="">Select Defender</option>';
        
        if (!this.standings || this.standings.length === 0) {
            chaserSelect.disabled = true;
            defenderSelect.disabled = true;
            return;
        }
        
        this.standings.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.driver;
            option.textContent = `${driver.driver} (P${driver.position})`;
            
            chaserSelect.appendChild(option.cloneNode(true));
            defenderSelect.appendChild(option.cloneNode(true));
        });
        
        chaserSelect.disabled = false;
        defenderSelect.disabled = false;
        
        if (this.chaserDriver) chaserSelect.value = this.chaserDriver;
        if (this.defenderDriver) defenderSelect.value = this.defenderDriver;
    }
    
    selectDriver(driver) {
        if (!this.chaserDriver) {
            this.chaserDriver = driver;
            document.getElementById('chaserSelect').value = driver;
        } else if (!this.defenderDriver) {
            this.defenderDriver = driver;
            document.getElementById('defenderSelect').value = driver;
        } else {
            this.defenderDriver = driver;
            document.getElementById('defenderSelect').value = driver;
        }
        
        this.updateSelectedDrivers();
    }
    
    updateSelectedDrivers() {
        this.updateStandingsList();
        
        const predictBtn = document.getElementById('predictBtn');
        const predictTimingBtn = document.getElementById('predictTimingBtn');
        predictBtn.disabled = !(this.chaserDriver && this.defenderDriver);
        predictTimingBtn.disabled = !(this.chaserDriver && this.defenderDriver);
        
        document.getElementById('chaserBox').classList.toggle('active', this.chaserDriver !== null);
        document.getElementById('defenderBox').classList.toggle('active', this.defenderDriver !== null);
    }
    
    async predictUndercut() {
        if (!this.validateSelection()) return;
        
        try {
            this.showLoading('predictBtn');
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    year: this.currentYear,
                    round_num: this.currentRound,
                    lap_number: this.currentLap,
                    chaser: this.chaserDriver,
                    defender: this.defenderDriver
                })
            });
            
            const data = await response.json();
            this.hideLoading('predictBtn');
            
            if (response.ok) {
                this.displayPrediction(data);
            } else {
                this.showError(data.error || 'Prediction failed');
            }
        } catch (error) {
            console.error('Error predicting undercut:', error);
            this.hideLoading('predictBtn');
            this.showError('Failed to get prediction');
        }
    }
    
    async predictBestTiming() {
        if (!this.validateSelection()) return;
        
        try {
            this.showLoading('predictTimingBtn');
            const response = await fetch('/api/best-timing', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    year: this.currentYear,
                    round_num: this.currentRound,
                    chaser: this.chaserDriver,
                    defender: this.defenderDriver
                })
            });
            
            const data = await response.json();
            this.hideLoading('predictTimingBtn');
            
            if (response.ok) {
                this.displayRecommendedLaps(data.recommended_laps || data.laps);
            } else {
                this.showError(data.error || 'Failed to get best timing');
            }
        } catch (error) {
            console.error('Error predicting best timing:', error);
            this.hideLoading('predictTimingBtn');
            this.showError('Failed to get best timing');
        }
    }
    
    displayRecommendedLaps(laps) {
        const container = document.getElementById('recommendedLaps');
        const list = document.getElementById('recommendedLapsList');
        
        // Clear previous recommended laps
        this.recommendedLapNumbers = [];
        
        if (!laps || laps.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>No timing recommendations available</p>
                </div>
            `;
            container.style.display = 'block';
            return;
        }
        
        // Sort laps by probability (highest first)
        laps.sort((a, b) => b.probability - a.probability);
        
        // Store lap numbers for highlighting
        this.recommendedLapNumbers = laps.map(lap => lap.lap);
        
        list.innerHTML = '';
        
        laps.forEach((lap, index) => {
            const probability = (lap.probability * 100).toFixed(1);
            const lapItem = document.createElement('div');
            lapItem.className = 'recommended-lap-item';
            lapItem.innerHTML = `
                <div class="recommended-lap-info">
                    <div class="recommended-lap-number">Lap ${lap.lap}</div>
                    <div class="recommended-lap-probability">
                        <div class="probability-bar">
                            <div class="probability-fill" style="width: ${probability}%"></div>
                        </div>
                        <span>${probability}%</span>
                    </div>
                </div>
                <div class="recommended-lap-actions">
                    <button class="select-lap-btn" data-lap="${lap.lap}">
                        <i class="fas fa-sliders-h"></i> Select Lap
                    </button>
                </div>
            `;
            
            // Add click event to the select button
            const selectBtn = lapItem.querySelector('.select-lap-btn');
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectRecommendedLap(lap.lap);
            });
            
            // Also make the whole item clickable
            lapItem.addEventListener('click', () => {
                this.selectRecommendedLap(lap.lap);
            });
            
            list.appendChild(lapItem);
        });
        
        container.style.display = 'block';
        
        // Update lap value color if current lap is recommended
        this.updateLapValueColor();
        
        // Scroll to the recommended laps section
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // New method: Update lap value color based on whether it's a recommended lap
    updateLapValueColor() {
        const lapValueElement = document.getElementById('lapValue');
        
        // Remove any previous best-lap class
        lapValueElement.classList.remove('best-lap');
        
        // Add best-lap class if current lap is in recommended laps
        if (this.currentLap && this.recommendedLapNumbers.includes(this.currentLap)) {
            lapValueElement.classList.add('best-lap');
        }
    }
    
    selectRecommendedLap(lap) {
        // Update slider and current lap
        const slider = document.getElementById('lapSlider');
        slider.value = lap;
        this.currentLap = lap;
        
        // Update display
        document.getElementById('lapValue').textContent = lap;
        document.getElementById('currentLapDisplay').textContent = lap;
        
        // Ensure lap value is highlighted as best lap
        this.updateLapValueColor();
        
        // Load standings for this lap
        if (this.currentYear && this.currentRound) {
            this.loadStandings(this.currentYear, this.currentRound, lap);
        }
        
        // Close recommended laps section
        document.getElementById('recommendedLaps').style.display = 'none';
        
        // Show success message
        this.showTimingSuccessMessage(lap);
    }
    
    showTimingSuccessMessage(lap) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.timing-success-message');
        existingMessages.forEach(msg => msg.remove());
        
        const message = document.createElement('div');
        message.className = 'timing-success-message';
        message.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>Selected Lap ${lap} for undercut analysis</span>
        `;
        
        // Insert after the driver selection card
        const middlePanel = document.querySelector('.middle-panel');
        const driverCard = document.querySelector('.card:nth-child(2)');
        if (middlePanel && driverCard) {
            middlePanel.insertBefore(message, driverCard.nextSibling);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 3000);
        }
    }
    
    displayPrediction(data) {
        document.getElementById('predictionResult').style.display = 'block';
        document.getElementById('successBadge').textContent = data.success ? 'SUCCESS' : 'FAIL';
        document.getElementById('successBadge').className = `success-badge ${data.success ? 'success' : 'fail'}`;
        document.getElementById('probabilityValue').textContent = `${(data.probability * 100).toFixed(1)}%`;
        document.getElementById('confidenceBadge').textContent = `${data.confidence} Confidence`;
        
        // Scroll to prediction result
        document.getElementById('predictionResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    validateSelection() {
        if (!this.currentYear || !this.currentRound || !this.currentLap) {
            this.showError('Please select year, race, and lap');
            return false;
        }
        
        if (!this.chaserDriver || !this.defenderDriver) {
            this.showError('Please select both chaser and defender drivers');
            return false;
        }
        
        if (this.chaserDriver === this.defenderDriver) {
            this.showError('Chaser and defender must be different drivers');
            return false;
        }
        
        return true;
    }
    
    clearSelections() {
        this.currentLap = null;
        this.chaserDriver = null;
        this.defenderDriver = null;
        this.recommendedLapNumbers = []; // Clear recommended laps
        
        document.getElementById('lapSlider').value = 1;
        document.getElementById('lapSlider').disabled = true;
        document.getElementById('lapValue').textContent = '1';
        document.getElementById('currentLapDisplay').textContent = '1';
        document.getElementById('lapValue').classList.remove('best-lap'); // Remove highlight
        document.getElementById('chaserSelect').value = '';
        document.getElementById('defenderSelect').value = '';
        document.getElementById('chaserSelect').disabled = true;
        document.getElementById('defenderSelect').disabled = true;
        document.getElementById('predictionResult').style.display = 'none';
        document.getElementById('recommendedLaps').style.display = 'none';
        
        // Disable both buttons
        document.getElementById('predictBtn').disabled = true;
        document.getElementById('predictTimingBtn').disabled = true;
        
        document.getElementById('standingsList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-flag-checkered"></i>
                <p>Select a race and lap to see standings</p>
            </div>
        `;
    }
    
    showLoading(buttonId) {
        const button = document.getElementById(buttonId);
        button.classList.add('loading');
        button.disabled = true;
        button.innerHTML = '<div class="spinner"></div>';
    }
    
    hideLoading(buttonId) {
        const button = document.getElementById(buttonId);
        button.classList.remove('loading');
        button.disabled = false;
        
        // Restore button text based on ID
        if (buttonId === 'predictBtn') {
            button.textContent = 'Predict Undercut';
        } else if (buttonId === 'predictTimingBtn') {
            button.textContent = 'Predict Best Timing';
        }
    }
    
    showError(message) {
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        // Insert at top of middle panel
        const middlePanel = document.querySelector('.middle-panel');
        if (middlePanel) {
            middlePanel.insertBefore(errorDiv, middlePanel.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new F1UndercutApp();
});