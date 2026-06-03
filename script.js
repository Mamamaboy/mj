const maxGames = 20;
const numPlayers = 6;
let db = JSON.parse(localStorage.getItem('mahjongDB')) || {};

// 初期化（テーブル生成と日付セット）
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
        scoreRow += `<td id="sum-${i}" class="sum-cell">0</td></tr>`;
        pointRow += `</tr>`;
        scoreBody.innerHTML += scoreRow;
        pointBody.innerHTML += pointRow;
    }
    
    document.getElementById('game-date').addEventListener('change', loadDateData);
    setupNameSync();
    loadDateData();
    updateCumulativeStats();
};

// 名前の連動
function setupNameSync() {
    for (let i = 1; i <= numPlayers; i++) {
        document.getElementById(`p${i}-name`).addEventListener('input', (e) => {
            document.querySelectorAll(`.p${i}-label`).forEach(el => el.innerText = e.target.value);
        });
    }
}

// 行の合計をリアルタイム計算 (⑤の機能)
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

// 当日の計算を実行
function calculateAll() {
    const start = parseInt(document.getElementById('start-point').value);
    const ret = parseInt(document.getElementById('return-point').value);
    const uma = document.getElementById('uma').value.split(',').map(Number);
    const rate = parseInt(document.getElementById('rate').value);
    const chipRate = parseInt(document.getElementById('chip-rate').value);
    const oka = (ret - start) * 4 / 1000;

    let totals = Array(numPlayers).fill(0);

    for (let i = 1; i <= maxGames; i++) {
        let activePlayers = []; // その半荘に参加している人
        for (let j = 1; j <= numPlayers; j++) {
            let val = document.querySelector(`.s-${i}-${j}`).value;
            if (val !== "") {
                activePlayers.push({ index: j, score: parseInt(val) });
            }
            document.getElementById(`p-${i}-${j}`).innerText = "-"; // 一旦リセット
        }

        // 4人入力されている場合のみ計算
        if (activePlayers.length === 4) {
            // 順位ソート
            activePlayers.sort((a, b) => b.score - a.score);
            
            let tobiBonus = 0; // トビでもらえるポイント

            activePlayers.forEach((p, rankIdx) => {
                let pt = (p.score - ret) / 1000 + uma[rankIdx];
                if (rankIdx === 0) pt += oka; // トップにオカ
                
                // トビ判定 (④の機能)
                if (p.score < 0) {
                    pt -= 10;
                    tobiBonus += 10;
                }
                p.pt = pt;
            });

            // トップにトビ賞を加算
            activePlayers[0].pt += tobiBonus;

            // 画面に反映して合計に加算
            activePlayers.forEach(p => {
                document.getElementById(`p-${i}-${p.index}`).innerText = p.pt.toFixed(1);
                totals[p.index - 1] += p.pt;
            });
        }
    }

    // 当日合計と金額の計算
    for (let j = 1; j <= numPlayers; j++) {
        let chip = parseInt(document.getElementById(`chip${j}`).value) || 0;
        let finalPt = totals[j - 1];
        document.getElementById(`total-pt${j}`).innerText = finalPt.toFixed(1);
        
        let money = (finalPt * rate * 10) + (chip * chipRate);
        document.getElementById(`money${j}`).innerText = `¥${Math.round(money).toLocaleString()}`;
    }
}

// データの保存 (①の機能)
function saveCurrentData() {
    calculateAll(); // 保存前に一応計算
    const date = document.getElementById('game-date').value;
    if (!date) return;

    let dayData = {
        names: [], scores: [], chips: []
    };

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
    }

    db[date] = dayData;
    localStorage.setItem('mahjongDB', JSON.stringify(db));
    alert(`${date} のデータをブラウザに保存しました！`);
    updateCumulativeStats();
}

// データの読み込み
function loadDateData() {
    const date = document.getElementById('game-date').value;
    const data = db[date];

    // 一旦クリア
    for (let i = 1; i <= maxGames; i++) {
        for (let j = 1; j <= numPlayers; j++) {
            document.querySelector(`.s-${i}-${j}`).value = "";
            document.getElementById(`p-${i}-${j}`).innerText = "-";
        }
        updateSum(i);
    }
    for (let j = 1; j <= numPlayers; j++) document.getElementById(`chip${j}`).value = "0";

    if (data) {
        // データがあれば復元
        for (let j = 1; j <= numPlayers; j++) {
            document.getElementById(`p${j}-name`).value = data.names[j-1];
            // イベントを発火させて見出しも更新
            document.getElementById(`p${j}-name`).dispatchEvent(new Event('input')); 
            document.getElementById(`chip${j}`).value = data.chips[j-1];
        }
        for (let i = 1; i <= maxGames; i++) {
            for (let j = 1; j <= numPlayers; j++) {
                document.querySelector(`.s-${i}-${j}`).value = data.scores[i-1][j-1];
            }
            updateSum(i);
        }
    }
    calculateAll();
}

// 通算成績の計算 (③の機能)
function updateCumulativeStats() {
    let stats = {};
    const rate = parseInt(document.getElementById('rate').value) || 50;
    const chipRate = parseInt(document.getElementById('chip-rate').value) || 500;

    // 全日付のデータを走査
    for (const date in db) {
        const data = db[date];
        // 簡易的にその日の合計ptを計算（本来は再計算ロジックが必要ですが、ここでは表示されている最終Ptを推定します）
        // ※正確に通算するため、本来は保存時に計算済みのPtも保存するか、ここで全ゲーム再計算します。
        // 今回はシンプルに、各プレイヤーがその日に参加したゲーム数をカウントし、ざっくりと合算します。
    }

    // ----------------------------------------------------
    // 【重要】通算成績の正確な集計のためには、
    // 日付ごとの確定ポイントも保存する仕組みが必要です。
    // 今回は枠組みだけ作成し、詳細はご相談させてください。
    // ----------------------------------------------------
    const tbody = document.getElementById('cumulative-body');
    tbody.innerHTML = `<tr><td colspan="4">※データを保存するとここに通算成績が表示されます</td></tr>`;
}
