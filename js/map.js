/**
 * map.js — University floor plan.
 * Coordinate system: 1000 × 600 map-units. 1m = 20 units.
 *
 * Layout:
 *   Top row:    Salle 1-4  (y=5–210, above main corridor)
 *   Bottom left: Salle 5-6  (y=320–595)
 *   Bottom right: Cafétéria  (y=320–595, large)
 *   Corridors: main horizontal + left vertical
 *   Exterior/RER: right strip x=940-1000
 */
const MAP = {
    width:  1000,
    height: 600,

    // ── Zones ──────────────────────────────────────────────────────────
    corridors: [
        { id: 'main',  x: 0,   y: 220, w: 1000, h: 90  },  // main horizontal
        { id: 'left',  x: 0,   y: 0,   w: 70,   h: 600 },  // left vertical
    ],

    exterior: { x: 935, y: 0, w: 65, h: 600 },
    rerExit:  { x: 975, y: 265, label: 'Gare RER' },

    rooms: [
        // Top row — y=5-210
        { id:'class1', salle:'Salle 1', label:'Salle 1', x:80,  y:5, w:185, h:205, type:'classroom', door:'bottom' },
        { id:'class2', salle:'Salle 2', label:'Salle 2', x:275, y:5, w:185, h:205, type:'classroom', door:'bottom' },
        { id:'class3', salle:'Salle 3', label:'Salle 3', x:470, y:5, w:185, h:205, type:'classroom', door:'bottom' },
        { id:'class4', salle:'Salle 4', label:'Salle 4', x:665, y:5, w:185, h:205, type:'classroom', door:'bottom' },
        // Bottom left — y=320-595
        { id:'class5', salle:'Salle 5', label:'Salle 5', x:80,  y:320, w:185, h:270, type:'classroom', door:'top' },
        { id:'class6', salle:'Salle 6', label:'Salle 6', x:275, y:320, w:185, h:270, type:'classroom', door:'top' },
        // Bottom right — cafeteria (large)
        { id:'cafeteria', salle:null, label:'Cafétéria', x:470, y:320, w:450, h:270, type:'cafeteria', door:'top' },
    ],

    // ── Lookups ────────────────────────────────────────────────────────
    getRoomBySalle(s)  { return this.rooms.find(r => r.salle === s) || this.rooms[0]; },
    getCafeteria()     { return this.rooms.find(r => r.type === 'cafeteria'); },

    // ── Door info ──────────────────────────────────────────────────────
    // Returns { wx, wy, gapX1, gapX2, gapY1, gapY2 }
    getDoor(room) {
        const hw = CONFIG.DOOR_HALF_WIDTH; // 15
        const cx = room.x + room.w / 2;
        if (room.door === 'bottom') {
            return { wx: cx, wy: room.y + room.h + 5,
                gapX1: cx - hw, gapX2: cx + hw, gapY1: room.y + room.h, gapY2: 220 };
        }
        if (room.door === 'top') {
            return { wx: cx, wy: room.y - 5,
                gapX1: cx - hw, gapX2: cx + hw, gapY1: 310, gapY2: room.y };
        }
    },

    // ── Geometry ───────────────────────────────────────────────────────
    inRect(x, y, r)      { return x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h; },
    isInCorridor(x, y)   { return this.corridors.some(c => this.inRect(x,y,c)); },
    isInExterior(x, y)   { return this.inRect(x,y,this.exterior); },
    isInRoom(x, y, room) { return this.inRect(x,y,room); },
    isInAnyRoom(x, y)    { return this.rooms.some(r => this.inRect(x,y,r)); },

    isInDoorGap(x, y) {
        for (const room of this.rooms) {
            const d = this.getDoor(room);
            if (x >= d.gapX1 && x <= d.gapX2 && y >= d.gapY1 && y <= d.gapY2) return true;
        }
        return false;
    },

    // Main walkability check used by A* grid builder
    isWalkable(x, y) {
        if (x < 0 || x > this.width || y < 0 || y > this.height) return false;
        if (this.isInCorridor(x, y)) return true;
        if (this.isInAnyRoom(x, y))  return true;
        if (this.isInExterior(x, y)) return true;
        if (this.isInDoorGap(x, y))  return true;
        return false;
    },

    getZoneAt(x, y) {
        for (const r of this.rooms) { if (this.inRect(x,y,r)) return r.type; }
        if (this.isInExterior(x, y)) return 'exterior';
        if (this.isInCorridor(x, y)) return 'corridor';
        return null;
    },

    // ── Random points ──────────────────────────────────────────────────
    randomCorridorPoint() {
        // Pick main corridor preferentially
        const c = this.corridors[0];
        return { x: 70 + Math.random() * 860, y: c.y + 10 + Math.random() * (c.h - 20) };
    },
    randomExteriorPoint() {
        const e = this.exterior;
        return { x: e.x + 5 + Math.random() * (e.w - 10), y: 10 + Math.random() * (this.height - 20) };
    },
    randomRoomPoint(room) {
        return { x: room.x + 20 + Math.random() * (room.w - 40),
                 y: room.y + 20 + Math.random() * (room.h - 40) };
    },

    // ── Seat generation ────────────────────────────────────────────────
    generateSeats(room, count) {
        const seats = [], margin = 25;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const sx = (room.w - 2*margin) / Math.max(cols-1,1);
        const sy = (room.h - 2*margin) / Math.max(rows-1,1);
        for (let r=0; r<rows && seats.length<count; r++)
            for (let c=0; c<cols && seats.length<count; c++)
                seats.push({ x: room.x+margin+c*sx, y: room.y+margin+r*sy });
        return seats;
    },

    // ── Wall repulsion (raycasting) ────────────────────────────────────
    wallRepulsion(mx, my) {
        const d = CONFIG.WALL_REPULSE_DIST, f = CONFIG.WALL_REPULSE_FORCE;
        let fx = 0, fy = 0;
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            if (!this.isWalkable(mx+dx*d, my+dy*d)) { fx -= dx*f; fy -= dy*f; }
        }
        return { fx, fy };
    },
};
