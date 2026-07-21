export interface LabTheme {
  id: string;
  worldName: string;
  lore: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  accent2: string;
  portal: string;
  portalName: string;
  collectibleName: string;
}

export const PROTOTYPE_THEME: LabTheme = {
  id: 'prototype-corridor',
  worldName: 'Prototype Corridor',
  lore: 'A shifting test wing where the Wayfinder Guild studies new puzzle mechanisms.',
  skyTop: '#163c42', skyMid: '#2e6768', skyBottom: '#071c24',
  surface: '#31585a', surfaceAlt: '#486b67', accent: '#f6c85f', accent2: '#71d8c7',
  portal: '#9ff4e4', portalName: 'field portal', collectibleName: 'signal',
};

export const WATCHER_TEST_THEME: LabTheme = {
  id: 'watcher-garden',
  worldName: 'The Verdant Orrery',
  lore: 'A forgotten sky-garden turns beneath a silent moon. Its ancient paths wake only for a Wayfinder willing to restore the Watcher\'s compass.',
  skyTop: '#162f45', skyMid: '#315f66', skyBottom: '#10232f',
  surface: '#536f61', surfaceAlt: '#6d846d', accent: '#f1c96b', accent2: '#83d7c2',
  portal: '#b8f4df', portalName: 'orrery portal', collectibleName: 'star shard',
};

export function themeCss(theme: LabTheme) {
  return {
    '--theme-accent': theme.accent,
    '--theme-accent-2': theme.accent2,
    '--theme-surface': theme.surface,
  } as CSSProperties;
}
import type { CSSProperties } from 'react';
