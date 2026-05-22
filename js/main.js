/**
 * main.js — Bootstrap: init, animation loop, resize.
 */
(function () {
    'use strict';

    const spatialCanvas  = document.getElementById('spatial-canvas');
    const graphCanvas    = document.getElementById('graph-canvas');
    const spatialWrapper = document.getElementById('spatial-wrapper');
    const graphWrapper   = document.getElementById('graph-wrapper');
    const loadingEl      = document.getElementById('loading-overlay');

    const simulation      = new Simulation();
    const spatialRenderer = new SpatialRenderer(spatialCanvas);
    const graphRenderer   = new GraphRenderer(graphCanvas);
    const ui              = new UIController(simulation);

    function resetSimulation() {
        if (loadingEl) loadingEl.style.display = 'flex';

        const s = spatialRenderer.resize(spatialWrapper);
        graphRenderer.resize(graphWrapper);

        // Init runs synchronously (A* grid build + agent creation from STUDENTS_DATA)
        simulation.init(s.width, s.height);
        graphRenderer.nodes = [];
        graphRenderer.syncWithSimulation(simulation);
        simulation.running = false;
        simulation._lastTimestamp = 0;

        ui.update();
        ui._updateButtonStates();
        spatialRenderer.render(simulation);
        graphRenderer.render();

        if (loadingEl) loadingEl.style.display = 'none';
    }

    // Resize handler
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const s = spatialRenderer.resize(spatialWrapper);
            graphRenderer.resize(graphWrapper);
            const rx = s.width  / (simulation.scaleX * MAP.width);
            const ry = s.height / (simulation.scaleY * MAP.height);
            simulation.scaleX = s.width  / MAP.width;
            simulation.scaleY = s.height / MAP.height;
            for (const a of simulation.agents) {
                a.x        *= rx; a.y        *= ry;
                a.displayX *= rx; a.displayY *= ry;
                a.scaleX = simulation.scaleX;
                a.scaleY = simulation.scaleY;
                a.path = a.path.map(p => ({ x: p.x * rx, y: p.y * ry }));
            }
        }, 200);
    });

    // Animation loop
    let frame = 0;
    function animate(ts) {
        requestAnimationFrame(animate);
        simulation.tick(ts);
        if (frame % 3 === 0) graphRenderer.syncWithSimulation(simulation);
        graphRenderer.applyForces();
        spatialRenderer.render(simulation);
        graphRenderer.render();
        if (frame % 2 === 0) ui.update();
        frame++;
    }

    ui.init(resetSimulation);
    resetSimulation();
    requestAnimationFrame(animate);

    // Auto-start after short delay
    setTimeout(() => { simulation.running = true; ui._updateButtonStates(); }, 1000);
})();
