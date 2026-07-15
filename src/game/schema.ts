import { z } from 'zod';
import type { DailyAdventure, LogicConfig } from './types';

const questionSchema = z.object({
  prompt: z.string().min(8),
  choices: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correct: z.number().int().min(0).max(3),
  fact: z.string().min(8),
});

const logicRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('before'), left: z.string(), right: z.string() }),
  z.object({ kind: z.literal('immediatelyBefore'), left: z.string(), right: z.string() }),
  z.object({ kind: z.literal('position'), token: z.string(), index: z.number().int().min(0).max(3) }),
  z.object({ kind: z.literal('notPosition'), token: z.string(), indexes: z.array(z.number().int().min(0).max(3)).min(1) }),
]);

const puzzleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('trivia'), title: z.string(), brief: z.string(), questions: z.tuple([questionSchema, questionSchema, questionSchema]) }),
  z.object({ type: z.literal('logic'), title: z.string(), brief: z.string(), tokens: z.tuple([z.string(), z.string(), z.string(), z.string()]), clues: z.array(z.object({ text: z.string(), rule: logicRuleSchema })).min(3), solution: z.tuple([z.string(), z.string(), z.string(), z.string()]) }),
  z.object({ type: z.literal('rhythm'), title: z.string(), brief: z.string(), actionLabel: z.string(), cueLabel: z.string(), beatMap: z.array(z.number().positive()).length(12), durationMs: z.literal(30000), windowMs: z.number().min(180).max(500), maxErrors: z.literal(3) }),
  z.object({ type: z.literal('spatial'), title: z.string(), brief: z.string(), clue: z.string(), targetLabel: z.string(), target: z.object({ x: z.number().min(0).max(390), y: z.number().min(0).max(844), radius: z.number().min(24) }), hints: z.tuple([z.string(), z.string()]), maxTaps: z.literal(3) }),
  z.object({ type: z.literal('finale'), title: z.string(), brief: z.string(), question: questionSchema, orderTokens: z.tuple([z.string(), z.string(), z.string()]), orderSolution: z.tuple([z.string(), z.string(), z.string()]), scanClue: z.string(), scanTarget: z.object({ x: z.number(), y: z.number(), radius: z.number().min(24) }), rhythmBeats: z.tuple([z.number(), z.number(), z.number(), z.number()]), physics: z.object({ kind: z.enum(['mirror', 'ballast', 'buoyancy', 'balance', 'dish', 'sandglass', 'orrery']), prompt: z.string(), choices: z.tuple([z.string(), z.string(), z.string()]), correct: z.number().int().min(0).max(2), successText: z.string() }) }),
]);

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
  levelOrder: z.tuple([z.enum(['trivia', 'logic', 'rhythm', 'spatial']), z.enum(['trivia', 'logic', 'rhythm', 'spatial']), z.enum(['trivia', 'logic', 'rhythm', 'spatial']), z.enum(['trivia', 'logic', 'rhythm', 'spatial']), z.literal('finale')]),
  puzzles: z.object({ trivia: puzzleSchema, logic: puzzleSchema, rhythm: puzzleSchema, spatial: puzzleSchema, finale: puzzleSchema }),
});

function permutations<T>(items: T[]): T[][] {
  if (items.length < 2) return [items];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

export function satisfiesLogicClues(candidate: string[], config: LogicConfig): boolean {
  return config.clues.every(({ rule }) => {
    if (rule.kind === 'position') return candidate[rule.index] === rule.token;
    if (rule.kind === 'notPosition') return !rule.indexes.includes(candidate.indexOf(rule.token));
    const left = candidate.indexOf(rule.left);
    const right = candidate.indexOf(rule.right);
    return rule.kind === 'before' ? left < right : right === left + 1;
  });
}

export function countLogicSolutions(config: LogicConfig): number {
  return permutations([...config.tokens]).filter((candidate) => satisfiesLogicClues(candidate, config)).length;
}

export function validateAdventure(input: DailyAdventure): DailyAdventure {
  const parsed = dailyAdventureSchema.parse(input) as DailyAdventure;
  const firstFour = parsed.levelOrder.slice(0, 4);
  if (new Set(firstFour).size !== 4) throw new Error(`${parsed.id}: the first four puzzle types must be unique`);
  const solution = parsed.puzzles.logic as LogicConfig;
  if (new Set(solution.solution).size !== 4 || solution.solution.some((token) => !solution.tokens.includes(token))) throw new Error(`${parsed.id}: invalid logic solution`);
  if (countLogicSolutions(solution) !== 1) throw new Error(`${parsed.id}: logic solution must be unique`);
  const authoredSolutionValid = satisfiesLogicClues(solution.solution, solution);
  if (!authoredSolutionValid) throw new Error(`${parsed.id}: authored logic solution does not satisfy its clues`);
  return parsed;
}
