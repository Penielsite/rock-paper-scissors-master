const choices = ["rock", "paper", "scissors", "lizard", "spock"];
const defeats = {
  rock: ["scissors", "lizard"],
  paper: ["rock", "spock"],
  scissors: ["paper", "lizard"],
  lizard: ["spock", "paper"],
  spock: ["scissors", "rock"],
};
const scoreKey = "rpsls-score";

const scoreOutput = document.querySelector("#score");
const scoreLabel = document.querySelector("#score-label");
const modeButtons = document.querySelectorAll("[data-mode]");
const onlinePanel = document.querySelector("#online-panel");
const choiceBoard = document.querySelector("#choice-board");
const roundResult = document.querySelector("#round-result");
const playerChoice = document.querySelector("#player-choice");
const houseChoice = document.querySelector("#house-choice");
const playerHeading = document.querySelector("#player-heading");
const opponentHeading = document.querySelector("#opponent-heading");
const resultTitle = document.querySelector("#result-title");
const playAgainButton = document.querySelector("#play-again");
const createRoomButton = document.querySelector("#create-room");
const joinRoomButton = document.querySelector("#join-room");
const playerNameInput = document.querySelector("#player-name");
const roomCodeInput = document.querySelector("#room-code");
const inviteDetails = document.querySelector("#invite-details");
const inviteLinkInput = document.querySelector("#invite-link");
const copyInviteButton = document.querySelector("#copy-invite");
const approvalPanel = document.querySelector("#approval-panel");
const approvalMessage = document.querySelector("#approval-message");
const allowPlayerButton = document.querySelector("#allow-player");
const denyPlayerButton = document.querySelector("#deny-player");
const connectionStatus = document.querySelector("#connection-status");
const roundTimer = document.querySelector("#round-timer");
const rulesDialog = document.querySelector("#rules-dialog");
const openRulesButton = document.querySelector("#open-rules");
const closeRulesButton = document.querySelector("#close-rules");
const gameAnnouncement = document.querySelector("#game-announcement");

function readScore() {
  const storedScore = window.localStorage.getItem(scoreKey);
  if (storedScore === null) return 0;

  const savedScore = Number(storedScore);
  return Number.isSafeInteger(savedScore) ? savedScore : 0;
}

let score;
let scorePersistenceWarning = "";
let computerRoundTimer = null;
try {
  score = readScore();
} catch (error) {
  score = 0;
  scorePersistenceWarning = "Your saved score could not be loaded.";
}

let mode = "computer";
let localScores = [0, 0];
let localPlayer = 1;
let localFirstPick = null;
let peer = null;
let connection = null;
let onlineRole = null;
let onlineReady = false;
let onlineRound = 1;
let onlineScores = [0, 0];
let onlineMyPick = null;
let onlineOpponentPick = null;
let hostReady = false;
let guestReady = false;
let hostName = "";
let guestName = "";
let pendingGuestName = "";
let onlineDeadline = 0;
let onlineTimer = null;
let onlineCountdown = null;
let disconnectNotice = "";

function updateScore() {
  if (mode === "local") {
    scoreLabel.textContent = "P1 : P2";
    scoreOutput.classList.add("is-match-score");
    scoreOutput.value = `${localScores[0]} : ${localScores[1]}`;
    scoreOutput.textContent = `${localScores[0]} : ${localScores[1]}`;
    return;
  }
  scoreOutput.classList.remove("is-match-score");
  if (mode === "online") {
    scoreLabel.textContent = "Your wins";
    const ownScore = onlineRole === "guest" ? onlineScores[1] : onlineScores[0];
    scoreOutput.value = String(ownScore);
    scoreOutput.textContent = String(ownScore);
    return;
  }
  scoreLabel.textContent = "Score";
  scoreOutput.value = String(score);
  scoreOutput.textContent = String(score);
}

function choiceButton(choice, disabled = true) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `choice choice--${choice} choice--result`;
  button.disabled = disabled;
  button.setAttribute("aria-label", choice === "spock" ? "Spock" : choice);

  const icon = document.createElement("img");
  icon.src = `./images/icon-${choice}.svg`;
  icon.alt = "";
  button.append(icon);
  return button;
}

function createChoicePlaceholder(label) {
  const placeholder = document.createElement("div");
  placeholder.className = "choice-placeholder";
  placeholder.setAttribute("aria-label", label);
  return placeholder;
}

function saveScore() {
  try {
    window.localStorage.setItem(scoreKey, String(score));
  } catch (error) {
    scorePersistenceWarning = "Your score changed, but could not be saved in this browser.";
  }
}

function resetResult() {
  playerChoice.classList.remove("is-winner");
  houseChoice.classList.remove("is-winner");
  roundResult.hidden = true;
  choiceBoard.hidden = false;
  playAgainButton.disabled = false;
  choiceBoard.querySelector(".choice").focus();
}

function showResult(playerPick, opponentPick, title, winner, playerLabel, opponentLabel) {
  choiceBoard.hidden = true;
  roundResult.hidden = false;
  playerHeading.textContent = playerLabel;
  opponentHeading.textContent = opponentLabel;
  playerChoice.replaceChildren(choiceButton(playerPick));
  houseChoice.replaceChildren(choiceButton(opponentPick));
  playerChoice.classList.toggle("is-winner", winner === "player");
  houseChoice.classList.toggle("is-winner", winner === "opponent");
  resultTitle.textContent = title;
  playAgainButton.disabled = false;
  gameAnnouncement.textContent = title;
  playAgainButton.focus();
}

function playComputerRound(playerPick) {
  const housePick = choices[Math.floor(Math.random() * choices.length)];
  const outcome = playerPick === housePick
    ? "draw"
    : defeats[playerPick].includes(housePick)
      ? "win"
      : "lose";

  scorePersistenceWarning = "";
  if (outcome === "win") score += 1;
  if (outcome === "lose") score -= 1;
  updateScore();
  saveScore();

  choiceBoard.hidden = true;
  roundResult.hidden = false;
  playerHeading.textContent = "You picked";
  opponentHeading.textContent = "The house picked";
  playerChoice.replaceChildren(choiceButton(playerPick));
  houseChoice.replaceChildren();
  const placeholder = document.createElement("div");
  placeholder.className = "choice-placeholder";
  placeholder.setAttribute("aria-label", "The house is choosing");
  houseChoice.append(placeholder);
  resultTitle.textContent = "The house is choosing";
  gameAnnouncement.textContent = "The house is choosing.";
  playAgainButton.disabled = true;

  if (computerRoundTimer !== null) window.clearTimeout(computerRoundTimer);
  computerRoundTimer = window.setTimeout(() => {
    computerRoundTimer = null;
    if (mode !== "computer") return;
    houseChoice.replaceChildren(choiceButton(housePick));
    resultTitle.textContent = outcome === "draw"
      ? "Draw"
      : outcome === "win"
        ? "You win"
        : "You lose";
    if (outcome === "win") playerChoice.classList.add("is-winner");
    if (outcome === "lose") houseChoice.classList.add("is-winner");
    const roundAnnouncement = outcome === "draw"
      ? `Draw. You both chose ${housePick}.`
      : outcome === "win"
        ? `You win. ${playerPick} beats ${housePick}.`
        : `You lose. ${housePick} beats ${playerPick}.`;
    gameAnnouncement.textContent = [roundAnnouncement, scorePersistenceWarning].filter(Boolean).join(" ");
    playAgainButton.disabled = false;
    playAgainButton.focus();
  }, 550);
}

function showPassToPlayerTwo() {
  choiceBoard.hidden = true;
  roundResult.hidden = false;
  playerHeading.textContent = "Player 1's move is hidden";
  opponentHeading.textContent = "Player 2 to pick";
  playerChoice.replaceChildren();
  const hiddenPick = document.createElement("div");
  hiddenPick.className = "choice-placeholder";
  hiddenPick.setAttribute("aria-label", "Player 1's move is hidden");
  playerChoice.append(hiddenPick);
  houseChoice.replaceChildren();
  const placeholder = document.createElement("div");
  placeholder.className = "choice-placeholder";
  placeholder.setAttribute("aria-label", "Waiting for Player 2");
  houseChoice.append(placeholder);
  playerChoice.classList.remove("is-winner");
  houseChoice.classList.remove("is-winner");
  resultTitle.textContent = "Pass the device";
  playAgainButton.textContent = "Player 2, make your choice";
  gameAnnouncement.textContent = "Pass the device to Player 2.";
}

function playLocalRound(playerPick) {
  if (localPlayer === 1) {
    localFirstPick = playerPick;
    showPassToPlayerTwo();
    return;
  }

  const playerTwoPick = playerPick;
  const outcome = localFirstPick === playerTwoPick
    ? "draw"
    : defeats[playerTwoPick].includes(localFirstPick)
      ? "win"
      : "lose";
  if (outcome === "win") localScores[1] += 1;
  if (outcome === "lose") localScores[0] += 1;
  updateScore();
  showResult(
    playerTwoPick,
    localFirstPick,
    outcome === "draw" ? "Draw" : outcome === "win" ? "Player 2 wins" : "Player 1 wins",
    outcome === "draw" ? null : outcome === "win" ? "player" : "opponent",
    "Player 2 picked",
    "Player 1 picked",
  );
}

function setOnlineStatus(message) {
  connectionStatus.textContent = message;
  gameAnnouncement.textContent = message;
}

function validScores(scores) {
  return Array.isArray(scores)
    && scores.length === 2
    && scores.every((value) => Number.isSafeInteger(value) && value >= 0);
}

function clearOnlineTimers() {
  if (onlineTimer !== null) {
    window.clearTimeout(onlineTimer);
    onlineTimer = null;
  }
  if (onlineCountdown !== null) {
    window.clearInterval(onlineCountdown);
    onlineCountdown = null;
  }
  roundTimer.hidden = true;
}

function updateRoundCountdown() {
  const remaining = Math.max(0, Math.ceil((onlineDeadline - Date.now()) / 1000));
  roundTimer.textContent = `Choose in ${remaining} second${remaining === 1 ? "" : "s"}`;
  roundTimer.hidden = false;
}

function startOnlineTimer(deadline) {
  clearOnlineTimers();
  onlineDeadline = deadline;
  updateRoundCountdown();
  onlineCountdown = window.setInterval(updateRoundCountdown, 200);
  if (onlineRole === "host") {
    onlineTimer = window.setTimeout(() => finishOnlineRound(true), Math.max(0, deadline - Date.now()));
  }
}

function closeOnlineConnection() {
  clearOnlineTimers();
  onlineReady = false;
  onlineRole = null;
  onlineRound = 1;
  onlineScores = [0, 0];
  onlineMyPick = null;
  onlineOpponentPick = null;
  hostReady = false;
  guestReady = false;
  hostName = "";
  guestName = "";
  pendingGuestName = "";
  allowPlayerButton.textContent = "Allow player";
  approvalPanel.hidden = true;
  if (connection) {
    const previousConnection = connection;
    connection = null;
    previousConnection.close();
  }
  if (peer) {
    peer.destroy();
    peer = null;
  }
  inviteDetails.hidden = true;
  createRoomButton.disabled = false;
  joinRoomButton.disabled = false;
  updateScore();
}

function showOnlineBoard() {
  onlineReady = true;
  roundResult.hidden = true;
  choiceBoard.hidden = false;
  setOnlineStatus(`Connected with ${onlineRole === "host" ? guestName : hostName}. Choose your move before time runs out.`);
}

function finishOnlineRound(timedOut = false) {
  if (onlineRole !== "host" || !onlineReady) return;
  if (!timedOut && (onlineMyPick === null || onlineOpponentPick === null)) return;
  clearOnlineTimers();
  onlineReady = false;

  const hostPick = onlineMyPick;
  const guestPick = onlineOpponentPick;
  const timedOutPlayers = [];
  if (hostPick === null) timedOutPlayers.push("host");
  if (guestPick === null) timedOutPlayers.push("guest");
  const hostOutcome = timedOutPlayers.length === 2 || hostPick === guestPick
    ? "draw"
    : hostPick === null
      ? "lose"
      : guestPick === null
        ? "win"
        : defeats[hostPick].includes(guestPick)
          ? "win"
          : "lose";
  if (hostOutcome === "win") onlineScores[0] += 1;
  if (hostOutcome === "lose") onlineScores[1] += 1;
  updateScore();

  const result = {
    type: "result",
    round: onlineRound,
    hostPick,
    guestPick,
    hostOutcome,
    timedOutPlayers,
    scores: onlineScores,
  };
  connection.send(result);
  showOnlineResult(result);
}

function showOnlineResult(result) {
  clearOnlineTimers();
  onlineReady = false;
  onlineScores = result.scores;
  updateScore();
  const ownPick = onlineRole === "host" ? result.hostPick : result.guestPick;
  const opponentPick = onlineRole === "host" ? result.guestPick : result.hostPick;
  const ownOutcome = onlineRole === "host"
    ? result.hostOutcome
    : result.hostOutcome === "draw"
      ? "draw"
      : result.hostOutcome === "win"
        ? "lose"
        : "win";
  const ownRole = onlineRole;
  const ownTimedOut = result.timedOutPlayers.includes(ownRole);
  const opponentTimedOut = result.timedOutPlayers.includes(ownRole === "host" ? "guest" : "host");
  const title = ownOutcome === "draw"
    ? ownTimedOut && opponentTimedOut ? "Both players ran out of time. Draw." : "Draw"
    : ownTimedOut
      ? "You ran out of time. You lose."
      : opponentTimedOut
        ? "Opponent ran out of time. You win!"
    : ownOutcome === "win"
      ? "You win"
      : "You lose";
  choiceBoard.hidden = true;
  roundResult.hidden = false;
  playerHeading.textContent = `${onlineRole === "host" ? hostName : guestName}'s move`;
  opponentHeading.textContent = `${onlineRole === "host" ? guestName : hostName}'s move`;
  playerChoice.replaceChildren(ownPick ? choiceButton(ownPick) : createChoicePlaceholder("No move submitted"));
  houseChoice.replaceChildren(opponentPick ? choiceButton(opponentPick) : createChoicePlaceholder("No move submitted"));
  playerChoice.classList.toggle("is-winner", ownOutcome === "win");
  houseChoice.classList.toggle("is-winner", ownOutcome === "lose");
  resultTitle.textContent = title;
  playAgainButton.disabled = false;
  playAgainButton.focus();
  setOnlineStatus(`${title} Select Play again when both players are ready.`);
  onlineMyPick = null;
  onlineOpponentPick = null;
  hostReady = false;
  guestReady = false;
}

function startOnlineRound() {
  onlineRound += 1;
  onlineMyPick = null;
  onlineOpponentPick = null;
  hostReady = false;
  guestReady = false;
  const deadline = Date.now() + 5000;
  connection.send({ type: "start", round: onlineRound, scores: onlineScores, durationMs: 5000 });
  startOnlineTimer(deadline);
  showOnlineBoard();
}

function maybeStartOnlineRound() {
  if (onlineRole === "host" && hostReady && guestReady) {
    startOnlineRound();
  } else if (onlineRole === "host" && hostReady) {
    setOnlineStatus("Waiting for your friend to continue.");
  }
}

function handleOnlineMessage(message) {
  if (!message || typeof message !== "object") return;

  if (onlineRole === "host" && message.type === "join-request") {
    if (connection === null || pendingGuestName || typeof message.name !== "string") return;
    const requestedName = message.name.trim().slice(0, 24);
    if (!requestedName) {
      connection.send({ type: "denied", reason: "A valid player name is required." });
      connection.close();
      return;
    }
    pendingGuestName = requestedName;
    approvalMessage.textContent = `${requestedName} wants to join your game. Is this your friend?`;
    allowPlayerButton.textContent = `Allow ${requestedName}`;
    approvalPanel.hidden = false;
    setOnlineStatus(`Check the joining player's name (${requestedName}), then allow or deny them.`);
    return;
  }

  if (onlineRole === "guest" && message.type === "denied") {
    disconnectNotice = message.reason || "The host did not allow this player to join.";
    setOnlineStatus(disconnectNotice);
    if (connection) connection.close();
    return;
  }

  if (onlineRole === "host" && message.type === "move") {
    if (!onlineReady || message.round !== onlineRound || !choices.includes(message.choice) || onlineOpponentPick !== null) return;
    if (Date.now() >= onlineDeadline) {
      finishOnlineRound(true);
      return;
    }
    onlineOpponentPick = message.choice;
    if (onlineMyPick !== null) finishOnlineRound();
    return;
  }

  if (onlineRole === "host" && message.type === "ready") {
    if (onlineReady || message.round !== onlineRound + 1) return;
    guestReady = true;
    maybeStartOnlineRound();
    return;
  }

  if (onlineRole === "guest" && message.type === "move") {
    if (message.round !== onlineRound || !choices.includes(message.choice) || onlineOpponentPick !== null) return;
    onlineOpponentPick = message.choice;
    if (onlineMyPick !== null) setOnlineStatus("Waiting for your friend to choose.");
    return;
  }

  if (onlineRole === "guest" && message.type === "init") {
    if (!validScores(message.scores) || !Number.isSafeInteger(message.round) || message.round < 1
      || message.durationMs !== 5000 || typeof message.hostName !== "string" || typeof message.guestName !== "string") return;
    onlineRound = message.round;
    onlineScores = message.scores;
    hostName = message.hostName;
    guestName = message.guestName;
    startOnlineTimer(Date.now() + message.durationMs);
    updateScore();
    showOnlineBoard();
    return;
  }

  if (onlineRole === "guest" && message.type === "start") {
    if (!validScores(message.scores) || message.round !== onlineRound + 1 || message.durationMs !== 5000) return;
    onlineRound = message.round;
    onlineScores = message.scores;
    startOnlineTimer(Date.now() + message.durationMs);
    updateScore();
    showOnlineBoard();
    return;
  }

  if (onlineRole === "guest" && message.type === "result") {
    if (message.round !== onlineRound
      || (message.hostPick !== null && !choices.includes(message.hostPick))
      || (message.guestPick !== null && !choices.includes(message.guestPick))
      || !["win", "lose", "draw"].includes(message.hostOutcome)
      || !Array.isArray(message.timedOutPlayers)
      || !message.timedOutPlayers.every((player) => player === "host" || player === "guest")
      || !validScores(message.scores)) return;
    showOnlineResult(message);
  }
}

function attachConnection(dataConnection, role) {
  connection = dataConnection;
  onlineRole = role;
  createRoomButton.disabled = true;
  joinRoomButton.disabled = true;
  setOnlineStatus("Connecting to your friend...");

  connection.on("open", () => {
    if (role === "host") {
      setOnlineStatus("A player connected. Waiting for their name and join request.");
    } else {
      connection.send({ type: "join-request", name: guestName });
      setOnlineStatus(`Join request sent as ${guestName}. Waiting for the host to allow you.`);
    }
  });
  connection.on("data", handleOnlineMessage);
  connection.on("close", () => {
    if (connection !== dataConnection) return;
    connection = null;
    onlineReady = false;
    clearOnlineTimers();
    approvalPanel.hidden = true;
    pendingGuestName = "";
    allowPlayerButton.textContent = "Allow player";
    choiceBoard.hidden = true;
    roundResult.hidden = true;
    createRoomButton.disabled = false;
    joinRoomButton.disabled = false;
    setOnlineStatus(disconnectNotice || "The connection ended. Create or join a room to play again.");
    disconnectNotice = "";
  });
  connection.on("error", (error) => {
    if (connection !== dataConnection) return;
    setOnlineStatus(`Connection error: ${error.message}`);
  });
}

function createOnlineRoom() {
  const name = playerNameInput.value.trim().slice(0, 24);
  if (!name) {
    setOnlineStatus("Enter your name before creating a room.");
    playerNameInput.focus();
    return;
  }
  closeOnlineConnection();
  hostName = name;
  inviteDetails.hidden = true;
  if (typeof window.Peer !== "function") {
    setOnlineStatus("PeerJS could not load. Check your internet connection and reload the page.");
    return;
  }
  createRoomButton.disabled = true;
  joinRoomButton.disabled = true;
  setOnlineStatus("Creating your room...");
  peer = new window.Peer();
  const activePeer = peer;
  peer.on("open", (id) => {
    if (peer !== activePeer) return;
    onlineRole = "host";
    const inviteUrl = new URL(window.location.href);
    inviteUrl.searchParams.set("room", id);
    inviteLinkInput.value = inviteUrl.toString();
    roomCodeInput.value = id;
    inviteDetails.hidden = false;
    setOnlineStatus("Room created. Share the code or invite link and wait for your friend.");
  });
  peer.on("connection", (dataConnection) => {
    if (peer !== activePeer) {
      dataConnection.close();
      return;
    }
    if (connection) {
      dataConnection.close();
      return;
    }
    onlineRole = "host";
    attachConnection(dataConnection, "host");
  });
  peer.on("error", (error) => {
    if (peer !== activePeer) return;
    createRoomButton.disabled = false;
    joinRoomButton.disabled = false;
    setOnlineStatus(`Room error: ${error.message}`);
  });
}

function joinOnlineRoom(roomId) {
  const code = roomId.trim();
  const name = playerNameInput.value.trim().slice(0, 24);
  if (!name) {
    setOnlineStatus("Enter your name before requesting to join.");
    playerNameInput.focus();
    return;
  }
  if (!code) {
    setOnlineStatus("Enter a room code to join.");
    roomCodeInput.focus();
    return;
  }
  closeOnlineConnection();
  guestName = name;
  inviteDetails.hidden = true;
  if (typeof window.Peer !== "function") {
    setOnlineStatus("PeerJS could not load. Check your internet connection and reload the page.");
    return;
  }
  createRoomButton.disabled = true;
  joinRoomButton.disabled = true;
  setOnlineStatus("Joining room...");
  peer = new window.Peer();
  const activePeer = peer;
  peer.on("open", () => {
    if (peer !== activePeer) return;
    attachConnection(activePeer.connect(code, { reliable: true }), "guest");
  });
  peer.on("error", (error) => {
    if (peer !== activePeer) return;
    createRoomButton.disabled = false;
    joinRoomButton.disabled = false;
    setOnlineStatus(`Room error: ${error.message}`);
  });
}

function allowPendingPlayer() {
  if (!connection || !pendingGuestName || onlineRole !== "host") return;
  guestName = pendingGuestName;
  pendingGuestName = "";
  allowPlayerButton.textContent = "Allow player";
  approvalPanel.hidden = true;
  onlineRound = 1;
  onlineMyPick = null;
  onlineOpponentPick = null;
  onlineReady = true;
  const deadline = Date.now() + 5000;
  connection.send({
    type: "init",
    round: onlineRound,
    scores: onlineScores,
    durationMs: 5000,
    hostName,
    guestName,
  });
  startOnlineTimer(deadline);
  showOnlineBoard();
}

function denyPendingPlayer() {
  if (!connection || !pendingGuestName || onlineRole !== "host") return;
  connection.send({ type: "denied", reason: "The host did not allow you to join." });
  approvalPanel.hidden = true;
  pendingGuestName = "";
  allowPlayerButton.textContent = "Allow player";
  connection.close();
  setOnlineStatus("Player denied. Your room is still open for another request.");
}

function continueOnlineGame() {
  roundResult.hidden = true;
  choiceBoard.hidden = true;
  onlineMyPick = null;
  onlineOpponentPick = null;

  if (onlineRole === "host") {
    hostReady = true;
    maybeStartOnlineRound();
  } else if (onlineRole === "guest") {
    guestReady = true;
    connection.send({ type: "ready", round: onlineRound + 1 });
    setOnlineStatus("Waiting for the host to continue.");
  }
}

function chooseOnlineMove(choice) {
  if (!onlineReady || onlineMyPick !== null) return;
  if (Date.now() >= onlineDeadline) {
    if (onlineRole === "host") finishOnlineRound(true);
    return;
  }
  onlineMyPick = choice;
  choiceBoard.hidden = true;

  if (onlineRole === "guest") {
    connection.send({ type: "move", round: onlineRound, choice });
    setOnlineStatus("Move sent. Waiting for your friend...");
  } else {
    if (onlineOpponentPick !== null) finishOnlineRound();
    else setOnlineStatus("Move locked in. Waiting for your friend...");
  }
}

function setMode(nextMode) {
  if (!["computer", "local", "online"].includes(nextMode)) return;
  if (mode === nextMode) return;
  if (computerRoundTimer !== null) {
    window.clearTimeout(computerRoundTimer);
    computerRoundTimer = null;
    playAgainButton.disabled = false;
  }
  if (mode === "online" && nextMode !== "online") closeOnlineConnection();
  mode = nextMode;
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  playerChoice.classList.remove("is-winner");
  houseChoice.classList.remove("is-winner");
  onlinePanel.hidden = mode !== "online";
  roundResult.hidden = true;
  choiceBoard.hidden = mode === "online";
  playAgainButton.disabled = false;
  localPlayer = 1;
  localFirstPick = null;
  playAgainButton.textContent = "Play again";
  if (mode === "online") {
    setOnlineStatus("Online games need an internet connection and a site hosted over HTTPS.");
  }
  updateScore();
}

scoreOutput.value = String(score);
scoreOutput.textContent = String(score);
gameAnnouncement.textContent = scorePersistenceWarning;

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

choiceBoard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button) return;
  if (mode === "computer") playComputerRound(button.dataset.choice);
  if (mode === "local") playLocalRound(button.dataset.choice);
  if (mode === "online") chooseOnlineMove(button.dataset.choice);
});

playAgainButton.addEventListener("click", () => {
  if (mode === "local" && localPlayer === 1 && localFirstPick !== null) {
    localPlayer = 2;
    playAgainButton.textContent = "Play again";
    roundResult.hidden = true;
    choiceBoard.hidden = false;
    gameAnnouncement.textContent = "Player 2, choose your move.";
    choiceBoard.querySelector(".choice").focus();
    return;
  }
  if (mode === "online") {
    continueOnlineGame();
    return;
  }
  if (mode === "local") {
    localPlayer = 1;
    localFirstPick = null;
  }
  resetResult();
});

createRoomButton.addEventListener("click", createOnlineRoom);
joinRoomButton.addEventListener("click", () => joinOnlineRoom(roomCodeInput.value));
allowPlayerButton.addEventListener("click", allowPendingPlayer);
denyPlayerButton.addEventListener("click", denyPendingPlayer);
roomCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinOnlineRoom(roomCodeInput.value);
});
copyInviteButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(inviteLinkInput.value);
    setOnlineStatus("Invite link copied. Send it to your friend.");
  } catch (error) {
    inviteLinkInput.focus();
    inviteLinkInput.select();
    setOnlineStatus("Copying was blocked by your browser. Select the invite link and copy it.");
  }
});

openRulesButton.addEventListener("click", () => {
  rulesDialog.showModal();
  closeRulesButton.focus();
});

closeRulesButton.addEventListener("click", () => {
  rulesDialog.close();
  openRulesButton.focus();
});

rulesDialog.addEventListener("click", (event) => {
  if (event.target === rulesDialog) {
    rulesDialog.close();
    openRulesButton.focus();
  }
});

const invitedRoom = new URLSearchParams(window.location.search).get("room");
if (invitedRoom) {
  setMode("online");
  roomCodeInput.value = invitedRoom;
  setOnlineStatus("Enter your name, then request to join the invited room.");
}
