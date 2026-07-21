import { LabHub } from './LabHub';
import type { CharacterCustomization } from '../character/character';

export function CoreLabHub(props: { onExit: () => void; openAdventure: () => void; openBlockShift: () => void; openMineTrail: () => void; character: CharacterCustomization }) {
  return <LabHub {...props} />;
}
