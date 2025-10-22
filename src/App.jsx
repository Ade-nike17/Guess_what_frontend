import { useState, useEffect } from "react";
import io from "socket.io-client";

console.log("🔍 VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log("🔍 VITE_SOCKET_URL:", import.meta.env.VITE_SOCKET_URL);

const socket = io(import.meta.env.VITE_SOCKET_URL);

export default function App() {
  const [username, setUsername] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [question, setQuestion] = useState("");
  const [guess, setGuess] = useState("");
  const [chat, setChat] = useState([]);
  const [timer, setTimer] = useState(0);
  const [attempts, setAttempts] = useState(3);
  const [isMaster, setIsMaster] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // 🔹 SOCKET EVENTS
  useEffect(() => {
    socket.on("player-list", setPlayers);

    socket.on("game-started", ({ question }) => {
      setQuestion(question);
      setChat((prev) => [...prev, "🎮 Game started! Guess now!"]);
    });

    socket.on("timer", (t) => setTimer(t));

    socket.on("message", (msg) => setChat((c) => [...c, `🗨️ ${msg}`]));

    socket.on("game-ended", (data) => {
      setChat((c) => [...c, `🏁 ${data.message} (Answer: ${data.answer})`]);
      setQuestion("");
      setTimer(0);
      setAttempts(3);
    });

    socket.on("error", (err) => alert(err));

    return () => socket.off();
  }, []);

  // 🔹 CREATE A NEW SESSION
  const createSession = async () => {
    if (!username) return alert("Enter your username first!");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();

      console.log("Session response:", data);

      if (data.sessionCode) {
        setCreatedCode(data.sessionCode);
        setSessionCode(data.sessionCode);
        setIsMaster(true);
        setJoined(true);
        alert(`Game created! Your code is ${data.sessionCode}`);
      }
    } catch (err) {
      alert("Error creating session");
      console.error(err);
    }
  };

  // 🔹 JOIN EXISTING SESSION
  const join = () => {
    if (!username || !sessionCode) return alert("Enter both fields!");
    socket.emit("join-session", { username, sessionCode });
    setJoined(true);
  };

  // 🔹 OPEN MODAL TO ENTER QUESTION & ANSWER
  const openModal = () => setShowModal(true);

  // 🔹 CONFIRM START GAME
  const confirmStart = () => {
    if (!newQuestion || !newAnswer) return alert("Please fill both fields!");
    socket.emit("start-game", {
      sessionCode,
      question: newQuestion,
      answer: newAnswer,
    });
    setShowModal(false);
    setNewQuestion("");
    setNewAnswer("");
  };

  // 🔹 PLAYER MAKES A GUESS
  const sendGuess = () => {
    if (attempts <= 0) return alert("No attempts left!");
    socket.emit("guess", { guess });
    setAttempts((prev) => prev - 1);
    setGuess("");
  };

  return (
    <div className="p-6 max-w-lg mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">🎯 Guessing Game</h1>

      {/* IF NOT JOINED YET */}
      {!joined ? (
        <div className="space-y-3">
          <input
            placeholder="Enter your username"
            className="border p-2 w-full rounded"
            onChange={(e) => setUsername(e.target.value)}
          />

          <div className="flex justify-between gap-3">
            <button
              onClick={createSession}
              className="bg-blue-600 text-white px-4 py-2 rounded w-1/2"
            >
              Create Game
            </button>
            <button
              onClick={join}
              className="bg-green-600 text-white px-4 py-2 rounded w-1/2"
            >
              Join Game
            </button>
          </div>

          <input
            placeholder="Enter session code to join"
            className="border p-2 w-full rounded"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
          />

          {/* Show generated code after creating game */}
          {createdCode && (
            <p className="mt-2 text-sm text-gray-700">
              🔑 <strong>Your Game Code: {createdCode}</strong>
              <br />
              Share this code with friends so they can join!
            </p>
          )}
        </div>
      ) : (
        // IF JOINED
        <div>
          {/* Always show session code */}
          {sessionCode && (
            <p className="text-sm mb-3 text-blue-700">
              🏷️ Session Code: <strong>{sessionCode}</strong>
            </p>
          )}

          <h3 className="font-semibold mb-2">
            Players: {players.map((p) => p.username).join(", ") || "Waiting..."}
          </h3>

          {isMaster && !question && (
            <button
              onClick={openModal}
              className="bg-purple-600 text-white px-4 py-2 mt-3 rounded"
            >
              Start Game
            </button>
          )}

          {question && (
            <div className="my-4">
              <h4 className="text-lg font-medium">Question: {question}</h4>
              <p>⏰ Time left: {timer}s</p>
              <p>💭 Attempts left: {attempts}</p>

              <div className="mt-2">
                <input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="border p-2 w-2/3 rounded"
                />
                <button
                  onClick={sendGuess}
                  className="bg-green-600 text-white px-3 py-2 ml-2 rounded"
                >
                  Guess
                </button>
              </div>
            </div>
          )}

          <div className="my-3 text-left border-t pt-3">
            {chat.map((c, i) => (
              <p key={i}>{c}</p>
            ))}
          </div>
        </div>
      )}

      {/* 🔹 Modal for Game Master */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Set Question</h3>
            <input
              placeholder="Enter question"
              className="border p-2 w-full mb-2 rounded"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <input
              placeholder="Enter answer"
              className="border p-2 w-full mb-4 rounded"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-400 text-white px-3 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmStart}
                className="bg-green-600 text-white px-3 py-2 rounded"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}