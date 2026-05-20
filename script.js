const TYNKR_REGISTRY = {
    scaler: "https://builtbyjoshstudio-cyber.github.io/universal-recipe-scaler/",
    reverseRoast: "https://builtbyjoshstudio-cyber.github.io/reverse-roasting-calculator/",
    panSwap: "https://builtbyjoshstudio-cyber.github.io/pan-swap-calculator/",
    roastPull: "https://builtbyjoshstudio-cyber.github.io/perfect-roast-pull-temp-calculator/",
    brine: "https://builtbyjoshstudio-cyber.github.io/brine-calculator/",
    thawing: "https://builtbyjoshstudio-cyber.github.io/meat-thawing-planner/",
    dough: "https://builtbyjoshstudio-cyber.github.io/dough-hydration-calculator/",
    hub: "https://builtbyjoshstudio.com/tools/"
};

function getToolUrl(toolId, params = {}) {
    let baseUrl = TYNKR_REGISTRY[toolId] || TYNKR_REGISTRY['hub'];
    if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        baseUrl += `?${queryString}`;
    }
    return baseUrl;
}

document.addEventListener("DOMContentLoaded", () => {
    // Theme switcher logic
    const switchBtns = document.querySelectorAll('[data-set-theme]');
    function setTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem('tynkr-glass-theme', t); } catch (e) {}
        switchBtns.forEach(b => b.classList.toggle('on', b.dataset.setTheme === t));
    }
    switchBtns.forEach(b => b.addEventListener('click', () => setTheme(b.dataset.setTheme)));

    try {
        const stored = localStorage.getItem('tynkr-glass-theme');
        if (stored && ['light','mist','dark'].includes(stored)) setTheme(stored);
    } catch (e) {}

    // State Variables
    let currentUnit = 'g'; // 'g' (metric) or 'oz' (imperial)

    // Elements
    const unitMetricBtn = document.getElementById("unit-metric");
    const unitImperialBtn = document.getElementById("unit-imperial");
    
    const flourType = document.getElementById("flour-type");
    const bakingPreset = document.getElementById("baking-preset");
    const calcMode = document.getElementById("calc-mode");
    const targetLabel = document.getElementById("target-label");
    const targetValueInput = document.getElementById("target-value");
    
    const hydrationSlider = document.getElementById("hydration-slider");
    const hydrationBubble = document.getElementById("hydration-bubble");
    
    const totalYieldOutput = document.getElementById("total-yield-output");
    const flourOutput = document.getElementById("flour-output");
    const waterOutput = document.getElementById("water-output");
    const saltOutput = document.getElementById("salt-output");
    const yeastOutput = document.getElementById("yeast-output");
    const waterPctLabel = document.getElementById("water-pct-label");
    const warningContainer = document.getElementById("absorbency-warning-container");
    const pipelineLinkPan = document.getElementById("pipeline-link-pan");

    // Presets mapping
    const presets = {
        neapolitan: 60,
        baguette: 65,
        sourdough: 72,
        ciabatta: 80
    };

    // Set weight unit state
    function setWeightUnit(unit) {
        if (unit === 'g') {
            currentUnit = 'g';
            unitMetricBtn.classList.add("active");
            unitImperialBtn.classList.remove("active");
            targetValueInput.step = "1";
            if (calcMode.value === 'total-dough') {
                targetLabel.textContent = "Target Dough Weight (g)";
            } else {
                targetLabel.textContent = "Target Flour Mass (g)";
            }
        } else {
            currentUnit = 'oz';
            unitImperialBtn.classList.add("active");
            unitMetricBtn.classList.remove("active");
            targetValueInput.step = "0.1";
            if (calcMode.value === 'total-dough') {
                targetLabel.textContent = "Target Dough Weight (oz)";
            } else {
                targetLabel.textContent = "Target Flour Mass (oz)";
            }
        }
    }

    // Toggle metric
    unitMetricBtn.addEventListener("click", () => {
        if (currentUnit !== 'g') {
            const val = parseFloat(targetValueInput.value) || 0;
            // Convert oz to g
            targetValueInput.value = Math.round(val * 28.3495);
            setWeightUnit('g');
            calculateRatios();
        }
    });

    // Toggle imperial
    unitImperialBtn.addEventListener("click", () => {
        if (currentUnit !== 'oz') {
            const val = parseFloat(targetValueInput.value) || 0;
            // Convert g to oz
            targetValueInput.value = (Math.round(val / 28.3495 * 10) / 10).toFixed(1);
            setWeightUnit('oz');
            calculateRatios();
        }
    });

    // Mode Selector change
    calcMode.addEventListener("change", () => {
        if (calcMode.value === 'total-dough') {
            targetLabel.textContent = currentUnit === 'g' ? "Target Dough Weight (g)" : "Target Dough Weight (oz)";
            // default metric/imperial total weight
            targetValueInput.value = currentUnit === 'g' ? "1000" : "35.3";
        } else {
            targetLabel.textContent = currentUnit === 'g' ? "Target Flour Mass (g)" : "Target Flour Mass (oz)";
            // default metric/imperial flour mass
            targetValueInput.value = currentUnit === 'g' ? "600" : "21.2";
        }
        calculateRatios();
    });

    // Preset Selection
    bakingPreset.addEventListener("change", () => {
        const presetVal = bakingPreset.value;
        if (presetVal !== "custom" && presets[presetVal] !== undefined) {
            hydrationSlider.value = presets[presetVal];
            hydrationBubble.textContent = `${presets[presetVal]}%`;
        }
        calculateRatios();
    });

    // Slider Interaction
    hydrationSlider.addEventListener("input", () => {
        hydrationBubble.textContent = `${hydrationSlider.value}%`;
        bakingPreset.value = "custom";
        calculateRatios();
    });

    // Inputs listener
    targetValueInput.addEventListener("input", calculateRatios);
    flourType.addEventListener("change", calculateRatios);

    // Baker's Percentage Core Engine
    function calculateRatios() {
        const targetVal = parseFloat(targetValueInput.value) || 0;
        const hydration = parseInt(hydrationSlider.value) || 70;
        const mode = calcMode.value;

        // Constants: Salt (2%), Yeast (1%)
        const saltPct = 2;
        const yeastPct = 1;

        let flourMass = 0;
        let waterMass = 0;
        let saltMass = 0;
        let yeastMass = 0;
        let totalDoughWeight = 0;

        if (mode === "total-dough") {
            // Total % = 100 + hydration + salt + yeast
            const totalPct = 100 + hydration + saltPct + yeastPct;
            flourMass = (targetVal * 100) / totalPct;
            waterMass = (flourMass * hydration) / 100;
            saltMass = (flourMass * saltPct) / 100;
            yeastMass = (flourMass * yeastPct) / 100;
            totalDoughWeight = targetVal;
        } else {
            // mode === "flour-mass"
            flourMass = targetVal;
            waterMass = (flourMass * hydration) / 100;
            saltMass = (flourMass * saltPct) / 100;
            yeastMass = (flourMass * yeastPct) / 100;
            totalDoughWeight = flourMass + waterMass + saltMass + yeastMass;
        }

        // Format outputs
        const unitSuffix = ` ${currentUnit}`;
        const decimals = currentUnit === 'g' ? 0 : 1;

        totalYieldOutput.textContent = formatVal(totalDoughWeight, decimals) + unitSuffix;
        flourOutput.textContent = formatVal(flourMass, decimals) + unitSuffix;
        waterOutput.textContent = formatVal(waterMass, decimals) + unitSuffix;
        saltOutput.textContent = formatVal(saltMass, decimals) + unitSuffix;
        yeastOutput.textContent = formatVal(yeastMass, decimals) + unitSuffix;
        waterPctLabel.textContent = `${hydration}% hydration`;

        // Absorbency Interceptor (Low protein flour + high hydration > 72%)
        const selectedFlour = flourType.value;
        const isLowProtein = (selectedFlour === "all-purpose" || selectedFlour === "00-pizza");
        if (isLowProtein && hydration > 72) {
            warningContainer.style.display = "block";
        } else {
            warningContainer.style.display = "none";
        }

        // Update pipeline cross-promotion link
        if (pipelineLinkPan) {
            // Forward parameters: doughWeight (metric or imperial target weight) and unit
            pipelineLinkPan.href = getToolUrl('panSwap', {
                doughWeight: totalDoughWeight.toFixed(decimals),
                unit: currentUnit === 'g' ? 'metric' : 'imperial'
            });
        }
    }

    function formatVal(val, decimals) {
        if (decimals === 0) {
            return Math.round(val);
        }
        return (Math.round(val * 10) / 10).toFixed(decimals);
    }

    // URL Parameter Ingestion
    function parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const weight = params.get('weight');
        const unit = params.get('unit');
        const flour = params.get('flour');
        const preset = params.get('preset');
        const hydration = params.get('hydration');
        const mode = params.get('mode');

        if (unit) {
            if (unit.toLowerCase() === 'g' || unit.toLowerCase() === 'metric') {
                setWeightUnit('g');
            } else if (unit.toLowerCase() === 'oz' || unit.toLowerCase() === 'imperial') {
                setWeightUnit('oz');
            }
        }

        if (mode && (mode === 'total-dough' || mode === 'flour-mass')) {
            calcMode.value = mode;
            if (mode === 'total-dough') {
                targetLabel.textContent = currentUnit === 'g' ? "Target Dough Weight (g)" : "Target Dough Weight (oz)";
            } else {
                targetLabel.textContent = currentUnit === 'g' ? "Target Flour Mass (g)" : "Target Flour Mass (oz)";
            }
        }

        if (weight) {
            targetValueInput.value = weight;
        }

        if (flour) {
            const selectVal = flour.toLowerCase();
            if (['bread-flour', 'whole-wheat', 'all-purpose', '00-pizza'].includes(selectVal)) {
                flourType.value = selectVal;
            }
        }

        if (preset) {
            const selectPreset = preset.toLowerCase();
            if (['neapolitan', 'baguette', 'sourdough', 'ciabatta', 'custom'].includes(selectPreset)) {
                bakingPreset.value = selectPreset;
                if (selectPreset !== 'custom' && presets[selectPreset] !== undefined) {
                    hydrationSlider.value = presets[selectPreset];
                    hydrationBubble.textContent = `${presets[selectPreset]}%`;
                }
            }
        }

        if (hydration) {
            const hydVal = parseInt(hydration);
            if (hydVal >= 50 && hydVal <= 90) {
                hydrationSlider.value = hydVal;
                hydrationBubble.textContent = `${hydVal}%`;
                bakingPreset.value = "custom";
            }
        }

        calculateRatios();
    }

    // Initialize
    parseUrlParameters();
});
