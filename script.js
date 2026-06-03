const maxGames = 20;
const numPlayers = 6;
let db = JSON.parse(localStorage.getItem('mahjongDB')) || {};
let manualRows = new Array(maxGames + 1).fill(false); // 手入力モードの記憶

window.onload = () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('game-date').value = today;
    
    const scoreBody = document.getElementById('score-body');
    const pointBody = document.getElementById('point-body');
    
    for (let i = 1; i <= maxGames; i++) {
        // 点数入力の行
        let scoreRow = `<tr><td>${i}</td>`;
        let pointRow = `<tr><td>${i}</td>`;
        for (let j = 1; j <= numPlayers; j++) {
            scoreRow += `<td><input type="number" class="s-${i}-${j}" oninput="updateSum(${i})"></td>`;
            // ポイント表は input に変更（通常はreadonlyで操作不可）
            pointRow += `<td><input type="number" id="p-${i}-${j}" class="pt-input" step="0.1" readonly></td>`;
        }
        scoreRow += `<td id="sum-${i}" class="sum-cell">0</td>`;
        scoreRow += `<td><select id="tobi-${i}" class="tobi-select"><option value="0">自動</option></select></td>`;
        scoreRow += `<td><button class="manual-btn" id="manual-btn-${i}" onclick="toggleManual(${i})">手入力</button></td></tr>`;
        
        pointRow += `</tr>`;
        scoreBody.innerHTML += scoreRow;
        pointBody.innerHTML += pointRow;
    }
    
    document.getElementById('game-date').addEventListener('change', loadDateData);
    setupNameSync();
    updateTobiOptions();
    loadDateData();
};

function setupNameSync() {
    for (let i = 1; i <= numPlayers; i++) {
        document.getElementById(`p${i}-name`).addEventListener('input', (e) => {
            document.querySelectorAll(`.p${i}-label`).forEach(el => el.innerText = e.target.value);
            updateTobiOptions();
        });
    }
}

function updateTobiOptions() {
    for (let i = 1; i <= maxGames; i++) {
        let select = document.getElementById(`tobi-${i}`);
        let currentVal = select.value;
        select.innerHTML = `<option value="0">自動</option>`;
        for (let j = 1; j <= numPlayers; j++) {
            let name = document.getElementById(`p${j}-name`).value;
            if (name) {
                select.innerHTML += `<option value="${j}">${name}</option>`;
            }
        }
        select.value = currentVal;
    }
}

function updateSum(rowIdx) {
    let sum = 0;
    for (let j = 1; j <= numPlayers; j++) {
        let val = document.querySelector(`.s-${rowIdx}-${j}`).value;
        if (val !== "") sum += parseInt(val);
    }
    let sumCell = document.getElementById(`sum-${rowIdx}`);
    sumCell.innerText = sum;
    
    const startPoint = parseInt(document.getElementById('start-point').value);
    if (sum === startPoint * 4) {
        sumCell.className = "sum-cell sum-ok";
    } else if (sum !== 0) {
        sumCell.className = "sum-cell sum-err";
    } else {
        sumCell.className = "sum-cell";
    }
}

// 手入力モードの切り替え
function toggleManual(rowIdx) {
    manualRows[rowIdx] = !manualRows[rowIdx];
    const btn = document.getElementById(`manual-btn-${rowIdx}`);
    
    if (manualRows[rowIdx]) {
        btn.classList.add('active');
        btn.innerText = '手入力中';
        // ポイント枠を編集可能にする
        for (let j = 1; j <= numPlayers; j++) {
            let pInput = document.getElementById(`p-${rowIdx}-${j}`);
            pInput.removeAttribute('readonly');
            pInput.classList.add('manual-mode');
        }
    } else {
        btn.classList.remove('active');
        btn.innerText = '手入力';
        // 編集不可に戻す
        for (let j = 1; j <= numPlayers; j++) {
            let pInput = document.getElementById(`p-${rowIdx}-${j}`);
            pInput.setAttribute('readonly', true);
            pInput.classList.remove('manual-mode');
        }
        calculateAll(); // 元の自動計算に戻す
    }
}

function calculateAll() {
    const start = parseInt(document.getElementById('start-point').value);
    const ret = parseInt(document.getElementById('return-point').value);
    const uma = document.getElementById('uma').value.split(',').map(Number);
    const rate = parseInt(document.getElementById('rate').value);
    const chipRate = parseInt(document.getElementById('chip-rate').value);
    const oka = (ret - start) * 4 / 1000;

    let totals = Array(numPlayers).fill(0);

    for (let i = 1; i <= maxGames; i++) {
        if (manualRows[i]) {
            // 【手入力モード】: ポイント表に入力された数値をそのまま読み取って合計に足す
            for (let j = 1; j <= numPlayers; j++) {
                let pVal = document.getElementById(`p-${i}-${j}`).value;
                if (pVal !== "") {
                    totals[j - 1] += parseFloat(pVal);
                }
            }
        } else {
            // 【自動計算モード】: 今まで通り点数から計算する
            let activePlayers = [];
            for (let j = 1; j <= numPlayers; j++) {
                let val = document.querySelector(`.s-${i}-${j}`).value;
                if (val !== "") {
                    activePlayers.push({ index: j, score: parseInt(val) });
                }
                document.getElementById(`p-${i}-${j}`).value = ""; // 一旦リセット
            }

            if (activePlayers.length === 4) {
                activePlayers.sort((a, b) => b.score - a.score);
                
                let tobiCount = 0;
                activePlayers.forEach((p, rankIdx) => {
                    let pt = (p.score - ret) / 1000 + uma[rankIdx];
                    if (rankIdx === 0) pt += oka; 
                    if (p.score < 0) {
                        pt -= 10;
                        tobiCount++;
                    }
                    p.pt = pt;
                });

                if (tobiCount > 0) {
                    let manualWinnerIdx = parseInt(document.getElementById(`tobi-${i}`).value);
                    let winner = activePlayers.find(p => p.index === manualWinnerIdx);
                    
                    if (manualWinnerIdx > 0 && winner) {
                        winner.pt += (10 * tobiCount);
                    } else {
                        activePlayers[0].pt += (10 * tobiCount);
                    }
                }

                activePlayers.forEach(p => {
                    document.getElementById(`p-${i}-${p.index}`).value = p.pt.toFixed(1);
                    totals[p.index - 1] += p.pt;
                });
            }
        }
    }

    let moneys = [];
    for (let j = 1; j <= numPlayers; j++) {
        let chip = parseInt(document.getElementById(`chip${j}`).value) || 0;
        let finalPt = totals[j - 1];
        document.getElementById(`total-pt${j}`).innerText = finalPt.toFixed(1);
        
        let money = (finalPt * rate * 10) + (chip * chipRate);
        moneys.push(money);
        document.getElementById(`money${j}`).innerText = `¥${Math.round(money).toLocaleString()}`;
    }
    
    return { totals, moneys };
}

function saveCurrentData() {
    let calcResult = calculateAll();
    const date = document.getElementById('game-date').value;
    if (!date) return;

    let dayData = { 
        names: [], scores: [], chips: [], tobiWinners: [], 
        totals: calcResult.totals, moneys: calcResult.moneys,
        manualRows: [...manualRows], points: []
    };

    for (let j = 1; j <= numPlayers; j++) {
        dayData.names.push(document.getElementById(`p${j}-name`).value);
        dayData.chips.push(document.getElementById(`chip${j}`).value);
    }

    for (let i = 1; i <= maxGames; i++) {
        let rowScore = [];
        let rowPoint = [];
        for (let j = 1; j <= numPlayers; j++) {
            rowScore.push(document.querySelector(`.s-${i}-${j}`).value);
            rowPoint.push(document.getElementById(`p-${i}-${j}`).value); // 手入力ポイントも保存
        }
        dayData.scores.push(rowScore);
        dayData.points.push(rowPoint);
        dayData.tobiWinners.push(document.getElementById(`tobi-${i}`).value);
    }

    db[date] = dayData;
    localStorage.setItem('mahjongDB', JSON.stringify(db));
    alert(`${date} のデータを保存し、通算成績を更新しました！`);
    updateCumulativeStats();
}

function loadDateData() {
    const date = document.getElementById('game-date').value;
    const data = db[date];

    // 一旦全クリア
    for (let i = 1; i <= maxGames; i++) {
        for (let j = 1; j <= numPlayers; j++) {
            document.querySelector(`.s-${i}-${j}`).value = "";
            document.getElementById(`p-${i}-${j}`).value = "";
        }
        document.getElementById(`tobi-${i}`).value = "0";
        
        // 手入力状態のリセット
        manualRows[i] = false;
        let btn = document.getElementById(`manual-btn-${i}`);
        btn.classList.remove('active');
        btn.innerText = '手入力';
        for (let j = 1; j <= numPlayers; j++) {
            let pInput = document.getElementById(`p-${i}-${j}`);
            pInput.setAttribute('readonly', true);
            pInput.classList.remove('manual-mode');
        }
        updateSum(i);
    }
    for (let j = 1; j <= numPlayers; j++) document.getElementById(`chip${j}`).value = "0";

    if (data) {
        for (let j = 1; j <= numPlayers; j++) {
            document.getElementById(`p${j}-name`).value = data.names[j-1];
            document.getElementById(`p${j}-name`).dispatchEvent(new Event('input')); 
            document.getElementById(`chip${j}`).value = data.chips[j-1];
        }
        
        manualRows = data.manualRows || new Array(maxGames + 1).fill(false);
        
        for (let i = 1; i <= maxGames; i++) {
            for (let j = 1; j <= numPlayers; j++) {
                document.querySelector(`.s-${i}-${j}`).value = data.scores[i-1][j-1];
            }
            if(data.tobiWinners) document.getElementById(`tobi-${i}`).value = data.tobiWinners[i-1];
            
            // 手入力モードの復元
            if (manualRows[i]) {
                let btn = document.getElementById(`manual-btn-${i}`);
                btn.classList.add('active');
                btn.innerText = '手入力中';
                for (let j = 1; j <= numPlayers; j++) {
                    let pInput = document.getElementById(`p-${i}-${j}`);
                    pInput.removeAttribute('readonly');
                    pInput.classList.add('manual-mode');
                    if (data.points && data.points[i-1]) {
                        pInput.value = data.points[i-1][j-1];
                    }
                }
            }
            updateSum(i);
        }
    }
    calculateAll();
    updateCumulativeStats();
}

function updateCumulativeStats() {
    let allStats = {};

    for (const date in db) {
        let d = db[date];
        if (!d.totals) continue; 
        
        for (let j = 0; j < numPlayers; j++) {
            let name = d.names[j];
            if (!name || name.trim() === "") continue;
            if (!allStats[name]) allStats[name] = { games: 0, pt: 0, money: 0 };
            
            let games = 0;
            d.scores.forEach(row => {
                if (row[j] !== "") games++;
            });
            
            allStats[name].games += games;
            allStats[name].pt += (d.totals[j] || 0);
            allStats[name].money += (d.moneys[j] || 0);
        }
    }

    const tbody = document.getElementById('cumulative-body');
    tbody.innerHTML = "";
    let hasData = false;
    for (const name in allStats) {
        let st = allStats[name];
        if (st.games > 0) {
            hasData = true;
            tbody.innerHTML += `<tr>
                <td><strong>${name}</strong></td>
                <td>${st.games} 半荘</td>
                <td>${st.pt.toFixed(1)}</td>
                <td style="color:#059669; font-weight:bold;">¥${Math.round(st.money).toLocaleString()}</td>
            </tr>`;
        }
    }
    if (!hasData) {
        tbody.innerHTML = `<tr><td colspan="4">※「この日のデータを保存」ボタンを押すと通算成績が表示されます</td></tr>`;
    }
}
