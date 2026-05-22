/**
 * simulation.js — Engine: time, CSV agents, SEIR, proximity slider, patient-zero slider.
 */
class Simulation {
    constructor() {
        this.agents       = [];
        this.contacts     = [];
        this.allContacts  = new Set();
        this.contactEdges = [];
        this.simTime      = 0;
        this.running      = false;
        this.speed        = CONFIG.DEFAULT_SPEED;
        this.transmissionProb  = CONFIG.DEFAULT_TRANSMISSION_PROB;
        this.incubationHours   = CONFIG.DEFAULT_INCUBATION_HOURS;
        // Proximity in metres (slider 0.5–5.0m); converted to map-units on the fly
        this.proximityMeters   = CONFIG.DEFAULT_PROXIMITY_METERS;
        this.population        = CONFIG.DEFAULT_POPULATION;
        this.patientZeros      = CONFIG.DEFAULT_PATIENT_ZEROS;
        this.scaleX = 1; this.scaleY = 1;
        this._lastTimestamp = 0;
        this._accumulator   = 0;
    }

    // Proximity in canvas-space pixels
    get proximityPx() {
        return this.proximityMeters * CONFIG.PIXELS_PER_METER * this.scaleX;
    }

    // ── Init from STUDENTS_DATA subset ────────────────────────────────────
    init(canvasWidth, canvasHeight) {
        this.scaleX = canvasWidth  / MAP.width;
        this.scaleY = canvasHeight / MAP.height;
        this.agents = []; this.contacts = [];
        this.allContacts = new Set(); this.contactEdges = [];
        this.simTime = 0; this._lastTimestamp = 0; this._accumulator = 0;

        Pathfinder.build();

        const pool = (typeof STUDENTS_DATA !== 'undefined') ? STUDENTS_DATA : [];
        // Shuffle and pick `population` healthy students
        const healthy  = pool.filter(d => d.status === 0).sort(() => Math.random() - 0.5);
        const subset   = healthy.slice(0, Math.min(this.population, healthy.length));

        // Force `patientZeros` infected agents into the subset
        const pzCount = Math.min(this.patientZeros, this.population - 1);
        const infected = pool.filter(d => d.status === 2).sort(() => Math.random() - 0.5);
        for (let i = 0; i < pzCount; i++) {
            const iz = infected[i % infected.length];
            if (iz) subset[i] = { ...iz }; // use infected row
        }

        for (const row of subset) {
            this.agents.push(new Agent(row, this.scaleX, this.scaleY));
        }
    }

    // ── Main tick ─────────────────────────────────────────────────────────
    tick(timestamp) {
        if (!this._lastTimestamp) this._lastTimestamp = timestamp;
        const deltaMs = Math.min(timestamp - this._lastTimestamp, 100);
        this._lastTimestamp = timestamp;
        if (!this.running) return;

        const rate = (this.speed * 60) / (CONFIG.REAL_SECONDS_PER_SIM_HOUR * 1000);
        this._accumulator += deltaMs * rate;
        const step = 0.25;
        while (this._accumulator >= step) {
            this._accumulator -= step;
            this.simTime += step;
            if (this.simTime >= CONFIG.DAY_DURATION_MINUTES) {
                this.simTime = CONFIG.DAY_DURATION_MINUTES; this.running = false; break;
            }
            this._updateAgents(step);
            this._detectContacts();
            this._processContamination();
        }
    }

    _updateAgents(stepMin) {
        for (const a of this.agents) {
            a.update(this.simTime, this.agents);
            a.tickIncubation(stepMin);
        }
    }

    _detectContacts() {
        this.contacts = [];
        const active = this.agents.filter(a => a.active && a.state !== 'gone' && a.state !== 'waiting');
        const thr    = this.proximityPx;

        for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
                const a = active[i], b = active[j];
                const d = Math.hypot(a.displayX - b.displayX, a.displayY - b.displayY);
                if (d < thr) {
                    this.contacts.push({ a, b, dist: d });
                    this.allContacts.add([a.id, b.id].sort().join('|'));
                }
            }
        }
        this.contactEdges = [];
        this.allContacts.forEach(k => {
            const [s,t] = k.split('|');
            this.contactEdges.push({ source: s, target: t });
        });
    }

    _processContamination() {
        for (const { a, b } of this.contacts) {
            // Rule: ONLY status=2 (infected) can transmit. status=1 (incubating) cannot.
            const infector = a.contagious ? a : (b.contagious ? b : null);
            const target   = infector === a ? b : a;
            if (!infector || !target.susceptible) continue;

            const mx   = ((a.displayX + b.displayX) / 2) / this.scaleX;
            const my   = ((a.displayY + b.displayY) / 2) / this.scaleY;
            const zone = MAP.getZoneAt(mx, my) || 'corridor';
            const mult = CONFIG.ZONE_MULTIPLIERS[zone] ?? 0.5;
            if (mult === 0) continue;
            if (Math.random() <= this.transmissionProb * mult * 0.02) {
                target.expose(this.incubationHours * 60);
            }
        }
    }

    // ── CSV export ─────────────────────────────────────────────────────────
    exportCSV() {
        const now = this.getTimeString();
        const toHHMM = m => {
            const tot = 7*60 + Math.round(m);
            return String(Math.floor(tot/60)).padStart(2,'0') + ':' + String(tot%60).padStart(2,'0');
        };
        const LABEL = { 0:'Sain', 1:'Incubation', 2:'Infecté' };
        const rows  = [
            'ID,Nom_Prenom,Niveau,Classe_Attitree,Profil_Dejeuner,' +
            'Horaire_Arrivee,Horaire_Depart,Indice_Sociabilite,' +
            'Statut_Sante,Statut_Label,Temps_Incubation_Restant,Contacts_Total,Heure_Export'
        ];
        for (const a of this.agents) {
            rows.push([
                a.id, `"${a.name}"`, a.niveau, `"${a.salleId}"`, `"${a.profil}"`,
                toHHMM(a.arrivalMin), toHHMM(a.departureMin),
                a.sociability.toFixed(2), a.healthStatus, LABEL[a.healthStatus] || '',
                Math.round(a.incubationLeft),
                [...this.allContacts].filter(k => k.includes(a.id)).length,
                now
            ].join(','));
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const el   = Object.assign(document.createElement('a'), {
            href: url, download: `sim_export_${now.replace(':','-')}.csv`
        });
        document.body.appendChild(el); el.click();
        document.body.removeChild(el); URL.revokeObjectURL(url);
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    getTimeString() {
        const m = Math.floor(this.simTime);
        return String(CONFIG.DAY_START_HOUR + Math.floor(m/60)).padStart(2,'0') + ':' +
               String(m % 60).padStart(2,'0');
    }

    getStats() {
        let s = 0, i = 0, inf = 0;
        for (const a of this.agents) {
            if (a.healthStatus === 0) s++;
            else if (a.healthStatus === 1) i++;
            else inf++;
        }
        return {
            susceptible: s, incubating: i, infected: inf,
            contacts: this.allContacts.size,
            active: this.agents.filter(a => a.active && a.state !== 'gone').length
        };
    }
}
