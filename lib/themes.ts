export type Rect = { x: number; y: number; w: number; h: number };

export type Part = {
  id: string;
  label: string;
  hint: string;
  rect: Rect;
};

export type Theme = {
  id: string;
  name: string;
  emoji: string;
  /** Size of the final composite canvas. */
  canvas: { w: number; h: number };
  /** Parts are composited in array order (earlier = drawn first / underneath). */
  parts: Part[];
};

export const THEMES: Theme[] = [
  {
    id: "robot",
    name: "Robot",
    emoji: "🤖",
    canvas: { w: 800, h: 1000 },
    parts: [
      {
        id: "head",
        label: "Head",
        hint: "Draw the robot's head — antenna? bolts? Leave room for eyes and mouth, they're someone else's job!",
        rect: { x: 240, y: 30, w: 320, h: 260 },
      },
      {
        id: "body",
        label: "Body",
        hint: "The robot's torso — control panels, buttons, ducts, a little door?",
        rect: { x: 220, y: 290, w: 360, h: 380 },
      },
      {
        id: "left-eye",
        label: "Left eye",
        hint: "Just the left eye. Googly, laser, suspicious — your call.",
        rect: { x: 280, y: 90, w: 100, h: 80 },
      },
      {
        id: "right-eye",
        label: "Right eye",
        hint: "Just the right eye. It does NOT have to match the left one.",
        rect: { x: 420, y: 90, w: 100, h: 80 },
      },
      {
        id: "mouth",
        label: "Mouth",
        hint: "The robot's mouth — speaker grille, grin, mustache slot?",
        rect: { x: 310, y: 190, w: 180, h: 70 },
      },
      {
        id: "left-arm",
        label: "Left arm",
        hint: "The whole left arm. Claw, plunger, tentacle... anything grabby.",
        rect: { x: 60, y: 300, w: 170, h: 330 },
      },
      {
        id: "right-arm",
        label: "Right arm",
        hint: "The whole right arm. Symmetry is optional and discouraged.",
        rect: { x: 570, y: 300, w: 170, h: 330 },
      },
      {
        id: "legs",
        label: "Legs",
        hint: "Legs, wheels, tank treads, or a single spring. Keep the robot upright(ish).",
        rect: { x: 240, y: 670, w: 320, h: 300 },
      },
    ],
  },
  {
    id: "zach",
    name: "Zach Lloyd",
    emoji: "🧑‍💻",
    canvas: { w: 800, h: 1000 },
    parts: [
      {
        id: "face",
        label: "Face",
        hint: "Zach's face — eyes, nose, expression. Draw him mid-keynote.",
        rect: { x: 270, y: 90, w: 260, h: 240 },
      },
      {
        id: "hair",
        label: "Hair",
        hint: "Zach's hair. Draw it with confidence.",
        rect: { x: 260, y: 20, w: 280, h: 130 },
      },
      {
        id: "torso",
        label: "Torso",
        hint: "The torso — startup tee? Quarter-zip? Warp merch?",
        rect: { x: 220, y: 330, w: 360, h: 330 },
      },
      {
        id: "left-arm",
        label: "Left arm",
        hint: "Left arm. Maybe holding a terminal? A coffee?",
        rect: { x: 70, y: 340, w: 160, h: 320 },
      },
      {
        id: "right-arm",
        label: "Right arm",
        hint: "Right arm. Waving? Typing in mid-air? Pointing at a chart that only goes up?",
        rect: { x: 580, y: 340, w: 160, h: 320 },
      },
      {
        id: "legs",
        label: "Legs",
        hint: "The legs. Founder jeans or joggers, you decide.",
        rect: { x: 250, y: 660, w: 300, h: 250 },
      },
      {
        id: "shoes",
        label: "Shoes",
        hint: "The shoes. Sensible sneakers? Crocs? Rocket boots?",
        rect: { x: 230, y: 900, w: 340, h: 90 },
      },
    ],
  },
  {
    id: "office",
    name: "Inside the office",
    emoji: "🏢",
    canvas: { w: 1200, h: 800 },
    parts: [
      {
        id: "window",
        label: "Window",
        hint: "The office window and whatever's outside it — skyline, UFO, rain, one pigeon.",
        rect: { x: 760, y: 60, w: 360, h: 280 },
      },
      {
        id: "whiteboard",
        label: "Whiteboard",
        hint: "A whiteboard covered in… plans? Graphs? Doodles nobody will erase?",
        rect: { x: 80, y: 60, w: 400, h: 260 },
      },
      {
        id: "lamp",
        label: "Ceiling lamp",
        hint: "The ceiling light. Fluorescent panel, fancy pendant, or a disco ball.",
        rect: { x: 520, y: 30, w: 200, h: 170 },
      },
      {
        id: "desk",
        label: "Desk",
        hint: "The desk itself — clutter encouraged: cables, mugs, sticky notes.",
        rect: { x: 420, y: 450, w: 440, h: 200 },
      },
      {
        id: "computer",
        label: "Computer",
        hint: "The computer on the desk. What's on the screen? (A terminal, obviously.)",
        rect: { x: 500, y: 310, w: 240, h: 150 },
      },
      {
        id: "chair",
        label: "Office chair",
        hint: "The office chair. Ergonomic throne or folding chair of shame.",
        rect: { x: 140, y: 430, w: 220, h: 330 },
      },
      {
        id: "plant",
        label: "Office plant",
        hint: "The office plant. Thriving, dying, or plastic — be honest.",
        rect: { x: 960, y: 430, w: 170, h: 330 },
      },
    ],
  },
  {
    id: "house",
    name: "House",
    emoji: "🏠",
    canvas: { w: 1200, h: 800 },
    parts: [
      {
        id: "sky",
        label: "Sky",
        hint: "The sky above the house — sun, clouds, dramatic weather, passing dragon.",
        rect: { x: 40, y: 20, w: 1120, h: 150 },
      },
      {
        id: "walls",
        label: "Walls & door",
        hint: "The front of the house — walls and the front door. Leave space for windows!",
        rect: { x: 400, y: 330, w: 400, h: 330 },
      },
      {
        id: "roof",
        label: "Roof",
        hint: "The roof — shingles, chimney, satellite dish, cat on top.",
        rect: { x: 350, y: 160, w: 500, h: 180 },
      },
      {
        id: "windows",
        label: "Windows",
        hint: "The windows on the house. Someone might be looking out of one…",
        rect: { x: 430, y: 380, w: 340, h: 140 },
      },
      {
        id: "tree",
        label: "Tree",
        hint: "A big tree next to the house. Treehouse? Tire swing? Ominous crow?",
        rect: { x: 60, y: 220, w: 240, h: 420 },
      },
      {
        id: "fence",
        label: "Fence",
        hint: "A fence on the right side. White picket or maximum-security.",
        rect: { x: 880, y: 480, w: 280, h: 200 },
      },
      {
        id: "garden",
        label: "Garden",
        hint: "The garden along the bottom — flowers, gnomes, an overly ambitious vegetable patch.",
        rect: { x: 60, y: 620, w: 1080, h: 150 },
      },
    ],
  },
];

export const DEFAULT_ROUND_THEMES = ["robot", "zach", "office"];

export const ROUND_COUNT = 3;

export const DRAW_SECONDS = 60;

export function getTheme(id: string): Theme {
  const t = THEMES.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown theme: ${id}`);
  return t;
}
