/** ui.js — UI controls and event bindings */
class UIController {
    constructor(simulation) {
        this.simulation = simulation;
        this.els = {
            timeDisplay:        document.getElementById('time-display'),
            timeDisplayHeader:  document.getElementById('time-display-header'),
            timeSlider:         document.getElementById('time-slider'),
            speedSlider:        document.getElementById('speed-slider'),
            speedLabel:         document.getElementById('speed-label'),
            transmissionSlider: document.getElementById('transmission-slider'),
            transmissionLabel:  document.getElementById('transmission-label'),
            proximitySlider:    document.getElementById('proximity-slider'),
            proximityLabel:     document.getElementById('proximity-label'),
            incubationSlider:   document.getElementById('incubation-slider'),
            incubationLabel:    document.getElementById('incubation-label'),
            patientZeroSlider:  document.getElementById('patient-zero-slider'),
            patientZeroLabel:   document.getElementById('patient-zero-label'),
            populationSlider:   document.getElementById('population-slider'),
            populationLabel:    document.getElementById('population-label'),
            btnPlay:    document.getElementById('btn-play'),
            btnPause:   document.getElementById('btn-pause'),
            btnReset:   document.getElementById('btn-reset'),
            btnExport:  document.getElementById('btn-export'),
            countHealthy:  document.getElementById('count-healthy'),
            countExposed:  document.getElementById('count-exposed'),
            countInfected: document.getElementById('count-infected'),
            countActive:   document.getElementById('count-active'),
            countContacts: document.getElementById('count-contacts'),
        };
        this._isDraggingTime = false;
    }

    init(resetCallback) {
        this.resetCallback = resetCallback;

        // Time scrubbing
        this.els.timeSlider.addEventListener('mousedown', () => { this._isDraggingTime = true; });
        this.els.timeSlider.addEventListener('mouseup',   () => { this._isDraggingTime = false; });
        this.els.timeSlider.addEventListener('input', () => {
            if (this._isDraggingTime) this.simulation.simTime = parseFloat(this.els.timeSlider.value);
        });

        // Speed
        this.els.speedSlider.addEventListener('input', () => {
            this.simulation.speed = parseFloat(this.els.speedSlider.value);
            this.els.speedLabel.textContent = this.simulation.speed + 'x';
        });

        // Transmission probability
        this.els.transmissionSlider.addEventListener('input', () => {
            this.simulation.transmissionProb = parseFloat(this.els.transmissionSlider.value);
            this.els.transmissionLabel.textContent = this.simulation.transmissionProb.toFixed(2);
        });

        // Proximity (metres) — live, no reset needed
        if (this.els.proximitySlider) {
            this.els.proximitySlider.addEventListener('input', () => {
                this.simulation.proximityMeters = parseFloat(this.els.proximitySlider.value);
                this.els.proximityLabel.textContent = this.simulation.proximityMeters.toFixed(1);
            });
        }

        // Incubation hours
        this.els.incubationSlider.addEventListener('input', () => {
            this.simulation.incubationHours = parseFloat(this.els.incubationSlider.value);
            this.els.incubationLabel.textContent = this.simulation.incubationHours;
        });

        // Patient zeros — requires reset (changes initial distribution)
        if (this.els.patientZeroSlider) {
            this.els.patientZeroSlider.addEventListener('input', () => {
                this.simulation.patientZeros = parseInt(this.els.patientZeroSlider.value);
                this.els.patientZeroLabel.textContent = this.simulation.patientZeros;
            });
            this.els.patientZeroSlider.addEventListener('change', () => this.resetCallback());
        }

        // Population — requires reset
        if (this.els.populationSlider) {
            this.els.populationSlider.addEventListener('input', () => {
                this.simulation.population = parseInt(this.els.populationSlider.value);
                this.els.populationLabel.textContent = this.simulation.population;
            });
            this.els.populationSlider.addEventListener('change', () => this.resetCallback());
        }

        // Buttons
        this.els.btnPlay.addEventListener('click',  () => { this.simulation.running = true;  this._updateButtonStates(); });
        this.els.btnPause.addEventListener('click', () => { this.simulation.running = false; this._updateButtonStates(); });
        this.els.btnReset.addEventListener('click', () => this.resetCallback());

        // Export CSV
        if (this.els.btnExport) {
            this.els.btnExport.addEventListener('click', () => {
                this.simulation.exportCSV();
                this.els.btnExport.classList.add('export-flash');
                setTimeout(() => this.els.btnExport.classList.remove('export-flash'), 800);
            });
        }

        // Space = play/pause
        document.addEventListener('keydown', e => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.simulation.running = !this.simulation.running;
                this._updateButtonStates();
            }
        });

        this._updateButtonStates();
    }

    update() {
        const t = this.simulation.getTimeString();
        if (this.els.timeDisplay)       this.els.timeDisplay.textContent       = t;
        if (this.els.timeDisplayHeader) this.els.timeDisplayHeader.textContent = t;
        if (!this._isDraggingTime)      this.els.timeSlider.value = this.simulation.simTime;

        const s = this.simulation.getStats();
        this.els.countHealthy.textContent  = s.susceptible;
        this.els.countExposed.textContent  = s.incubating;
        this.els.countInfected.textContent = s.infected;
        this.els.countActive.textContent   = s.active;
        this.els.countContacts.textContent = s.contacts;
    }

    _updateButtonStates() {
        this.els.btnPlay.classList.toggle('active',  this.simulation.running);
        this.els.btnPause.classList.toggle('active', !this.simulation.running);
    }
}
