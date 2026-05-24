[game.html](https://github.com/user-attachments/files/28196345/game.html)
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="경우의수 RPG — 선택과 확률이 결과를 결정하는 텍스트 RPG"
    />
    <title>경우의수 RPG</title>
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body>
    <div class="pixel-bg" aria-hidden="true">
      <div class="pixel-bg__sky"></div>
      <div class="pixel-bg__image"></div>
      <div class="pixel-bg__shade"></div>
    </div>
    <button
      type="button"
      id="btn-bgm"
      class="bgm-toggle"
      aria-pressed="false"
      aria-label="배경음악 켜기"
      title="배경음악 (한국도자재단 BGM)"
    >
      ♪
    </button>
    <audio id="bgm-audio" preload="metadata" loop>
      <source src="audio/bgm-adventure.mp3" type="audio/mpeg" />
    </audio>
    <div id="app">
      <header class="site-header">
        <h1>경우의수 RPG</h1>
        <p class="tagline">선택 × 확률 = 당신의 운명</p>
      </header>

      <aside class="stats-bar" id="stats-bar" aria-label="플레이어 상태">
        <div class="stat stat-hp-wrap">
          <span class="stat-label">체력</span>
          <span id="stat-hp">100/100</span>
          <div class="hp-bar"><span id="stat-hp-bar"></span></div>
        </div>
        <div class="stat">
          <span class="stat-label">금</span>
          <span id="stat-gold">30</span>
        </div>
        <div class="stat">
          <span class="stat-label">사기</span>
          <span id="stat-morale">50</span>
        </div>
        <div class="stat">
          <span class="stat-label">층</span>
          <span id="stat-chapter">1/1</span>
        </div>
      </aside>

      <p class="player-info" id="player-info">
        <strong id="player-name-display">—</strong>
        · <span id="player-role-display">—</span>
      </p>
      <p class="job-path-bar" id="job-path-bar">
        <span class="job-path-label">진화</span>
        <span id="job-path-list">—</span>
      </p>
      <p class="companions-bar" id="companions-bar" aria-label="동료">
        <span class="companions-label">동료</span>
        <span id="companions-list">없음</span>
        <span class="hidden-hint" id="hidden-hint" hidden>✦ 히든 조건 일부 충족</span>
      </p>
      <p class="inventory-quick" id="inventory-quick" aria-label="가방 요약">
        <span class="companions-label">가방</span>
        <span id="inventory-quick-list">비어 있음</span>
      </p>

      <section id="screen-title" class="screen active">
        <div class="card">
          <h2>모험을 시작하세요</h2>
          <p class="intro">
            플레이 실력이 아니라 <strong>선택과 확률</strong>이 결과를 만듭니다.
            쉼터에서 동료를 맞이하고, 황혼의 탑 7층을 올라 정상에 도달하세요.
            <strong>직업 진화</strong>: 제단에서 전직(확률) · 성직→하급 신, 사냥꾼→신살자 등.<br />
            <strong>아이템</strong>: 선택마다 확률 드롭 · 쉼터/가방에서 제작.<br />
            <strong>히든</strong>: 신의 파편 + 동료 2명 → 정상 「신이 되기」.
          </p>
          <div class="field">
            <label for="player-name">모험가 이름</label>
            <input
              type="text"
              id="player-name"
              placeholder="이름을 입력하세요"
              maxlength="20"
              autocomplete="nickname"
            />
          </div>
          <button type="button" class="btn btn-primary" id="btn-to-role">
            시작 직업 선택하기
          </button>
        </div>
      </section>

      <section id="screen-role" class="screen">
        <div class="card">
          <h2>시작 직업을 고르세요</h2>
          <p class="intro">
            RPG 직업 트리의 출발점입니다. 여정 중 <strong>전직의 제단</strong>에서
            확률에 따라 상위 직업으로 진화합니다. 끝은 화경·신살·하급 신·신살자.
          </p>
          <div class="role-grid" id="role-grid"></div>
          <button type="button" class="btn btn-primary" id="btn-start-game" disabled>
            여정 시작
          </button>
        </div>
      </section>

      <section id="screen-game" class="screen">
        <div class="event-scene">
          <header class="pixel-box event-title-box">
            <h2 id="event-title"></h2>
          </header>
          <div class="pixel-box event-story-box">
            <p id="event-narrative"></p>
          </div>
          <p id="event-hint" class="event-hint-line"></p>
          <div class="event-layout">
            <aside id="utility-sidebar" class="utility-sidebar" aria-label="부가 행동"></aside>
            <div class="event-choices-wrap">
              <div
                id="choice-travel-msg"
                class="choice-travel-msg pixel-box"
                hidden
                aria-live="polite"
              ></div>
              <div id="choices-list" class="choices-stack" role="list"></div>
            </div>
            <aside
              id="prob-panel"
              class="prob-panel pixel-box"
              aria-label="선택지 확률표"
            >
              <h3 id="prob-panel-title" class="prob-panel-title">확률표</h3>
              <p id="prob-panel-tag" class="prob-panel-tag"></p>
              <ul id="prob-panel-list" class="prob-outcomes-list"></ul>
              <p id="prob-panel-ev" class="prob-panel-ev" hidden></p>
            </aside>
          </div>
          <footer class="pixel-box event-cases-bar">
            <span id="event-cases"></span>
          </footer>
        </div>
      </section>

      <section id="screen-camp" class="screen">
        <div class="card camp-card">
          <h2 id="camp-title">쉼터</h2>
          <p class="intro" id="camp-desc">재료를 모아 제작하고, 소모품을 사용할 수 있습니다.</p>
          <div class="camp-tabs">
            <button type="button" class="camp-tab active" data-tab="rest">휴식</button>
            <button type="button" class="camp-tab" data-tab="bag">가방</button>
            <button type="button" class="camp-tab" data-tab="craft">제작</button>
          </div>
          <div id="camp-panel-rest" class="camp-panel active">
            <p>체력·사기를 회복합니다. <strong>챕터당 1회</strong>.</p>
            <button type="button" class="btn btn-primary" id="btn-rest">휴식하기 (HP+30, 사기+12)</button>
            <p id="rest-status" class="rest-status"></p>
          </div>
          <div id="camp-panel-bag" class="camp-panel">
            <ul id="inventory-list" class="inventory-list"></ul>
            <p id="equipped-display" class="equipped-display"></p>
          </div>
          <div id="camp-panel-craft" class="camp-panel">
            <ul id="craft-list" class="craft-list"></ul>
          </div>
          <button type="button" class="btn btn-ghost" id="btn-camp-back">돌아가기</button>
        </div>
      </section>

      <section id="screen-result" class="screen">
        <div class="card result-card">
          <span id="result-icon" class="result-icon">·</span>
          <p id="result-text"></p>
          <p id="result-delta"></p>
          <button type="button" class="btn btn-primary" id="btn-result-continue">
            계속하기
          </button>
        </div>
      </section>

      <section id="screen-end" class="screen">
        <div class="card">
          <h2 id="end-title"></h2>
          <p id="end-rank"></p>
          <p id="end-msg"></p>
          <aside id="hidden-ending-guide" class="hidden-ending-guide" hidden>
            <h3>히든 엔딩 — 다시 도전해 보세요</h3>
            <p id="hidden-ending-intro"></p>
            <ul id="hidden-ending-checklist" class="hidden-ending-checklist"></ul>
            <p id="hidden-ending-tip" class="hidden-ending-tip"></p>
          </aside>
          <h3>여정 기록</h3>
          <ul id="journey-log"></ul>
          <button type="button" class="btn btn-ghost" id="btn-restart">
            처음부터 다시하기
          </button>
        </div>
      </section>
    </div>

    <script src="js/jobs-data.js"></script>
    <script src="js/items-data.js"></script>
    <script src="js/game.js"></script>
  </body>
</html>
