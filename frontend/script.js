document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const btnStart = document.getElementById('start-duel-btn');
    const btnReset = document.getElementById('reset-btn');
    const inputUser = document.getElementById('your-site');
    const inputComp = document.getElementById('competitor-site');
    const errorMsg = document.getElementById('error-msg');
    const resultSection = document.getElementById('result-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Score & Winner Elements
    const elScoreUser = document.getElementById('score-user');
    const elScoreComp = document.getElementById('score-competitor');
    const cardUser = document.getElementById('card-user');
    const cardComp = document.getElementById('card-competitor');
    const winnerBanner = document.getElementById('winner-banner');
    const winnerText = document.getElementById('winner-text');
    
    // Labels
    const labelUser = document.getElementById('label-user');
    const labelComp = document.getElementById('label-competitor');
    
    // Metrics Elements
    const metrics = {
        title: [document.getElementById('metric-title-user'), document.getElementById('metric-title-comp')],
        desc: [document.getElementById('metric-desc-user'), document.getElementById('metric-desc-comp')],
        headings: [document.getElementById('metric-h-user'), document.getElementById('metric-h-comp')],
        wc: [document.getElementById('metric-wc-user'), document.getElementById('metric-wc-comp')],
        mob: [document.getElementById('metric-mob-user'), document.getElementById('metric-mob-comp')]
    };

    // Event Listeners
    btnStart.addEventListener('click', startDuel);
    btnReset.addEventListener('click', resetDuel);
    
    // Remove error when typing
    [inputUser, inputComp].forEach(input => {
        input.addEventListener('input', () => {
            if (!inputUser.value.trim() || !inputComp.value.trim()) return;
            errorMsg.classList.add('hidden');
        });
    });

    function startDuel() {
        // 1. Validate
        const userUrl = inputUser.value.trim();
        const compUrl = inputComp.value.trim();
        
        if (!userUrl || !compUrl) {
            errorMsg.classList.remove('hidden');
            return;
        }

        // 2. UI State: Loading
        btnStart.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        
        // Simulate API delay
        setTimeout(() => {
            generateResults(userUrl, compUrl);
        }, 1500);
    }

    function generateResults(userUrl, compUrl) {
        // 3. Logic: Generate Data
        const userScore = getRandomScore(60, 95);
        const compScore = getRandomScore(40, 90);
        
        // Update Labels
        labelUser.textContent = formatUrl(userUrl);
        labelComp.textContent = formatUrl(compUrl);

        // Update Score Text
        animateValue(elScoreUser, 0, userScore, 1500);
        animateValue(elScoreComp, 0, compScore, 1500);

        // Update Charts (SVG Stroke Dasharray)
        // 100, 100 is full circle. We want x, 100 where x is the score.
        // We need to access the <path class="circle"> inside the specific cards
        updateChart(cardUser, userScore);
        updateChart(cardComp, compScore);

        // Determine Winner
        const userWins = userScore >= compScore;
        
        // Generate Mock Metrics based on scores (higher score gets better metrics)
        populateMetrics(0, userScore); // 0 index for user
        populateMetrics(1, compScore); // 1 index for competitor

        // 4. Reveal Results
        loadingIndicator.classList.add('hidden');
        resultSection.classList.remove('hidden');
        
        // Highlight Winner
        if (userWins) {
            cardUser.classList.add('winner');
            cardComp.classList.remove('winner');
            winnerText.textContent = "You Win!";
            winnerBanner.style.background = "linear-gradient(to right, #22c55e, #4ade80)";
            winnerBanner.style.webkitBackgroundClip = "text";
        } else {
            cardComp.classList.add('winner');
            cardUser.classList.remove('winner');
            winnerText.textContent = "Competitor Wins";
            winnerBanner.style.background = "linear-gradient(to right, #ef4444, #f87171)";
             winnerBanner.style.webkitBackgroundClip = "text";
        }
        winnerBanner.classList.remove('hidden');
    }

    function resetDuel() {
        // Reset UI
        resultSection.classList.add('hidden');
        btnStart.classList.remove('hidden');
        winnerBanner.classList.add('hidden');
        
        // Reset Cards styles
        cardUser.classList.remove('winner');
        cardComp.classList.remove('winner');
        
        // Clear Inputs? (Optional, maybe keep them for tweaking)
        // inputUser.value = '';
        // inputComp.value = '';
    }

    // --- Helpers ---

    function getRandomScore(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function formatUrl(url) {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    }

    function updateChart(card, score) {
        const circle = card.querySelector('.circle');
        // SVG stroke-dasharray="current, 100"
        // We set it to 0 initially in CSS or here
        circle.setAttribute('stroke-dasharray', `${score}, 100`);
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function populateMetrics(colIndex, score) {
        // High score = better metrics logic (mock)
        const good = score > 70;
        
        // Title Length (Optimal: 50-60)
        const titleLen = good ? getRandomScore(50, 60) : getRandomScore(20, 90);
        metrics.title[colIndex].textContent = `${titleLen} chars`;
        metrics.title[colIndex].style.color = (titleLen >= 50 && titleLen <= 60) ? 'var(--success)' : 'var(--text-muted)';

        // Meta Description
        const hasMeta = good || Math.random() > 0.3;
        metrics.desc[colIndex].textContent = hasMeta ? 'Optimized' : 'Missing';
        metrics.desc[colIndex].style.color = hasMeta ? 'var(--success)' : 'var(--danger)';

        // Headings
        metrics.headings[colIndex].textContent = good ? 'Well Structured' : 'Unstructured';
        metrics.headings[colIndex].style.color = good ? 'var(--success)' : 'var(--warning)';

        // Word Count
        const wc = good ? getRandomScore(800, 2000) : getRandomScore(100, 500);
        metrics.wc[colIndex].textContent = `${wc}`;

        // Mobile Friendly
        const isMobile = good || Math.random() > 0.4;
        metrics.mob[colIndex].textContent = isMobile ? 'Yes' : 'Issues Found';
        metrics.mob[colIndex].style.color = isMobile ? 'var(--success)' : 'var(--danger)';
    }
});
