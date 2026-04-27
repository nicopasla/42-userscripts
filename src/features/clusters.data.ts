export const CLUSTER_CONFIG = {
  COLOR: "#00babc",
  THICKNESS: 3,
  OPACITY: "0.4",
  BAR_SIZE: 16,
  CURVE_DEPTH: 1,
} as const;

function rowScreens(row, positions, dir) {
  return Object.fromEntries(positions.map((n) => [`${row}-p${n}`, dir]));
}

function rowsScreens(rows, positions, dir) {
  return Object.fromEntries(
    rows.flatMap((row) => positions.map((n) => [`${row}-p${n}`, dir])),
  );
}

const SHI_SCREENS = {
  ...rowsScreens(
    ["r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11"],
    [1, 3, 5, 7],
    "UP",
  ),
  ...rowsScreens(
    ["r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11"],
    [2, 4, 6, 8],
    "DOWN",
  ),
  ...rowScreens("r1", [1, 2, 3, 4, 5, 6, 7], "DOWN"),
  ...rowScreens("r12", [1, 2, 3, 4], "UP"),
  ...rowScreens("c1", [1, 2, 3, 4, 5, 6], "LEFT"),
  ...rowScreens("c2", [1, 2, 3, 4, 5, 6], "LEFT"),
};

const FU_SCREENS = {
  ...rowsScreens(
    ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10"],
    [1, 3, 5, 7],
    "UP",
  ),
  ...rowsScreens(
    ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10"],
    [2, 4, 6, 8],
    "DOWN",
  ),
  ...rowScreens("c1", [1, 2, 3, 5], "LEFT"),
  "c1-p5": "NONE",
  ...rowScreens("c2", [1, 2, 3], "LEFT"),
  "c2-p4": "UP",
  ...rowScreens("c3", [1, 2, 3, 4, 5, 6], "RIGHT"),
  ...rowScreens("c4", [1, 2, 3, 4, 5, 6], "RIGHT"),
};

const MI_SCREENS = {
  ...rowsScreens(
    ["r1", "r2", "r3", "r4", "r5", "r6", "r7"],
    [1, 3, 5, 7],
    "UP",
  ),
  ...rowsScreens(
    ["r1", "r2", "r3", "r4", "r5", "r6", "r7"],
    [2, 4, 6, 8],
    "DOWN",
  ),
  "r1-p5": "NONE",
  "r8-p1": "RIGHT",
  "r8-p2": "NONE",
  "r8-p3": "RIGHT",
  ...rowScreens("c1", [1, 2], "DOWN"),
  ...rowScreens("c2", [1, 2, 3, 4, 5, 6, 7, 8], "LEFT"),
  ...rowScreens("c3", [1, 2, 3], "LEFT"),
  ...rowScreens("c4", [1, 2, 3], "UP"),
  ...rowScreens("c4", [4, 5], "RIGHT"),
  ...rowScreens("c5", [1], "RIGHT"),
  ...rowScreens("c6", [1, 2, 3, 4], "RIGHT"),
};

const A1_SCREENS = {};

const A2_SCREENS = {};

function prefixScreens(prefix, screens) {
  return Object.fromEntries(
    Object.entries(screens).map(([id, dir]) => [`${prefix}-${id}`, dir]),
  );
}

export const SCREENS = {
  ...prefixScreens("shi", SHI_SCREENS),
  ...prefixScreens("fu", FU_SCREENS),
  ...prefixScreens("mi", MI_SCREENS),
  ...prefixScreens("a1", A1_SCREENS),
  ...prefixScreens("a2", A2_SCREENS),
};

export const CLUSTERS = [
  { id: "20", name: "shi" },
  { id: "21", name: "fu" },
  { id: "54", name: "mi" },
  { id: "164", name: "a1" },
  { id: "165", name: "a2" },
];
