/**
 * renderer.js — Spatial 2D canvas renderer.
 * Draws new map: 6 classrooms, cafeteria, corridors, exterior, RER, agents.
 */
class SpatialRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
    }

    resize(container) {
        const rect = container.getBoundingClientRect();
        const dpr  = window.devicePixelRatio || 1;
        this.canvas.width  = rect.width  * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { width: rect.width, height: rect.height };
    }

    render(sim) {
        const ctx = this.ctx;
        const cw  = this.canvas.width  / (window.devicePixelRatio || 1);
        const ch  = this.canvas.height / (window.devicePixelRatio || 1);
        const sx  = cw / MAP.width;
        const sy  = ch / MAP.height;

        // Background
        ctx.fillStyle = '#0b0f1e';
        ctx.fillRect(0, 0, cw, ch);

        this._drawGrid(ctx, cw, ch);
        this._drawExterior(ctx, sx, sy);
        this._drawCorridors(ctx, sx, sy);
        this._drawRooms(ctx, sx, sy);
        this._drawDoors(ctx, sx, sy);
        this._drawRER(ctx, sx, sy);
        this._drawContacts(ctx, sim, sx);
        this._drawAgents(ctx, sim, sx);
        this._drawProximityRef(ctx, cw, ch, sim, sx);
    }

    _drawGrid(ctx, cw, ch) {
        ctx.strokeStyle = 'rgba(255,255,255,0.018)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < cw; x += step) {
            ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke();
        }
        for (let y = 0; y < ch; y += step) {
            ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke();
        }
    }

    _drawExterior(ctx, sx, sy) {
        const e = MAP.exterior;
        ctx.fillStyle   = 'rgba(80,200,100,0.05)';
        ctx.strokeStyle = 'rgba(80,200,100,0.18)';
        ctx.lineWidth   = 1;
        ctx.fillRect(e.x*sx, e.y*sy, e.w*sx, e.h*sy);
        ctx.strokeRect(e.x*sx, e.y*sy, e.w*sx, e.h*sy);
        ctx.fillStyle    = 'rgba(80,200,100,0.35)';
        ctx.font         = `500 ${Math.max(8,9*sx)}px Inter,sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ext.', (e.x+e.w/2)*sx, (e.y+e.h/2)*sy);
    }

    _drawCorridors(ctx, sx, sy) {
        ctx.fillStyle   = 'rgba(255,255,255,0.025)';
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth   = 1;
        for (const c of MAP.corridors) {
            ctx.fillRect(c.x*sx, c.y*sy, c.w*sx, c.h*sy);
            ctx.strokeRect(c.x*sx, c.y*sy, c.w*sx, c.h*sy);
        }
        // Label main corridor
        ctx.fillStyle    = 'rgba(255,255,255,0.12)';
        ctx.font         = `400 ${Math.max(8,9*sx)}px Inter,sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Couloir principal', 500*sx, 265*sy);
    }

    _drawRooms(ctx, sx, sy) {
        for (const room of MAP.rooms) {
            const rx = room.x*sx, ry = room.y*sy;
            const rw = room.w*sx, rh = room.h*sy;
            const isCaf = room.type === 'cafeteria';

            ctx.fillStyle   = isCaf ? 'rgba(255,160,50,0.08)' : 'rgba(90,120,255,0.08)';
            ctx.strokeStyle = isCaf ? 'rgba(255,160,50,0.35)' : 'rgba(90,120,255,0.35)';
            this._roundRect(ctx, rx, ry, rw, rh, 6);
            ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();

            // Label
            ctx.fillStyle    = isCaf ? 'rgba(255,160,50,0.6)' : 'rgba(90,120,255,0.55)';
            ctx.font         = `600 ${Math.max(9,11*sx)}px Inter,sans-serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(room.label, rx + rw/2, ry + rh/2);

            // Seat dots
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            for (const s of MAP.generateSeats(room, isCaf ? 25 : 15)) {
                ctx.beginPath();
                ctx.arc(s.x*sx, s.y*sy, 2, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }

    _drawDoors(ctx, sx, sy) {
        for (const room of MAP.rooms) {
            const d   = MAP.getDoor(room);
            const hw  = CONFIG.DOOR_HALF_WIDTH;
            const col = room.type === 'cafeteria' ? 'rgba(255,160,50,0.8)' : 'rgba(90,120,255,0.8)';
            ctx.fillStyle = col;

            // Draw door gap as a bright bar
            if (room.door === 'bottom') {
                const cy = ((d.gapY1 + d.gapY2) * 0.5) * sy;
                ctx.fillRect((d.wx - hw)*sx, cy - 2, hw*2*sx, 5);
            } else {
                const cy = ((d.gapY1 + d.gapY2) * 0.5) * sy;
                ctx.fillRect((d.wx - hw)*sx, cy - 2, hw*2*sx, 5);
            }
        }
    }

    _drawRER(ctx, sx, sy) {
        const rx = MAP.rerExit.x * sx;
        const ry = MAP.rerExit.y * sy;
        // Vertical dashed line
        ctx.strokeStyle = 'rgba(0,210,255,0.35)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(rx - 10, 0); ctx.lineTo(rx - 10, MAP.height*sy); ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.fillStyle    = 'rgba(0,210,255,0.75)';
        ctx.font         = `bold ${Math.max(9,10*sx)}px Inter,sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚉 RER', (rx + MAP.exterior.x*sx) * 0.5, ry);
    }

    _drawContacts(ctx, sim, sx) {
        const thr = sim.proximityPx;
        for (const { a, b, dist } of sim.contacts) {
            const op = Math.max(0.05, 0.55 - dist / thr * 0.5);
            ctx.strokeStyle = `rgba(255,200,60,${op})`;
            ctx.lineWidth   = 1;
            ctx.beginPath(); ctx.moveTo(a.displayX, a.displayY); ctx.lineTo(b.displayX, b.displayY); ctx.stroke();
        }
    }

    _drawAgents(ctx, sim, sx) {
        for (const a of sim.agents) {
            if (!a.active || a.state === 'gone' || a.state === 'waiting') continue;
            const x = a.displayX, y = a.displayY;
            const r = CONFIG.AGENT_RADIUS;
            let fill, glow;
            if      (a.healthStatus === 2) { fill='#ff4056'; glow='rgba(255,64,86,0.3)'; }
            else if (a.healthStatus === 1) { fill='#ffaa3c'; glow='rgba(255,170,60,0.25)'; }
            else                            { fill='#4aeadc'; glow='rgba(74,234,220,0.2)'; }

            // Glow halo
            const g = ctx.createRadialGradient(x,y,0,x,y,r*4);
            g.addColorStop(0, glow); g.addColorStop(1, glow.replace(/[\d.]+\)$/, '0)'));
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x,y,r*4,0,Math.PI*2); ctx.fill();

            // Dot
            ctx.fillStyle = fill;
            ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        }
    }

    _drawProximityRef(ctx, cw, ch, sim, sx) {
        const r  = sim.proximityMeters * CONFIG.PIXELS_PER_METER * sx * 0.5;
        const cx = cw - 50, cy = ch - 35;
        ctx.strokeStyle = 'rgba(255,200,60,0.35)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle    = 'rgba(255,255,255,0.3)';
        ctx.font         = '9px Inter,sans-serif';
        ctx.textAlign    = 'center';
        ctx.fillText(`${sim.proximityMeters}m`, cx, cy + r + 10);
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
        ctx.closePath();
    }
}
