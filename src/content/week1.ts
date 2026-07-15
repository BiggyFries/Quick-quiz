import { validateAdventure } from '../game/schema';
import type {
  DailyAdventure,
  FinaleConfig,
  LogicConfig,
  LogicRule,
  PuzzleType,
  RhythmConfig,
  SpatialConfig,
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
const logic = (title: string, brief: string, tokens: LogicConfig['tokens'], clues: Array<[string, LogicRule]>, solution: LogicConfig['solution']): LogicConfig => ({
  type: 'logic', title, brief, tokens, clues: clues.map(([text, rule]) => ({ text, rule })) as LogicConfig['clues'], solution,
});
const rhythm = (title: string, brief: string, actionLabel: string, cueLabel: string, offset = 0): RhythmConfig => ({
  type: 'rhythm', title, brief, actionLabel, cueLabel, beatMap: beats.map((beat, index) => beat + (index % 3) * offset), durationMs: 30000, windowMs: 360, maxErrors: 3,
});
const spatial = (title: string, brief: string, clue: string, targetLabel: string, target: SpatialConfig['target'], hints: SpatialConfig['hints']): SpatialConfig => ({
  type: 'spatial', title, brief, clue, targetLabel, target, hints, maxTaps: 3,
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
    ['logic', 'trivia', 'rhythm', 'spatial', 'finale'],
    {
      logic: logic('Bridge of Idols', 'Arrange four temple guardians using every inscription.', ['Sun', 'Owl', 'Serpent', 'Jaguar'], [
        ['The Owl is not at either end.', { kind: 'notPosition', token: 'Owl', indexes: [0, 3] }],
        ['The Jaguar stands immediately right of the Serpent.', { kind: 'immediatelyBefore', left: 'Serpent', right: 'Jaguar' }],
        ['The Sun is somewhere left of the Owl.', { kind: 'before', left: 'Sun', right: 'Owl' }],
        ['The Serpent is not first.', { kind: 'notPosition', token: 'Serpent', indexes: [0] }],
      ], ['Sun', 'Owl', 'Serpent', 'Jaguar']),
      trivia: trivia('Archive of Glyphs', 'Answer all three questions. One wrong tablet opens the floor.', [
        q('Whose tomb did Howard Carter discover largely intact in 1922?', ['Ramesses II', 'Tutankhamun', 'Cleopatra VII', 'Akhenaten'], 1, 'Howard Carter discovered Tutankhamun’s tomb in 1922.'),
        q('Alongside Ancient Greek and Demotic, which script appears on the Rosetta Stone?', ['Cuneiform', 'Latin', 'Hieroglyphic', 'Phoenician'], 2, 'The decree appears in Greek, Demotic, and Egyptian hieroglyphs.'),
        q('Which Nile plant was made into a common ancient writing surface?', ['Papyrus', 'Lotus', 'Flax', 'Reed grass'], 0, 'Papyrus strips were layered and pressed into writing sheets.'),
      ]),
      rhythm: rhythm('Bridge of Drums', 'Tap when each gold ring reaches the drum to leap the collapsing gaps.', 'LEAP', 'NOW'),
      spatial: spatial('Hall of a Thousand Eyes', 'Find the scarab latch in no more than three taps.', 'Two sunbeams cross beneath the bird that watches the west wall.', 'Scarab latch', { x: 286, y: 363, radius: 34 }, ['Follow the brightest rays.', 'Look just below the falcon’s eye.']),
      finale: finale({
        title: 'Eclipse Engine', brief: 'Recall the trail, find the hidden release, charge the mechanism, and aim the mirror.',
        question: q('Which object translated the temple archive?', ['A crown', 'A stone with repeated scripts', 'A sundial', 'A gold mask'], 1, 'The Rosetta Stone repeated one decree in three scripts.'),
        orderTokens: ['Dawn', 'Noon', 'Dusk'], orderSolution: ['Dawn', 'Noon', 'Dusk'], scanClue: 'Tap the notch where the two carved rays meet.', scanTarget: { x: 112, y: 378, radius: 32 }, rhythmBeats: [900, 1800, 2700, 3600],
        physics: { kind: 'mirror', prompt: 'Which counterweight pairing turns the mirror toward the Sunstone?', choices: ['Heavy left · light right', 'Light left · heavy right', 'Both on the left'], correct: 1, successText: 'The mirror catches the final beam. The Sunstone awakens.' },
      }),
    },
  ),
  adventure(
    'week1-day2-airship', 1, 'Clockwork Airship', 'The Storm Engine',
    'Board a brass airship and repair its storm engine before the thunderhead swallows Brasshaven.',
    art('airship', 'backplates/airship.webp', '#e7a84d', '#5bc0be', '#172b35', '#fff7df', 'Brass decks, teal storm clouds, propellers and suspended cargo', 'Storm Cog', '⚙'),
    ['trivia', 'logic', 'spatial', 'rhythm', 'finale'],
    {
      trivia: trivia('Weather Deck', 'Prove you understand the sky before entering the engine room.', [
        q('Which lifting gas is nonflammable and less dense than air?', ['Oxygen', 'Helium', 'Carbon dioxide', 'Nitrogen'], 1, 'Helium is light and nonflammable.'),
        q('Which instrument measures atmospheric pressure?', ['Thermometer', 'Anemometer', 'Barometer', 'Hygrometer'], 2, 'A barometer measures atmospheric pressure.'),
        q('Which cloud type most often produces thunderstorms?', ['Cirrus', 'Stratus', 'Cumulonimbus', 'Altocumulus'], 2, 'Cumulonimbus clouds can produce thunder, lightning, and heavy rain.'),
      ]),
      logic: logic('Cargo Rail', 'Load the four supply crates from bow to stern.', ['Compass', 'Tools', 'Water', 'Fuel'], [
        ['The Compass is left of the Tools.', { kind: 'before', left: 'Compass', right: 'Tools' }],
        ['Fuel is immediately right of Water.', { kind: 'immediatelyBefore', left: 'Water', right: 'Fuel' }],
        ['Tools are not at either end.', { kind: 'notPosition', token: 'Tools', indexes: [0, 3] }],
        ['Water is not first.', { kind: 'notPosition', token: 'Water', indexes: [0] }],
      ], ['Compass', 'Tools', 'Water', 'Fuel']),
      rhythm: rhythm('Twelve-Pin Engine', 'Tap as each rotating pin enters the illuminated lock.', 'SET PIN', 'LOCK', 35),
      spatial: spatial('Storm Deck Release', 'Find the emergency pin before lightning reaches the mast.', 'Follow the engraved pipe arrows; the last arrow vanishes behind a rope.', 'Emergency pin', { x: 306, y: 332, radius: 32 }, ['Trace the brass pipe from the engine.', 'The pin sits behind the dark foreground rope.']),
      finale: finale({
        title: 'Thunderhead Engine', brief: 'Ground the coil, restore cargo order, lock the turbine, and balance the deck.',
        question: q('Which instrument warned the crew that air pressure was falling?', ['Compass', 'Barometer', 'Clock', 'Altimeter'], 1, 'A falling barometer can signal an approaching storm.'),
        orderTokens: ['Compass', 'Tools', 'Fuel'], orderSolution: ['Compass', 'Tools', 'Fuel'], scanClue: 'Tap the grounded coil marked by three descending arrows.', scanTarget: { x: 302, y: 380, radius: 30 }, rhythmBeats: [850, 1700, 2600, 3500],
        physics: { kind: 'ballast', prompt: 'The bow is rising too high. Where should the two ballast bags go?', choices: ['Both at the bow', 'One at each end', 'Both at the stern'], correct: 0, successText: 'The bow settles, the propellers bite, and the airship climbs.' },
      }),
    },
  ),
  adventure(
    'week1-day3-library', 2, 'Sunken Library', 'The Drowned Index',
    'Descend through a drowned archive where living lights guard a map no surface explorer has seen.',
    art('library', 'backplates/library.webp', '#4ecdc4', '#9676d9', '#102a36', '#effdfa', 'Submerged shelves, turquoise shafts, violet jellyfish and drifting pages', 'Tide Index', '◈'),
    ['spatial', 'trivia', 'logic', 'rhythm', 'finale'],
    {
      trivia: trivia('Abyssal Catalogue', 'Answer three questions before the ink dissolves.', [
        q('Which trench contains the deepest known point in Earth’s oceans?', ['Java Trench', 'Puerto Rico Trench', 'Mariana Trench', 'Tonga Trench'], 2, 'Challenger Deep lies in the Mariana Trench.'),
        q('What is light produced by a living organism called?', ['Fluorescence', 'Bioluminescence', 'Refraction', 'Phosphorescence'], 1, 'Bioluminescence is light made by a living organism.'),
        q('Which upward force helps objects float in water?', ['Friction', 'Gravity', 'Buoyancy', 'Magnetism'], 2, 'Buoyancy is the upward force exerted by a fluid.'),
      ]),
      logic: logic('Floodgate Shelves', 'Place the four archive seals from left to right.', ['Pearl', 'Ink', 'Coral', 'Key'], [
        ['Ink is immediately left of Key.', { kind: 'immediatelyBefore', left: 'Ink', right: 'Key' }],
        ['Pearl is right of Key.', { kind: 'before', left: 'Key', right: 'Pearl' }],
        ['Coral is at the left end.', { kind: 'position', token: 'Coral', index: 0 }],
      ], ['Coral', 'Ink', 'Key', 'Pearl']),
      rhythm: rhythm('Pressure Rings', 'Ping the bathysphere through twelve closing sonar rings.', 'PING', 'ECHO', 20),
      spatial: spatial('Mural of Tides', 'Find the shell key hidden in the flooded mosaic.', 'Two trails of bubbles meet where the missing shell belongs.', 'Shell key', { x: 118, y: 390, radius: 35 }, ['Ignore the painted fish.', 'Look where both bubble trails end.']),
      finale: finale({
        title: 'Leviathan Archive', brief: 'Read the depth clue, restore the index, open the valve, and raise the final shelf.',
        question: q('Which force can raise the drowned shelf?', ['Buoyancy', 'Friction', 'Gravity', 'Static charge'], 0, 'Air-filled bladders increase buoyancy.'),
        orderTokens: ['Coral', 'Ink', 'Key'], orderSolution: ['Coral', 'Ink', 'Key'], scanClue: 'Tap the valve between the converging bubbles.', scanTarget: { x: 276, y: 346, radius: 30 }, rhythmBeats: [900, 1650, 2550, 3450],
        physics: { kind: 'buoyancy', prompt: 'Where should the two air bladders attach to lift the shelf level?', choices: ['Both in the center', 'One at each outer end', 'Both on the left'], correct: 1, successText: 'The shelf rises level and becomes a bridge to the Tide Index.' },
      }),
    },
  ),
  adventure(
    'week1-day4-forest', 3, 'Moonlit Forest', 'The Lantern Stag',
    'Follow a crown of fireflies into a silver forest and return the Moon Lantern to its guardian.',
    art('forest', 'backplates/forest.webp', '#80d6a3', '#d8b4fe', '#152b2b', '#f7fff5', 'Layered moonlit trees, luminous moss, fireflies and antler silhouettes', 'Moon Lantern', '☾'),
    ['rhythm', 'logic', 'spatial', 'trivia', 'finale'],
    {
      trivia: trivia('Naturalist’s Hollow', 'Name the living patterns that guide travelers after dark.', [
        q('What mainly causes the Moon’s phases?', ['Earth’s shadow every night', 'Changing views of its sunlit half', 'Clouds crossing its surface', 'The Moon producing less light'], 1, 'Moon phases come from our changing view of the Moon’s sunlit half.'),
        q('Lichen commonly combines a fungus with which partner?', ['An insect', 'An alga or cyanobacterium', 'A moss root', 'A fern'], 1, 'Lichen is a partnership between a fungus and a photosynthetic organism.'),
        q('An animal that is active mainly at night is called what?', ['Diurnal', 'Nocturnal', 'Aquatic', 'Migratory'], 1, 'Nocturnal animals are primarily active at night.'),
      ]),
      logic: logic('Procession of Tracks', 'Place the four forest signs in their trail order.', ['Moth', 'Owl', 'Fox', 'Stag'], [
        ['Moth is immediately left of Owl.', { kind: 'immediatelyBefore', left: 'Moth', right: 'Owl' }],
        ['Fox is right of Owl.', { kind: 'before', left: 'Owl', right: 'Fox' }],
        ['Stag is at the right end.', { kind: 'position', token: 'Stag', index: 3 }],
      ], ['Moth', 'Owl', 'Fox', 'Stag']),
      rhythm: rhythm('Firefly Crossing', 'Tap with each bright swarm to vault the roots below.', 'FOLLOW', 'GLOW', 45),
      spatial: spatial('The Listening Oak', 'Find the antler-shaped release hidden in the bark.', 'The moonbeam points to a hollow shaped like half a crown.', 'Antler notch', { x: 284, y: 350, radius: 34 }, ['Follow the pale moonbeam.', 'The notch is on the right side of the hollow.']),
      finale: finale({
        title: 'Hollow Oak Guardian', brief: 'Read the moon, follow the tracks, find the hinge, and balance the lantern bridge.',
        question: q('Why does the Moon appear to change shape?', ['Clouds cover it', 'We see different portions of its sunlit half', 'It shrinks each month', 'Earth blocks it nightly'], 1, 'The Moon’s phases are changing views of its illuminated half.'),
        orderTokens: ['Moth', 'Owl', 'Stag'], orderSolution: ['Moth', 'Owl', 'Stag'], scanClue: 'Tap the hinge inside the crescent-shaped knot.', scanTarget: { x: 110, y: 362, radius: 30 }, rhythmBeats: [800, 1600, 2450, 3350],
        physics: { kind: 'balance', prompt: 'How can a heavy lantern balance a light one across the branch?', choices: ['Heavy near pivot · light far away', 'Both at the far end', 'Light near pivot · heavy far away'], correct: 0, successText: 'The torques balance. The branch lowers into a moonlit bridge.' },
      }),
    },
  ),
  adventure(
    'week1-day5-observatory', 4, 'Polar Observatory', 'The Aurora Signal',
    'Wake an icebound observatory and send one last signal through a sky alive with color.',
    art('observatory', 'backplates/observatory.webp', '#66e0cf', '#7c8cff', '#15283b', '#f1fbff', 'Snow shelves, glass domes, aurora ribbons and crystalline radio towers', 'Aurora Lens', '✦'),
    ['trivia', 'spatial', 'rhythm', 'logic', 'finale'],
    {
      trivia: trivia('Field Notes in Ice', 'Answer before the frost covers the observatory glass.', [
        q('Auroras begin when charged particles primarily arrive from where?', ['The Moon', 'The Sun', 'The oceans', 'Volcanoes'], 1, 'Charged particles from the Sun interact with gases in Earth’s upper atmosphere.'),
        q('Which star is commonly used to locate north in the Northern Hemisphere?', ['Sirius', 'Betelgeuse', 'Polaris', 'Vega'], 2, 'Polaris lies close to the north celestial pole.'),
        q('At which temperature do Celsius and Fahrenheit have the same numerical value?', ['−40°', '0°', '32°', '100°'], 0, '−40 degrees is the same on both scales.'),
      ]),
      logic: logic('Signal Prisms', 'Align the four observatory symbols.', ['Comet', 'Aurora', 'Moon', 'Star'], [
        ['Aurora is immediately left of Moon.', { kind: 'immediatelyBefore', left: 'Aurora', right: 'Moon' }],
        ['Comet is left of Aurora.', { kind: 'before', left: 'Comet', right: 'Aurora' }],
        ['Star is right of Moon.', { kind: 'before', left: 'Moon', right: 'Star' }],
      ], ['Comet', 'Aurora', 'Moon', 'Star']),
      rhythm: rhythm('Aurora Telegraph', 'Key twelve pulses as the ribbons cross the antenna.', 'TRANSMIT', 'SIGNAL', 25),
      spatial: spatial('Frozen Breaker Panel', 'Find the breaker concealed beneath the frost.', 'Two constellation lines intersect at the only star with six points.', 'Ice breaker', { x: 126, y: 336, radius: 35 }, ['Trace both etched constellations.', 'Tap the six-pointed intersection.']),
      finale: finale({
        title: 'Whiteout Dish', brief: 'Read the aurora, align the prisms, uncover the pivot, and turn the dish into the wind.',
        question: q('Which star marks north for this observatory?', ['Polaris', 'Sirius', 'Vega', 'Rigel'], 0, 'Polaris is the traditional Northern Hemisphere guide star.'),
        orderTokens: ['Comet', 'Aurora', 'Star'], orderSolution: ['Comet', 'Aurora', 'Star'], scanClue: 'Tap the pivot under the six-pointed frost mark.', scanTarget: { x: 294, y: 354, radius: 30 }, rhythmBeats: [850, 1750, 2600, 3500],
        physics: { kind: 'dish', prompt: 'A strong wind pushes the dish right. Where should the ice counterweight go?', choices: ['Rightmost socket', 'Center socket', 'Leftmost socket'], correct: 2, successText: 'The counterweight holds. The dish locks onto the Aurora Signal.' },
      }),
    },
  ),
  adventure(
    'week1-day6-caravan', 5, 'Desert Caravan', 'The Glass Compass',
    'Cross a field of mirages and align an ancient caravan gate before the last shadow disappears.',
    art('caravan', 'backplates/caravan.webp', '#f1b45a', '#e87955', '#36291f', '#fff7e8', 'Layered dunes, canvas caravans, long shadows and glass obelisks', 'Glass Compass', '◇'),
    ['logic', 'trivia', 'rhythm', 'spatial', 'finale'],
    {
      trivia: trivia('Wayfinder’s Questions', 'Separate desert knowledge from convincing mirages.', [
        q('A common road mirage is mainly caused by what?', ['Reflection from sand grains', 'Refraction through layers of warm air', 'Magnetism', 'Moonlight'], 1, 'Temperature layers bend light through refraction.'),
        q('What do camel humps primarily store?', ['Water', 'Fat', 'Air', 'Salt'], 1, 'Camel humps store fat that can be metabolized for energy.'),
        q('Where do all lines of longitude meet?', ['At the equator', 'At the poles', 'At the tropics', 'At sea level'], 1, 'Meridians converge at the North and South Poles.'),
      ]),
      logic: logic('Caravan Order', 'Arrange the caravan from front scout to rear cargo.', ['Scout', 'Lantern', 'Water', 'Goods'], [
        ['Water is immediately before Goods.', { kind: 'immediatelyBefore', left: 'Water', right: 'Goods' }],
        ['Scout is before Water.', { kind: 'before', left: 'Scout', right: 'Water' }],
        ['Lantern is neither first nor last.', { kind: 'notPosition', token: 'Lantern', indexes: [0, 3] }],
      ], ['Scout', 'Lantern', 'Water', 'Goods']),
      rhythm: rhythm('Dune Runner', 'Tap the reins as each safe ridge passes under the lead camel.', 'REIN', 'RIDE', 30),
      spatial: spatial('The Honest Shadow', 'Find the wheel pin whose shadow matches the real sun.', 'Mirages point both ways. Only one spoke casts a shadow away from the sun.', 'Compass pin', { x: 276, y: 386, radius: 34 }, ['Look at the true sun, not its reflection.', 'The real pin is on the right wheel.']),
      finale: finale({
        title: 'Sandglass Gate', brief: 'Read the mirage, restore the caravan, find the vent, and steer light through the obelisk.',
        question: q('What bends light above the hot road?', ['Refraction', 'Magnetism', 'Gravity alone', 'Sound'], 0, 'Refraction through air layers produces the mirage.'),
        orderTokens: ['Scout', 'Lantern', 'Water'], orderSolution: ['Scout', 'Lantern', 'Water'], scanClue: 'Tap the vent beneath the shadow that points away from the sun.', scanTarget: { x: 114, y: 382, radius: 31 }, rhythmBeats: [900, 1800, 2650, 3500],
        physics: { kind: 'sandglass', prompt: 'Which sand-weight placement tilts the mirror toward the obelisk?', choices: ['Full left · half right', 'Both on the right', 'Half left · full right'], correct: 0, successText: 'The falling sand turns the mirror and opens the Glass Compass vault.' },
      }),
    },
  ),
  adventure(
    'week1-day7-citadel', 6, 'Sky Citadel', 'The Last Horizon',
    'Assemble the Atlas Engine above the clouds and open the trail to every Venture still to come.',
    art('citadel', 'backplates/citadel.webp', '#7bdff2', '#f6c85f', '#172b46', '#f5fbff', 'Floating stone islands, cloud bridges, banners and a vast brass orrery', 'Atlas Key', '✧'),
    ['spatial', 'rhythm', 'logic', 'trivia', 'finale'],
    {
      trivia: trivia('Lessons of the Upper Air', 'Answer the citadel’s final questions.', [
        q('In which atmospheric layer does most weather occur?', ['Stratosphere', 'Mesosphere', 'Troposphere', 'Thermosphere'], 2, 'Most weather occurs in the troposphere.'),
        q('Which instrument measures wind speed?', ['Barometer', 'Anemometer', 'Hygrometer', 'Altimeter'], 1, 'An anemometer measures wind speed.'),
        q('Why do many sunsets appear red or orange?', ['Red light travels fastest', 'Shorter blue wavelengths scatter more', 'Clouds create red light', 'The Sun cools down'], 1, 'More blue light scatters out of the long path through the atmosphere.'),
      ]),
      logic: logic('Banners of the Horizon', 'Order the four banners along the western parapet.', ['Star', 'Wave', 'Sun', 'Wing'], [
        ['Wing is immediately right of Sun.', { kind: 'immediatelyBefore', left: 'Sun', right: 'Wing' }],
        ['Wave is not at either end.', { kind: 'notPosition', token: 'Wave', indexes: [0, 3] }],
        ['Star is left of Wave.', { kind: 'before', left: 'Star', right: 'Wave' }],
      ], ['Star', 'Wave', 'Sun', 'Wing']),
      rhythm: rhythm('Cloud Gate Glide', 'Tap each wind crest to lift the glider through twelve rings.', 'FLAP', 'LIFT', 40),
      spatial: spatial('Seventh Socket', 'Find the final socket in the citadel relief.', 'A split pennant hides the star missing from the stone constellation.', 'Star socket', { x: 300, y: 366, radius: 34 }, ['Look behind the moving banners.', 'The split gold pennant covers the socket.']),
      finale: finale({
        title: 'Atlas Engine', brief: 'Read the sky, align the banners, uncover the anchor, and balance the final orrery.',
        question: q('Which layer carries the storm around the citadel?', ['Troposphere', 'Exosphere', 'Mesosphere', 'Thermosphere'], 0, 'The troposphere contains most of Earth’s weather.'),
        orderTokens: ['Star', 'Wave', 'Sun'], orderSolution: ['Star', 'Wave', 'Sun'], scanClue: 'Tap the anchor beneath the split pennant.', scanTarget: { x: 104, y: 360, radius: 30 }, rhythmBeats: [750, 1500, 2350, 3250],
        physics: { kind: 'orrery', prompt: 'Which arrangement balances the three relic arms before launch?', choices: ['Light · medium · heavy clockwise', 'Heavy · light · medium clockwise', 'All relics on one arm'], correct: 1, successText: 'The Atlas Engine balances. The explorer flies through the last horizon.' },
      }),
    },
  ),
];

export const WEEK_ONE_BY_ID = new Map(WEEK_ONE.map((item) => [item.id, item]));
