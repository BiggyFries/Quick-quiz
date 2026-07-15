import { z } from 'zod';
import type { DailyAdventure, LogicOrderConfig } from './types';

const questionSchema = z.object({
  prompt: z.string().min(8),
  choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct: z.number().int().min(0).max(3),
  fact: z.string().min(8),
});

const logicRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('before'), left: z.string(), right: z.string() }),
  z.object({ kind: z.literal('immediatelyBefore'), left: z.string(), right: z.string() }),
  z.object({ kind: z.literal('position'), token: z.string(), index: z.number().int().min(0).max(4) }),
  z.object({ kind: z.literal('notPosition'), token: z.string(), indexes: z.array(z.number().int().min(0).max(4)).min(1) }),
]);

const triviaSchema = z.object({
  type: z.literal('trivia'),
  title: z.string(),
  brief: z.string(),
  questions: z.tuple([questionSchema, questionSchema, questionSchema]),
});

const logicSchema = z.discriminatedUnion('mechanic', [
  z.object({
    type: z.literal('logic'), mechanic: z.literal('order'), title: z.string(), brief: z.string(),
    tokens: z.array(z.string()).min(4).max(5),
    clues: z.array(z.object({ text: z.string(), rule: logicRuleSchema })).min(3),
    solution: z.array(z.string()).min(4).max(5),
  }),
  z.object({
    type: z.literal('logic'), mechanic: z.literal('deduction'), title: z.string(), brief: z.string(),
    prompt: z.string().min(12), clues: z.array(z.string().min(5)).min(3),
    choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correct: z.number().int().min(0).max(3), explanation: z.string().min(8),
  }),
]);

const rhythmSchema = z.object({
  type: z.literal('rhythm'), title: z.string(), brief: z.string(), actionLabel: z.string(), cueLabel: z.string(),
  beatMap: z.array(z.number().positive()).length(12), durationMs: z.literal(30000),
  windowMs: z.number().min(180).max(500), maxErrors: z.literal(3),
});

const memorySchema = z.object({
  type: z.literal('memory'), title: z.string(), brief: z.string(),
  symbols: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  rounds: z.tuple([
    z.array(z.string()).length(4),
    z.array(z.string()).length(5),
    z.array(z.string()).length(6),
  ]),
  revealMs: z.number().int().min(500).max(1200),
});

const finaleSchema = z.object({
  type: z.literal('finale'), title: z.string(), brief: z.string(), question: questionSchema,
  orderTokens: z.tuple([z.string(), z.string(), z.string()]),
  orderSolution: z.tuple([z.string(), z.string(), z.string()]),
  memorySymbols: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  memorySequence: z.tuple([z.string(), z.string(), z.string(), z.string(), z.string()]),
  memoryRevealMs: z.number().int().min(500).max(1200),
  rhythmBeats: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  physics: z.object({
    kind: z.enum(['mirror', 'ballast', 'buoyancy', 'balance', 'dish', 'sandglass', 'orrery']),
    prompt: z.string(), choices: z.tuple([z.string(), z.string(), z.string()]),
    correct: z.number().int().min(0).max(2), successText: z.string(),
  }),
});

export const dailyAdventureSchema = z.object({
  id: z.string().min(3),
  weekIndex: z.number().int().min(0).max(6),
  status: z.enum(['draft', 'approved', 'scheduled', 'published']),
  publishDate: z.string().nullable(),
  title: z.string(),
  subtitle: z.string(),
  synopsis: z.string(),
  estimatedMinutes: z.string(),
  art: z.object({ key: z.string(), background: z.string(), accent: z.string(), accent2: z.string(), ink: z.string(), paper: z.string(), atmosphere: z.string(), artifact: z.string(), motif: z.string() }),
  levelOrder: z.tuple([
    z.enum(['trivia', 'logic', 'rhythm', 'memory']),
    z.enum(['trivia', 'logic', 'rhythm', 'memory']),
    z.enum(['trivia', 'logic', 'rhythm', 'memory']),
    z.enum(['trivia', 'logic', 'rhythm', 'memory']),
    z.literal('finale'),
  ]),
  puzzles: z.object({ trivia: triviaSchema, logic: logicSchema, rhythm: rhythmSchema, memory: memorySchema, finale: finaleSchema }),
});

function permutations<T>(items: T[]): T[][] {
  if (items.length < 2) return [items];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

export function satisfiesLogicClues(candidate: string[], config: LogicOrderConfig): boolean {
  return config.clues.every(({ rule }) => {
    if (rule.kind === 'position') return candidate[rule.index] === rule.token;
    if (rule.kind === 'notPosition') return !rule.indexes.includes(candidate.indexOf(rule.token));
    const left = candidate.indexOf(rule.left);
    const right = candidate.indexOf(rule.right);
    return rule.kind === 'before' ? left < right : right === left + 1;
  });
}

export function countLogicSolutions(config: LogicOrderConfig): number {
  return permutations([...config.tokens]).filter((candidate) => satisfiesLogicClues(candidate, config)).length;
}

export function validateAdventure(input: DailyAdventure): DailyAdventure {
  const parsed = dailyAdventureSchema.parse(input) as DailyAdventure;
  const firstFour = parsed.levelOrder.slice(0, 4);
  if (new Set(firstFour).size !== 4) throw new Error(`${parsed.id}: the first four puzzle types must be unique`);

  const memory = parsed.puzzles.memory;
  if (new Set(memory.symbols).size !== memory.symbols.length) throw new Error(`${parsed.id}: memory symbols must be unique`);
  if (memory.rounds.flat().some((symbol) => !memory.symbols.includes(symbol))) throw new Error(`${parsed.id}: memory round contains an unknown symbol`);
  if (parsed.puzzles.finale.memorySequence.some((symbol) => !parsed.puzzles.finale.memorySymbols.includes(symbol))) throw new Error(`${parsed.id}: finale memory sequence contains an unknown symbol`);

  const logic = parsed.puzzles.logic;
  if (logic.mechanic === 'order') {
    if (new Set(logic.solution).size !== logic.tokens.length || logic.solution.length !== logic.tokens.length || logic.solution.some((token) => !logic.tokens.includes(token))) throw new Error(`${parsed.id}: invalid logic solution`);
    if (countLogicSolutions(logic) !== 1) throw new Error(`${parsed.id}: logic solution must be unique`);
    if (!satisfiesLogicClues(logic.solution, logic)) throw new Error(`${parsed.id}: authored logic solution does not satisfy its clues`);
  } else if (new Set(logic.choices).size !== logic.choices.length) {
    throw new Error(`${parsed.id}: deduction choices must be unique`);
  }
  return parsed;
}
