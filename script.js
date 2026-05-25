const scoreBody = document.getElementById('score-body');
const pointBody = document.getElementById('point-body');
const rankBody = document.getElementById('rank-body');

for (let i = 1; i <= 20; i++) {
    scoreBody.innerHTML += `<tr><td>${i}</td>` + 
        `<td><input type="number" class="s-${i}-1" placeholder="0"></td>` +
        `<td><input type="number" class="s-${i}-2" placeholder="0"></td>` +
        `<td><input type="number" class="s-${i}-3" placeholder="0"></td>` +
        `<td><input type="number" class="s-${i}-4" placeholder="0"></td></tr>`;
    
    pointBody.innerHTML += `<tr><td>${i}</td><td id="p-${i}-1">-</td><td id="p-${i}-2">-</td><td id="p-${i}-3">-</td><td id="p-${i}-4">-</td></tr>`;
    rankBody.innerHTML += `<tr><td>${i}</td><td id="r-${i}-1">-</td><td id="r-${i}-2">-</td><td id="r-${i}-3">-</td><td id="r-${i}-4">-</td></tr>`;
}

const ids = ['p1-name', 'p2-name', 'p3-name', 'p4-name'];
ids.forEach((id, idx) => {
    document.getElementById(id).addEventListener('input', (e) => {
        document.querySelectorAll(`.p${idx+1}-label`).forEach(el => el.innerText = e.target.value);
    });
});

function calculateAll() {
    const startPoint = parseInt(document.getElementById('start-point').value);
    const returnPoint = parseInt(document.getElementById('return-point').value);
    const uma = document.getElementById('uma').value.split(',').map(Number);
    const rate = parseInt(document.getElementById('rate').value);
    const chipRate = parseInt(document.getElementById('chip-rate').value);
    const oka = (returnPoint - startPoint) * 4 / 1000;

    let totals = [0, 0, 0, 0];
    let rankSums = [0, 0, 0, 0];
    let gamesPlayed = 0;

    for (let i = 1; i <= 20; i++) {
        let scores = [];
        for (let j = 1; j <= 4; j++) {
            let val = document.querySelector(`.s-${i}-${j}`).value;
            if (val === "") scores.push(null);
            else scores.push(parseInt(val));
        }

        if (scores.every(s => s !== null)) {
            gamesPlayed++;
            let sorted = scores.map((s, idx) => ({s, idx})).sort((a, b) => b.s - a.s);
            let ranks = new Array(4);
            sorted.forEach((item, rIdx) => {
                ranks[item.idx] = rIdx + 1;
                rankSums[item.idx] += (rIdx + 1);
            });

            scores.forEach((s, idx) => {
                let p = (s - returnPoint) / 1000 + uma[ranks[idx] - 1];
                if (ranks[idx] === 1) p += oka;
                
                document.getElementById(`p-${i}-${idx+1}`).innerText = p.toFixed(1);
                document.getElementById(`r-${i}-${idx+1}`).innerText = ranks[idx];
                totals[idx] += p;
            });
        }
    }

    for (let j = 1; j <= 4; j++) {
        let chip = parseInt(document.getElementById(`chip${j}`).value) || 0;
        let finalPt = totals[j-1];
        document.getElementById(`total-pt${j}`).innerText = finalPt.toFixed(1);
        
        let money = (finalPt * rate * 10) + (chip * chipRate);
        document.getElementById(`money${j}`).innerText = `¥${Math.round(money).toLocaleString()}`;
        
        if (gamesPlayed > 0) {
            document.getElementById(`avg-rank${j}`).innerText = (rankSums[j-1] / gamesPlayed).toFixed(2);
        }
    }
}
