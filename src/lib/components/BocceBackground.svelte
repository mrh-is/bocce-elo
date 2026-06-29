<script lang="ts"></script>

<div class="balls-bg" aria-hidden="true">
  <!-- Edge peeks: always visible at any width -->
  <div
    class="bocce-ball ball-red"
    style="width:60px;height:60px;left:-24px;top:7%;"
  ></div>
  <div
    class="bocce-ball ball-green"
    style="width:50px;height:50px;left:-18px;top:58%;"
  ></div>
  <div
    class="bocce-ball ball-blue"
    style="width:56px;height:56px;right:-20px;top:15%;"
  ></div>
  <div
    class="bocce-ball ball-yellow"
    style="width:48px;height:48px;right:-16px;top:70%;"
  ></div>
  <!-- Left margin: visible when side margins appear (~1100px+) -->
  <div
    class="bocce-ball ball-blue"
    style="width:40px;height:40px;left:5%;top:28%;"
  ></div>
  <div
    class="bocce-ball ball-yellow"
    style="width:28px;height:28px;left:9%;top:78%;"
  ></div>
  <div
    class="bocce-ball ball-white"
    style="width:24px;height:24px;left:12%;top:44%;"
  ></div>
  <div
    class="bocce-ball ball-red"
    style="width:44px;height:44px;left:3%;top:93%;"
  ></div>
  <!-- Right margin: visible when side margins appear (~1100px+) -->
  <div
    class="bocce-ball ball-green"
    style="width:44px;height:44px;left:88%;top:8%;"
  ></div>
  <div
    class="bocce-ball ball-white"
    style="width:36px;height:36px;left:91%;top:38%;"
  ></div>
  <div
    class="bocce-ball ball-red"
    style="width:30px;height:30px;left:87%;top:85%;"
  ></div>
  <div
    class="bocce-ball ball-blue"
    style="width:26px;height:26px;left:90%;top:55%;"
  ></div>
  <!-- Wider margins: visible ~1400px+ -->
  <div
    class="bocce-ball ball-green"
    style="width:36px;height:36px;left:16%;top:17%;"
  ></div>
  <div
    class="bocce-ball ball-blue"
    style="width:28px;height:28px;left:14%;top:68%;"
  ></div>
  <div
    class="bocce-ball ball-red"
    style="width:40px;height:40px;left:81%;top:30%;"
  ></div>
  <div
    class="bocce-ball ball-yellow"
    style="width:30px;height:30px;left:83%;top:76%;"
  ></div>
</div>

<style>
  .balls-bg {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: -1;
  }

  .bocce-ball {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    box-shadow:
      inset -4px -5px 10px rgba(0, 0, 0, 0.28),
      3px 4px 10px rgba(0, 0, 0, 0.15);
    flex-shrink: 0;
  }

  .ball-red {
    background: radial-gradient(
      circle at 35% 30%,
      #ff9999 0%,
      #dd3333 42%,
      #8b0000 100%
    );
    --glow: rgba(220, 50, 50, 0.7);
  }

  .ball-blue {
    background: radial-gradient(
      circle at 35% 30%,
      #99ccff 0%,
      #2255cc 42%,
      #0a2a6e 100%
    );
    --glow: rgba(50, 100, 220, 0.7);
  }

  .ball-green {
    background: radial-gradient(
      circle at 35% 30%,
      #88ddaa 0%,
      #1a7a32 42%,
      #0a3a18 100%
    );
    --glow: rgba(40, 160, 80, 0.7);
  }

  .ball-yellow {
    background: radial-gradient(
      circle at 35% 30%,
      #fff199 0%,
      #f0c000 42%,
      #8a6500 100%
    );
    --glow: rgba(240, 192, 0, 0.75);
  }

  .ball-white {
    background: radial-gradient(
      circle at 35% 30%,
      #ffffff 0%,
      #e8f4e8 42%,
      #c0d8c0 100%
    );
    --glow: rgba(200, 240, 210, 0.9);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .bocce-ball {
      box-shadow:
        inset -4px -5px 10px rgba(0, 0, 0, 0.55),
        0 0 14px var(--glow),
        0 0 32px var(--glow),
        2px 3px 8px rgba(0, 0, 0, 0.4);
      animation: ball-glow 4s ease-in-out infinite;
    }
  }

  :global([data-theme="dark"]) .bocce-ball {
    box-shadow:
      inset -4px -5px 10px rgba(0, 0, 0, 0.55),
      0 0 14px var(--glow),
      0 0 32px var(--glow),
      2px 3px 8px rgba(0, 0, 0, 0.4);
    animation: ball-glow 4s ease-in-out infinite;
  }

  @keyframes ball-glow {
    0%,
    100% {
      filter: brightness(0.88) drop-shadow(0 0 4px var(--glow));
    }

    50% {
      filter: brightness(1.18) drop-shadow(0 0 14px var(--glow));
    }
  }

  .bocce-ball:nth-child(1) {
    animation-delay: 0s;
  }
  .bocce-ball:nth-child(2) {
    animation-delay: 0.55s;
  }
  .bocce-ball:nth-child(3) {
    animation-delay: 1.1s;
  }
  .bocce-ball:nth-child(4) {
    animation-delay: 1.65s;
  }
  .bocce-ball:nth-child(5) {
    animation-delay: 2.2s;
  }
  .bocce-ball:nth-child(6) {
    animation-delay: 2.75s;
  }
  .bocce-ball:nth-child(7) {
    animation-delay: 0.3s;
  }
  .bocce-ball:nth-child(8) {
    animation-delay: 0.85s;
  }
  .bocce-ball:nth-child(9) {
    animation-delay: 1.4s;
  }
  .bocce-ball:nth-child(10) {
    animation-delay: 1.95s;
  }
  .bocce-ball:nth-child(11) {
    animation-delay: 0.2s;
  }
  .bocce-ball:nth-child(12) {
    animation-delay: 0.75s;
  }
  .bocce-ball:nth-child(13) {
    animation-delay: 1.3s;
  }
  .bocce-ball:nth-child(14) {
    animation-delay: 1.85s;
  }
  .bocce-ball:nth-child(15) {
    animation-delay: 2.4s;
  }
  .bocce-ball:nth-child(16) {
    animation-delay: 2.95s;
  }

  @media (max-width: 600px) {
    .bocce-ball {
      transform: scale(0.7);
      transform-origin: center;
    }
  }
</style>
