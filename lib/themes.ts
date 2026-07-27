export type Rect = { x: number; y: number; w: number; h: number };

export type Part = {
  id: string;
  label: string;
  hint: string;
  rect: Rect;
  /**
   * If set, this part is not assigned to a player — it's pre-rendered
   * automatically (e.g. a plain default square or themed background).
   */
  prefill?:
    | "square"
    | "zoo-background"
    | "aquarium-background"
    | "farm-background";
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
  {
    id: "zoo",
    name: "Zoo",
    emoji: "🦁",
    canvas: { w: 1600, h: 1250 },
    parts: [
      {
        id: "zoo-background",
        label: "Zoo background",
        hint: "A green zoo field with a fence around it — animals go inside.",
        rect: { x: 0, y: 0, w: 1600, h: 1250 },
        prefill: "zoo-background",
      },
      {
        id: "elephant",
        label: "Elephant",
        hint: "An elephant in the zoo — big ears, trunk, tiny hat, your call.",
        rect: { x: 45, y: 95, w: 310, h: 270 },
      },
      {
        id: "giraffe",
        label: "Giraffe",
        hint: "A tall giraffe. Long neck, spots, maybe peeking over the fence.",
        rect: { x: 390, y: 75, w: 220, h: 310 },
      },
      {
        id: "lion",
        label: "Lion",
        hint: "A lion with maximum mane energy. Regal, sleepy, or deeply confused.",
        rect: { x: 665, y: 115, w: 270, h: 230 },
      },
      {
        id: "monkey",
        label: "Monkey",
        hint: "A monkey doing monkey business — swinging, snacking, judging everyone.",
        rect: { x: 990, y: 120, w: 220, h: 220 },
      },
      {
        id: "penguins",
        label: "Penguins",
        hint: "A penguin crew. Formalwear is built in; chaos is optional.",
        rect: { x: 1285, y: 130, w: 230, h: 200 },
      },
      {
        id: "zebra",
        label: "Zebra",
        hint: "A zebra. Stripes may be accurate, abstract, or emotionally motivated.",
        rect: { x: 60, y: 400, w: 280, h: 220 },
      },
      {
        id: "flamingos",
        label: "Flamingos",
        hint: "A flamboyance of flamingos — one-legged poses encouraged.",
        rect: { x: 385, y: 375, w: 230, h: 270 },
      },
      {
        id: "tiger",
        label: "Tiger",
        hint: "A tiger prowling through the zoo. Stripes, swagger, and drama encouraged.",
        rect: { x: 660, y: 400, w: 280, h: 220 },
      },
      {
        id: "panda",
        label: "Panda",
        hint: "A panda with snacks, naps, or both. Bamboo is optional but recommended.",
        rect: { x: 985, y: 400, w: 230, h: 220 },
      },
      {
        id: "hippo",
        label: "Hippo",
        hint: "A hippo lounging in its habitat. Big smile, bigger presence.",
        rect: { x: 1250, y: 395, w: 300, h: 230 },
      },
      {
        id: "rhino",
        label: "Rhino",
        hint: "A rhino with a magnificent horn and absolutely no patience.",
        rect: { x: 55, y: 680, w: 290, h: 220 },
      },
      {
        id: "crocodile",
        label: "Crocodile",
        hint: "A crocodile near the grass — toothy grin strongly encouraged.",
        rect: { x: 335, y: 705, w: 330, h: 170 },
      },
      {
        id: "koala",
        label: "Koala",
        hint: "A koala clinging to something and refusing to be productive.",
        rect: { x: 705, y: 690, w: 190, h: 200 },
      },
      {
        id: "parrot",
        label: "Parrot",
        hint: "A bright parrot. Feathers, attitude, and side-eye all welcome.",
        rect: { x: 1000, y: 695, w: 200, h: 190 },
      },
      {
        id: "gorilla",
        label: "Gorilla",
        hint: "A gorilla with big personality — thoughtful, powerful, or stealing the show.",
        rect: { x: 1265, y: 675, w: 270, h: 240 },
      },
      {
        id: "bear",
        label: "Bear",
        hint: "A bear wandering through the zoo. Cute, huge, or actively seeking snacks.",
        rect: { x: 55, y: 950, w: 290, h: 230 },
      },
      {
        id: "kangaroo",
        label: "Kangaroo",
        hint: "A kangaroo ready to hop, box, or pose with unreasonable confidence.",
        rect: { x: 385, y: 930, w: 230, h: 270 },
      },
      {
        id: "lemur",
        label: "Lemur",
        hint: "A lemur with a ringed tail and chaotic little gremlin energy.",
        rect: { x: 700, y: 970, w: 200, h: 200 },
      },
      {
        id: "otters",
        label: "Otters",
        hint: "A pair of otters floating, holding paws, or plotting something adorable.",
        rect: { x: 965, y: 980, w: 270, h: 170 },
      },
      {
        id: "sloth",
        label: "Sloth",
        hint: "A sloth hanging around and taking the full 60 seconds seriously.",
        rect: { x: 1300, y: 960, w: 200, h: 220 },
      },
    ],
  },
  {
    id: "aquarium",
    name: "Aquarium",
    emoji: "🐠",
    canvas: { w: 1600, h: 1250 },
    parts: [
      {
        id: "aquarium-background",
        label: "Aquarium background",
        hint: "A light blue aquarium tank — sea animals go inside.",
        rect: { x: 0, y: 0, w: 1600, h: 1250 },
        prefill: "aquarium-background",
      },
      {
        id: "goldfish",
        label: "Goldfish",
        hint: "A goldfish swimming through the tank. Fancy fins encouraged.",
        rect: { x: 95, y: 145, w: 210, h: 170 },
      },
      {
        id: "jellyfish",
        label: "Jellyfish",
        hint: "A floaty jellyfish with tentacles, glow, or suspicious vibes.",
        rect: { x: 390, y: 95, w: 220, h: 270 },
      },
      {
        id: "shark",
        label: "Shark",
        hint: "A shark cruising through the aquarium. Friendly grin optional.",
        rect: { x: 640, y: 120, w: 320, h: 220 },
      },
      {
        id: "octopus",
        label: "Octopus",
        hint: "An octopus with as many dramatic arms as you can fit.",
        rect: { x: 955, y: 105, w: 290, h: 250 },
      },
      {
        id: "sea-turtle",
        label: "Sea turtle",
        hint: "A sea turtle gliding by. Shell pattern, sunglasses, wisdom — your choice.",
        rect: { x: 1265, y: 125, w: 270, h: 210 },
      },
      {
        id: "seahorse",
        label: "Seahorse",
        hint: "A tiny seahorse. Curly tail and tiny crown are both acceptable.",
        rect: { x: 105, y: 385, w: 190, h: 250 },
      },
      {
        id: "crab",
        label: "Crab",
        hint: "A crab on the tank floor. Big claws, bigger attitude.",
        rect: { x: 390, y: 425, w: 220, h: 170 },
      },
      {
        id: "stingray",
        label: "Stingray",
        hint: "A stingray gliding like an underwater pancake.",
        rect: { x: 650, y: 420, w: 300, h: 180 },
      },
      {
        id: "clownfish",
        label: "Clownfish",
        hint: "A clownfish. Orange stripes, celebrity cameo, or tiny comedy routine.",
        rect: { x: 1005, y: 430, w: 190, h: 160 },
      },
      {
        id: "eel",
        label: "Eel",
        hint: "A long eel weaving through the tank. Mysterious energy required.",
        rect: { x: 1250, y: 430, w: 300, h: 160 },
      },
      {
        id: "starfish",
        label: "Starfish",
        hint: "A starfish stuck to the glass or chilling on the sand.",
        rect: { x: 105, y: 705, w: 190, h: 170 },
      },
      {
        id: "coral-reef",
        label: "Coral reef",
        hint: "Colorful coral on the tank floor — branches, blobs, or alien plants.",
        rect: { x: 360, y: 700, w: 280, h: 180 },
      },
      {
        id: "seaweed",
        label: "Seaweed",
        hint: "Tall waving seaweed. Make it graceful or mildly haunted.",
        rect: { x: 705, y: 660, w: 190, h: 260 },
      },
      {
        id: "angelfish",
        label: "Angelfish",
        hint: "An elegant angelfish with dramatic fins and main-character posture.",
        rect: { x: 995, y: 695, w: 210, h: 190 },
      },
      {
        id: "treasure-chest",
        label: "Treasure chest",
        hint: "A tiny treasure chest on the sand. Treasure, bubbles, or one suspicious boot.",
        rect: { x: 1285, y: 705, w: 230, h: 170 },
      },
      {
        id: "dolphin",
        label: "Dolphin",
        hint: "A dolphin leaping through the tank with maximum show-off energy.",
        rect: { x: 50, y: 960, w: 300, h: 190 },
      },
      {
        id: "pufferfish",
        label: "Pufferfish",
        hint: "A pufferfish: round, spiky, offended, or all three.",
        rect: { x: 405, y: 970, w: 190, h: 190 },
      },
      {
        id: "squid",
        label: "Squid",
        hint: "A squid drifting through the water. Tentacles and ink-cloud drama welcome.",
        rect: { x: 670, y: 935, w: 260, h: 260 },
      },
      {
        id: "lobster",
        label: "Lobster",
        hint: "A lobster on the tank floor with fancy claws and strong opinions.",
        rect: { x: 970, y: 980, w: 260, h: 170 },
      },
      {
        id: "anemone",
        label: "Sea anemone",
        hint: "A wavy sea anemone. Bright colors, soft tentacles, tiny hiding fish.",
        rect: { x: 1290, y: 955, w: 220, h: 230 },
      },
    ],
  },
  {
    id: "farm",
    name: "Farm",
    emoji: "🐮",
    canvas: { w: 1600, h: 1250 },
    parts: [
      {
        id: "farm-background",
        label: "Farm background",
        hint: "A sunny farm field with a barn, fence, and path — farm life goes around it.",
        rect: { x: 0, y: 0, w: 1600, h: 1250 },
        prefill: "farm-background",
      },
      {
        id: "cow",
        label: "Cow",
        hint: "A cow in the pasture. Spots, bell, or judgmental stare encouraged.",
        rect: { x: 45, y: 590, w: 300, h: 180 },
      },
      {
        id: "horse",
        label: "Horse",
        hint: "A horse trotting around the farm. Mane drama welcome.",
        rect: { x: 360, y: 590, w: 290, h: 180 },
      },
      {
        id: "pig",
        label: "Pig",
        hint: "A pig near the mud. Round, pink, and extremely pleased with itself.",
        rect: { x: 710, y: 605, w: 220, h: 145 },
      },
      {
        id: "sheep",
        label: "Sheep",
        hint: "A fluffy sheep. Cloud-like wool, tiny legs, or suspicious eyes.",
        rect: { x: 995, y: 600, w: 220, h: 150 },
      },
      {
        id: "goat",
        label: "Goat",
        hint: "A goat plotting to climb something it absolutely should not climb.",
        rect: { x: 1290, y: 600, w: 220, h: 150 },
      },
      {
        id: "chickens",
        label: "Chickens",
        hint: "A chicken squad pecking around. Tiny chaos, big opinions.",
        rect: { x: 90, y: 770, w: 210, h: 150 },
      },
      {
        id: "rooster",
        label: "Rooster",
        hint: "A rooster with a dramatic comb and main-character energy.",
        rect: { x: 405, y: 745, w: 190, h: 200 },
      },
      {
        id: "ducks",
        label: "Ducks",
        hint: "A row of ducks waddling through the farm like they own it.",
        rect: { x: 665, y: 780, w: 270, h: 140 },
      },
      {
        id: "donkey",
        label: "Donkey",
        hint: "A donkey with long ears and a deeply unimpressed expression.",
        rect: { x: 965, y: 760, w: 270, h: 170 },
      },
      {
        id: "llama",
        label: "Llama",
        hint: "A llama standing tall with excellent hair and questionable manners.",
        rect: { x: 1300, y: 735, w: 200, h: 220 },
      },
      {
        id: "farm-dog",
        label: "Farm dog",
        hint: "A farm dog guarding the place, chasing birds, or requesting snacks.",
        rect: { x: 90, y: 950, w: 210, h: 145 },
      },
      {
        id: "barn-cat",
        label: "Barn cat",
        hint: "A barn cat in charge of everything. Tiny, smug, and probably loafing.",
        rect: { x: 425, y: 950, w: 160, h: 140 },
      },
      {
        id: "tractor",
        label: "Tractor",
        hint: "A tractor in the field. Big wheels, bright paint, maybe flames.",
        rect: { x: 630, y: 925, w: 330, h: 185 },
      },
      {
        id: "hay-bales",
        label: "Hay bales",
        hint: "A stack of hay bales. Neat rectangles, messy straw, or a hay fort.",
        rect: { x: 1000, y: 955, w: 210, h: 130 },
      },
      {
        id: "scarecrow",
        label: "Scarecrow",
        hint: "A scarecrow with style. Hat, patches, and zero bird-management skills.",
        rect: { x: 1300, y: 910, w: 200, h: 220 },
      },
      {
        id: "cornfield",
        label: "Cornfield",
        hint: "Tall corn stalks. Rows, cobs, and perhaps something mysterious between them.",
        rect: { x: 60, y: 1110, w: 280, h: 120 },
      },
      {
        id: "pumpkin-patch",
        label: "Pumpkin patch",
        hint: "A pumpkin patch. Cute pumpkins, weird gourds, or one gigantic champion.",
        rect: { x: 390, y: 1120, w: 250, h: 105 },
      },
      {
        id: "apple-tree",
        label: "Apple tree",
        hint: "An apple tree loaded with fruit, birds, or suspiciously perfect apples.",
        rect: { x: 690, y: 1065, w: 240, h: 165 },
      },
      {
        id: "farmer",
        label: "Farmer",
        hint: "The farmer. Overalls, pitchfork, sunhat, or heroic farm pose.",
        rect: { x: 1010, y: 1060, w: 190, h: 170 },
      },
      {
        id: "windmill",
        label: "Windmill",
        hint: "A windmill spinning in the distance. Blades, creaks, and countryside vibes.",
        rect: { x: 1295, y: 1045, w: 220, h: 190 },
      },
    ],
  },
];

export const DEFAULT_ROUND_THEME_POOLS = [
  ["robot"],
  ["farm", "aquarium", "zoo"],
  ["spiderman"],
];

export const DEFAULT_ROUND_THEMES = DEFAULT_ROUND_THEME_POOLS.map(
  ([themeId]) => themeId
);

export const ROUND_COUNT = 3;

export const DRAW_SECONDS = 60;

export const MIN_DRAW_SECONDS = 10;

export const MAX_DRAW_SECONDS = 300;

export function getTheme(id: string): Theme {
  const t = THEMES.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown theme: ${id}`);
  return t;
}
