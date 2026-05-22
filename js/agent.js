/**
 * agent.js — SEIR agent: A* navigation, sociability clusters, wall repulsion.
 */
class Agent {
    constructor(data, scaleX, scaleY) {
        this.id          = data.id;
        this.name        = data.name;
        this.niveau      = data.niveau || '';
        this.salleId     = data.classe;
        this.profil      = data.profil;
        this.sociability = data.sociability;
        this.arrivalMin  = data.arrivalMin;
        this.departureMin= data.departureMin;
        this.scaleX      = scaleX;
        this.scaleY      = scaleY;

        // SEIR: 0=susceptible, 1=incubating (not contagious), 2=infected (contagious)
        this.healthStatus   = data.status;
        this.incubationLeft = data.incubation; // simulated minutes

        // Position — start at RER
        const rx = MAP.rerExit.x * scaleX;
        const ry = MAP.rerExit.y * scaleY;
        this.x = rx; this.y = ry;
        this.displayX = rx; this.displayY = ry;
        this.vx = 0; this.vy = 0;

        // FSM: 'waiting' | 'navigating' | 'seated' | 'wandering' | 'social' | 'departing' | 'gone'
        this.state       = 'waiting';
        this.active      = false;
        this.path        = [];
        this.pathIdx     = 0;
        this._onArrival  = 'wandering';
        this.socialTimer = 0;
        this.currentActivity = null;
    }

    // ── Health getters ──────────────────────────────────────────────────
    get susceptible() { return this.healthStatus === 0; }
    get incubating()  { return this.healthStatus === 1; }
    get infected()    { return this.healthStatus === 2; }
    get contagious()  { return this.healthStatus === 2; } // ONLY infected transmit

    expose(incMinutes) {
        if (this.healthStatus !== 0) return;
        this.healthStatus   = 1;
        this.incubationLeft = incMinutes;
    }

    tickIncubation(dMin) {
        if (this.healthStatus !== 1) return;
        this.incubationLeft -= dMin;
        if (this.incubationLeft <= 0) { this.healthStatus = 2; this.incubationLeft = 0; }
    }

    // ── Navigation ──────────────────────────────────────────────────────
    _navigateTo(mx, my, onArrival) {
        const cmx = this.x / this.scaleX;
        const cmy = this.y / this.scaleY;
        const pts  = Pathfinder.find(cmx, cmy, mx, my);
        this.path     = pts.map(p => ({ x: p.x * this.scaleX, y: p.y * this.scaleY }));
        this.pathIdx  = 0;
        this.state    = 'navigating';
        this._onArrival = onArrival || 'wandering';
    }

    goToRoom(room, onArrival) {
        const p = MAP.randomRoomPoint(room);
        this._navigateTo(p.x, p.y, onArrival || 'seated');
    }

    goToCorridor(onArrival) {
        const p = MAP.randomCorridorPoint();
        this._navigateTo(p.x, p.y, onArrival || 'wandering');
    }

    goToExterior(onArrival) {
        const p = MAP.randomExteriorPoint();
        this._navigateTo(p.x, p.y, onArrival || 'wandering');
    }

    goToRER() {
        this._navigateTo(MAP.rerExit.x, MAP.rerExit.y, 'gone');
        this.state = 'departing';
    }

    // ── Main update ─────────────────────────────────────────────────────
    update(simTime, agents) {
        // Arrival trigger
        if (!this.active && simTime >= this.arrivalMin) {
            this.active = true;
            const room = MAP.getRoomBySalle(this.salleId);
            this.goToRoom(room, 'seated');
        }
        if (!this.active || this.state === 'waiting' || this.state === 'gone') return;

        // Departure trigger
        if (simTime >= this.departureMin && this.state !== 'departing' && this.state !== 'gone') {
            this.goToRER();
            return;
        }

        // Midday 12h (300 min from 7:00) → lunch zone
        if (simTime >= 300 && simTime < 420 && this.currentActivity !== 'midday'
            && this.state !== 'departing') {
            this.currentActivity = 'midday';
            this._goMidday();
        }
        // End midday → back to class
        if (this.currentActivity === 'midday' && simTime >= 420 && this.state !== 'departing') {
            this.currentActivity = null;
            const room = MAP.getRoomBySalle(this.salleId);
            this.goToRoom(room, 'seated');
        }

        switch (this.state) {
            case 'navigating':
            case 'departing':
                this._followPath(); break;
            case 'wandering':
                this._wander(agents); break;
            case 'social':
                this._updateSocial(); break;
            case 'seated':
                this._idleJitter(); break;
        }

        // Wall repulsion
        const rep = MAP.wallRepulsion(this.x / this.scaleX, this.y / this.scaleY);
        this.vx += rep.fx * this.scaleX;
        this.vy += rep.fy * this.scaleY;

        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;
        this.x = Math.max(0, Math.min(MAP.width  * this.scaleX, this.x));
        this.y = Math.max(0, Math.min(MAP.height * this.scaleY, this.y));

        // Smooth display
        this.displayX += (this.x - this.displayX) * 0.35;
        this.displayY += (this.y - this.displayY) * 0.35;
    }

    _goMidday() {
        if      (this.profil === 'Cafétéria') this.goToRoom(MAP.getCafeteria(), 'seated');
        else if (this.profil === 'Extérieur') this.goToExterior('wandering');
        else                                   this.goToCorridor('wandering');
    }

    _followPath() {
        if (this.pathIdx >= this.path.length) {
            this.state = this._onArrival;
            this.vx = 0; this.vy = 0;
            if (this.state === 'gone') {
                this.active = false;
                this.x = MAP.rerExit.x * this.scaleX;
                this.y = MAP.rerExit.y * this.scaleY;
            }
            return;
        }
        const wp   = this.path[this.pathIdx];
        const dx   = wp.x - this.x;
        const dy   = wp.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < CONFIG.AGENT_SPEED * 10) { this.pathIdx++; return; }
        const spd = Math.min(CONFIG.AGENT_SPEED * 1.5, dist);
        this.vx = (dx / dist) * spd;
        this.vy = (dy / dist) * spd;
    }

    _idleJitter() {
        this.vx = (Math.random() - 0.5) * 0.08;
        this.vy = (Math.random() - 0.5) * 0.08;
    }

    _wander(agents) {
        if (Math.random() < 0.015) {
            const a = Math.random() * Math.PI * 2;
            this.vx = Math.cos(a) * CONFIG.AGENT_SPEED * 0.7;
            this.vy = Math.sin(a) * CONFIG.AGENT_SPEED * 0.7;
        }
        // Ensure agent stays in walkable zone
        const mx = this.x / this.scaleX, my = this.y / this.scaleY;
        if (!MAP.isWalkable(mx, my)) {
            this.goToCorridor('wandering');
            return;
        }
        this._trySocialize(agents);
    }

    _trySocialize(agents) {
        if (Math.random() > CONFIG.SOCIAL_STOP_PROB) return;
        // Only socialize in corridors
        const mx = this.x / this.scaleX, my = this.y / this.scaleY;
        if (!MAP.isInCorridor(mx, my)) return;

        const radius  = CONFIG.SOCIAL_RADIUS * this.scaleX;
        const nearby  = agents.filter(a =>
            a.id !== this.id && a.state === 'wandering' &&
            Math.hypot(a.x - this.x, a.y - this.y) < radius
        );
        if (!nearby.length) return;

        const partner = nearby[Math.floor(Math.random() * nearby.length)];
        const avgSoc  = (this.sociability + partner.sociability) * 0.5;
        if (avgSoc > CONFIG.SOCIAL_THRESHOLD) {
            const ticks = CONFIG.SOCIAL_MIN_TICKS + Math.random() * (CONFIG.SOCIAL_MAX_TICKS - CONFIG.SOCIAL_MIN_TICKS);
            this.state = 'social'; this.socialTimer = ticks; this.vx = 0; this.vy = 0;
            partner.state = 'social'; partner.socialTimer = ticks * 0.8; partner.vx = 0; partner.vy = 0;
        }
    }

    _updateSocial() {
        this.vx = (Math.random() - 0.5) * 0.1;
        this.vy = (Math.random() - 0.5) * 0.1;
        this.socialTimer--;
        if (this.socialTimer <= 0) this.state = 'wandering';
    }
}
