// ==================== CONSTANTES ====================
const MAX_TOTAL_WATTS = 1905;
const MAX_PER_OUTLET_WATTS = 1270;
const STANDBY_PHASE_DURATION = 8000;
const TRANSITION_PHASE_DURATION = 5000;
const WIFI_LOSS_DURATION = 12000;
const BLUETOOTH_ACTIVATION_DELAY = 1000;

// ==================== TARIFAS CFE CON NIVELES ====================
const TARIFF_CONFIGS = {
    '1': { levels: 3, basic: 1.122, intermediate: 1.365, excess: 3.992, limits: { basic: 75, intermediate: 65 } },
    '1A': { levels: 3, basic: 1.004, intermediate: 1.163, excess: 3.992, limits: { basic: 100, intermediate: 50 } },
    '1B': { levels: 3, basic: 1.004, intermediate: 1.163, excess: 3.992, limits: { basic: 125, intermediate: 100 } },
    '1C': { levels: 4, basic: 1.004, intermediateLow: 1.163, intermediateHigh: 1.495, excess: 3.992, limits: { basic: 150, intermediateLow: 150, intermediateHigh: 150 } },
    '1D': { levels: 4, basic: 1.004, intermediateLow: 1.163, intermediateHigh: 1.495, excess: 3.992, limits: { basic: 175, intermediateLow: 225, intermediateHigh: 200 } },
    '1E': { levels: 4, basic: 0.839, intermediateLow: 1.039, intermediateHigh: 1.348, excess: 3.992, limits: { basic: 300, intermediateLow: 450, intermediateHigh: 150 } },
    '1F': { levels: 4, basic: 0.839, intermediateLow: 1.039, intermediateHigh: 2.526, excess: 3.992, limits: { basic: 300, intermediateLow: 900, intermediateHigh: 1300 } }
};

// ==================== LISTA DE DISPOSITIVOS CON RANGOS ====================
const DEVICES = [
    { id: 0, name: 'Refrigerador', icon: './icons/refrigerator.svg', minPower: 80, maxPower: 250, avgPower: 150 },
    { id: 1, name: 'Televisión', icon: 'fa-solid fa-tv', minPower: 50, maxPower: 150, avgPower: 80 },
    { id: 2, name: 'Cargadores', icon: 'fa-solid fa-mobile-button', minPower: 5, maxPower: 80, avgPower: 30 },
    { id: 3, name: 'Computadora', icon: 'fa-solid fa-laptop', minPower: 100, maxPower: 400, avgPower: 180 },
    { id: 4, name: 'Microondas', icon: './icons/microwave.svg', minPower: 700, maxPower: 1300, avgPower: 900 },
    { id: 5, name: 'Licuadora', icon: 'fa-solid fa-blender', minPower: 250, maxPower: 600, avgPower: 400 },
    { id: 6, name: 'Ventilador', icon: 'fa-solid fa-fan', minPower: 30, maxPower: 80, avgPower: 50 },
    { id: 7, name: 'Lampara', icon: 'fa-solid fa-lightbulb', minPower: 7, maxPower: 15, avgPower: 10 }
];

// Dispositivos aprendidos
let learnedDevices = [
    { id: 100, name: 'Cafetera', icon: './icons/coffee-machine.svg', minPower: 600, maxPower: 900, avgPower: 750, learned: true },
    { id: 101, name: 'Secadora', icon: './icons/dryer.svg', minPower: 300, maxPower: 800, avgPower: 500, learned: true }
];

// ==================== AUTOMATIZACIONES ====================
let automations = [
    { id: 1, name: 'Apagar todo por la noche', days: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], startTime: '23:00', endTime: '06:00', action: 'off', outlets: [0, 1, 2, 3] },
    { id: 2, name: 'Encender computadora', days: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'], startTime: '08:00', endTime: '18:00', action: 'on', outlets: [3] }
];
let nextAutomationId = 3;

// ==================== DATOS DE TOMAS ====================
const defaultOutlets = [
    { id: 0, name: 'Refrigerador', icon: './icons/refrigerator.svg', minPower: 80, maxPower: 250, avgPower: 150, isOn: true, currentPower: 0, energyToday: 0, costToday: 0, temperature: 42, history: [], sensorFault: false, deviceId: 0, isInPhantomFlow: false, phantomTimer: null, thermalLock: false, thermalCooldownUntil: 0 },
    { id: 1, name: 'Televisión', icon: 'fa-solid fa-tv', minPower: 50, maxPower: 150, avgPower: 80, isOn: true, currentPower: 0, energyToday: 0, costToday: 0, temperature: 42, history: [], sensorFault: false, deviceId: 1, isInPhantomFlow: false, phantomTimer: null, thermalLock: false, thermalCooldownUntil: 0 },
    { id: 2, name: 'Cargadores', icon: 'fa-solid fa-mobile-button', minPower: 5, maxPower: 80, avgPower: 30, isOn: true, currentPower: 0, energyToday: 0, costToday: 0, temperature: 42, history: [], sensorFault: false, deviceId: 2, isInPhantomFlow: false, phantomTimer: null, thermalLock: false, thermalCooldownUntil: 0 },
    { id: 3, name: 'Computadora', icon: 'fa-solid fa-laptop', minPower: 100, maxPower: 400, avgPower: 180, isOn: true, currentPower: 0, energyToday: 0, costToday: 0, temperature: 42, history: [], sensorFault: false, deviceId: 3, isInPhantomFlow: false, phantomTimer: null, thermalLock: false, thermalCooldownUntil: 0 }
];

// ==================== VARIABLES GLOBALES ====================
let outlets = JSON.parse(JSON.stringify(defaultOutlets));
let todayEnergyTotal = 0;
let todayCostTotal = 0;
let alerts = [];
let relayCycles = { 0: 1250, 1: 890, 2: 2340, 3: 567 };
let wifiConnected = true;
let bluetoothActive = false;
let currentTariff = '1';
let tariffRates = { basic: 1.122, intermediate: 1.365, excess: 3.992, intermediateLow: null, intermediateHigh: null };
let tariffLimits = { basic: 75, intermediate: 65 };
let tariffLevels = 3;
let historyData = { day: [], week: [], month: [] };
let outletHistoryData = { 0: { day: [], week: [], month: [] }, 1: { day: [], week: [], month: [] }, 2: { day: [], week: [], month: [] }, 3: { day: [], week: [], month: [] } };
let chart = null;
let historyChart = null;
let currentChartPeriod = 'day';
let currentHistoryOutletId = null;
let currentHistoryPeriod = 'day';
let lastHourUpdate = -1;
let simulationInterval = null;
let randomEventInterval = null;
let wifiLossTimeout = null;
let bluetoothActivationTimeout = null;
let isDarkMode = false;

// Variables de entrenamiento
let currentTrainingReadings = [];
let trainingInterval = null;

// ==================== MODO DEPURACION ====================
const EVENT_ORDER = ['overcurrent', 'temperature', 'phantom', 'wifi', 'sensor', 'recognition'];
let currentEventIndex = 0;
let isExecutingEvent = false;

// ==================== FUNCION PARA RENDERIZAR ICONOS ====================
function renderIcon(icon, className = '', styles = '') {
    if (!icon) return '';
    if (icon.startsWith('fa')) {
        return `<i class="${icon} ${className}" style="${styles}"></i>`;
    } else if (icon.endsWith('.svg')) {
        return `<img src="${icon}" class="${className}" style="width: 20px; height: 20px; object-fit: contain; ${styles}" alt="icon">`;
    }
    return `<i class="fas fa-plug ${className}" style="${styles}"></i>`;
}

// ==================== FUNCIONES AUXILIARES ====================
function showToast(message, isError = false) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast) return;
    toastMsg.textContent = message;
    toast.style.background = isError ? '#dc2626' : '#1e293b';
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.style.background = '#1e293b';
    }, 4500);
}

function showPushNotification(message) {
    const push = document.getElementById('pushNotification');
    const pushMsg = document.getElementById('pushMessage');
    if (!push) return;
    pushMsg.textContent = message;
    push.classList.remove('hidden');
    setTimeout(() => {
        push.classList.add('hidden');
    }, 4000);
}

function addAlert(type, title, message, autoAction = null) {
    const newAlert = {
        id: Date.now(),
        type: type,
        title: title,
        message: message,
        time: new Date().toLocaleTimeString(),
        autoAction: autoAction
    };
    alerts.unshift(newAlert);
    if (alerts.length > 100) alerts.pop();
    renderAlerts();
    showToast(message, type === 'overcurrent' || type === 'temperature');
    showPushNotification(message);
    if (autoAction) autoAction();
}

function getCurrentRateForEnergy(energyKwh) {
    if (tariffLevels === 3) {
        if (energyKwh <= tariffLimits.basic) return tariffRates.basic;
        if (energyKwh <= tariffLimits.basic + tariffLimits.intermediate) return tariffRates.intermediate;
        return tariffRates.excess;
    } else {
        if (energyKwh <= tariffLimits.basic) return tariffRates.basic;
        if (energyKwh <= tariffLimits.basic + tariffLimits.intermediateLow) return tariffRates.intermediateLow;
        if (energyKwh <= tariffLimits.basic + tariffLimits.intermediateLow + tariffLimits.intermediateHigh) return tariffRates.intermediateHigh;
        return tariffRates.excess;
    }
}

function getRandomPowerForDevice(device) {
    const min = device.minPower;
    const max = device.maxPower;
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function calculateOutletCost(outlet) {
    return outlet.energyToday * getCurrentRateForEnergy(outlet.energyToday);
}

// ==================== TARIFA CFE ====================
function updateTariffUI() {
    const config = TARIFF_CONFIGS[currentTariff];
    tariffLevels = config.levels;
    tariffLimits = config.limits;
    
    if (config.levels === 3) {
        tariffRates = { basic: config.basic, intermediate: config.intermediate, excess: config.excess, intermediateLow: null, intermediateHigh: null };
        document.getElementById('basicRate').value = config.basic;
        document.getElementById('intermediateRate').value = config.intermediate;
        document.getElementById('excessRate').value = config.excess;
        document.getElementById('intermediateLowRow').style.display = 'none';
        document.getElementById('intermediateRow').style.display = 'flex';
        document.getElementById('intermediateHighRow').style.display = 'none';
    } else {
        tariffRates = { basic: config.basic, intermediateLow: config.intermediateLow, intermediateHigh: config.intermediateHigh, excess: config.excess, intermediate: null };
        document.getElementById('basicRate').value = config.basic;
        document.getElementById('intermediateLowRate').value = config.intermediateLow;
        document.getElementById('intermediateHighRate').value = config.intermediateHigh;
        document.getElementById('excessRate').value = config.excess;
        document.getElementById('intermediateLowRow').style.display = 'flex';
        document.getElementById('intermediateRow').style.display = 'none';
        document.getElementById('intermediateHighRow').style.display = 'flex';
    }
}

function loadTariffFromStorage() {
    const saved = localStorage.getItem('plugi_tariff_type');
    if (saved) {
        currentTariff = saved;
        const select = document.getElementById('tariffType');
        if (select) select.value = saved;
        updateTariffUI();
    }
}

function saveTariffType() {
    localStorage.setItem('plugi_tariff_type', currentTariff);
}

// ==================== BLUETOOTH ====================
function activateBluetooth() {
    bluetoothActive = true;
    const btStatus = document.getElementById('bluetoothStatus');
    if (btStatus) btStatus.style.display = 'flex';
}

function deactivateBluetooth() {
    bluetoothActive = false;
    const btStatus = document.getElementById('bluetoothStatus');
    if (btStatus) btStatus.style.display = 'none';
}

// ==================== TEMPERATURA POR TOMA ====================
function updateOutletTemperature(outlet) {
    if (outlet.thermalCooldownUntil > Date.now() && outlet.temperature < 55) return;
    if (outlet.thermalLock) return;
    
    let totalLoad = outlet.isOn ? outlet.currentPower : 0;
    let newTemp = 35 + (totalLoad / 2000) * 45 + (Math.random() - 0.5) * 2;
    outlet.temperature = Math.min(85, Math.max(25, Math.round(newTemp)));
    
    if (outlet.temperature >= 65 && !outlet.thermalLock && outlet.thermalCooldownUntil <= Date.now()) {
        activateOutletThermalProtection(outlet);
    }
}

function activateOutletThermalProtection(outlet) {
    outlet.thermalLock = true;
    const wasOn = outlet.isOn;
    
    if (outlet.isOn) {
        outlet.isOn = false;
        if (outlet.phantomTimer) { clearTimeout(outlet.phantomTimer); outlet.isInPhantomFlow = false; }
        relayCycles[outlet.id]++;
    }
    
    addAlert('temperature', 'ALERTA DE TEMPERATURA', `"${outlet.name}" alcanzo ${Math.round(outlet.temperature)}°C (>65°C). Proteccion termica activada. Contacto apagado por 15 segundos.`, null);
    updateUI();
    
    setTimeout(() => {
        outlet.temperature = 45;
        updateUI();
        
        setTimeout(() => {
            if (wasOn && !outlet.isOn) {
                outlet.isOn = true;
                outlet.currentPower = getRandomPowerForDevice(outlet);
            }
            outlet.thermalLock = false;
            outlet.thermalCooldownUntil = Date.now() + 25000;
            updateUI();
            addAlert('temperature_recovery', 'TEMPERATURA NORMALIZADA', `"${outlet.name}" restablecido. Temperatura en ${outlet.temperature}°C.`, null);
        }, 5000);
    }, 10000);
}

// ==================== EVENTOS CICLICOS ====================
function executeCyclicEvent() {
    if (isExecutingEvent) return;
    
    const eventType = EVENT_ORDER[currentEventIndex];
    console.log(`\n========== EVENTO: ${eventType.toUpperCase()} ==========`);
    isExecutingEvent = true;
    
    switch(eventType) {
        case 'overcurrent': executeOvercurrentEvent(); break;
        case 'temperature': executeTemperatureEvent(); break;
        case 'phantom': executePhantomEvent(); break;
        case 'wifi': executeWifiEvent(); break;
        case 'sensor': executeSensorEvent(); break;
        case 'recognition': executeRecognitionEvent(); break;
    }
    
    currentEventIndex = (currentEventIndex + 1) % EVENT_ORDER.length;
    isExecutingEvent = false;
}

function executeWifiEvent() {
    if (!wifiConnected) {
        wifiConnected = true;
        deactivateBluetooth();
        updateUI();
        return;
    }
    
    wifiConnected = false;
    updateUI();
    addAlert('wifi', 'WiFi DESCONECTADO', 'Perdida de conexion a internet. Activando Bluetooth como respaldo.', null);
    
    bluetoothActivationTimeout = setTimeout(() => {
        activateBluetooth();
        updateUI();
    }, BLUETOOTH_ACTIVATION_DELAY);
    
    wifiLossTimeout = setTimeout(() => {
        wifiConnected = true;
        updateUI();
        addAlert('wifi', 'WiFi RECONECTADO', 'Conexion restablecida. Desactivando Bluetooth.', null);
        setTimeout(() => { deactivateBluetooth(); updateUI(); }, 1000);
    }, WIFI_LOSS_DURATION);
}

function executeOvercurrentEvent() {
    const onOutlets = outlets.filter(o => o.isOn && !o.sensorFault && !o.isInPhantomFlow);
    if (onOutlets.length > 0) {
        const target = onOutlets[Math.floor(Math.random() * onOutlets.length)];
        addAlert('overcurrent', 'SOBRECORRIENTE DETECTADA', `"${target.name}" supero el limite de 1,270W. Se apago automaticamente.`, 
            () => toggleOutlet(target.id, true));
    } else {
        triggerFallbackEvent();
    }
}

function executeTemperatureEvent() {
    const activeOutlets = outlets.filter(o => o.isOn && !o.sensorFault && !o.isInPhantomFlow && !o.thermalLock);
    if (activeOutlets.length > 0) {
        const target = activeOutlets[Math.floor(Math.random() * activeOutlets.length)];
        target.temperature = 68 + Math.random() * 10;
        updateUI();
        if (target.temperature >= 65 && !target.thermalLock && target.thermalCooldownUntil <= Date.now()) {
            activateOutletThermalProtection(target);
        } else {
            addAlert('temperature', 'ALERTA DE TEMPERATURA', `"${target.name}" a ${Math.round(target.temperature)}°C. Revise la ventilacion.`, null);
        }
    } else {
        triggerFallbackEvent();
    }
}

function executePhantomEvent() {
    const availableOutlets = outlets.filter(o => o.isOn && !o.sensorFault && !o.isInPhantomFlow && !o.thermalLock);
    if (availableOutlets.length === 0) { triggerFallbackEvent(); return; }
    
    const target = availableOutlets[Math.floor(Math.random() * availableOutlets.length)];
    target.isInPhantomFlow = true;
    
    const standbyPower = (Math.random() * 0.7 + 0.2).toFixed(1);
    target.currentPower = parseFloat(standbyPower);
    updateUI();
    
    target.phantomTimer = setTimeout(() => {
        if (!target.isInPhantomFlow) return;
        const phantomPower = Math.round(5 + Math.random() * 15);
        target.currentPower = phantomPower;
        updateUI();
        
        target.phantomTimer = setTimeout(() => {
            if (!target.isInPhantomFlow) return;
            addAlert('phantom', 'CONSUMO FANTASMA DETECTADO', 
                `"${target.name}" consumia ${target.currentPower}W en standby. Se apago automaticamente.`, 
                () => { target.isOn = false; target.currentPower = 0; target.isInPhantomFlow = false; relayCycles[target.id]++; updateUI(); });
            target.isOn = false;
            target.currentPower = 0;
            target.isInPhantomFlow = false;
            relayCycles[target.id]++;
            updateUI();
        }, TRANSITION_PHASE_DURATION);
    }, STANDBY_PHASE_DURATION);
}

function executeSensorEvent() {
    const target = outlets[Math.floor(Math.random() * outlets.length)];
    target.sensorFault = true;
    addAlert('sensor', 'FALLA EN SENSOR', `Sensor de corriente en "${target.name}" fallando. Datos no disponibles por 10 segundos.`, null);
    updateUI();
    setTimeout(() => {
        target.sensorFault = false;
        updateUI();
        addAlert('sensor', 'SENSOR RECUPERADO', `Sensor en "${target.name}" funciona nuevamente.`, null);
    }, 10000);
}

function executeRecognitionEvent() {
    let changesMade = false;
    outlets.forEach(outlet => {
        if (outlet.isOn && !outlet.sensorFault && !outlet.isInPhantomFlow && Math.random() < 0.35) {
            let availableDevices = DEVICES.filter(d => d.id !== outlet.deviceId);
            if (availableDevices.length === 0) return;
            const newDevice = availableDevices[Math.floor(Math.random() * availableDevices.length)];
            outlet.deviceId = newDevice.id;
            outlet.name = newDevice.name;
            outlet.icon = newDevice.icon;
            outlet.minPower = newDevice.minPower;
            outlet.maxPower = newDevice.maxPower;
            outlet.avgPower = newDevice.avgPower;
            outlet.currentPower = getRandomPowerForDevice(newDevice);
            addAlert('recognition', 'NUEVO DISPOSITIVO DETECTADO', `Se detecto "${newDevice.name}" en lugar de "${outlet.name}".`, null);
            changesMade = true;
        }
    });
    if (changesMade) updateUI();
}

function triggerFallbackEvent() {
    if (wifiConnected && !bluetoothActive) executeWifiEvent();
    else {
        const target = outlets[Math.floor(Math.random() * outlets.length)];
        target.sensorFault = true;
        addAlert('sensor', 'FALLA EN SENSOR', `Sensor en "${target.name}" fallando.`, null);
        updateUI();
        setTimeout(() => { target.sensorFault = false; updateUI(); }, 10000);
    }
}

// ==================== SIMULACION ====================
function updateSimulation() {
    let totalPower = 0;
    let totalEnergyDelta = 0;
    let totalCostDelta = 0;
    const currentHour = new Date().getHours();
    
    outlets.forEach(outlet => {
        if (outlet.sensorFault) return;
        if (outlet.isOn && !outlet.isInPhantomFlow && !outlet.thermalLock) {
            let newPower = getRandomPowerForDevice(outlet);
            outlet.currentPower = Math.min(newPower, MAX_PER_OUTLET_WATTS - 10);
            if (outlet.currentPower < 5) outlet.currentPower = 5;
            totalPower += outlet.currentPower;
            const energyDelta = (outlet.currentPower * 1) / 3600000;
            outlet.energyToday += energyDelta;
            totalEnergyDelta += energyDelta;
            outlet.costToday = calculateOutletCost(outlet);
            totalCostDelta += outlet.costToday;
            
            if (lastHourUpdate !== currentHour) {
                outletHistoryData[outlet.id].day.push(outlet.currentPower);
                if (outletHistoryData[outlet.id].day.length > 24) outletHistoryData[outlet.id].day.shift();
            }
        } else if (outlet.isOn && outlet.isInPhantomFlow) {
            totalPower += outlet.currentPower;
            const energyDelta = (outlet.currentPower * 1) / 3600000;
            outlet.energyToday += energyDelta;
            totalEnergyDelta += energyDelta;
            outlet.costToday = calculateOutletCost(outlet);
            totalCostDelta += outlet.costToday;
        } else {
            if (outlet.currentPower > 0 && outlet.currentPower <= 25) {
                totalPower += outlet.currentPower;
                const energyDelta = (outlet.currentPower * 1) / 3600000;
                outlet.energyToday += energyDelta;
                totalEnergyDelta += energyDelta;
                outlet.costToday = calculateOutletCost(outlet);
                totalCostDelta += outlet.costToday;
            } else {
                outlet.currentPower = 0;
            }
        }
        updateOutletTemperature(outlet);
    });
    
    todayEnergyTotal += totalEnergyDelta;
    todayCostTotal = outlets.reduce((sum, o) => sum + o.costToday, 0);
    
    if (lastHourUpdate !== currentHour && totalPower > 0) {
        lastHourUpdate = currentHour;
        updateHistoryData();
    }
    
    updateUI();
}

function updateHistoryData() {
    const totalPowerByHour = outlets.reduce((sum, o) => sum + (o.isOn ? o.currentPower : 0), 0);
    historyData.day.push(Math.round(totalPowerByHour));
    if (historyData.day.length > 24) historyData.day.shift();
    
    const todayAvg = historyData.day.length > 0 ? historyData.day.reduce((a, b) => a + b, 0) / historyData.day.length : 0;
    const dailyTotal = todayAvg * 24;
    historyData.week.push(Math.round(dailyTotal));
    if (historyData.week.length > 7) historyData.week.shift();
    historyData.month.push(Math.round(dailyTotal));
    if (historyData.month.length > 30) historyData.month.shift();
    if (chart) updateChart();
}

function initHistories() {
    historyData.day = []; historyData.week = []; historyData.month = [];
    for (let i = 0; i < 24; i++) historyData.day.push(80 + Math.random() * 200);
    for (let i = 0; i < 7; i++) historyData.week.push(1200 + Math.random() * 800);
    for (let i = 0; i < 30; i++) historyData.month.push(1400 + Math.random() * 1000);
    
    for (let outletId = 0; outletId < 4; outletId++) {
        outletHistoryData[outletId].day = [];
        outletHistoryData[outletId].week = [];
        outletHistoryData[outletId].month = [];
        for (let i = 0; i < 24; i++) outletHistoryData[outletId].day.push(20 + Math.random() * 180);
        for (let i = 0; i < 7; i++) outletHistoryData[outletId].week.push(100 + Math.random() * 300);
        for (let i = 0; i < 30; i++) outletHistoryData[outletId].month.push(80 + Math.random() * 350);
    }
}

// ==================== UI ====================
function toggleOutlet(id, isAuto = false) {
    const outlet = outlets[id];
    if (outlet.thermalLock && !isAuto) { showToast("Proteccion termica activada. Espere.", true); return; }
    const currentTotalPower = outlets.reduce((sum, o) => sum + (o.isOn ? o.currentPower : 0), 0);
    const wouldExceedTotal = !outlet.isOn && (currentTotalPower + outlet.avgPower) > MAX_TOTAL_WATTS;
    
    if (!outlet.isOn && wouldExceedTotal && !isAuto) {
        addAlert('overcurrent', 'NO SE PUEDE ENCENDER', `Encender "${outlet.name}" superaria el limite de ${MAX_TOTAL_WATTS}W.`, null);
        updateUI(); return;
    }
    
    outlet.isOn = !outlet.isOn;
    if (!outlet.isOn) {
        relayCycles[id]++;
        if (!isAuto) showToast(`${outlet.name} apagado`);
        if (outlet.phantomTimer) { clearTimeout(outlet.phantomTimer); outlet.isInPhantomFlow = false; }
        outlet.currentPower = 0;
    } else {
        if (outlet.isInPhantomFlow) { outlet.isInPhantomFlow = false; clearTimeout(outlet.phantomTimer); }
        outlet.currentPower = getRandomPowerForDevice(outlet);
        if (!isAuto) showToast(`${outlet.name} encendido`);
    }
    updateUI();
}

function showOutletHistory(outletId) {
    currentHistoryOutletId = outletId;
    currentHistoryPeriod = 'day';
    updateHistoryModal();
    const modal = document.getElementById('historyModal');
    const title = document.getElementById('historyModalTitle');
    if (title) title.innerHTML = ` Historial - ${outlets[outletId].name}`;
    if (modal) modal.classList.remove('hidden');
}

function updateHistoryModal() {
    if (currentHistoryOutletId === null) return;
    const outlet = outlets[currentHistoryOutletId];
    let data = [], labels = [];
    
    if (currentHistoryPeriod === 'day') {
        data = outletHistoryData[currentHistoryOutletId].day;
        labels = data.map((_, i) => `${i}h`);
    } else if (currentHistoryPeriod === 'week') {
        data = outletHistoryData[currentHistoryOutletId].week;
        labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    } else {
        data = outletHistoryData[currentHistoryOutletId].month;
        labels = data.map((_, i) => `D${i + 1}`);
    }
    
    if (historyChart) historyChart.destroy();
    const ctx = document.getElementById('historyChart').getContext('2d');
    historyChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Consumo (W)', data, borderColor: '#007d1f', backgroundColor: 'rgba(0,125,31,0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
    });
    
    const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
    const max = Math.max(...data).toFixed(1);
    const min = Math.min(...data).toFixed(1);
    const statsDiv = document.getElementById('historyStats');
    if (statsDiv) statsDiv.innerHTML = `
        <div class="history-stat-card"><div class="history-stat-label">Promedio</div><div class="history-stat-value">${avg} W</div></div>
        <div class="history-stat-card"><div class="history-stat-label">Maximo</div><div class="history-stat-value">${max} W</div></div>
        <div class="history-stat-card"><div class="history-stat-label">Minimo</div><div class="history-stat-value">${min} W</div></div>`;
}

function updateUI() {
    document.getElementById('todayCost').innerHTML = `$${todayCostTotal.toFixed(2)}`;
    document.getElementById('todayEnergy').innerHTML = todayEnergyTotal.toFixed(3);
    document.getElementById('totalPower').innerHTML = outlets.reduce((s, o) => s + (o.isOn ? o.currentPower : 0), 0).toFixed(0);
    
    const wifiDiv = document.getElementById('wifiStatus');
    wifiDiv.innerHTML = wifiConnected ? '<i class="fas fa-wifi wifi-on"></i><span>Conectado</span>' : '<i class="fas fa-wifi wifi-off"></i><span>Sin conexion</span>';
    
    const grid = document.getElementById('outletsGrid');
    grid.innerHTML = outlets.map(outlet => {
        const tempClass = outlet.temperature > 65 ? 'danger' : (outlet.temperature > 55 ? 'warning' : 'normal');
        return `
        <div class="outlet-card ${outlet.sensorFault || outlet.thermalLock ? 'disabled' : ''}" onclick="showOutletHistory(${outlet.id})">
            <div class="outlet-header">
                <div class="outlet-name">
                    ${renderIcon(outlet.icon)}
                    <span>${outlet.name}</span>
                </div>
                <button class="power-switch ${outlet.isOn ? 'active' : ''}" onclick="event.stopPropagation(); toggleOutlet(${outlet.id})" ${outlet.sensorFault || outlet.thermalLock ? 'disabled style="opacity:0.5"' : ''}></button>
            </div>
            <div class="consumption-detail">
                <p><span>Potencia actual:</span> <strong>${outlet.sensorFault ? '--' : outlet.currentPower} W</strong></p>
                <p><span>Consumo hoy:</span> <strong>${outlet.energyToday.toFixed(3)} kWh</strong> <span class="cost-value">($${outlet.costToday.toFixed(2)} MXN)</span></p>
            </div>
            <div class="temp-detail">
                <span>Temperatura:</span>
                <span class="temp-badge ${tempClass}"><i class="fas fa-thermometer-half"></i> ${Math.round(outlet.temperature)}°C</span>
            </div>
            ${outlet.isInPhantomFlow && outlet.isOn ? '<div class="warning-badge"><i class="fas fa-moon"></i> Modo standby</div>' : ''}
            ${outlet.sensorFault ? '<div class="fault-badge"><i class="fas fa-exclamation-triangle"></i> Sensor fallando</div>' : ''}
            ${outlet.thermalLock ? '<div class="fault-badge"><i class="fas fa-snowflake"></i> Proteccion termica</div>' : ''}
            <div class="history-hint"><i class="fas fa-chart-line"></i> Ver historial</div>
        </div>`}).join('');
    
    const namesContainer = document.getElementById('outletNamesSettings');
    if (namesContainer) {
        namesContainer.innerHTML = outlets.map(outlet => `
            <div class="settings-row">
                <label>${renderIcon(outlet.icon, '', 'width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;')} ${outlet.name}</label>
                <input type="text" value="${outlet.name}" data-id="${outlet.id}" class="outlet-name-input" placeholder="Nuevo nombre">
            </div>`).join('');
        document.querySelectorAll('.outlet-name-input').forEach(input => input.addEventListener('change', (e) => {
            const id = parseInt(input.dataset.id);
            if (input.value.trim()) outlets[id].name = input.value.trim();
            saveNames(); updateUI();
        }));
    }
    
    document.getElementById('relayCycles').innerHTML = Object.values(relayCycles).reduce((a, b) => a + b, 0);
    renderAutomations();
    renderLearnedDevices();
}

// ==================== AUTOMATIZACIONES ====================
function renderAutomations() {
    const container = document.getElementById('automationsList');
    if (!container) return;
    if (automations.length === 0) { container.innerHTML = '<div class="info-text">No hay automatizaciones configuradas.</div>'; return; }
    container.innerHTML = automations.map(auto => `
        <div class="automation-item" data-id="${auto.id}">
            <div class="automation-info">
                <div class="automation-name">${auto.name}</div>
                <div class="automation-details">${auto.days.join(', ')} · ${auto.startTime} - ${auto.endTime} · ${auto.action === 'on' ? 'Encender' : 'Apagar'} · ${auto.outlets.length} toma(s)</div>
            </div>
            <div class="automation-actions">
                <button class="automation-edit" onclick="editAutomation(${auto.id})"><i class="fas fa-edit"></i></button>
                <button class="automation-delete" onclick="deleteAutomation(${auto.id})"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`).join('');
}

function editAutomation(id) {    
    const auto = automations.find(a => a.id === id);
    if (!auto) return;
    document.getElementById('automationModalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar automatizacion';
    document.getElementById('automationName').value = auto.name;
    document.getElementById('automationStartTime').value = auto.startTime;
    document.getElementById('automationEndTime').value = auto.endTime;
    document.getElementById('automationAction').value = auto.action;
    document.querySelectorAll('#automationOutlets input').forEach(cb => cb.checked = auto.outlets.includes(parseInt(cb.value)));
    document.querySelectorAll('.days-selector input').forEach(cb => cb.checked = auto.days.includes(cb.value));
    const saveBtn = document.getElementById('saveAutomationBtn');
    saveBtn.onclick = () => saveAutomation(id);
    const modal = document.getElementById('automationModal');
    if (modal) modal.classList.remove('hidden');
}

function deleteAutomation(id) {
    automations = automations.filter(a => a.id !== id);
    renderAutomations();
    showToast('Automatizacion eliminada');
}

function saveAutomation(editId = null) {
    const name = document.getElementById('automationName').value.trim();
    if (!name) { showToast('Ingrese un nombre', true); return; }
    const days = Array.from(document.querySelectorAll('.days-selector input:checked')).map(cb => cb.value);
    if (days.length === 0) { showToast('Seleccione al menos un dia', true); return; }
    const startTime = document.getElementById('automationStartTime').value;
    const endTime = document.getElementById('automationEndTime').value;
    const action = document.getElementById('automationAction').value;
    const outletsSel = Array.from(document.querySelectorAll('#automationOutlets input:checked')).map(cb => parseInt(cb.value));
    if (outletsSel.length === 0) { showToast('Seleccione al menos una toma', true); return; }
    
    if (editId) {
        const index = automations.findIndex(a => a.id === editId);
        if (index !== -1) automations[index] = { ...automations[index], name, days, startTime, endTime, action, outlets: outletsSel };
        showToast('Automatizacion actualizada');
    } else {
        automations.push({ id: nextAutomationId++, name, days, startTime, endTime, action, outlets: outletsSel });
        showToast('Automatizacion creada');
    }
    renderAutomations();
    document.getElementById('automationModal').classList.add('hidden');
    resetAutomationForm();
}

function resetAutomationForm() {
    document.getElementById('automationName').value = '';
    document.getElementById('automationStartTime').value = '22:00';
    document.getElementById('automationEndTime').value = '06:00';
    document.getElementById('automationAction').value = 'off';
    document.querySelectorAll('#automationOutlets input').forEach(cb => cb.checked = false);
    document.querySelectorAll('.days-selector input').forEach(cb => cb.checked = false);
    const saveBtn = document.getElementById('saveAutomationBtn');
    saveBtn.onclick = () => saveAutomation();
    document.getElementById('automationModalTitle').innerHTML = '<i class="fas fa-clock"></i> Nueva automatizacion';
}

// ==================== ENTRENAMIENTO ====================
function renderLearnedDevices() {
    const container = document.getElementById('learnedDevicesList');
    if (!container) return;
    const allDevices = [...DEVICES, ...learnedDevices];
    container.innerHTML = allDevices.map(device => `
        <div class="learned-device-item">${renderIcon(device.icon, '', 'width: 16px; height: 16px; margin-right: 6px;')} ${device.name} (${device.minPower}-${device.maxPower}W)</div>`).join('');
}

function startTraining() {
    const select = document.getElementById('trainOutletSelect');
    const outletId = parseInt(select.value);
    const outlet = outlets[outletId];
    currentTrainingReadings = [];
    document.querySelectorAll('.train-step').forEach(step => step.classList.remove('active'));
    document.getElementById('trainStep2').classList.add('active');
    const progressBar = document.getElementById('trainProgressBar');
    const readingsDiv = document.getElementById('trainReadings');
    const statsDiv = document.getElementById('trainStats');
    let progress = 0;
    trainingInterval = setInterval(() => {
        progress += 2;
        progressBar.style.width = `${progress}%`;
        const fakeReading = (Math.random() * (outlet.maxPower - outlet.minPower) + outlet.minPower).toFixed(1);
        currentTrainingReadings.push(parseFloat(fakeReading));
        readingsDiv.innerHTML = `⚡ Mediciones: ${currentTrainingReadings.slice(-8).join(' W, ')} W`;
        if (progress >= 100) {
            clearInterval(trainingInterval);
            const avgReading = (currentTrainingReadings.reduce((a, b) => a + b, 0) / currentTrainingReadings.length).toFixed(1);
            const minReading = Math.min(...currentTrainingReadings).toFixed(1);
            const maxReading = Math.max(...currentTrainingReadings).toFixed(1);
            statsDiv.innerHTML = `<strong>Resultados del analisis:</strong><br>Potencia promedio: ${avgReading} W<br>Minima: ${minReading} W | Maxima: ${maxReading} W`;
            document.getElementById('trainDeviceName').value = `${outlet.name} (nuevo)`;
            document.getElementById('trainStep2').classList.remove('active');
            document.getElementById('trainStep3').classList.add('active');
            window.trainingData = { avg: avgReading, min: minReading, max: maxReading };
        }
    }, 100);
}

function saveLearnedDevice() {
    const deviceName = document.getElementById('trainDeviceName').value.trim();
    const deviceType = document.getElementById('trainDeviceType').value;
    const selectedIcon = document.querySelector('.icon-option.selected')?.dataset.icon || './icons/default.svg';
    if (!deviceName) { showToast('Ingrese un nombre', true); return; }
    let minPower = 0, maxPower = 0, avgPower = 0;
    if (deviceType !== 'new' && window.trainingData) {
        const existingDevice = DEVICES.find(d => d.name.toLowerCase() === deviceType);
        if (existingDevice) { minPower = existingDevice.minPower; maxPower = existingDevice.maxPower; avgPower = existingDevice.avgPower; }
    } else if (window.trainingData) {
        minPower = Math.floor(window.trainingData.min - 20);
        maxPower = Math.ceil(window.trainingData.max + 20);
        avgPower = parseFloat(window.trainingData.avg);
        if (minPower < 1) minPower = 1;
    }
    const newDevice = { id: 200 + learnedDevices.length, name: deviceName, icon: selectedIcon, minPower, maxPower, avgPower, learned: true };
    learnedDevices.push(newDevice);
    document.getElementById('trainStep3').classList.remove('active');
    document.getElementById('trainStep4').classList.add('active');
    const resultDiv = document.getElementById('trainResult');
    resultDiv.innerHTML = `<i class="fas fa-check-circle" style="color:#007d1f; font-size:48px;"></i><p><strong>${deviceName}</strong> registrado.</p><p>Rango: ${minPower}-${maxPower} W</p><p>Promedio: ${avgPower} W</p>`;
    renderLearnedDevices();
}

function resetTrainingUI() {
    if (trainingInterval) clearInterval(trainingInterval);
    document.querySelectorAll('.train-step').forEach(step => step.classList.remove('active'));
    document.getElementById('trainStep1').classList.add('active');
    const progressBar = document.getElementById('trainProgressBar');
    if (progressBar) progressBar.style.width = '0%';
    document.getElementById('trainReadings').innerHTML = '';
    document.getElementById('trainStats').innerHTML = '';
    document.getElementById('trainDeviceName').value = '';
    document.getElementById('trainDeviceType').value = 'new';
    document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.icon-option')?.classList.add('selected');
    window.trainingData = null;
}

// ==================== ALERTAS ====================
let currentFilter = 'all';
function renderAlerts() {
    const container = document.getElementById('alertsList');
    if (!container) return;
    let filtered = currentFilter === 'all' ? alerts : alerts.filter(a => a.type === currentFilter);
    if (filtered.length === 0) { container.innerHTML = '<div style="text-align:center;padding:40px;">No hay alertas recientes</div>'; return; }
    const icons = { overcurrent: 'fa-bolt', temperature: 'fa-temperature-high', temperature_recovery: 'fa-check-circle', phantom: 'fa-brain', wifi: 'fa-wifi', sensor: 'fa-microchip', recognition: 'fa-microchip' };
    container.innerHTML = filtered.map(alert => `
        <div class="alert-item ${alert.type}"><i class="fas ${icons[alert.type] || 'fa-info-circle'}"></i>
        <div class="alert-content"><div class="alert-title">${alert.title}</div><div style="font-size:12px">${alert.message}</div><div class="alert-time">${alert.time}</div></div></div>`).join('');
}

function testAlerts() {
    addAlert('overcurrent', 'SOBRECORRIENTE', 'Toma "TV" supero 1,270W. Apagada.', null);
    setTimeout(() => addAlert('temperature', 'TEMPERATURA', 'Dispositivo a 68°C.', null), 800);
    setTimeout(() => addAlert('phantom', 'CONSUMO FANTASMA', 'Cargadores consume 8W en standby.', null), 1600);
    setTimeout(() => addAlert('wifi', 'WI-FI', 'Perdida de conexion.', null), 2400);
    setTimeout(() => addAlert('sensor', 'SENSOR', 'Sensor fallando.', null), 3200);
    setTimeout(() => addAlert('recognition', 'RECONOCIMIENTO', 'Detectado Microondas.', null), 4000);
    showToast('6 eventos simulados');
}

// ==================== INICIALIZACION ====================
function saveNames() { localStorage.setItem('plugi_outlet_names', JSON.stringify(outlets.map(o => ({ id: o.id, name: o.name })))); }
function loadSavedNames() {
    const saved = localStorage.getItem('plugi_outlet_names');
    if (saved) JSON.parse(saved).forEach(s => { const o = outlets.find(ot => ot.id === s.id); if (o) o.name = s.name; });
}
function saveRates() { localStorage.setItem('plugi_rates', JSON.stringify({ tariff: currentTariff, rates: tariffRates, limits: tariffLimits, levels: tariffLevels })); }
function loadSavedRates() {
    const saved = localStorage.getItem('plugi_rates');
    if (saved) {
        const data = JSON.parse(saved);
        currentTariff = data.tariff;
        tariffRates = data.rates;
        tariffLimits = data.limits;
        tariffLevels = data.levels;
        const select = document.getElementById('tariffType');
        if (select) select.value = currentTariff;
        updateTariffUI();
    }
}
function saveDarkMode() { localStorage.setItem('plugi_dark_mode', isDarkMode); }
function loadDarkMode() {
    const saved = localStorage.getItem('plugi_dark_mode');
    if (saved === 'true') { isDarkMode = true; document.body.classList.add('dark-mode'); document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>'; }
}

function initChart() {
    const ctx = document.getElementById('consumptionChart');
    if (!ctx) return;
    chart = new Chart(ctx.getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Consumo (W)', data: [], borderColor: '#007d1f', backgroundColor: 'rgba(0,125,31,0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } } });
    updateChart();
}
function updateChart() {
    if (!chart) return;
    let labels = [], data = [];
    if (currentChartPeriod === 'day') { labels = historyData.day.map((_, i) => `${i}h`); data = historyData.day; }
    else if (currentChartPeriod === 'week') { labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']; data = historyData.week.slice(0, 7); }
    else { labels = historyData.month.map((_, i) => `D${i + 1}`); data = historyData.month; }
    chart.data.labels = labels; chart.data.datasets[0].data = data; chart.update();
}

function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(btn.dataset.panel).classList.add('active');
    }));
    document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); currentFilter = btn.dataset.filter; renderAlerts();
    }));
    document.querySelectorAll('.period-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); currentChartPeriod = btn.dataset.period; updateChart();
    }));
    document.querySelectorAll('.history-period-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.history-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); currentHistoryPeriod = btn.dataset.historyPeriod; updateHistoryModal();
    }));
    document.getElementById('historyModalClose')?.addEventListener('click', () => document.getElementById('historyModal').classList.add('hidden'));
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.getElementById('themeToggle').innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        saveDarkMode();
        updateAllIconsByMode();
    });
}

function initSettings() {
    const tariffSelect = document.getElementById('tariffType');
    if (tariffSelect) {
        tariffSelect.addEventListener('change', () => {
            currentTariff = tariffSelect.value;
            updateTariffUI();
            saveRates();
        });
    }
    
    document.getElementById('saveRatesBtn')?.addEventListener('click', () => {
        if (tariffLevels === 3) {
            tariffRates = { basic: parseFloat(document.getElementById('basicRate').value), intermediate: parseFloat(document.getElementById('intermediateRate').value), excess: parseFloat(document.getElementById('excessRate').value), intermediateLow: null, intermediateHigh: null };
        } else {
            tariffRates = { basic: parseFloat(document.getElementById('basicRate').value), intermediateLow: parseFloat(document.getElementById('intermediateLowRate').value), intermediateHigh: parseFloat(document.getElementById('intermediateHighRate').value), excess: parseFloat(document.getElementById('excessRate').value), intermediate: null };
        }
        saveRates();
        showToast('Tarifas guardadas');
    });
    document.getElementById('factoryResetBtn')?.addEventListener('click', () => { if (confirm('Restablecer valores?')) { localStorage.clear(); location.reload(); } });
    document.getElementById('testAlertsBtn')?.addEventListener('click', testAlerts);
    document.getElementById('addAutomationBtn')?.addEventListener('click', () => { resetAutomationForm(); document.getElementById('automationModal').classList.remove('hidden'); });
    document.getElementById('automationModalClose')?.addEventListener('click', () => document.getElementById('automationModal').classList.add('hidden'));
    document.getElementById('cancelAutomationBtn')?.addEventListener('click', () => document.getElementById('automationModal').classList.add('hidden'));
    document.getElementById('saveAutomationBtn')?.addEventListener('click', () => saveAutomation());
    document.getElementById('trainDeviceBtn')?.addEventListener('click', () => { resetTrainingUI(); document.getElementById('trainModal').classList.remove('hidden'); });
    document.getElementById('trainModalClose')?.addEventListener('click', () => { resetTrainingUI(); document.getElementById('trainModal').classList.add('hidden'); });
    document.getElementById('trainStep1Next')?.addEventListener('click', startTraining);
    document.getElementById('trainStep3Save')?.addEventListener('click', saveLearnedDevice);
    document.getElementById('trainCloseBtn')?.addEventListener('click', () => { resetTrainingUI(); document.getElementById('trainModal').classList.add('hidden'); });
    document.querySelectorAll('.icon-option').forEach(icon => icon.addEventListener('click', () => {
        document.querySelectorAll('.icon-option').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
    }));
}

function updateAllIconsByMode() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    document.querySelectorAll('img[src*=".svg"]').forEach(img => {
        let src = img.src;
        if (isDarkMode) src = src.replace('_black.svg', '.svg');
        else src = src.replace('.svg', '_black.svg');
        img.src = src;
    });
}

const iconObserver = new MutationObserver(() => updateAllIconsByMode());
iconObserver.observe(document.body, { attributes: true });
document.addEventListener('DOMContentLoaded', updateAllIconsByMode);

function init() {
    console.log("PLUGUI v6 inicializado - Temperatura por toma, Tarifas CFE con niveles");
    loadSavedNames(); loadSavedRates(); loadDarkMode(); loadTariffFromStorage();
    initHistories(); initChart(); initNavigation(); initSettings();
    outlets.forEach(o => { o.currentPower = getRandomPowerForDevice(o); o.energyToday = parseFloat((Math.random() * 0.5).toFixed(3)); o.costToday = calculateOutletCost(o); });
    todayEnergyTotal = outlets.reduce((s, o) => s + o.energyToday, 0);
    todayCostTotal = outlets.reduce((s, o) => s + o.costToday, 0);
    updateUI(); renderAlerts(); renderAutomations(); renderLearnedDevices();
    simulationInterval = setInterval(() => updateSimulation(), 1000);
    randomEventInterval = setInterval(() => executeCyclicEvent(), 30000);
}

window.toggleOutlet = toggleOutlet;
window.showOutletHistory = showOutletHistory;
window.editAutomation = editAutomation;
window.deleteAutomation = deleteAutomation;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();