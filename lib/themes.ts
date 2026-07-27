export type Rect = { x: number; y: number; w: number; h: number };

export type Part = {
  id: string;
  label: string;
  hint: string;
  rect: Rect;
  /**
   * If set, this part is not assigned to a player — it's pre-rendered
   * automatically (e.g. a plain default square).
   */
  prefill?: "square";
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
        hint: "The head is a default square — everyone else populates the rest of the robot.",
        rect: { x: 240, y: 30, w: 320, h: 260 },
        prefill: "square",
      },
      {
        id: "body",
        label: "Body",
        hint: "The robot's torso — control panels, buttons, ducts, a little door?",
        rect: { x: 180, y: 290, w: 440, h: 400 },
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
        id: "left-leg",
        label: "Left leg",
        hint: "The robot's left leg — piston, wheel, boot, tank tread, or anything sturdy.",
        rect: { x: 180, y: 690, w: 210, h: 310 },
      },
      {
        id: "right-leg",
        label: "Right leg",
        hint: "The robot's right leg. Symmetry is optional; balance is aspirational.",
        rect: { x: 410, y: 690, w: 210, h: 310 },
      },
    ],
  },
  {
    id: "burger",
    name: "Burger",
    emoji: "🍔",
    canvas: { w: 800, h: 1000 },
    parts: [
      {
        id: "bottom-bun",
        label: "Bottom bun",
        hint: "The bottom bun — the unsung hero holding it all together.",
        rect: { x: 160, y: 710, w: 480, h: 180 },
      },
      {
        id: "pickles",
        label: "Pickles & onions",
        hint: "Pickles, onions, or whatever controversial extras you believe in.",
        rect: { x: 180, y: 630, w: 440, h: 130 },
      },
      {
        id: "patty",
        label: "Patty",
        hint: "The patty. Beef, veggie, or something deeply mysterious.",
        rect: { x: 160, y: 510, w: 480, h: 170 },
      },
      {
        id: "cheese",
        label: "Cheese",
        hint: "The cheese — melty, drippy, ideally defying physics.",
        rect: { x: 150, y: 430, w: 500, h: 140 },
      },
      {
        id: "tomato",
        label: "Tomato",
        hint: "The tomato slice(s). Juicy. Perfectly round is optional.",
        rect: { x: 160, y: 350, w: 480, h: 130 },
      },
      {
        id: "lettuce",
        label: "Lettuce",
        hint: "The lettuce — frilly, ruffly, spilling out the sides.",
        rect: { x: 140, y: 260, w: 520, h: 140 },
      },
      {
        id: "top-bun",
        label: "Top bun",
        hint: "The top bun. Sesame seeds? A tiny flag? Go wild.",
        rect: { x: 160, y: 60, w: 480, h: 220 },
      },
    ],
  },
  {
    id: "spiderman",
    name: "Spider-Man",
    emoji: "🕷️",
    canvas: { w: 800, h: 1000 },
    parts: [
      {
        id: "web",
        label: "Web",
        hint: "The web behind him — strands, a whole net, maybe something caught in it.",
        rect: { x: 0, y: 0, w: 800, h: 1000 },
      },
      {
        id: "left-leg",
        label: "Left leg",
        hint: "Spidey's left leg — mid-swing, mid-crouch, or doing a superhero landing.",
        rect: { x: 240, y: 610, w: 150, h: 340 },
      },
      {
        id: "right-leg",
        label: "Right leg",
        hint: "Spidey's right leg — kicked out, tucked in, or tangled dramatically in web.",
        rect: { x: 410, y: 610, w: 150, h: 340 },
      },
      {
        id: "body",
        label: "Body",
        hint: "The suit-clad torso — spider emblem front and center.",
        rect: { x: 240, y: 290, w: 320, h: 340 },
      },
      {
        id: "left-arm",
        label: "Left arm",
        hint: "Spidey's left arm — thwipping a web, bracing for a landing, or striking a pose.",
        rect: { x: 60, y: 280, w: 270, h: 320 },
      },
      {
        id: "right-arm",
        label: "Right arm",
        hint: "Spidey's right arm — it can match the left arm, but it absolutely does not have to.",
        rect: { x: 470, y: 280, w: 270, h: 320 },
      },
      {
        id: "head",
        label: "Head",
        hint: "The masked head — big white eyes, web pattern if you're brave.",
        rect: { x: 280, y: 70, w: 240, h: 230 },
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

export const DEFAULT_ROUND_THEMES = ["robot", "burger", "spiderman"];

export const ROUND_COUNT = 3;

export const DRAW_SECONDS = 60;

export function getTheme(id: string): Theme {
  const t = THEMES.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown theme: ${id}`);
  return t;
}
