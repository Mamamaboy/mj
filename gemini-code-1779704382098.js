let hanchanCount = 0;

// 名前入力が変更されたらテーブルの見出しも変更する機能
const nameInputs = ['p1-name', 'p2-name', 'p3-name', 'p4-name'];
nameInputs.forEach((id, index) => {
    document.getElementById(id).addEventListener('input', (e) => {
        document.getElementById(`label-p${index + 1}`).innerText = e.target.value;
    });
});

function calculate() {
    // 1. 基本設定の取得
    const startPoint = parseInt(document.getElementById('start-point').value);
    const returnPoint = parseInt(document.getElementById('return-point').value);
    const umaStr = document.getElementById('uma').value.split(',');
    const uma = umaStr.map(Number);
    const rate = parseInt(document.getElementById('rate').value);
    const chipRate = parseInt(document.getElementById('chip-rate').value);

    // 2. プレイヤー情報の取得
    let players = [];
    for (let i = 1; i <= 4; i++) {
        players.push({
            id: i,
            name: document.getElementById(`p${i}-name`).value,
            score: parseInt(document.getElementById(`score${i}`).value),
            chip: parseInt(document.getElementById(`chip${i}`).value),
            point: 0,
            rank: 0,
            totalMoney: 0
        });
    }

    // 3. 点数チェック（合計が 配点×4 になっているか）
    const totalScore = players.reduce((sum, p) => sum + p.score, 0);
    if (totalScore !== startPoint * 4) {
        alert(`点数の合計が合いません！\n現在: ${totalScore} (あるべき合計: ${startPoint * 4})`);
        return;
    }

    // 4. 順位の算出（点数の高い順にソート）
    // 同点の場合は起家（今回は入力順）を優先するなどのルールがありますが、簡略化のため入力順を保持したままソートします
    let sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    // オカの計算 (返し点 - 配点) × 4 をトップに付与
    const oka = ((returnPoint - startPoint) * 4) / 1000;

    // 5. ポイントと合計金額の計算
    sortedPlayers.forEach((p, index) => {
        p.rank = index + 1;
        
        // ベースポイント = (持ち点 - 返し点) / 1000
        let basePoint = (p.score - returnPoint) / 1000;
        
        // ウマを加算
        p.point = basePoint + uma[index];

        // 1位にはオカを加算し、端数調整（他3人のマイナス分を丸ごとプラスにする）
        if (p.rank === 1) {
            p.point += oka;
        }

        // 合計金額 = (ポイント × レート) + (チップ枚数 × チップレート)
        p.totalMoney = (p.point * rate * 10) + (p.chip * chipRate); // ※レートが「テンゴ(50円)」などの場合、Pt×10倍×レート計算が一般的です。適宜調整してください。
    });

    // 6. 結果をテーブルに表示
    hanchanCount++;
    const tbody = document.getElementById('result-body');
    
    // 元の順番（座順）に戻して表示する
    players.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>第${hanchanCount}戦</td>
            <td>${p.name}</td>
            <td>${p.score}</td>
            <td>${p.rank}位</td>
            <td><strong>${p.point.toFixed(1)}</strong></td>
            <td>${p.chip}</td>
            <td>¥${p.totalMoney.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });

    // 入力欄のリセット（持ち点のみ）
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`score${i}`).value = startPoint;
        document.getElementById(`chip${i}`).value = 0;
    }
}