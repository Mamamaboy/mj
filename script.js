const maxGames = 20;
const numPlayers = 6;
let db = JSON.parse(localStorage.getItem('mahjongDB')) || {};

window.onload = () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('game-date').value = today;
    
    const scoreBody = document.getElementById('score-body');
    const pointBody = document.getElementById('point-body');
    
    for (let i = 1; i <= maxGames; i++) {
        let scoreRow = `<tr><td>${i}</td>`;
        let pointRow = `<tr><td>${i}</td>`;
        for (let j = 1; j <= numPlayers; j++) {
            scoreRow += `<td><input type="number" class="s-${i}-${j}" oninput="updateSum(${i})"></td>`;
            pointRow += `<td id="p-${i}-${j}">-</td>`;
        }
        scoreRow += `<td id="sum-${i}" class="sum-cell">0</td>`;
        // トビ賞選択プルダウン
        scoreRow += `<td><select id="tobi-${i}"><option value="0">自動(トップ)</option></select></td></tr>`;
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

// トビ賞の選択肢に最新の名前を反映する
function updateTobiOptions() {
    for (let i = 1; i <= maxGames; i++) {
        let select = document.getElementById(`tobi-${i}`);
        let currentVal = select.value;
        select.innerHTML = `<option value="0">自動(トップ)</option>`;
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

function calculateAll() {
    const start = parseInt(document.getElementById('start-point').value);
    const ret = parseInt(document.getElementById('return-point').value);
    const uma = document.getElementById('uma').value.split(',').map(Number);
    const rate = parseInt(document.getElementById('rate').value);
    const chipRate = parseInt(document.getElementById('chip-rate').value);
    const oka = (ret - start) * 4 / 1000;

    let totals = Array(numPlayers).fill(0);

    for (let i = 1; i <= maxGames; i++) {
        let activePlayers = [];
        for (let j = 1; j <= numPlayers; j++) {
            let val = document.querySelector(`.s-${i}-${j}`).value;
            if (val !== "") {
                activePlayers.push({ index: j, score: parseInt(val) });
            }
            document.getElementById(`p-${i}-${j}`).innerText = "-";
        }

        if (activePlayers.length === 4) {
            activePlayers.sort((a, b) => b.score - a.score);
            
            let tobiCount = 0;
            activePlayers.forEach((p, rankIdx) => {
                let pt = (p.score - ret) / 1000 + uma[rankIdx];
                if (rankIdx === 0) pt += oka; 
                
                // 持ち点がマイナスなら -10pt
                if (p.score < 0) {
                    pt -= 10;
                    tobiCount++;
                }
                p.pt = pt;
            });

            // トビ賞を加算する処理
            if (tobiCount > 0) {
                let manualWinnerIdx = parseInt(document.getElementById(`tobi-${i}`).value);
                let winner = activePlayers.find(p => p.index === manualWinnerIdx);
                
                if (manualWinnerIdx > 0 && winner) {
                    // 手動で選ばれた人に加算
                    winner.pt += (10 * tobiCount);
                } else {
                    // 「自動」のまま、または休みの人が選ばれていた場合はトップに加算
                    activePlayers[0].pt += (10 * tobiCount);
                }
            }

            activePlayers.forEach(p => {
                document.getElementById(`p-${i}-${p.index}`).innerText = p.pt.toFixed(1);
                totals[p.index - 1] += p.pt;
            });
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
    
    return { totals, moneys }; // 保存用に返す
}

function saveCurrentData() {
    let calcResult = calculateAll();
    const date = document.getElementById('game-date').value;
    if (!date) return;

    let dayData = { names: [], scores: [], chips: [], tobiWinners: [], totals: calcResult.totals, moneys: calcResult.moneys };

    for (let j = 1; j <= numPlayers; j++) {
        dayData.names.push(document.getElementById(`p${j}-name`).value);
        dayData.chips.push(document.getElementById(`chip${j}`).value);
    }

    for (let i = 1; i <= maxGames; i++) {
        let rowScore = [];
        for (let j = 1; j <= numPlayers; j++) {
            rowScore.push(document.querySelector(`.s-${i}-${j}`).value);
        }
        dayData.scores.push(rowScore);
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

    // 一旦クリア
    for (let i = 1; i <= maxGames; i++) {
        for (let j = 1; j <= numPlayers; j++) {
            document.querySelector(`.s-${i}-${j}`).value = "";
            document.getElementById(`p-${i}-${j}`).innerText = "-";
        }
        document.getElementById(`tobi-${i}`).value = "0";
        updateSum(i);
    }
    for (let j = 1; j <= numPlayers; j++) document.getElementById(`chip${j}`).value = "0";

    if (data) {
        for (let j = 1; j <= numPlayers; j++) {
            document.getElementById(`p${j}-name`).value = data.names[j-1];
            document.getElementById(`p${j}-name`).dispatchEvent(new Event('input')); 
            document.getElementById(`chip${j}`).value = data.chips[j-1];
        }
        for (let i = 1; i <= maxGames; i++) {
            for (let j = 1; j <= numPlayers; j++) {
                document.querySelector(`.s-${i}-${j}`).value = data.scores[i-1][j-1];
            }
            if(data.tobiWinners) document.getElementById(`tobi-${i}`).value = data.tobiWinners[i-1];
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
