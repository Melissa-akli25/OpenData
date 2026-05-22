/**
 * pathfinding.js — Clean A* on a 10-unit grid. No external dependencies.
 * All coordinates in map-space (same system as MAP).
 */
const Pathfinder = (() => {
    const CS = CONFIG.PF_CELL_SIZE; // 10 map-units per cell
    let COLS = 0, ROWS = 0, walkGrid = null;

    // ── Build walkability grid from MAP ──────────────────────────────────
    function build() {
        COLS = Math.ceil(MAP.width  / CS);
        ROWS = Math.ceil(MAP.height / CS);
        walkGrid = new Uint8Array(COLS * ROWS);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const mx = c * CS + CS * 0.5;
                const my = r * CS + CS * 0.5;
                if (MAP.isWalkable(mx, my)) walkGrid[r * COLS + c] = 1;
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────
    function isWalk(c, r) {
        return c >= 0 && c < COLS && r >= 0 && r < ROWS && walkGrid[r * COLS + c] === 1;
    }
    function toCell(mx, my) {
        return { c: Math.max(0, Math.min(COLS-1, Math.floor(mx/CS))),
                 r: Math.max(0, Math.min(ROWS-1, Math.floor(my/CS))) };
    }
    function heur(c1, r1, c2, r2) { return Math.hypot(c2-c1, r2-r1); }

    // Snap cell to nearest walkable
    function snap(cell) {
        if (isWalk(cell.c, cell.r)) return;
        for (let d = 1; d < 20; d++) {
            for (let dc = -d; dc <= d; dc++) {
                for (let dr = -d; dr <= d; dr++) {
                    if (Math.abs(dc) === d || Math.abs(dr) === d) {
                        const nc = cell.c + dc, nr = cell.r + dr;
                        if (isWalk(nc, nr)) { cell.c = nc; cell.r = nr; return; }
                    }
                }
            }
        }
    }

    // ── A* ───────────────────────────────────────────────────────────────
    // Returns array of {x,y} map-space waypoints, or a fallback direct route.
    function find(sx, sy, ex, ey) {
        if (!walkGrid) build();
        const sc = toCell(sx, sy);
        const ec = toCell(ex, ey);
        snap(sc); snap(ec);
        if (sc.c === ec.c && sc.r === ec.r) return [{ x: ex, y: ey }];

        const size    = COLS * ROWS;
        const gScore  = new Float32Array(size).fill(Infinity);
        const parent  = new Int32Array(size).fill(-1);
        const inOpen  = new Uint8Array(size);
        const closed  = new Uint8Array(size);

        // Open list as plain sorted array (fine for 6000 nodes)
        const open = [];
        const si   = sc.r * COLS + sc.c;
        gScore[si] = 0;
        open.push({ i: si, f: heur(sc.c, sc.r, ec.c, ec.r) });
        inOpen[si] = 1;

        // 8-directional movement costs
        const DIRS = [
            [0,1,1],[0,-1,1],[1,0,1],[-1,0,1],
            [1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]
        ];

        const ei = ec.r * COLS + ec.c;

        while (open.length > 0) {
            // Pop lowest-f node
            let best = 0;
            for (let k = 1; k < open.length; k++) {
                if (open[k].f < open[best].f) best = k;
            }
            const cur = open.splice(best, 1)[0];
            const ci  = cur.i;
            if (closed[ci]) continue;
            closed[ci] = 1;

            if (ci === ei) return buildPath(parent, ci, ex, ey);

            const cc = ci % COLS;
            const cr = Math.floor(ci / COLS);

            for (const [dc, dr, cost] of DIRS) {
                const nc = cc + dc, nr = cr + dr;
                if (!isWalk(nc, nr)) continue;
                // Diagonal: both cardinal neighbours must be walkable
                if (dc !== 0 && dr !== 0 && (!isWalk(cc+dc, cr) || !isWalk(cc, cr+dr))) continue;
                const ni = nr * COLS + nc;
                if (closed[ni]) continue;
                const ng = gScore[ci] + cost;
                if (ng < gScore[ni]) {
                    gScore[ni] = ng;
                    parent[ni] = ci;
                    if (!inOpen[ni]) { inOpen[ni] = 1; }
                    open.push({ i: ni, f: ng + heur(nc, nr, ec.c, ec.r) });
                }
            }
        }

        // Fallback: go via corridor midpoint
        const mp = MAP.randomCorridorPoint();
        return [{ x: mp.x, y: mp.y }, { x: ex, y: ey }];
    }

    function buildPath(parent, endIdx, ex, ey) {
        const cells = [];
        let cur = endIdx;
        while (cur !== -1) { cells.push(cur); cur = parent[cur]; }
        cells.reverse();
        // Convert to map-space centres
        const pts = cells.map(i => ({
            x: (i % COLS) * CS + CS * 0.5,
            y: Math.floor(i / COLS) * CS + CS * 0.5
        }));
        if (pts.length > 0) pts[pts.length - 1] = { x: ex, y: ey };
        return simplify(pts);
    }

    // String-pulling: skip intermediate collinear/visible points (lookahead=8)
    function simplify(pts) {
        if (pts.length <= 2) return pts;
        const res = [pts[0]];
        let i = 0;
        while (i < pts.length - 1) {
            let j = Math.min(i + 8, pts.length - 1);
            while (j > i + 1 && !lineWalkable(pts[i], pts[j])) j--;
            res.push(pts[j]);
            i = j;
        }
        return res;
    }

    function lineWalkable(a, b) {
        const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CS * 0.5));
        if (steps === 0) return true;
        for (let t = 0; t <= steps; t++) {
            const f  = t / steps;
            const mx = a.x + (b.x - a.x) * f;
            const my = a.y + (b.y - a.y) * f;
            if (!MAP.isWalkable(mx, my)) return false;
        }
        return true;
    }

    return { build, find };
})();
