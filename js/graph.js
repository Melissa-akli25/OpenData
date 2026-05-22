/**
 * graph.js — Force-directed graph visualization for contact network
 * Supports 3 SEIR states: susceptible (cyan), exposed (orange), infected (red)
 */

class GraphRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
        this.width = 0;
        this.height = 0;
    }

    resize(container) {
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = rect.width;
        this.height = rect.height;
        return { width: rect.width, height: rect.height };
    }

    // Convert numeric healthStatus (0/1/2) to string key used by _nodeColor
    _statusKey(healthStatus) {
        if (healthStatus === 2) return 'infected'; // Red — contagious
        if (healthStatus === 1) return 'exposed';  // Orange — incubating, NOT contagious
        return 'susceptible';                       // Cyan — healthy
    }

    syncWithSimulation(simulation) {
        const agents = simulation.agents;
        const existingIds = new Set(this.nodes.map(n => n.id));

        for (const agent of agents) {
            // Read healthStatus (integer 0/1/2) from agent
            const key = this._statusKey(agent.healthStatus);
            if (!existingIds.has(agent.id)) {
                this.nodes.push({
                    id: agent.id,
                    x: this.width / 2 + (Math.random() - 0.5) * this.width * 0.6,
                    y: this.height / 2 + (Math.random() - 0.5) * this.height * 0.6,
                    vx: 0, vy: 0,
                    healthState: key,
                });
            } else {
                const node = this.nodes.find(n => n.id === agent.id);
                if (node) node.healthState = key; // live update every frame
            }
        }

        const agentIds = new Set(agents.map(a => a.id));
        this.nodes = this.nodes.filter(n => agentIds.has(n.id));
        this.edges = simulation.contactEdges;
    }

    applyForces() {
        if (this.nodes.length === 0) return;
        const cx = this.width / 2;
        const cy = this.height / 2;

        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i], b = this.nodes[j];
                let dx = a.x - b.x, dy = a.y - b.y;
                let dist = Math.max(Math.hypot(dx, dy) || 1, 10);
                const force = CONFIG.GRAPH_REPULSION / (dist * dist);
                const fx = (dx / dist) * force, fy = (dy / dist) * force;
                a.vx += fx; a.vy += fy;
                b.vx -= fx; b.vy -= fy;
            }
        }

        for (const edge of this.edges) {
            const a = this.nodes.find(n => n.id === edge.source);
            const b = this.nodes.find(n => n.id === edge.target);
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 1;
            const force = dist * CONFIG.GRAPH_ATTRACTION;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            a.vx += fx; a.vy += fy;
            b.vx -= fx; b.vy -= fy;
        }

        for (const node of this.nodes) {
            node.vx += (cx - node.x) * CONFIG.GRAPH_CENTER_PULL;
            node.vy += (cy - node.y) * CONFIG.GRAPH_CENTER_PULL;
            node.vx *= CONFIG.GRAPH_DAMPING;
            node.vy *= CONFIG.GRAPH_DAMPING;
            const speed = Math.hypot(node.vx, node.vy);
            if (speed > 5) { node.vx = (node.vx / speed) * 5; node.vy = (node.vy / speed) * 5; }
            node.x += node.vx;
            node.y += node.vy;
            const m = 20;
            node.x = Math.max(m, Math.min(this.width - m, node.x));
            node.y = Math.max(m, Math.min(this.height - m, node.y));
        }
    }

    _nodeColor(state) {
        // Exact same palette as SpatialRenderer._drawAgents()
        if (state === 'infected')   return { fill: '#ff4056', glow: 'rgba(255,64,86,0.3)',    border: 'rgba(255,64,86,0.5)' };
        if (state === 'exposed')    return { fill: '#ffaa3c', glow: 'rgba(255,170,60,0.25)',  border: 'rgba(255,170,60,0.4)' };
        /* susceptible */           return { fill: '#4aeadc', glow: 'rgba(74,234,220,0.2)',   border: 'rgba(74,234,220,0.4)' };
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#0d1220';
        ctx.fillRect(0, 0, this.width, this.height);

        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
        }
        for (let y = 0; y < this.height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
        }

        // Edges
        const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
        for (const edge of this.edges) {
            const a = nodeMap.get(edge.source), b = nodeMap.get(edge.target);
            if (!a || !b) continue;
            const aInf = a.healthState === 'infected', bInf = b.healthState === 'infected';
            const aExp = a.healthState === 'exposed', bExp = b.healthState === 'exposed';

            if (aInf && bInf) ctx.strokeStyle = 'rgba(255, 77, 106, 0.25)';
            else if (aInf || bInf || aExp || bExp) ctx.strokeStyle = 'rgba(255, 200, 60, 0.2)';
            else ctx.strokeStyle = 'rgba(74, 234, 220, 0.12)';

            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        // Nodes
        for (const node of this.nodes) {
            const r = CONFIG.GRAPH_NODE_RADIUS;
            const hasEdge = this.edges.some(e => e.source === node.id || e.target === node.id);
            const colors = this._nodeColor(node.healthState);

            if (hasEdge) {
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3.5);
                gradient.addColorStop(0, colors.glow);
                gradient.addColorStop(1, colors.glow.replace(/[\d.]+\)$/, '0)'));
                ctx.fillStyle = gradient;
                ctx.beginPath(); ctx.arc(node.x, node.y, r * 3.5, 0, Math.PI * 2); ctx.fill();
            }

            ctx.fillStyle = colors.fill;
            ctx.beginPath(); ctx.arc(node.x, node.y, hasEdge ? r : r * 0.7, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (this.nodes.length <= 60) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = '8px JetBrains Mono, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(node.id, node.x, node.y - r - 3);
            }
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${this.nodes.length} nœuds · ${this.edges.length} arêtes`, 12, this.height - 10);
    }
}
