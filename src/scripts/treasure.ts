// CONFIG
// Default example secret is "starlight" (base64 below). Change it for your hunt:
// - Put your secret in lower case, then Base64-encode it.
//   e.g., "dragon" -> btoa("dragon") in your browser console.
// - Replace the string below with your new base64.
const SECRET_B64: string = "c2NobWV0dGVybGluZ3NmYXJt"; // "schmetterlingsfarm"

// Optional: Use SHA-256 instead of base64 if you prefer.
// 1) Compute hash with: crypto.subtle.digest("SHA-256", new TextEncoder().encode("yoursecret"))
// 2) Convert to hex and paste into SECRET_SHA256 below. Then set USE_SHA256 = true.
const USE_SHA256: boolean = false;
const SECRET_SHA256_HEX: string = ""; // e.g., "9b74c9897bac770ffc029102a200c5de..." (lowercase hex)

// UI elements
const form = document.getElementById("secret-form") as HTMLFormElement | null;
const input = document.getElementById(
  "secret-input"
) as HTMLInputElement | null;
const submitBtn = document.getElementById(
  "submit-btn"
) as HTMLButtonElement | null;
const feedback = document.getElementById("feedback") as HTMLElement | null;
const mapWrap = document.getElementById("map-wrap") as HTMLElement | null;
const panel = document.getElementById("panel") as HTMLElement | null;
const mapImg = document.getElementById("map") as HTMLImageElement | null;

if (
  !form ||
  !input ||
  !submitBtn ||
  !feedback ||
  !mapWrap ||
  !mapImg ||
  !panel
) {
  // Elements not present on this page; abort.
  // This keeps the script safe if imported elsewhere.
  throw new Error("Required DOM elements for treasure script not found");
}

// Persist success across refresh
const STORAGE_KEY = "scavenger-solved";

form.addEventListener("submit", async (e: SubmitEvent) => {
  e.preventDefault();
  const guess: string = (input!.value || "").trim().toLowerCase();
  if (!guess) {
    giveFeedback("Das war leider nix :)", false);
    bump(input!);
    input!.focus();
    return;
  }

  setLoading(true);

  try {
    const pass = USE_SHA256
      ? await compareSha256(guess, SECRET_SHA256_HEX)
      : guess === atob(SECRET_B64).toLowerCase();

    if (pass) {
      giveFeedback(
        "Correct! The map is revealed. Good luck, adventurer!",
        true
      );
      revealMap();
      localStorage.setItem(STORAGE_KEY, "yes");
      fireConfetti();
    } else {
      giveFeedback("Not quite. Try again!", false);
      bump(input!);
    }
  } catch (err) {
    console.error(err);
    giveFeedback("Something went wrong. Please try again.", false);
  } finally {
    setLoading(false);
  }
});

// Support direct links like /?secret=schmetterlingsfarm
// If present, auto-validate and then clean the URL.
(function handleSecretFromQuery() {
  try {
    const url = new URL(window.location.href);
    const qsSecret = url.searchParams.get("secret");
    if (!qsSecret) return;
    input!.value = qsSecret;
    // Trigger the same submit flow without navigating
    form!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    // Remove the query param to avoid repeated attempts on refresh
    url.searchParams.delete("secret");
    history.replaceState(null, "", url.toString());
  } catch {
    // ignore
  }
})();

function giveFeedback(msg: string, ok: boolean): void {
  feedback!.textContent = msg;
  feedback!.className = "feedback text-center text-sm " + (ok ? "ok" : "err");
}

function revealMap(initial: boolean = false): void {
  // Hide the panel (form card)
  panel!.style.opacity = "0";
  panel!.style.transform = "scale(0.98)";
  setTimeout(() => {
    panel!.style.display = "none";
  }, 250);

  // Show overlay map
  mapWrap!.classList.add("revealed");
  mapWrap!.classList.remove("opacity-0", "pointer-events-none");
  // allow CSS transition to fade in
  requestAnimationFrame(() => {
    mapWrap!.classList.remove("opacity-0");
    mapWrap!.classList.add("opacity-100");
  });
  mapWrap!.setAttribute("aria-hidden", "false");
  // allow CSS transition to apply
  if (!initial) {
    requestAnimationFrame(() => {
      mapImg!.classList.add("revealed");
    });
  } else {
    mapImg!.classList.add("revealed");
  }

  // Add click listener for confetti cannon on map clicks
  mapImg!.style.cursor = "pointer";
  mapImg!.title = "Click the map for more confetti! 🎉";
  mapImg!.addEventListener("click", () => {
    fireConfetti();
  });
}

function bump(el: HTMLElement): void {
  el.classList.remove("shake");
  // Force reflow
  void el.offsetWidth;
  el.classList.add("shake");
}

function setLoading(isLoading: boolean): void {
  submitBtn!.disabled = isLoading;
}

async function compareSha256(
  value: string,
  expectedHex: string
): Promise<boolean> {
  if (!expectedHex) return false;
  const enc = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const hex = [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === expectedHex.toLowerCase();
}

// Access confetti from window (loaded by module script)
export {};

declare global {
  interface Window {
    confetti: any;
  }
}

function fireConfetti() {
  // Check if confetti library is loaded
  if (typeof window.confetti === 'undefined') {
    console.warn('Confetti library not loaded yet, skipping confetti');
    return;
  }

  // Create multiple confetti cannons like in the CodePen
  const cannons = [
    { x: 0.1, y: 0.8, angle: 45 },      // Bottom left
    { x: 0.9, y: 0.8, angle: 135 },     // Bottom right
    { x: 0.3, y: 0.9, angle: 75 },      // Bottom left-center
    { x: 0.7, y: 0.9, angle: 105 },     // Bottom right-center
    { x: 0.5, y: 0.95, angle: 90 }      // Bottom center
  ];

  cannons.forEach((cannon, index) => {
    setTimeout(() => {
      window.confetti({
        particleCount: 50,
        angle: cannon.angle,
        spread: 55,
        origin: { x: cannon.x, y: cannon.y },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd']
      });
    }, index * 100);
  });
}

// Initialize on page load - check if already solved
(function initializePage() {
  if (localStorage.getItem(STORAGE_KEY) === "yes") {
    // Map was already revealed, show it immediately
    giveFeedback("Welcome back! The map is ready for your adventure.", true);
    revealMap(true);
  }
})();
