const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];
let turn = 'white';
let players = {};

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function isValidMove(from, to, playerColor) {
  const piece = board[from.row][from.col];
  const targetPiece = board[to.row][to.col];

  if (!piece) {
    return false; // No piece to move
  }

  const isWhitePiece = piece === piece.toUpperCase();
  if ((playerColor === 'white' && !isWhitePiece) || (playerColor === 'black' && isWhitePiece)) {
    return false; // Not the player's piece
  }

  if (targetPiece) {
    const isTargetWhite = targetPiece === targetPiece.toUpperCase();
    if (isWhitePiece === isTargetWhite) {
      return false; // Can't capture friendly piece
    }
  }

  switch (piece.toLowerCase()) {
    case 'p': // Pawn
      const direction = isWhitePiece ? -1 : 1;
      const startRow = isWhitePiece ? 6 : 1;

      // Standard one-square move
      if (to.row === from.row + direction && to.col === from.col && !targetPiece) {
        return true;
      }

      // Initial two-square move
      if (from.row === startRow && to.row === from.row + 2 * direction && to.col === from.col && !targetPiece && !board[from.row + direction][from.col]) {
        return true;
      }

      // Capture move
      if (to.row === from.row + direction && Math.abs(to.col - from.col) === 1 && targetPiece) {
        return true;
      }
      return false;

    case 'r': // Rook
      if (from.row !== to.row && from.col !== to.col) {
        return false; // Not a straight line
      }

      const rowStep = from.row === to.row ? 0 : (to.row - from.row) / Math.abs(to.row - from.row);
      const colStep = from.col === to.col ? 0 : (to.col - from.col) / Math.abs(to.col - from.col);

      let currentRow = from.row + rowStep;
      let currentCol = from.col + colStep;

      while (currentRow !== to.row || currentCol !== to.col) {
        if (board[currentRow][currentCol]) {
          return false; // Path is blocked
        }
        currentRow += rowStep;
        currentCol += colStep;
      }
      return true;

    case 'n': // Knight
      const rowDiff = Math.abs(from.row - to.row);
      const colDiff = Math.abs(from.col - to.col);
      return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

    case 'b': // Bishop
      if (Math.abs(from.row - to.row) !== Math.abs(from.col - to.col)) {
        return false; // Not a diagonal line
      }

      const rowStepB = (to.row - from.row) / Math.abs(to.row - from.row);
      const colStepB = (to.col - from.col) / Math.abs(to.col - from.col);

      let currentRowB = from.row + rowStepB;
      let currentColB = from.col + colStepB;

      while (currentRowB !== to.row || currentColB !== to.col) {
        if (board[currentRowB][currentColB]) {
          return false; // Path is blocked
        }
        currentRowB += rowStepB;
        currentColB += colStepB;
      }
      return true;

    case 'q': // Queen
      if (from.row !== to.row && from.col !== to.col && Math.abs(from.row - to.row) !== Math.abs(from.col - to.col)) {
        return false; // Not a straight or diagonal line
      }

      const rowStepQ = from.row === to.row ? 0 : (to.row - from.row) / Math.abs(to.row - from.row);
      const colStepQ = from.col === to.col ? 0 : (to.col - from.col) / Math.abs(to.col - from.col);

      let currentRowQ = from.row + rowStepQ;
      let currentColQ = from.col + colStepQ;

      while (currentRowQ !== to.row || currentColQ !== to.col) {
        if (board[currentRowQ][currentColQ]) {
          return false; // Path is blocked
        }
        currentRowQ += rowStepQ;
        currentColQ += colStepQ;
      }
      return true;

    case 'k': // King
      const rowDiffK = Math.abs(from.row - to.row);
      const colDiffK = Math.abs(from.col - to.col);
      return rowDiffK <= 1 && colDiffK <= 1;

    default:
      // All pieces are implemented.
      return true;
  }
}


wss.on('connection', ws => {
  let playerColor;
  if (!players.white) {
    playerColor = 'white';
    players.white = ws;
  } else if (!players.black) {
    playerColor = 'black';
    players.black = ws;
  } else {
    // Spectator
  }

  console.log(`Player ${playerColor} connected`);
  ws.send(JSON.stringify({ type: 'init', color: playerColor, board, turn }));

  ws.on('message', message => {
    const data = JSON.parse(message);

    if (data.type === 'move' && playerColor === turn) {
      const { from, to } = data;
      if (isValidMove(from, to, playerColor)) {
        const piece = board[from.row][from.col];
        board[to.row][to.col] = piece;
        board[from.row][from.col] = '';
        turn = turn === 'white' ? 'black' : 'white';
        broadcast({ type: 'move', board, turn, lastMove: { from, to } });
      }
    } else if (data.type === 'chat') {
      broadcast({ type: 'chat', message: data.message, from: playerColor });
    }
  });

  ws.on('close', () => {
    console.log(`Player ${playerColor} disconnected`);
    if (playerColor) {
      players[playerColor] = null;
    }
  });
});

console.log('WebSocket server started on port 8080');