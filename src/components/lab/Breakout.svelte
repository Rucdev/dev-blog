<script lang="ts">
import type { Attachment } from "svelte/attachments";

const WIDTH = 480;
const HEIGHT = 320;

const PADDLE_W = 80;
const PADDLE_H = 10;
const PADDLE_Y = HEIGHT - PADDLE_H - 4;
const PADDLE_SPEED = 420; // px/s(キーボード操作時)
const BALL_R = 6;
const MAX_BOUNCE = (60 * Math.PI) / 180; // パドルの端に当てたときの角度
const LIVES = 3;

const COLS = 8;
const ROWS = 4;
const BRICK_GAP = 6;
const BRICK_MARGIN = 16;
const BRICK_TOP = 28;
const BRICK_H = 14;
const BRICK_W = (WIDTH - BRICK_MARGIN * 2 - BRICK_GAP * (COLS - 1)) / COLS;
const ROW_COLORS = [
  "--accent-hover",
  "--accent",
  "--accent-mid",
  "--accent-low",
];

type Phase = "ready" | "playing" | "over" | "clear";
type Brick = { x: number; y: number; row: number; alive: boolean };

// ゲームの状態。描画ループからしか触らないので $state にしない
// (毎フレーム書き換える値をリアクティブにする必要はない)
const ball = { x: 0, y: 0, vx: 0, vy: 0, speed: 0 };
const paddle = { x: WIDTH / 2 - PADDLE_W / 2 };
const keys = { left: false, right: false };
let bricks: Brick[] = [];
let baseSpeed = 260; // px/s。reduced-motion のときは attach で落とす

// 画面に表示したい値だけ $state にする
let phase = $state<Phase>("ready");
let score = $state(0);
let life = $state(LIVES);
let best = $state(0);

function createBricks(): Brick[] {
  const list: Brick[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      list.push({
        x: BRICK_MARGIN + col * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
        row,
        alive: true,
      });
    }
  }
  return list;
}

function resetGame() {
  bricks = createBricks();
  score = 0;
  life = LIVES;
  phase = "ready";
}

function launch() {
  // 真上だと単調なので、少しだけ左右に振る
  const angle = (Math.random() - 0.5) * (Math.PI / 3);
  ball.speed = baseSpeed;
  ball.vx = ball.speed * Math.sin(angle);
  ball.vy = -ball.speed * Math.cos(angle);
  phase = "playing";
}

function start() {
  if (phase === "over" || phase === "clear") resetGame();
  else if (phase === "ready") launch();
}

function saveBest() {
  if (score <= best) return;
  best = score;
  try {
    localStorage.setItem("breakout:best", String(best));
  } catch {
    /* ignore */
  }
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

function movePaddle(dt: number) {
  const dir = Number(keys.right) - Number(keys.left);
  paddle.x = clamp(paddle.x + dir * PADDLE_SPEED * dt, 0, WIDTH - PADDLE_W);
}

// 壁・パドル・ブロックとの当たり判定。1回で進む距離が小さい前提で呼ぶ
function stepBall(dt: number) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // 壁: 反転と同時に内側へ戻して、壁に張り付かないようにする
  if (ball.x - BALL_R < 0) {
    ball.x = BALL_R;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + BALL_R > WIDTH) {
    ball.x = WIDTH - BALL_R;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y - BALL_R < 0) {
    ball.y = BALL_R;
    ball.vy = Math.abs(ball.vy);
  }

  // パドル: 下向きのときだけ判定する。当たった位置(-1〜1)で角度を変える
  if (
    ball.vy > 0 &&
    ball.y + BALL_R >= PADDLE_Y &&
    ball.y < PADDLE_Y + PADDLE_H &&
    ball.x >= paddle.x - BALL_R &&
    ball.x <= paddle.x + PADDLE_W + BALL_R
  ) {
    const hit = clamp(
      (ball.x - (paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2),
      -1,
      1,
    );
    const angle = hit * MAX_BOUNCE;
    ball.vx = ball.speed * Math.sin(angle);
    ball.vy = -ball.speed * Math.cos(angle);
    ball.y = PADDLE_Y - BALL_R;
  }

  // ブロック: 円と矩形。1ステップで壊すのは1個まで
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const nx = clamp(ball.x, brick.x, brick.x + BRICK_W);
    const ny = clamp(ball.y, brick.y, brick.y + BRICK_H);
    const dx = ball.x - nx;
    const dy = ball.y - ny;
    if (dx * dx + dy * dy > BALL_R * BALL_R) continue;

    brick.alive = false;
    score += 10 * (ROWS - brick.row);
    // 横から当たったら vx、上下から当たったら vy を反転する
    if (Math.abs(dx) > Math.abs(dy))
      ball.vx = Math.sign(dx) * Math.abs(ball.vx);
    else ball.vy = (Math.sign(dy) || -Math.sign(ball.vy)) * Math.abs(ball.vy);
    // 少しずつ速くする
    const scale = Math.min(ball.speed * 1.015, baseSpeed * 1.6) / ball.speed;
    ball.speed *= scale;
    ball.vx *= scale;
    ball.vy *= scale;
    break;
  }
}

function update(dt: number) {
  movePaddle(dt);

  if (phase === "ready") {
    ball.x = paddle.x + PADDLE_W / 2;
    ball.y = PADDLE_Y - BALL_R;
    return;
  }
  if (phase !== "playing") return;

  // 1ステップで進む距離を 4px 以下に刻んで、薄いブロックの突き抜けを防ぐ
  const steps = Math.max(1, Math.ceil((ball.speed * dt) / 4));
  for (let i = 0; i < steps; i++) {
    stepBall(dt / steps);
    if (ball.y - BALL_R > HEIGHT) break;
  }

  if (bricks.every((b) => !b.alive)) {
    phase = "clear";
    saveBest();
  } else if (ball.y - BALL_R > HEIGHT) {
    life -= 1;
    if (life > 0) {
      phase = "ready";
    } else {
      phase = "over";
      saveBest();
    }
  }
}

type Colors = { ball: string; paddle: string; rows: string[] };

// テーマ色は切り替わったときだけ読み直す(毎フレーム getComputedStyle しない)
function readColors(el: Element): Colors {
  const style = getComputedStyle(el);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return {
    ball: get("--accent"),
    paddle: get("--ink"),
    rows: ROW_COLORS.map(get),
  };
}

function draw(ctx: CanvasRenderingContext2D, colors: Colors) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  for (const brick of bricks) {
    if (!brick.alive) continue;
    ctx.fillStyle = colors.rows[brick.row];
    ctx.fillRect(brick.x, brick.y, BRICK_W, BRICK_H);
  }

  ctx.fillStyle = colors.paddle;
  ctx.fillRect(paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H);

  if (phase !== "over") {
    ctx.fillStyle = colors.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }
}

// canvas 要素がマウントされたら呼ばれ、戻り値の関数がアンマウント時に呼ばれる
const game: Attachment<HTMLCanvasElement> = (canvas) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 高 DPI ディスプレイでぼやけないように内部解像度を上げる
  const dpr = window.devicePixelRatio || 1;
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;
  ctx.scale(dpr, dpr);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    baseSpeed = 180;
  }
  try {
    best = Number(localStorage.getItem("breakout:best")) || 0;
  } catch {
    /* ignore */
  }
  resetGame();

  let colors = readColors(canvas);
  const refreshColors = () => {
    colors = readColors(canvas);
  };
  const themeObserver = new MutationObserver(refreshColors);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkQuery.addEventListener("change", refreshColors);

  let raf = 0;
  let last = 0;
  const loop = (time: number) => {
    // 経過時間で動かす(リフレッシュレートに依存しない)。タブ復帰時の大きな dt は切り詰める
    const dt = last ? Math.min((time - last) / 1000, 1 / 30) : 0;
    last = time;
    update(dt);
    draw(ctx, colors);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const toLogicalX = (clientX: number) => {
    // CSS 上の表示サイズと論理サイズの比で座標を変換する
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * WIDTH;
  };
  const onPointerMove = (e: PointerEvent) => {
    paddle.x = clamp(toLogicalX(e.clientX) - PADDLE_W / 2, 0, WIDTH - PADDLE_W);
  };
  const onPointerDown = (e: PointerEvent) => {
    onPointerMove(e);
    start();
  };
  // canvas にフォーカスがあるときだけ拾うので、記事を読む人のスペースキーは奪わない
  const onKey = (e: KeyboardEvent) => {
    const down = e.type === "keydown";
    if (e.key === "ArrowLeft") keys.left = down;
    else if (e.key === "ArrowRight") keys.right = down;
    else if (e.key === " " || e.key === "Enter") {
      if (down && !e.repeat) start();
    } else return;
    e.preventDefault();
  };
  const onBlur = () => {
    keys.left = false;
    keys.right = false;
  };

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("keydown", onKey);
  canvas.addEventListener("keyup", onKey);
  canvas.addEventListener("blur", onBlur);

  return () => {
    cancelAnimationFrame(raf);
    themeObserver.disconnect();
    darkQuery.removeEventListener("change", refreshColors);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("keydown", onKey);
    canvas.removeEventListener("keyup", onKey);
    canvas.removeEventListener("blur", onBlur);
  };
};
</script>

<div class="breakout">
  <div class="stage">
    <canvas
      {@attach game}
      style:aspect-ratio="{WIDTH} / {HEIGHT}"
      tabindex="0"
      aria-label="ブロック崩し。クリックかスペースキーで開始、矢印キーかポインタでパドルを動かす"
    ></canvas>
    {#if phase !== "playing"}
      <div class="overlay" aria-live="polite">
        {#if phase === "ready"}
          <p>click / space で{life < LIVES ? "再開" : "開始"}</p>
        {:else if phase === "over"}
          <p class="headline">GAME OVER</p>
          <p>click / space でもう一度</p>
        {:else}
          <p class="headline">CLEAR</p>
          <p>click / space でもう一度</p>
        {/if}
      </div>
    {/if}
  </div>
  <p class="status">
    <span>score: {score}</span>
    <span>
      life:
      <span aria-hidden="true"
        >{"●".repeat(life)}{"○".repeat(LIVES - life)}</span
      >
      <span class="sr-only">{life}</span>
    </span>
    <span>best: {best}</span>
  </p>
</div>

<style>
.breakout {
  margin: 2rem 0;
  max-width: 480px;
}

.stage {
  position: relative;
}

canvas {
  display: block;
  width: 100%;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 5px;
  touch-action: none;
  cursor: pointer;
}

canvas:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-top: 25%;
  pointer-events: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--muted);
}

.overlay p {
  margin: 0;
}

.overlay .headline {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ink);
}

.status {
  display: flex;
  gap: 1.5em;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
