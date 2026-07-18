import { LabHub } from './LabHub';

export function CoreLabHub(props: { onExit: () => void; openBlockShift: () => void; openMineTrail: () => void }) {
  return <LabHub {...props} />;
}
