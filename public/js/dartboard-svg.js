/**
 * Legacy Adapter: DartboardSVG -> Delegated to native Web Component <dart-board>
 * Maintenu pour rétrocompatibilité avec l'assistant de calibration.
 */
import '../components/Dartboard.js';

export class DartboardSVG {
  constructor(container) {
    this.container = container;
    let board = container.querySelector('dart-board');
    if (!board) {
      board = document.createElement('dart-board');
      container.innerHTML = '';
      container.appendChild(board);
    }
    this.board = board;
  }

  render() {
    if (this.board) {
      this.board.render();
    } else {
      // Fallback Light DOM SVG creation
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      if (this.container) this.container.appendChild(svg);
    }
  }

  highlight(segmentKey, color = '#00FF87') {
    if (this.board) {
      this.board.highlight(segmentKey);
    }
  }
}
