const boardElement = document.getElementById('board');
const squares = [];
const messagesElement = document.getElementById('messages');
const messageInputElement = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// --- WebSocket ---
const ws = new WebSocket('ws://localhost:8080');

let playerColor = null;

ws.onopen = () => {
  console.log('Connected to WebSocket server');
};

ws.onmessage = event => {
  const data = JSON.parse(event.data);
  if (data.type === 'init') {
    playerColor = data.color;
    renderBoard(data.board);
  } else if (data.type === 'move') {
    renderBoard(data.board);
  } else if (data.type === 'chat') {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${data.from}: ${data.message}`;
    messagesElement.appendChild(messageElement);
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }
};

// --- Game State ---
let selectedSquare = null;

const pieceSymbols = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙',
};

// --- UI ---
function renderBoard(board) {
  boardElement.innerHTML = '';
  squares.length = 0; // Clear the squares array
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.classList.add('square');
      if ((row + col) % 2 === 0) {
        square.classList.add('white');
      } else {
        square.classList.add('black');
      }
      square.dataset.row = row;
      square.dataset.col = col;

      const piece = board[row][col];
      if (piece) {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('piece');
        pieceElement.textContent = pieceSymbols[piece];
        pieceElement.style.color = piece === piece.toLowerCase() ? 'black' : 'white';
        square.appendChild(pieceElement);
      }
      boardElement.appendChild(square);
      squares.push(square);
    }
  }

  squares.forEach(square => {
    square.addEventListener('click', handleSquareClick);
  });
}

// --- Game Logic ---
function handleSquareClick(event) {
  if (!playerColor) return;

  const square = event.currentTarget;
  const row = parseInt(square.dataset.row);
  const col = parseInt(square.dataset.col);

  if (selectedSquare) {
    const move = {
      type: 'move',
      from: selectedSquare,
      to: { row, col },
    };
    ws.send(JSON.stringify(move));
    selectedSquare = null;
    squares.forEach(s => s.classList.remove('selected'));
  } else {
    selectedSquare = { row, col };
    square.classList.add('selected');
  }
}

// --- Chat ---
function sendChatMessage() {
  const message = messageInputElement.value;
  if (message.trim() !== '') {
    const chatData = {
      type: 'chat',
      message: message,
    };
    ws.send(JSON.stringify(chatData));
    messageInputElement.value = '';
  }
}

sendButton.addEventListener('click', sendChatMessage);
messageInputElement.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
});
