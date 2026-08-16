// ══════════════════════════════════════════════════════════════
// SMART DUSTBIN SIMULATOR — app.js
// ══════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────
const state = {
    handDist:    50,
    fillPercent: 0,
    lidOpen:     false,
    lidTimer:    null,
    alertOn:     false,
    buzzerTimer: null,
    opens:       0,
    alerts:      0,
    startTime:   Date.now(),
    running:     true,
};

// ── DOM References ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
    handDist:      $('hand-dist'),
    handStatus:    $('hand-status'),
    levelDist:     $('level-dist'),
    levelStatus:   $('level-status'),
    lidStatusVal:  $('lid-status-val'),
    servoAngle:    $('servo-angle'),
    alertVal:      $('alert-val'),
    buzzerStatus:  $('buzzer-status'),
    handSlider:    $('hand-slider'),
    levelSlider:   $('level-slider'),
    handSliderVal: $('hand-slider-val'),
    levelSliderVal:$('level-slider-val'),
    btnWave:       $('btn-wave'),
    btnFill:       $('btn-fill'),
    btnReset:      $('btn-reset'),
    binLid:        $('bin-lid'),
    binFill:       $('bin-fill'),
    fillPct:       $('fill-pct'),
    gaugeFill:     $('gauge-fill'),
    gaugeText:     $('gauge-text'),
    statusBanner:  $('status-banner'),
    bannerIcon:    $('banner-icon'),
    bannerText:    $('banner-text'),
    ledGreen:      $('led-green'),
    ledRed:        $('led-red'),
    buzzerViz:     $('buzzer-viz'),
    handBeam:      $('hand-beam'),
    levelBeam:     $('level-beam'),
    serial:        $('serial-monitor'),
    statOpens:     $('stat-opens'),
    statAlerts:    $('stat-alerts'),
    statUptime:    $('stat-uptime'),
    statEfficiency:$('stat-efficiency'),
    clock:         $('clock'),
    cardHand:      $('card-hand'),
    cardLevel:     $('card-level'),
    cardLid:       $('card-lid'),
    cardAlert:     $('card-alert'),
};


// ══════════════════════════════════════════════════════════════
// SERIAL MONITOR
// ══════════════════════════════════════════════════════════════
function serial(msg, type = 'info') {
    const line = document.createElement('div');
    line.className = `serial-line ${type}`;
    const now = new Date().toLocaleTimeString();
    line.textContent = `[${now}] ${msg}`;
    dom.serial.appendChild(line);
    dom.serial.scrollTop = dom.serial.scrollHeight;

    // Keep max 50 lines
    while (dom.serial.children.length > 50) {
        dom.serial.removeChild(dom.serial.firstChild);
    }
}


// ══════════════════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════════════════
function updateClock() {
    const now = new Date();
    dom.clock.textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();


// ══════════════════════════════════════════════════════════════
// OPEN LID
// ══════════════════════════════════════════════════════════════
function openLid() {
    if (state.lidOpen) return;
    if (state.fillPercent >= 100) {
        serial('WARN: Bin full — lid locked!', 'warn');
        return;
    }

    state.lidOpen = true;
    state.opens++;

    dom.binLid.classList.add('open');
    dom.lidStatusVal.textContent = 'OPEN';
    dom.lidStatusVal.style.color = '#00ff88';
    dom.servoAngle.textContent   = '90°';
    dom.handBeam.classList.add('active');

    dom.statOpens.textContent = state.opens;

    serial(`Lid OPENED — Servo → 90° (Open #${state.opens})`, 'ok');

    // Auto close after 3 seconds
    clearTimeout(state.lidTimer);
    state.lidTimer = setTimeout(() => {
        closeLid();
    }, 3000);
}


// ══════════════════════════════════════════════════════════════
// CLOSE LID
// ══════════════════════════════════════════════════════════════
function closeLid() {
    if (!state.lidOpen) return;

    state.lidOpen = false;

    dom.binLid.classList.remove('open');
    dom.lidStatusVal.textContent = 'CLOSED';
    dom.lidStatusVal.style.color = '#4a7a9b';
    dom.servoAngle.textContent   = '0°';
    dom.handBeam.classList.remove('active');

    serial('Lid CLOSED — Servo → 0°', 'info');
}


// ══════════════════════════════════════════════════════════════
// UPDATE BIN FILL
// ══════════════════════════════════════════════════════════════
function updateFill(percent) {
    state.fillPercent = Math.min(100, Math.max(0, percent));
    const p = state.fillPercent;

    // Update fill visual
    dom.binFill.style.height = p + '%';
    dom.fillPct.textContent  = p + '%';

    // Fill color class
    dom.binFill.classList.remove('medium', 'full');
    if      (p >= 90) dom.binFill.classList.add('full');
    else if (p >= 60) dom.binFill.classList.add('medium');

    // Gauge
    dom.gaugeFill.style.width = p + '%';
    dom.gaugeText.textContent = p + '%';

    // Level beam
    dom.levelBeam.classList.toggle('active', p > 0);

    // Level distance (inverse — more waste = less distance)
    const levelCm = Math.round(30 * (1 - p / 100));
    dom.levelDist.textContent = levelCm + ' cm';

    // Level status
    if (p >= 90) {
        dom.levelStatus.textContent = 'FULL!';
        dom.levelStatus.style.color = '#ff4444';
    } else if (p >= 60) {
        dom.levelStatus.textContent = 'MEDIUM';
        dom.levelStatus.style.color = '#ffd700';
    } else {
        dom.levelStatus.textContent = 'LOW';
        dom.levelStatus.style.color = '#00ff88';
    }

    // LEDs
    updateLEDs(p);

    // Buzzer
    updateBuzzer(p);

    // Banner
    updateBanner(p);

    // Efficiency
    const eff = Math.max(0, 100 - Math.floor(p / 10));
    dom.statEfficiency.textContent = eff + '%';
}


// ══════════════════════════════════════════════════════════════
// UPDATE LEDs
// ══════════════════════════════════════════════════════════════
function updateLEDs(percent) {
    if (percent >= 90) {
        dom.ledGreen.classList.remove('on');
        dom.ledRed.classList.add('on');
    } else if (percent >= 60) {
        dom.ledGreen.classList.remove('on');
        dom.ledRed.classList.add('on');
    } else {
        dom.ledGreen.classList.add('on');
        dom.ledRed.classList.remove('on');
    }
}


// ══════════════════════════════════════════════════════════════
// UPDATE BUZZER
// ══════════════════════════════════════════════════════════════
function updateBuzzer(percent) {
    if (percent >= 90) {
        if (!state.alertOn) {
            state.alertOn = true;
            state.alerts++;
            dom.statAlerts.textContent = state.alerts;
            serial('ALERT: Bin is FULL! Please empty now!', 'err');
        }
        dom.buzzerViz.classList.add('active');
        dom.buzzerStatus.textContent  = 'BEEPING!';
        dom.buzzerStatus.style.color  = '#ff4444';
        dom.alertVal.textContent      = 'BIN FULL!';
        dom.alertVal.style.color      = '#ff4444';
        dom.cardAlert.style.borderColor = '#ff4444';
    } else {
        state.alertOn = false;
        dom.buzzerViz.classList.remove('active');
        dom.buzzerStatus.textContent  = 'OFF';
        dom.buzzerStatus.style.color  = '#4a7a9b';
        dom.alertVal.textContent      = 'NORMAL';
        dom.alertVal.style.color      = '#00ff88';
        dom.cardAlert.style.borderColor = '';
    }
}


// ══════════════════════════════════════════════════════════════
// UPDATE BANNER
// ══════════════════════════════════════════════════════════════
function updateBanner(percent) {
    dom.statusBanner.classList.remove('warning', 'danger');

    if (percent >= 90) {
        dom.statusBanner.classList.add('danger');
        dom.bannerIcon.textContent = '🚨';
        dom.bannerText.textContent =
            'BIN FULL — IMMEDIATE COLLECTION REQUIRED!';
    } else if (percent >= 60) {
        dom.statusBanner.classList.add('warning');
        dom.bannerIcon.textContent = '⚠️';
        dom.bannerText.textContent =
            'BIN MEDIUM — SCHEDULE COLLECTION SOON';
    } else {
        dom.bannerIcon.textContent = '✅';
        dom.bannerText.textContent =
            'BIN READY — SYSTEM OPERATIONAL';
    }
}


// ══════════════════════════════════════════════════════════════
// UPDATE HAND DISTANCE
// ══════════════════════════════════════════════════════════════
function updateHand(dist) {
    state.handDist = dist;
    dom.handDist.textContent = dist + ' cm';

    if (dist <= 15) {
        dom.handStatus.textContent = 'DETECTED!';
        dom.handStatus.style.color = '#00ff88';
        dom.cardHand.style.borderColor = '#00ff88';
        openLid();
    } else if (dist <= 25) {
        dom.handStatus.textContent = 'NEARBY';
        dom.handStatus.style.color = '#ffd700';
        dom.cardHand.style.borderColor = '';
    } else {
        dom.handStatus.textContent = 'CLEAR';
        dom.handStatus.style.color = '#4a7a9b';
        dom.cardHand.style.borderColor = '';
    }
}


// ══════════════════════════════════════════════════════════════
// UPTIME COUNTER
// ══════════════════════════════════════════════════════════════
setInterval(() => {
    const elapsed = Math.floor(
        (Date.now() - state.startTime) / 1000
    );
    if (elapsed < 60) {
        dom.statUptime.textContent = elapsed + 's';
    } else if (elapsed < 3600) {
        dom.statUptime.textContent =
            Math.floor(elapsed / 60) + 'm';
    } else {
        dom.statUptime.textContent =
            Math.floor(elapsed / 3600) + 'h';
    }
}, 1000);


// ══════════════════════════════════════════════════════════════
// SLIDER EVENTS
// ══════════════════════════════════════════════════════════════
dom.handSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    dom.handSliderVal.textContent = val + ' cm';
    updateHand(val);
    serial(
        `Hand sensor: ${val}cm detected`,
        val <= 15 ? 'ok' : 'info'
    );
});

dom.levelSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    dom.levelSliderVal.textContent = val + '%';
    updateFill(val);
    serial(
        `Bin level updated: ${val}%`,
        val >= 90 ? 'err' : val >= 60 ? 'warn' : 'info'
    );
});


// ══════════════════════════════════════════════════════════════
// BUTTON EVENTS
// ══════════════════════════════════════════════════════════════
dom.btnWave.addEventListener('click', () => {
    // Simulate hand wave
    dom.handSlider.value = 10;
    dom.handSliderVal.textContent = '10 cm';
    updateHand(10);
    serial('Hand wave simulated — 10cm', 'ok');

    // Reset after 1 second
    setTimeout(() => {
        dom.handSlider.value = 50;
        dom.handSliderVal.textContent = '50 cm';
        updateHand(50);
    }, 1000);
});

dom.btnFill.addEventListener('click', () => {
    const newFill = Math.min(100, state.fillPercent + 25);
    dom.levelSlider.value = newFill;
    dom.levelSliderVal.textContent = newFill + '%';
    updateFill(newFill);
    serial(`Waste added — Bin now ${newFill}% full`,
        newFill >= 90 ? 'err' : 'warn'
    );
});

dom.btnReset.addEventListener('click', () => {
    // Reset everything
    state.fillPercent = 0;
    state.lidOpen     = false;
    state.alertOn     = false;
    clearTimeout(state.lidTimer);

    dom.handSlider.value  = 50;
    dom.levelSlider.value = 0;
    dom.handSliderVal.textContent  = '50 cm';
    dom.levelSliderVal.textContent = '0%';

    updateHand(50);
    updateFill(0);
    closeLid();

    serial('=== SYSTEM RESET ===', 'init');
    serial('All sensors initialized', 'ok');
    serial('System ready!', 'ok');
});


// ══════════════════════════════════════════════════════════════
// AUTO SIMULATION — Random sensor noise
// ══════════════════════════════════════════════════════════════
setInterval(() => {
    // Small random variation in hand distance
    if (!state.lidOpen && state.handDist > 20) {
        const noise = (Math.random() - 0.5) * 2;
        const newDist = Math.min(50,
            Math.max(20, state.handDist + noise)
        );
        dom.handDist.textContent = newDist.toFixed(1) + ' cm';
    }
}, 500);


// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
serial('=== SMART DUSTBIN SYSTEM v1.0 ===', 'init');
serial('Arduino UNO initialized', 'ok');
serial('HC-SR04 Sensor #1 → Ready', 'ok');
serial('HC-SR04 Sensor #2 → Ready', 'ok');
serial('Servo Motor → Position 0°', 'ok');
serial('Green LED → ON', 'ok');
serial('System fully operational!', 'ok');
serial('Waiting for input...', 'info');

updateFill(0);
updateHand(50);
dom.ledGreen.classList.add('on');