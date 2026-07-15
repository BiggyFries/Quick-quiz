import { validateAdventure } from '../game/schema';
import type {
  DailyAdventure,
  FinaleConfig,
  LogicConfig,
  LogicRule,
  MemoryConfig,
  PuzzleType,
  RhythmConfig,
  ThemeArt,
  TriviaConfig,
  TriviaQuestion,
} from '../game/types';

const beats = [2400, 4500, 6800, 9000, 11200, 13600, 15900, 18300, 20700, 23100, 25600, 28100];

const q = (prompt: string, choices: [string, string, string, string], correct: number, fact: string): TriviaQuestion => ({ prompt, choices, correct, fact });

const art = (
  key: string,
  background: string,
  accent: string,
  accent2: string,
  ink: string,
  paper: string,
  atmosphere: string,
  artifact: string,
  motif: string,
): ThemeArt => ({ key, background, accent, accent2, ink, paper, atmosphere, artifact, motif });

const trivia = (title: string, brief: string, questions: TriviaConfig['questions']): TriviaConfig => ({ type: 'trivia', title, brief, questions });
const logicOrder = (title: string, brief: string, tokens: string[], clues: Array<[string, LogicRule]>, solution: string[]): LogicConfig => ({
  type: 'logic', mechanic: 'order', title, brief,
  tokens: tokens as Extract<LogicConfig, { mechanic: 'order' }>['tokens'],
  clues: clues.map(([text, rule]) => ({ text, rule })) as Extract<LogicConfig, { mechanic: 'order' }>['clues'],
  solution: solution as Extract<LogicConfig, { mechanic: 'order' }>['solution'],
});
const logicDeduction = (title: string, brief: string, prompt: string, clues: string[], choices: [string, string, string, string], correct: number, explanation: string): LogicConfig => ({
  type: 'logic', mechanic: 'deduction', title, brief, prompt,
  clues: clues as Extract<LogicConfig, { mechanic: 'deduction' }>['clues'], choices, correct, explanation,
});
const rhythm = (title: string, brief: string, actionLabel: string, cueLabel: string, offset = 0): RhythmConfig => ({
  type: 'rhythm', title, brief, actionLabel, cueLabel, beatMap: beats.map((beat, index) => beat + (index % 3) * offset), durationMs: 30000, windowMs: 360, maxErrors: 3,
});
const memory = (title: string, brief: string, symbols: MemoryConfig['symbols'], rounds: MemoryConfig['rounds']): MemoryConfig => ({
  type: 'memory', title, brief, symbols, rounds, revealMs: 760,
});
const finale = (config: Omit<FinaleConfig, 'type'>): FinaleConfig => ({ type: 'finale', ...config });

function adventure(
  id: string,
  weekIndex: number,
  title: string,
  subtitle: string,
  synopsis: string,
  theme: ThemeArt,
  levelOrder: [PuzzleType, PuzzleType, PuzzleType, PuzzleType, 'finale'],
  puzzleSet: DailyAdventure['puzzles'],
): DailyAdventure {
  return validateAdventure({ id, weekIndex, status: 'draft', publishDate: null, title, subtitle, synopsis, estimatedMinutes: '6–8 minutes', art: theme, levelOrder, puzzles: puzzleSet });
}

export const WEEK_ONE: DailyAdventure[] = [
  adventure(
    'week1-day1-temple', 0, 'Temple of the Sun', 'The Eclipse Trial',
    'Recover the Sunstone before a total eclipse seals the temple for another century.',
    art('temple', 'backplates/temple.webp', '#f2b544', '#e76f51', '#1d2931', '#fff8e7', 'Sunlit sandstone, deep ravines, carved animal guardians', 'Sunstone', '☀'),
    ['logic', 'trivia', 'rhythm', 'memory', 'finale'],
    {
      logic: logicOrder('Bridge of Idols', 'Use the linked inscriptions to arrange five guardians.', ['Sun', 'Owl', 'Serpent', 'Jaguar', 'Moon'], [
        ['The Owl stands immediately before the Serpent.', { kind: 'immediatelyBefore', left: 'Owl', right: 'Serpent' }],
        ['The Jaguar stands immediately right of the Serpent.', { kind: 'immediatelyBefore', left: 'Serpent', right: 'Jaguar' }],
        ['The Sun is somewhere left of the Owl.', { kind: 'before', left: 'Sun', right: 'Owl' }],
        ['The Moon rises somewhere right of the Jaguar.', { kind: 'before', left: 'Jaguar', right: 'Moon' }],
      ], ['Sun', 'Owl', 'Serpent', 'Jaguar', 'Moon']),
      trivia: trivia('Archive of Glyphs', 'Answer all three questions. One wrong tablet opens the floor.', [
        q('Whose tomb did Howard Carter discover largely intact in 1922?', ['Ramesses II', 'Tutankhamun', 'Cleopatra VII', 'Akhenaten'], 1, 'Howard Carter discovered Tutankhamun’s tomb in 1922.'),
        q('Alongside Ancient Greek and Demotic, which script appears on the Rosetta Stone?', ['Cuneiform', 'Latin', 'Hieroglyphic', 'Phoenician'], 2, 'The decree appears in Greek, Demotic, and Egyptian hieroglyphs.'),
        q('Which Nile plant was made into a common ancient writing surface?', ['Papyrus', 'Lotus', 'Flax', 'Reed grass'], 0, 'Papyrus strips were layered and pressed into writing sheets.'),
      ]),
      rhythm: rhythm('Bridge of Drums', 'Tap when each gold ring reaches the drum to leap the collapsing gaps.', 'LEAP', 'NOW'),
      memory: memory('Scarabs of the Sun', 'Watch three ceremonial glyph chains, then repeat each one exactly.', ['Sun', 'Owl', 'Serpent', 'Jaguar'], [
        ['Sun', 'Owl', 'Sun', 'Jaguar'],
        ['Serpent', 'Sun', 'Owl', 'Jaguar', 'Sun'],
        ['Jaguar', 'Owl', 'Serpent', 'Sun', 'Owl', 'Jaguar'],
      ]),
      finale: finale({
        title: 'Eclipse Engine', brief: 'Recall the trail, repeat the eclipse glyphs, charge the mechanism, and aim the mirror.',
        question: q('Which object translated the temple archive?', ['A crown', 'A stone with repeated scripts', 'A sundial', 'A gold mask'], 1, 'The Rosetta Stone repeated one decree in three scripts.'),
        orderTokens: ['Dawn', 'Noon', 'Dusk'], orderSolution: ['Dawn', 'Noon', 'Dusk'],
        memorySymbols: ['Sun', 'Owl', 'Serpent', 'Jaguar'], memorySequence: ['Sun', 'Owl', 'Jaguar', 'Serpent', 'Sun'], memoryRevealMs: 700,
        rhythmBeats: [900, 1800, 2700, 3600],
        physics: { kind: 'mirror', prompt: 'Which counterweight pairing turns the mirror toward the Sunstone?', choices: ['Heavy left · light right', 'Light left · heavy right', 'Both on the left'], correct: 1, successText: 'The mirror catches the final beam. The Sunstone awakens.' },
      }),
    },
  ),
  adventure(
    'week1-day2-airship', 1, 'Clockwork Airship', 'The Storm Engine',
    'Board a brass airship and repair its storm engine before the thunderhead swallows Brasshaven.',
    art('airship', 'backplates/airship.webp', '#e7a84d', '#5bc0be', '#172b35', '#fff7df', 'Brass decks, teal storm clouds, propellers and suspended cargo', 'Storm Cog', '⚙'),
    ['trivia', 'logic', 'memory', 'rhythm', 'finale'],
    {
      trivia: trivia('Weather Deck', 'Prove you understand the sky before entering the engine room.', [
        q('Which lifting gas is nonflammable and less dense than air?', ['Oxygen', 'Helium', 'Carbon dioxide', 'Nitrogen'], 1, 'Helium is light and nonflammable.'),
        q('Which instrument measures atmospheric pressure?', ['Thermometer', 'Anemometer', 'Barometer', 'Hygrometer'], 2, 'A barometer measures atmospheric pressure.'),
        q('Which cloud type most often produces thunderstorms?', ['Cirrus', 'Stratus', 'Cumulonimbus', 'Altocumulus'], 2, 'Cumulonimbus clouds can produce thunder, lightning, and heavy rain.'),
      ]),
      logic: logicDeduction('Cargo Rail', 'Infer which crate belongs at the damaged bow mount.',
        'Four mounts each accept one crate. Which crate must occupy the bow?',
        ['Fuel must be directly behind Water.', 'Tools cannot touch Fuel.', 'The Compass is ahead of Tools.', 'Water cannot occupy either end.'],
        ['Compass', 'Tools', 'Water', 'Fuel'], 0, 'Only Compass can lead while preserving the Water–Fuel pair and keeping Tools away from Fuel.'),
      rhythm: rhythm('Twelve-Pin Engine', 'Tap as each rotating pin enters the illuminated lock.', 'SET PIN', 'LOCK', 35),
      memory: memory('Storm Dial', 'Memorize the engineer’s dial flashes before the storm erases them.', ['Compass', 'Cog', 'Cloud', 'Bolt'], [
        ['Bolt', 'Cog', 'Compass', 'Cloud'],
        ['Compass', 'Bolt', 'Cloud', 'Cog', 'Bolt'],
        ['Cloud', 'Compass', 'Cog', 'Bolt', 'Cloud', 'Compass'],
      ]),
      finale: finale({
        title: 'Thunderhead Engine', brief: 'Restore cargo order, repeat the storm code, lock the turbine, and balance the deck.',
        question: q('Which instrument warned the crew that air pressure was falling?', ['Compass', 'Barometer', 'Clock', 'Altimeter'], 1, 'A falling barometer can signal an approaching storm.'),
        orderTokens: ['Compass', 'Tools', 'Fuel'], orderSolution: ['Compass', 'Tools', 'Fuel'],
        memorySymbols: ['Compass', 'Cog', 'Cloud', 'Bolt'], memorySequence: ['Bolt', 'Cloud', 'Cog', 'Compass', 'Bolt'], memoryRevealMs: 700,
        rhythmBeats: [850, 1700, 2600, 3500],
        physics: { kind: 'ballast', prompt: 'The bow is rising too high. Where should the two ballast bags go?', choices: ['Both at the bow', 'One at each end', 'Both at the stern'], correct: 0, successText: 'The bow settles, the propellers bite, and the airship climbs.' },
      }),
    },
  ),
  adventure(
    'week1-day3-library', 2, 'Sunken Library', 'The Drowned Index',
    'Descend through a drowned archive where living lights guard a map no surface explorer has seen.',
    art('library', 'backplates/library.webp', '#4ecdc4', '#9676d9', '#102a36', '#effdfa', 'Submerged shelves, turquoise shafts, violet jellyfish and drifting pages', 'Tide Index', '◈'),
    ['memory', 'trivia', 'logic', 'rhythm', 'finale'],
    {
      trivia: trivia('Abyssal Catalogue', 'Answer three questions before the ink dissolves.', [
        q('Which trench contains the deepest known point in Earth’s oceans?', ['Java Trench', 'Puerto Rico Trench', 'Mariana Trench', 'Tonga Trench'], 2, 'Challenger Deep lies in the Mariana Trench.'),
        q('What is light produced by a living organism called?', ['Fluorescence', 'Bioluminescence', 'Refraction', 'Phosphorescence'], 1, 'Bioluminescence is light made by a living organism.'),
        q('Which upward force helps objects float in water?', ['Friction', 'Gravity', 'Buoyancy', 'Magnetism'], 2, 'Buoyancy is the upward force exerted by a fluid.'),
      ]),
      logic: logicOrder('Floodgate Shelves', 'Reconstruct the five-seal index from the surviving rules.', ['Pearl', 'Ink', 'Coral', 'Key', 'Shell'], [
        ['Ink is immediately left of Key.', { kind: 'immediatelyBefore', left: 'Ink', right: 'Key' }],
        ['Coral appears somewhere before Ink.', { kind: 'before', left: 'Coral', right: 'Ink' }],
        ['Pearl is immediately left of Shell.', { kind: 'immediatelyBefore', left: 'Pearl', right: 'Shell' }],
        ['Key appears somewhere before Pearl.', { kind: 'before', left: 'Key', right: 'Pearl' }],
      ], ['Coral', 'Ink', 'Key', 'Pearl', 'Shell']),
      rhythm: rhythm('Pressure Rings', 'Ping the bathysphere through twelve closing sonar rings.', 'PING', 'ECHO', 20),
      memory: memory('The Drowned Index', 'Hold three sequences of archive seals in memory as the pages drift away.', ['Coral', 'Ink', 'Key', 'Pearl'], [
        ['Coral', 'Key', 'Ink', 'Pearl'],
        ['Ink', 'Pearl', 'Coral', 'Key', 'Ink'],
        ['Pearl', 'Key', 'Coral', 'Ink', 'Key', 'Pearl'],
      ]),
      finale: finale({
        title: 'Leviathan Archive', brief: 'Read the depth clue, restore the index, repeat its seal code, and raise the final shelf.',
        question: q('Which force can raise the drowned shelf?', ['Buoyancy', 'Friction', 'Gravity', 'Static charge'], 0, 'Air-filled bladders increase buoyancy.'),
        orderTokens: ['Coral', 'Ink', 'Key'], orderSolution: ['Coral', 'Ink', 'Key'],
        memorySymbols: ['Coral', 'Ink', 'Key', 'Pearl'], memorySequence: ['Coral', 'Pearl', 'Ink', 'Key', 'Coral'], memoryRevealMs: 700,
        rhythmBeats: [900, 1650, 2550, 3450],
        physics: { kind: 'buoyancy', prompt: 'Where should the two air bladders attach to lift the shelf level?', choices: ['Both in the center', 'One at each outer end', 'Both on the left'], correct: 1, successText: 'The shelf rises level and becomes a bridge to the Tide Index.' },
      }),
    },
  ),
  adventure(
    'week1-day4-forest', 3, 'Moonlit Forest', 'The Lantern Stag',
    'Follow a crown of fireflies into a silver forest and return the Moon Lantern to its guardian.',
    art('forest', 'backplates/forest.webp', '#80d6a3', '#d8b4fe', '#152b2b', '#f7fff5', 'Layered moonlit trees, luminous moss, fireflies and antler silhouettes', 'Moon Lantern', '☾'),
    ['rhythm', 'logic', 'memory', 'trivia', 'finale'],
    {
      trivia: trivia('Naturalist’s Hollow', 'Name the living patterns that guide travelers after dark.', [
        q('What mainly causes the Moon’s phases?', ['Earth’s shadow every night', 'Changing views of its sunlit half', 'Clouds crossing its surface', 'The Moon producing less light'], 1, 'Moon phases come from our changing view of the Moon’s sunlit half.'),
        q('Lichen commonly combines a fungus with which partner?', ['An insect', 'An alga or cyanobacterium', 'A moss root', 'A fern'], 1, 'Lichen is a partnership between a fungus and a photosynthetic organism.'),
        q('An animal that is active mainly at night is called what?', ['Diurnal', 'Nocturnal', 'Aquatic', 'Migratory'], 1, 'Nocturnal animals are primarily active at night.'),
      ]),
      logic: logicDeduction('Procession of Tracks', 'Work out which animal crossed the moonlit bridge second.',
        'Four animals crossed once each. Which animal must have crossed second?',
        ['The Moth crossed before the Owl.', 'The Fox crossed immediately before the Stag.', 'The Owl did not cross first.', 'The Stag crossed last.'],
        ['Moth', 'Owl', 'Fox', 'Stag'], 1, 'Fox and Stag occupy the final pair; Moth must precede Owl, leaving Owl in the second position.'),
      rhythm: rhythm('Firefly Crossing', 'Tap with each bright swarm to vault the roots below.', 'FOLLOW', 'GLOW', 45),
      memory: memory('Whispers in the Oak', 'Repeat the guardian’s animal calls after each echo fades.', ['Moth', 'Owl', 'Fox', 'Stag'], [
        ['Moth', 'Owl', 'Fox', 'Moth'],
        ['Stag', 'Fox', 'Owl', 'Moth', 'Stag'],
        ['Owl', 'Moth', 'Stag', 'Fox', 'Owl', 'Stag'],
      ]),
      finale: finale({
        title: 'Hollow Oak Guardian', brief: 'Read the moon, follow the tracks, echo the guardian, and balance the lantern bridge.',
        question: q('Why does the Moon appear to change shape?', ['Clouds cover it', 'We see different portions of its sunlit half', 'It shrinks each month', 'Earth blocks it nightly'], 1, 'The Moon’s phases are changing views of its illuminated half.'),
        orderTokens: ['Moth', 'Owl', 'Stag'], orderSolution: ['Moth', 'Owl', 'Stag'],
        memorySymbols: ['Moth', 'Owl', 'Fox', 'Stag'], memorySequence: ['Moth', 'Fox', 'Owl', 'Stag', 'Moth'], memoryRevealMs: 700,
        rhythmBeats: [800, 1600, 2450, 3350],
        physics: { kind: 'balance', prompt: 'How can a heavy lantern balance a light one across the branch?', choices: ['Heavy near pivot · light far away', 'Both at the far end', 'Light near pivot · heavy far away'], correct: 0, successText: 'The torques balance. The branch lowers into a moonlit bridge.' },
      }),
    },
  ),
  adventure(
    'week1-day5-observatory', 4, 'Polar Observatory', 'The Aurora Signal',
    'Wake an icebound observatory and send one last signal through a sky alive with color.',
    art('observatory', 'backplates/observatory.webp', '#66e0cf', '#7c8cff', '#15283b', '#f1fbff', 'Snow shelves, glass domes, aurora ribbons and crystalline radio towers', 'Aurora Lens', '✦'),
    ['trivia', 'memory', 'rhythm', 'logic', 'finale'],
    {
      trivia: trivia('Field Notes in Ice', 'Answer before the frost covers the observatory glass.', [
        q('Auroras begin when charged particles primarily arrive from where?', ['The Moon', 'The Sun', 'The oceans', 'Volcanoes'], 1, 'Charged particles from the Sun interact with gases in Earth’s upper atmosphere.'),
        q('Which star is commonly used to locate north in the Northern Hemisphere?', ['Sirius', 'Betelgeuse', 'Polaris', 'Vega'], 2, 'Polaris lies close to the north celestial pole.'),
        q('At which temperature do Celsius and Fahrenheit have the same numerical value?', ['−40°', '0°', '32°', '100°'], 0, '−40 degrees is the same on both scales.'),
      ]),
      logic: logicOrder('Signal Prisms', 'Align five prisms using the complete observatory log.', ['Comet', 'Aurora', 'Moon', 'Star', 'Snow'], [
        ['Aurora is immediately left of Moon.', { kind: 'immediatelyBefore', left: 'Aurora', right: 'Moon' }],
        ['Comet is left of Aurora.', { kind: 'before', left: 'Comet', right: 'Aurora' }],
        ['Star is immediately left of Snow.', { kind: 'immediatelyBefore', left: 'Star', right: 'Snow' }],
        ['Moon appears somewhere left of Star.', { kind: 'before', left: 'Moon', right: 'Star' }],
      ], ['Comet', 'Aurora', 'Moon', 'Star', 'Snow']),
      rhythm: rhythm('Aurora Telegraph', 'Key twelve pulses as the ribbons cross the antenna.', 'TRANSMIT', 'SIGNAL', 25),
      memory: memory('Constellation Relay', 'Memorize the observatory’s light sequence before frost clouds the lens.', ['Comet', 'Aurora', 'Moon', 'Star'], [
        ['Star', 'Moon', 'Aurora', 'Comet'],
        ['Aurora', 'Star', 'Comet', 'Moon', 'Aurora'],
        ['Comet', 'Moon', 'Star', 'Aurora', 'Comet', 'Star'],
      ]),
      finale: finale({
        title: 'Whiteout Dish', brief: 'Read the aurora, align the prisms, repeat the sky signal, and turn the dish into the wind.',
        question: q('Which star marks north for this observatory?', ['Polaris', 'Sirius', 'Vega', 'Rigel'], 0, 'Polaris is the traditional Northern Hemisphere guide star.'),
        orderTokens: ['Comet', 'Aurora', 'Star'], orderSolution: ['Comet', 'Aurora', 'Star'],
        memorySymbols: ['Comet', 'Aurora', 'Moon', 'Star'], memorySequence: ['Star', 'Aurora', 'Moon', 'Comet', 'Star'], memoryRevealMs: 700,
        rhythmBeats: [850, 1750, 2600, 3500],
        physics: { kind: 'dish', prompt: 'A strong wind pushes the dish right. Where should the ice counterweight go?', choices: ['Rightmost socket', 'Center socket', 'Leftmost socket'], correct: 2, successText: 'The counterweight holds. The dish locks onto the Aurora Signal.' },
      }),
    },
  ),
  adventure(
    'week1-day6-caravan', 5, 'Desert Caravan', 'The Glass Compass',
    'Cross a field of mirages and align an ancient caravan gate before the last shadow disappears.',
    art('caravan', 'backplates/caravan.webp', '#f1b45a', '#e87955', '#36291f', '#fff7e8', 'Layered dunes, canvas caravans, long shadows and glass obelisks', 'Glass Compass', '◇'),
    ['logic', 'trivia', 'rhythm', 'memory', 'finale'],
    {
      trivia: trivia('Wayfinder’s Questions', 'Separate desert knowledge from convincing mirages.', [
        q('A common road mirage is mainly caused by what?', ['Reflection from sand grains', 'Refraction through layers of warm air', 'Magnetism', 'Moonlight'], 1, 'Temperature layers bend light through refraction.'),
        q('What do camel humps primarily store?', ['Water', 'Fat', 'Air', 'Salt'], 1, 'Camel humps store fat that can be metabolized for energy.'),
        q('Where do all lines of longitude meet?', ['At the equator', 'At the poles', 'At the tropics', 'At sea level'], 1, 'Meridians converge at the North and South Poles.'),
      ]),
      logic: logicDeduction('Glass Compass', 'Use the rotating dial rules to identify the missing bearing.',
        'The dial turns through a repeating pattern. Which symbol replaces the missing sixth mark?',
        ['Odd marks advance Scout → Water → Goods.', 'Even marks alternate Lantern → Scout.', 'Marks 1–5 are Scout, Lantern, Water, Scout, Goods.'],
        ['Scout', 'Lantern', 'Water', 'Goods'], 1, 'The even-position pattern alternates Lantern, Scout, Lantern, so mark six is Lantern.'),
      rhythm: rhythm('Dune Runner', 'Tap the reins as each safe ridge passes under the lead camel.', 'REIN', 'RIDE', 30),
      memory: memory('Mirage Caravan', 'Track the real caravan symbols while their reflections fade and reverse.', ['Scout', 'Lantern', 'Water', 'Goods'], [
        ['Scout', 'Water', 'Lantern', 'Goods'],
        ['Goods', 'Scout', 'Water', 'Lantern', 'Goods'],
        ['Lantern', 'Water', 'Scout', 'Goods', 'Water', 'Lantern'],
      ]),
      finale: finale({
        title: 'Sandglass Gate', brief: 'Read the mirage, restore the caravan, repeat the compass code, and steer light through the obelisk.',
        question: q('What bends light above the hot road?', ['Refraction', 'Magnetism', 'Gravity alone', 'Sound'], 0, 'Refraction through air layers produces the mirage.'),
        orderTokens: ['Scout', 'Lantern', 'Water'], orderSolution: ['Scout', 'Lantern', 'Water'],
        memorySymbols: ['Scout', 'Lantern', 'Water', 'Goods'], memorySequence: ['Scout', 'Water', 'Goods', 'Lantern', 'Scout'], memoryRevealMs: 700,
        rhythmBeats: [900, 1800, 2650, 3500],
        physics: { kind: 'sandglass', prompt: 'Which sand-weight placement tilts the mirror toward the obelisk?', choices: ['Full left · half right', 'Both on the right', 'Half left · full right'], correct: 0, successText: 'The falling sand turns the mirror and opens the Glass Compass vault.' },
      }),
    },
  ),
  adventure(
    'week1-day7-citadel', 6, 'Sky Citadel', 'The Last Horizon',
    'Assemble the Atlas Engine above the clouds and open the trail to every Venture still to come.',
    art('citadel', 'backplates/citadel.webp', '#7bdff2', '#f6c85f', '#172b46', '#f5fbff', 'Floating stone islands, cloud bridges, banners and a vast brass orrery', 'Atlas Key', '✧'),
    ['memory', 'rhythm', 'logic', 'trivia', 'finale'],
    {
      trivia: trivia('Lessons of the Upper Air', 'Answer the citadel’s final questions.', [
        q('In which atmospheric layer does most weather occur?', ['Stratosphere', 'Mesosphere', 'Troposphere', 'Thermosphere'], 2, 'Most weather occurs in the troposphere.'),
        q('Which instrument measures wind speed?', ['Barometer', 'Anemometer', 'Hygrometer', 'Altimeter'], 1, 'An anemometer measures wind speed.'),
        q('Why do many sunsets appear red or orange?', ['Red light travels fastest', 'Shorter blue wavelengths scatter more', 'Clouds create red light', 'The Sun cools down'], 1, 'More blue light scatters out of the long path through the atmosphere.'),
      ]),
      logic: logicDeduction('Banners of the Horizon', 'Determine which banner can fly from the cracked third mast.',
        'Four banners fill four masts. Which banner must occupy the third mast?',
        ['Wing flies immediately after Sun.', 'Wave is not on either end.', 'Star is somewhere before Wave.', 'Sun is not on the first mast.'],
        ['Star', 'Wave', 'Sun', 'Wing'], 2, 'Star and Wave must take the first two masts; the linked Sun–Wing pair then occupies masts three and four.'),
      rhythm: rhythm('Cloud Gate Glide', 'Tap each wind crest to lift the glider through twelve rings.', 'FLAP', 'LIFT', 40),
      memory: memory('Atlas Constellation', 'Repeat the relic pattern as each sky bridge disappears behind cloud.', ['Star', 'Wave', 'Sun', 'Wing'], [
        ['Star', 'Wing', 'Wave', 'Sun'],
        ['Sun', 'Wave', 'Star', 'Wing', 'Sun'],
        ['Wing', 'Star', 'Sun', 'Wave', 'Wing', 'Star'],
      ]),
      finale: finale({
        title: 'Atlas Engine', brief: 'Read the sky, align the banners, repeat the Atlas code, and balance the final orrery.',
        question: q('Which layer carries the storm around the citadel?', ['Troposphere', 'Exosphere', 'Mesosphere', 'Thermosphere'], 0, 'The troposphere contains most of Earth’s weather.'),
        orderTokens: ['Star', 'Wave', 'Sun'], orderSolution: ['Star', 'Wave', 'Sun'],
        memorySymbols: ['Star', 'Wave', 'Sun', 'Wing'], memorySequence: ['Star', 'Sun', 'Wing', 'Wave', 'Star'], memoryRevealMs: 700,
        rhythmBeats: [750, 1500, 2350, 3250],
        physics: { kind: 'orrery', prompt: 'Which arrangement balances the three relic arms before launch?', choices: ['Light · medium · heavy clockwise', 'Heavy · light · medium clockwise', 'All relics on one arm'], correct: 1, successText: 'The Atlas Engine balances. The explorer flies through the last horizon.' },
      }),
    },
  ),
];

export const WEEK_ONE_BY_ID = new Map(WEEK_ONE.map((item) => [item.id, item]));
