// Cyberpunk-opener by MadMonkey

$(function () {
    let resultMap = {};
    let isOpening = false;
    const headerFont = `'Orbitron', sans-serif`;
    const dataFont = `'Share Tech Mono', monospace`;

    $('head').append(`
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
        <style>
            
            #blookTally {
                display:none; position:fixed; top:20px; right:20px; bottom:20px; 
                width:320px; background: rgba(8, 4, 12, 0.95);
                border: 1px solid #bc13fe; border-top: 4px solid #39ff14;
                box-shadow: 0 0 20px rgba(188, 19, 254, 0.3), inset 0 0 15px rgba(0,0,0,1);
                z-index:2000; color:#fff; padding:0; overflow:hidden;
                font-family: ${dataFont}; transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                clip-path: polygon(0 0, 100% 0, 100% 95%, 90% 100%, 0 100%);
            }

           //effect
            #blookTally::before {
                content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), 
                            linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                z-index: 10; background-size: 100% 2px, 3px 100%; pointer-events: none;
            }

            .terminal-header {
                background: rgba(188, 19, 254, 0.1); padding: 10px;
                border-bottom: 1px solid #bc13fe; font-family: ${headerFont};
                font-size: 10px; letter-spacing: 2px; color: #39ff14;
                display: flex; justify-content: space-between; align-items: center;
            }

            #blookListContainer {
                height: calc(100% - 120px); overflow-y: auto; padding: 15px;
                scrollbar-width: thin; scrollbar-color: #bc13fe transparent;
            }

            .cyber-row { 
                display: grid; grid-template-columns: 40px 1fr 40px;
                align-items: center; margin-bottom: 8px; 
                background: rgba(188, 19, 254, 0.05); padding: 8px;
                border-right: 3px solid #bc13fe; transition: 0.2s;
            }

            .cyber-row:hover {
                background: rgba(57, 255, 20, 0.1);
                border-right: 3px solid #39ff14;
                transform: translateX(-5px);
            }

            .cyber-row img { width: 30px; filter: drop-shadow(0 0 5px currentColor); }

            .stat-label { font-size: 9px; color: #bc13fe; margin-top: -4px; display: block; }

            .summary-footer {
                position: absolute; bottom: 0; width: 100%; height: 70px;
                background: #000; border-top: 1px solid #bc13fe;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
            }

            .holo-btn {
                background: transparent; color: #39ff14; border: 1px solid #39ff14;
                padding: 5px 15px; font-family: ${headerFont}; font-size: 9px;
                cursor: pointer; transition: 0.3s;
            }

            .holo-btn:hover { background: #39ff14; color: #000; box-shadow: 0 0 15px #39ff14; }
        </style>
    `);

    const resultPanel = $(`
        <section id="blookTally">
            <div class="terminal-header">
                <span>● STATUS: COLLECTING...</span>
                <span style="color:#bc13fe">v4.0.2</span>
            </div>
            <div id="blookListContainer"></div>
            <div class="summary-footer">
                <div id="summaryArea" style="font-size:10px; color:#39ff14; margin-bottom:5px;"></div>
            </div>
        </section>
    `);
    $('body').append(resultPanel);

    function appendBlookResult(name) {
        const info = blacket.blooks[name] || {};
        const img = info.image || '/content/blooks/Error.webp';
        const rarity = info.rarity || 'Unknown';
        const color = blacket.rarities[rarity]?.color || '#fff';

        if (!resultMap[name]) {
            const item = $(`
                <div class="cyber-row" style="color: ${color}">
                    <img src="${img}">
                    <div>
                        <span style="font-weight:bold; letter-spacing:1px;">${name.toUpperCase()}</span>
                        <span class="stat-label">${rarity.toUpperCase()}</span>
                    </div>
                    <div style="text-align:right; font-size:14px; color:#39ff14;">
                        [<span class="count">1</span>]
                    </div>
                </div>
            `);
            resultMap[name] = { count: 1, rarity, element: item };
        } else {
            resultMap[name].count++;
            resultMap[name].element.find('.count').text(resultMap[name].count);
        }
        sortResultsByRarity();
    }

    function sortResultsByRarity() {
        const container = $('#blookListContainer');
        const rarityOrder = Object.keys(blacket.rarities);
        const entries = Object.values(resultMap).sort((a, b) => rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity));
        container.empty();
        entries.forEach(e => container.append(e.element));
    }

    async function beginOpening(pack, count, cost) {
        if (isOpening) return;
        isOpening = true;
        resultMap = {};
        $('#blookListContainer').empty();
        resultPanel.fadeIn(200).css('transform', 'scale(1)');

        const originalOpenPack = blacket.openPack;
        let opened = 0;

        blacket.openPack = (p) => new Promise(resolve => {
            blacket.requests.post("/worker3/open", { pack: p }, (resp) => {
                if (resp.error) return resolve(null);
                blacket.user.tokens -= blacket.packs[p].price;
                $("#tokenBalance > div:nth-child(2)").text(blacket.user.tokens.toLocaleString());
                blacket.user.blooks[resp.blook] = (blacket.user.blooks[resp.blook] || 0) + 1;
                resolve(resp.blook);
            });
        });

        for (let i = 0; i < count; i++) {
            if (blacket.user.tokens < cost) break;
            const result = await blacket.openPack(pack);
            if (result) {
                appendBlookResult(result);
                const delay = blacket.rarities[blacket.blooks[result]?.rarity]?.wait ?? 40;
                await new Promise(r => setTimeout(r, delay));
            }
            opened++;
            $('#summaryArea').text(`TOTAL_OPENED: ${opened}`);
        }

        blacket.openPack = originalOpenPack;
        isOpening = false;
        $('.terminal-header span:first-child').text('● STATUS: IDLE').css('color', '#bc13fe');
        $('#summaryArea').append(`<br><button class="holo-btn" onclick="$('#blookTally').fadeOut()">DISCONNECT</button>`);
    }

    // button
    const packs = Object.keys(blacket?.packs || {}).filter(p => !blacket.packs[p].hidden);
    const dialog = $(`
        <div id="packModal" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background: #000; padding:20px; border:1px solid #39ff14; z-index:2100; display:none; text-align:center; font-family:${headerFont};">
            <h2 style="color:#39ff14; font-size:14px; margin-bottom:15px;">SELECT_TARGET_PACK</h2>
            <select id="packDropdown" style="background:#111; color:#fff; border:1px solid #bc13fe; padding:5px; width:100%; font-family:${dataFont};"></select>
            <input type="number" id="qtyInput" value="100" style="background:#111; color:#39ff14; border:1px solid #bc13fe; width:100%; margin:10px 0; padding:5px; text-align:center;">
            <button id="confirmBtn" class="holo-btn" style="width:100%">OPEN</button>
        </div>
    `);
    packs.forEach(name => dialog.find('#packDropdown').append(`<option value="${name}">${name}</option>`));
    $('body').append(dialog);

    const trigger = $(`
        <button id="openBtn" class="holo-btn" style="position:fixed; bottom:20px; right:20px; z-index:1000;">[ OPEN_INTERFACE ]</button>
    `);
    trigger.on('click', () => $('#packModal').toggle());
    $('body').append(trigger);

    $('#confirmBtn').on('click', () => {
        const pack = $('#packDropdown').val();
        let amount = parseInt($('#qtyInput').val(), 10);
        const price = blacket.packs[pack].price;
        amount = Math.min(amount, Math.floor(blacket.user.tokens / price));
        $('#packModal').hide();
        beginOpening(pack, amount, price);
    });
});
