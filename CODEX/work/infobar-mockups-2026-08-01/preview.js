// codex:2026-08-01T13:52:00+02:00 — Gemeinsamer Zustandsvertrag für alle fünf Mockups.
const states = {
  idle: { title: "Character", state: "Idle", task: "No active skill", taskWidth: 0, xpWidth: 16 },
  training: { title: "Woodcutting", state: "Training", task: "Cutting Grimwood · 44%", taskWidth: 44, xpWidth: 67 },
  combat: { title: "Combat", state: "Fighting", task: "Hunting Ashen Warden · 72%", taskWidth: 72, xpWidth: 38 },
};

let mode = "idle";
function render(nextMode = mode) {
  mode = nextMode;
  const state = states[mode];
  document.documentElement.style.setProperty("--task", `${state.taskWidth}%`);
  document.documentElement.style.setProperty("--xp", `${state.xpWidth}%`);
  document.querySelectorAll("[data-title]").forEach((el) => { el.textContent = state.title; });
  document.querySelectorAll("[data-state]").forEach((el) => { el.textContent = state.state; });
  document.querySelectorAll("[data-task-label]").forEach((el) => { el.textContent = state.task; });
  document.querySelectorAll("[data-mode]").forEach((el) => el.classList.toggle("active", el.dataset.mode === mode));
}

document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => render(button.dataset.mode)));
document.querySelector("#tick").addEventListener("click", () => {
  const state = states[mode];
  state.taskWidth = (state.taskWidth + 11) % 101;
  state.xpWidth = (state.xpWidth + 7) % 101;
  render();
});
render();
