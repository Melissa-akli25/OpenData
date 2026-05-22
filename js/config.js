/** config.js — Global constants */
const CONFIG = {
    DAY_START_HOUR: 7,
    DAY_END_HOUR: 19,
    DAY_DURATION_MINUTES: 720,
    DEFAULT_SPEED: 1,
    REAL_SECONDS_PER_SIM_HOUR: 10,

    // Scale: 1 metre = 20 map-units
    PIXELS_PER_METER: 20,
    AGENT_RADIUS: 5,
    AGENT_SPEED: 1.4,

    // Sociability clustering
    SOCIAL_THRESHOLD: 0.65,
    SOCIAL_STOP_PROB: 0.0012,
    SOCIAL_MIN_TICKS: 300,
    SOCIAL_MAX_TICKS: 900,
    SOCIAL_RADIUS: 35,

    // Virus defaults
    DEFAULT_TRANSMISSION_PROB: 0.30,
    DEFAULT_PROXIMITY_METERS: 1.5,    // metres — slider range 0.5–5.0
    DEFAULT_INCUBATION_HOURS: 2,
    DEFAULT_PATIENT_ZEROS: 3,         // slider range 1–20

    ZONE_MULTIPLIERS: { classroom: 0.8, corridor: 0.5, cafeteria: 1.2, exterior: 0.0 },

    // Population
    DEFAULT_POPULATION: 80,

    // A* grid cell = 10 map-units = 0.5 m
    PF_CELL_SIZE: 10,

    // Door width 1.5 m = 30 map-units
    DOOR_HALF_WIDTH: 15,

    // Wall repulsion: 0.1 m = 2 map-units
    WALL_REPULSE_DIST: 2,
    WALL_REPULSE_FORCE: 0.4,

    GRAPH_NODE_RADIUS: 6,
    GRAPH_REPULSION: 900,
    GRAPH_ATTRACTION: 0.004,
    GRAPH_DAMPING: 0.92,
    GRAPH_CENTER_PULL: 0.01,
};
