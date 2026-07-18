export function CoreLabHub(props: { onExit: () => void; openBlockShift: () => void; openMineTrail: () => void }) {
  return <section className="core-lab-hub" aria-label="Puzzle Lab selector">
    <header className="page-header">
      <button className="icon-button" aria-label="Back to home" onClick={props.onExit}>‹</button>
      <div>
        <small>DAILY VENTURE · TEST WING</small>
        <h1>Puzzle Labs</h1>
      </div>
    </header>

    <p className="page-copy">Play isolated prototypes here before they are refined, themed, and added to a Daily Venture.</p>

    <div className="core-lab-card-list">
      <button className="core-lab-card block-card" aria-label="Play Block Shift Lab 01" onClick={props.openBlockShift}>
        <span className="core-lab-card-number">01</span>
        <span className="core-lab-card-art" aria-hidden="true"><i>↔</i><i>↕</i><i>◆</i></span>
        <span className="core-lab-card-copy">
          <small>CHARACTER + BLOCK PUZZLE</small>
          <strong>Block Shift</strong>
          <span>Push rigid pieces through a larger 2.5D room and slide the keystone into the door rail.</span>
        </span>
        <b aria-hidden="true">›</b>
      </button>

      <button className="core-lab-card mine-card" aria-label="Play Mine Trail Lab 02" onClick={props.openMineTrail}>
        <span className="core-lab-card-number">02</span>
        <span className="core-lab-card-art" aria-hidden="true"><i>1</i><i>2</i><i>·</i><i>!</i></span>
        <span className="core-lab-card-copy">
          <small>CHARACTER + DEDUCTION PUZZLE</small>
          <strong>Mine Trail</strong>
          <span>Move the explorer tile by tile, then use Action to reveal clues and clear a safe route.</span>
        </span>
        <b aria-hidden="true">›</b>
      </button>
    </div>

    <p className="core-lab-hub-note"><strong>LAB BUILD</strong><span>Progress here is intentionally temporary and does not affect Week 1 Ventures.</span></p>
  </section>;
}
