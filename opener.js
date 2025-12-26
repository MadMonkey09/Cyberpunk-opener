// Cyberpunk-opener by MadMonkey


$(function () {
    let resultMap = {};
    let isOpening = false;
    
   
    const headerFont = `'Orbitron', sans-serif`; // Sci-fi futuristic
    const dataFont = `'Share Tech Mono', monospace`; // Terminal / Hacker style

    // UI
    $('head').append(`
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
        <style>
            #blookTally::-webkit-scrollbar { width: 3px; }
            #blookTally::-webkit-scrollbar-thumb { background: #bc13fe; border-radius: 10px; }
            
            .cyber-row { 
                display: flex; 
                align-items: center; 
                margin-bottom: 6px; 
                padding: 4px;
                border-left: 2px solid transparent;
                transition: all 0.2s;
            }
            .cyber-row:hover {
                background: rgba(188, 19, 254, 0.1);
                border-left: 2px solid #39ff14;
            }
            .cyber-row img {
                width: 28px;
                height: 28px;
                margin-right: 12px;
                filter: drop-shadow(0 0 5px rgba(57, 255, 20, 0.5));
            }
            .cyber-text {
                font-family: ${dataFont};
                font-size: 1.1em;
                text-transform: uppercase;
                text-shadow: 0 0 5px rgba(188, 19, 254, 0.6);
            }

            .holo-btn {
                background: rgba(188, 19, 254, 0.05);
                color: #39ff14;
                border: 1px solid #bc13fe;
                padding: 10px 20px;
                font-family: ${headerFont};
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 3px;
                cursor: pointer;
                transition: 0.3s;
                box-shadow: inset 0 0 10px rgba(188, 19, 254, 0.2);
            }
            .holo-btn:hover {
                background: #bc13fe;
                color: #000;
                box-shadow: 0 0 20px #bc13fe, 0 0 40px #39ff14;
                border-color: #39ff14;
            }

            @keyframes scan {
                0% { top: 0%; opacity: 0.1; }
                50% { opacity: 0.8; }
                100% { top: 100%; opacity: 0.1; }
            }
            .scanner-line {
                position: absolute;
                width: 100%;
                height: 2px;
                background: rgba(57, 255, 20, 0.5);
                box-shadow: 0 0 15px #39ff14;
                animation: scan 4s linear infinite;
                z-index: 5;
                pointer-events: none;
            }
        </style>
    `);

    // Results
    const resultPanel = $(`
        <section id="blookTally" style="
            display:none; position:fixed; top:20px; bottom:20px; right:-280px; 
            width:240px; background: rgba(5, 2, 10, 0.95);
            backdrop-filter: blur(15px); border: 1px solid #bc13fe;
            color:#fff; padding:15px; border-radius:10px 0 0 10px; z-index:2000; 
            transition:right 0.5s ease-out; box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        ">
            <div class="scanner-line"></div>
            <div style="font-family:${headerFont}; font-size:10px; color:#bc13fe; letter-spacing:4px; margin-bottom:20px; text-align:center; border-bottom: 1px solid rgba(188, 19, 254, 0.3); padding-bottom: 5px;">
                > DATA_HARVEST
            </div>
            <div id="blookListContainer"></div>
            <div id="summaryArea" style="margin-top:20px; text-align:center; font-family:${dataFont}; font-size:11px; color:#39ff14;"></div>
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
                <div class="cyber-row">
                    <img src="${img}">
                    <span class="cyber-text" style="color: ${color};">
                        ${name} <span style="color:#39ff14;">x</span><span class="count" style="color:#fff;">1</span>
                    </span>
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
        resultPanel.show().css('right', '0');

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
        }

        blacket.openPack = originalOpenPack;
        isOpening = false;
        $('#summaryArea').html(`[ COMPLETED_${opened} ] <br> <button class="holo-btn" style="margin-top:15px; font-size:9px;" onclick="$('#blookTally').css('right', '-280px')">EXIT_TERMINAL</button>`);
    }

    const packs = Object.keys(blacket?.packs || {}).filter(p => !blacket.packs[p].hidden);
    const dialog = $(`
        <div id="packModal" style="
            position:fixed; top:50%; left:50%; transform:translate(-50%, -50%);
            background: rgba(10, 5, 15, 0.98); padding:30px; border-radius:2px; z-index:2100;
            text-align:center; display:none; color:#fff; font-family:${headerFont};
            border: 2px solid #39ff14; width: 280px; box-shadow: 0 0 40px rgba(57, 255, 20, 0.2);
        ">
            <div style="font-size:11px; letter-spacing:5px; margin-bottom:25px; color:#bc13fe;">ACCESS_GRANTED</div>
            <select id="packDropdown" style="background:#000; border:1px solid #bc13fe; color:#39ff14; width:100%; padding:10px; margin-bottom:15px; font-family:${dataFont}; outline:none; cursor:pointer;"></select>
            <input type="number" id="qtyInput" value="1" min="1" style="background:#000; border:1px solid #bc13fe; color:#fff; width:100%; padding:10px; text-align:center; font-family:${dataFont}; margin-bottom:25px; outline:none;" />
            
            <button id="confirmBtn" class="holo-btn" style="width:100%;">RUN_OVERRIDE</button>
            <div style="color:#555; font-size:9px; margin-top:15px; cursor:pointer; font-family:${dataFont};" onclick="$('#packModal').fadeOut()">_ABORT_MISSION</div>
        </div>
    `);
    
    packs.forEach(name => dialog.find('#packDropdown').append(`<option value="${name}">${name.toUpperCase()}</option>`));
    $('body').append(dialog);

    const trigger = $(`
        <button id="openBtn" class="holo-btn" style="position:fixed; bottom:25px; right:25px; z-index:1000; border: 2px solid #39ff14;">
            CORE_INTERFACE
        </button>
    `);

    trigger.on('click', () => $('#packModal').fadeIn());
    $('body').append(trigger);

    $('#confirmBtn').on('click', () => {
        const pack = $('#packDropdown').val();
        let amount = parseInt($('#qtyInput').val(), 10);
        const price = blacket.packs[pack].price;
        amount = Math.min(amount, Math.floor(blacket.user.tokens / price));
        if (amount <= 0) return;
        $('#packModal').fadeOut();
        beginOpening(pack, amount, price);
    });
});
