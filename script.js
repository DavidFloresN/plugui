// ==================== CONSTANTES ====================
const MAX_TOTAL_WATTS = 1905;
const MAX_PER_OUTLET_WATTS = 1270;
const TARIFF_LIMITS = { basic: 50, intermediate: 150 };
const STANDBY_PHASE_DURATION = 8000;
const TRANSITION_PHASE_DURATION = 5000;
const WIFI_LOSS_DURATION = 12000;
const BLUETOOTH_ACTIVATION_DELAY = 1000;

// ==================== LISTA DE DISPOSITIVOS CON RANGOS ====================
const DEVICES = [
    { id: 0, name: 'Refrigerador', icon: './icons/refrigerator.svg', minPower: 80, maxPower: 250, avgPower: 150 },
    { id: 1, name: 'Televisión', icon: 'fa-solid fa-tv', minPower: 50, maxPower: 150, avgPower: 80 },
    { id: 2, name: 'Cargadores', icon: 'fa-solid fa-mobile-button', minPower: 5, maxPower: 80, avgPower: 30 },
    { id: 3, name: 'Computadora', icon: 'fa-solid fa-laptop', minPower: 100, maxPower: 400, avgPower: 180 },
    { id: 4, name: 'Microondas', icon: './icons/microwave.svg', minPower: 700, maxPower: 1300, avgPower: 900 },
    { id: 5, name: 'Licuadora', icon: 'fa-solid fa-blender', minPower: 250, maxPower: 600, avgPower: 400 },
    { id: 6, name: 'Ventilador', icon: 'fa-solid fa-fan', minPower: 30, maxPower: 80, avgPower: 50 },
    { id: 7, name: 'Lámpara', icon: 'fa-solid fa-lightbulb', minPower: 7, maxPower: 15, avgPower: 10 }
];

// Dispositivos aprendidos (se irán agregando)
let learnedDevices = [
    { id: 100, name: 'Cafetera', icon: './icons/coffee-machine.svg', minPower: 600, maxPower: 900, avgPower: 750, learned: true },
    { id: 101, name: 'Secadora', icon: './icons/dryer.svg', minPower: 300, maxPower: 800, avgPower: 500, learned: true }
];

// ==================== AUTOMATIZACIONES ====================
let automations = [
    { id: 1, name: 'Apagar todo por la noche', days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], startTime: '23:00', endTime: '06:00', action: 'off', outlets: [0, 1, 2, 3] },
    { id: 2, name: 'Encender computadora', days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], startTime: '08:00', endTime: '18:00', action: 'on', outlets: [3] }
];
let nextAutomationId = 3;

// ==================== DATOS DE TOMAS ====================
const defaultOutlets = [
    { id: 0, name: 'Refrigerador', icon: './icons/refrigerator.svg', minPower: 80, maxPower: 250, avgPower: 150, isOn: true, currentPower: 0, energyToday: 0, history: [], sensorFault: false, deviceId: 0, isInPhantomFlow: false, phantomTimer: null, originalAvgPower: 150 },
    { id: 1, name: 'Televisión', icon: 'fa-solid fa-tv', minPower: 50, maxPower: 150, avgPower: 80, isOn: true, currentPower: 0, energyToday: 0, history: [], sensorFault: false, deviceId: 1, isInPhantomFlow: false, phantomTimer: null, originalAvgPower: 80 },
    { id: 2, name: 'Cargadores', icon: 'fa-solid fa-mobile-button', minPower: 5, maxPower: 80, avgPower: 30, isOn: true, currentPower: 0, energyToday: 0, history: [], sensorFault: false, deviceId: 2, isInPhantomFlow: false, phantomTimer: null, originalAvgPower: 30 },
    { id: 3, name: 'Computadora', icon: 'fa-solid fa-laptop', minPower: 100, maxPower: 400, avgPower: 180, isOn: true, currentPower: 0, energyToday: 0, history: [], sensorFault: false, deviceId: 3, isInPhantomFlow: false, phantomTimer: null, originalAvgPower: 180 }
];

// ==================== VARIABLES GLOBALES ====================
let outlets = JSON.parse(JSON.stringify(defaultOutlets));
let todayEnergyTotal = 0;
let todayCostTotal = 0;
let alerts = [];
let relayCycles = { 0: 1250, 1: 890, 2: 2340, 3: 567 };
let wifiConnected = true;
let bluetoothActive = false;
let deviceTemp = 42;
let currentTariff = { basic: 1.116, intermediate: 1.357, excess: 3.50 };
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
let thermalLock = false;
let previousPowerState = [];
let thermalCooldownUntil = 0;
let isDarkMode = false;

// Variables de entrenamiento
let currentTrainingReadings = [];
let trainingInterval = null;

// ==================== MODO DEPURACIÓN ====================
const EVENT_ORDER = ['overcurrent', 'temperature', 'phantom', 'wifi', 'sensor', 'recognition'];
let currentEventIndex = 0;
let isExecutingEvent = false;

// ==================== FUNCIÓN PARA RENDERIZAR ICONOS ====================
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

function getCurrentRate() {
    const kwh = todayEnergyTotal;
    if (kwh <= TARIFF_LIMITS.basic) return currentTariff.basic;
    if (kwh <= TARIFF_LIMITS.intermediate) return currentTariff.intermediate;
    return currentTariff.excess;
}

function getRandomPowerForDevice(device) {
    const min = device.minPower;
    const max = device.maxPower;
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

// ==================== BLUETOOTH COMO RESPALDO ====================
function activateBluetooth() {
    bluetoothActive = true;
    const btStatus = document.getElementById('bluetoothStatus');
    if (btStatus) btStatus.style.display = 'flex';
    showToast('Activando Bluetooth - Control local disponible');
    showPushNotification('Bluetooth activado. Control local disponible.');
    console.log("Bluetooth activado como respaldo");
}

function deactivateBluetooth() {
    bluetoothActive = false;
    const btStatus = document.getElementById('bluetoothStatus');
    if (btStatus) btStatus.style.display = 'none';
    showToast('Desactivando Bluetooth - Control por nube restablecido');
    showPushNotification('Bluetooth desactivado. Control por nube restablecido.');
    console.log("Bluetooth desactivado");
}

// ==================== EVENTOS CÍCLICOS ====================
function executeCyclicEvent() {
    if (thermalLock) {
        console.log("Evento pospuesto: Protección térmica activada");
        setTimeout(() => executeCyclicEvent(), 5000);
        return;
    }
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
    addAlert('wifi', 'WiFi DESCONECTADO', 'Pérdida de conexión a internet. Activando Bluetooth como respaldo.', null);
    
    bluetoothActivationTimeout = setTimeout(() => {
        activateBluetooth();
        updateUI();
    }, BLUETOOTH_ACTIVATION_DELAY);
    
    wifiLossTimeout = setTimeout(() => {
        wifiConnected = true;
        updateUI();
        addAlert('wifi', 'WiFi RECONECTADO', 'Conexión restablecida. Desactivando Bluetooth.', null);
        setTimeout(() => { deactivateBluetooth(); updateUI(); }, 1000);
    }, WIFI_LOSS_DURATION);
}

function executeOvercurrentEvent() {
    const onOutlets = outlets.filter(o => o.isOn && !o.sensorFault && !o.isInPhantomFlow);
    if (onOutlets.length > 0) {
        const target = onOutlets[Math.floor(Math.random() * onOutlets.length)];
        addAlert('overcurrent', 'SOBRECORRIENTE DETECTADA', `"${target.name}" superó el límite de 1,270W. Se apagó automáticamente.`, 
            () => toggleOutlet(target.id, true));
    } else {
        triggerFallbackEvent();
    }
}

function executeTemperatureEvent() {
    deviceTemp = 68 + Math.random() * 10;
    updateUI();
    if (deviceTemp >= 65 && !thermalLock && thermalCooldownUntil <= Date.now()) {
        activateThermalProtection();
    } else {
        addAlert('temperature', 'ALERTA DE TEMPERATURA', `Dispositivo a ${Math.round(deviceTemp)}°C. Revise la ventilación.`, null);
    }
}

function executePhantomEvent() {
    const availableOutlets = outlets.filter(o => o.isOn && !o.sensorFault && !o.isInPhantomFlow && !thermalLock);
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
                `"${target.name}" consumía ${target.currentPower}W en standby. Se apagó automáticamente.`, 
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
            addAlert('recognition', 'NUEVO DISPOSITIVO DETECTADO', `Se detectó "${newDevice.name}" conectado en lugar de "${outlet.name}".`, null);
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
        addAlert('sensor', '🔧 FALLA EN SENSOR', `Sensor en "${target.name}" fallando.`, null);
        updateUI();
        setTimeout(() => { target.sensorFault = false; updateUI(); }, 10000);
    }
}

// ==================== TEMPERATURA ====================
function updateDeviceTemperature() {
    if (thermalCooldownUntil > Date.now() && deviceTemp < 55) return;
    if (thermalLock) return;
    
    let totalLoad = outlets.reduce((sum, o) => sum + (o.isOn ? o.currentPower : 0), 0);
    let newTemp = 35 + (totalLoad / 2000) * 45 + (Math.random() - 0.5) * 2;
    deviceTemp = Math.min(85, Math.max(25, Math.round(newTemp)));
    
    if (deviceTemp >= 65 && !thermalLock && thermalCooldownUntil <= Date.now()) {
        activateThermalProtection();
    }
}

function activateThermalProtection() {
    thermalLock = true;
    previousPowerState = outlets.map(o => o.isOn);
    outlets.forEach(outlet => {
        if (outlet.isOn) {
            outlet.isOn = false;
            if (outlet.phantomTimer) { clearTimeout(outlet.phantomTimer); outlet.isInPhantomFlow = false; }
            relayCycles[outlet.id]++;
        }
    });
    addAlert('temperature', 'ALERTA DE TEMPERATURA CRÍTICA', `Dispositivo a ${Math.round(deviceTemp)}°C (>65°C). Todos los contactos apagados por 15 segundos.`, null);
    updateUI();
    
    setTimeout(() => {
        deviceTemp = 45;
        updateUI();
        addAlert('temperature_recovery', 'TEMPERATURA NORMALIZADA', `Dispositivo a ${Math.round(deviceTemp)}°C. Reanudando en 5 segundos...`, null);
        setTimeout(() => {
            outlets.forEach((outlet, idx) => {
                if (previousPowerState[idx] && !outlet.isOn) {
                    outlet.isOn = true;
                    outlet.currentPower = getRandomPowerForDevice(outlet);
                }
            });
            thermalLock = false;
            thermalCooldownUntil = Date.now() + 25000;
            updateUI();
            addAlert('temperature_recovery', 'SISTEMA REACTIVADO', 'Contactos restablecidos.', null);
        }, 5000);
    }, 10000);
}

// ==================== SIMULACIÓN ====================
function updateSimulation() {
    let totalPower = 0;
    let totalEnergyDelta = 0;
    const currentHour = new Date().getHours();
    
    outlets.forEach(outlet => {
        if (outlet.sensorFault) return;
        if (outlet.isOn && !outlet.isInPhantomFlow) {
            let newPower = getRandomPowerForDevice(outlet);
            outlet.currentPower = Math.min(newPower, MAX_PER_OUTLET_WATTS - 10);
            if (outlet.currentPower < 5) outlet.currentPower = 5;
            totalPower += outlet.currentPower;
            const energyDelta = (outlet.currentPower * 1) / 3600000;
            outlet.energyToday += energyDelta;
            totalEnergyDelta += energyDelta;
            
            if (lastHourUpdate !== currentHour) {
                outletHistoryData[outlet.id].day.push(outlet.currentPower);
                if (outletHistoryData[outlet.id].day.length > 24) outletHistoryData[outlet.id].day.shift();
            }
        } else if (outlet.isOn && outlet.isInPhantomFlow) {
            totalPower += outlet.currentPower;
            totalEnergyDelta += (outlet.currentPower * 1) / 3600000;
            outlet.energyToday += (outlet.currentPower * 1) / 3600000;
        } else {
            if (outlet.currentPower > 0 && outlet.currentPower <= 25) {
                totalPower += outlet.currentPower;
                totalEnergyDelta += (outlet.currentPower * 1) / 3600000;
                outlet.energyToday += (outlet.currentPower * 1) / 3600000;
            } else {
                outlet.currentPower = 0;
            }
        }
    });
    
    todayEnergyTotal += totalEnergyDelta;
    todayCostTotal += totalEnergyDelta * getCurrentRate();
    
    if (lastHourUpdate !== currentHour && totalPower > 0) {
        lastHourUpdate = currentHour;
        updateHistoryData();
    }
    
    updateUI();
    updateDeviceTemperature();
}

function updateHistoryData() {
    const totalPowerByHour = outlets.reduce((sum, o) => sum + (o.isOn ? o.currentPower : 0), 0);
    historyData.day.push(Math.round(totalPowerByHour * 10) / 10);
    if (historyData.day.length > 24) historyData.day.shift();
    
    const todayAvg = historyData.day.length > 0 ? historyData.day.reduce((a, b) => a + b, 0) / historyData.day.length : 0;
    const dailyTotal = todayAvg * 24;
    historyData.week.push(Math.round(dailyTotal * 10) / 10);
    if (historyData.week.length > 7) historyData.week.shift();
    historyData.month.push(Math.round(dailyTotal * 10) / 10);
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
    if (thermalLock && !isAuto) { showToast("Protección térmica activada.", true); return; }
    const outlet = outlets[id];
    const currentTotalPower = outlets.reduce((sum, o) => sum + (o.isOn ? o.currentPower : 0), 0);
    const wouldExceedTotal = !outlet.isOn && (currentTotalPower + outlet.avgPower) > MAX_TOTAL_WATTS;
    
    if (!outlet.isOn && wouldExceedTotal && !isAuto) {
        addAlert('overcurrent', 'NO SE PUEDE ENCENDER', `Encender "${outlet.name}" superaría el límite de ${MAX_TOTAL_WATTS}W.`, null);
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
        labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    } else {
        data = outletHistoryData[currentHistoryOutletId].month;
        labels = data.map((_, i) => `D${i + 1}`);
    }
    
    if (historyChart) historyChart.destroy();
    const ctx = document.getElementById('historyChart').getContext('2d');
    historyChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Consumo (W)', data, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
    });
    
    const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
    const max = Math.max(...data).toFixed(1);
    const min = Math.min(...data).toFixed(1);
    const statsDiv = document.getElementById('historyStats');
    if (statsDiv) statsDiv.innerHTML = `
        <div class="history-stat-card"><div class="history-stat-label">Promedio</div><div class="history-stat-value">${avg} W</div></div>
        <div class="history-stat-card"><div class="history-stat-label">Máximo</div><div class="history-stat-value">${max} W</div></div>
        <div class="history-stat-card"><div class="history-stat-label">Mínimo</div><div class="history-stat-value">${min} W</div></div>`;
}

function updateUI() {
    document.getElementById('todayCost').innerHTML = `$${todayCostTotal.toFixed(2)}`;
    document.getElementById('todayEnergy').innerHTML = todayEnergyTotal.toFixed(3);
    document.getElementById('totalPower').innerHTML = outlets.reduce((s, o) => s + (o.isOn ? o.currentPower : 0), 0).toFixed(0);
    document.getElementById('tempValue').innerHTML = `${Math.round(deviceTemp)}°C`;
    
    const wifiDiv = document.getElementById('wifiStatus');
    wifiDiv.innerHTML = wifiConnected ? '<i class="fas fa-wifi wifi-on"></i><span>Conectado</span>' : '<i class="fas fa-wifi wifi-off"></i><span>Sin conexión</span>';
    
    const tempDiv = document.getElementById('tempStatus');
    if (deviceTemp > 65) tempDiv.className = 'status-item temp-danger';
    else if (deviceTemp > 55) tempDiv.className = 'status-item temp-warning';
    else tempDiv.className = 'status-item temp-normal';
    
    // Dashboard - Tomas grid
    const grid = document.getElementById('outletsGrid');
    grid.innerHTML = outlets.map(outlet => `
        <div class="outlet-card ${outlet.sensorFault || thermalLock ? 'disabled' : ''}" onclick="showOutletHistory(${outlet.id})">
            <div class="outlet-header">
                <div class="outlet-name">
                    ${renderIcon(outlet.icon)}
                    <span>${outlet.name}</span>
                </div>
                <button class="power-switch ${outlet.isOn ? 'active' : ''}" onclick="event.stopPropagation(); toggleOutlet(${outlet.id})" ${outlet.sensorFault || thermalLock ? 'disabled style="opacity:0.5"' : ''}></button>
            </div>
            <div class="consumption-detail">
                <p><span>Potencia actual:</span> <strong>${outlet.sensorFault ? '--' : outlet.currentPower} W</strong></p>
                <p><span>Consumo hoy:</span> <strong>${outlet.energyToday.toFixed(3)} kWh</strong></p>
            </div>
            ${outlet.isInPhantomFlow && outlet.isOn ? '<div class="warning-badge"><i class="fas fa-moon"></i> Modo standby</div>' : ''}
            ${outlet.sensorFault ? '<div class="fault-badge"><i class="fas fa-exclamation-triangle"></i> Sensor fallando</div>' : ''}
            ${thermalLock ? '<div class="fault-badge"><i class="fas fa-snowflake"></i> Protección térmica</div>' : ''}
            <div class="history-hint"><i class="fas fa-chart-line"></i> Ver historial</div>
        </div>`).join('');
    
    // Ranking
    const ranking = [...outlets].sort((a, b) => b.currentPower - a.currentPower);
    document.getElementById('rankingList').innerHTML = ranking.map((outlet, idx) => `
        <div class="ranking-item"><span class="rank-number">${idx + 1}</span><span>${outlet.name}</span><strong>${outlet.sensorFault ? '--' : outlet.currentPower} W</strong></div>`).join('');
    
    // Configuración - Nombrar tomas
    const namesContainer = document.getElementById('outletNamesSettings');
    namesContainer.innerHTML = outlets.map(outlet => `
        <div class="settings-row">
            <label>
                ${renderIcon(outlet.icon, '', 'width: 18px; height: 18px; vertical-align: middle; margin-right: 6px;')}
                ${outlet.name}
            </label>
            <input type="text" value="${outlet.name}" data-id="${outlet.id}" class="outlet-name-input" placeholder="Nuevo nombre">
        </div>
    `).join('');
    
    document.querySelectorAll('.outlet-name-input').forEach(input => input.addEventListener('change', (e) => {
        const id = parseInt(input.dataset.id);
        if (input.value.trim()) outlets[id].name = input.value.trim();
        saveNames(); updateUI();
    }));
    
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
    document.getElementById('automationModalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar automatización';
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
    showToast('Automatización eliminada');
}

function saveAutomation(editId = null) {
    const name = document.getElementById('automationName').value.trim();
    if (!name) { showToast('Ingrese un nombre', true); return; }
    const days = Array.from(document.querySelectorAll('.days-selector input:checked')).map(cb => cb.value);
    if (days.length === 0) { showToast('Seleccione al menos un día', true); return; }
    const startTime = document.getElementById('automationStartTime').value;
    const endTime = document.getElementById('automationEndTime').value;
    const action = document.getElementById('automationAction').value;
    const outletsSel = Array.from(document.querySelectorAll('#automationOutlets input:checked')).map(cb => parseInt(cb.value));
    if (outletsSel.length === 0) { showToast('Seleccione al menos una toma', true); return; }
    
    if (editId) {
        const index = automations.findIndex(a => a.id === editId);
        if (index !== -1) automations[index] = { ...automations[index], name, days, startTime, endTime, action, outlets: outletsSel };
        showToast('Automatización actualizada');
    } else {
        automations.push({ id: nextAutomationId++, name, days, startTime, endTime, action, outlets: outletsSel });
        showToast('Automatización creada');
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
    document.getElementById('automationModalTitle').innerHTML = '<i class="fas fa-clock"></i> Nueva automatización';
}

// ==================== ENTRENAMIENTO MEJORADO ====================
function renderLearnedDevices() {
    const container = document.getElementById('learnedDevicesList');
    if (!container) return;
    const allDevices = [...DEVICES, ...learnedDevices];
    container.innerHTML = allDevices.map(device => `
        <div class="learned-device-item">
            ${renderIcon(device.icon, '', 'width: 16px; height: 16px; margin-right: 6px;')}
            ${device.name} (${device.minPower}-${device.maxPower}W)
        </div>
    `).join('');
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
            statsDiv.innerHTML = `<strong>Resultados del análisis:</strong><br>📊 Potencia promedio: ${avgReading} W<br>📈 Mínima: ${minReading} W | Máxima: ${maxReading} W`;
            
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
    
    if (!deviceName) { showToast('Ingrese un nombre para el dispositivo', true); return; }
    
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
    resultDiv.innerHTML = `
        <i class="fas fa-check-circle" style="color:#10b981; font-size:48px;"></i>
        <p><strong>${deviceName}</strong> ha sido registrado exitosamente.</p>
        <p>Rango detectado: ${minPower}-${maxPower} W</p>
        <p>Potencia promedio: ${avgPower} W</p>
    `;
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
        <div class="alert-item ${alert.type}">
            <i class="fas ${icons[alert.type] || 'fa-info-circle'}"></i>
            <div class="alert-content"><div class="alert-title">${alert.title}</div><div style="font-size:12px">${alert.message}</div><div class="alert-time">${alert.time}</div></div>
        </div>`).join('');
}

function testAlerts() {
    addAlert('overcurrent', 'SOBRECORRIENTE', 'Toma "TV" superó 1,270W. Apagada.', null);
    setTimeout(() => addAlert('temperature', 'TEMPERATURA', 'Dispositivo a 68°C.', null), 800);
    setTimeout(() => addAlert('phantom', 'CONSUMO FANTASMA', 'Cargadores consume 8W en standby.', null), 1600);
    setTimeout(() => addAlert('wifi', 'Wi-Fi', 'Pérdida de conexión.', null), 2400);
    setTimeout(() => addAlert('sensor', 'SENSOR', 'Sensor fallando.', null), 3200);
    setTimeout(() => addAlert('recognition', 'RECONOCIMIENTO', 'Detectado Microondas.', null), 4000);
    showToast('🔧 6 eventos simulados');
}

// ==================== INICIALIZACIÓN ====================
function saveNames() { localStorage.setItem('plugi_outlet_names', JSON.stringify(outlets.map(o => ({ id: o.id, name: o.name })))); }
function loadSavedNames() {
    const saved = localStorage.getItem('plugi_outlet_names');
    if (saved) JSON.parse(saved).forEach(s => { const o = outlets.find(ot => ot.id === s.id); if (o) o.name = s.name; });
}
function saveRates() { localStorage.setItem('plugi_rates', JSON.stringify(currentTariff)); }
function loadSavedRates() {
    const saved = localStorage.getItem('plugi_rates');
    if (saved) { currentTariff = JSON.parse(saved);
        document.getElementById('basicRate').value = currentTariff.basic;
        document.getElementById('intermediateRate').value = currentTariff.intermediate;
        document.getElementById('excessRate').value = currentTariff.excess;
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
    chart = new Chart(ctx.getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Consumo (Wh)', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } } });
    updateChart();
}
function updateChart() {
    if (!chart) return;
    let labels = [], data = [];
    if (currentChartPeriod === 'day') { labels = historyData.day.map((_, i) => `${i}h`); data = historyData.day; }
    else if (currentChartPeriod === 'week') { labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']; data = historyData.week.slice(0, 7); }
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
    });
}

function initSettings() {
    document.getElementById('saveRatesBtn')?.addEventListener('click', () => {
        currentTariff.basic = parseFloat(document.getElementById('basicRate').value);
        currentTariff.intermediate = parseFloat(document.getElementById('intermediateRate').value);
        currentTariff.excess = parseFloat(document.getElementById('excessRate').value);
        saveRates(); showToast('Tarifas guardadas');
    });
    document.getElementById('factoryResetBtn')?.addEventListener('click', () => { if (confirm('¿Restablecer valores?')) { localStorage.clear(); location.reload(); } });
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

function init() {
    console.log("========================================");
    console.log("🔌 PLUGI v5 - VERSIÓN COMPLETA CON SVG PERSONALIZADOS");
    console.log("========================================");
    loadSavedNames(); loadSavedRates(); loadDarkMode();
    initHistories(); initChart(); initNavigation(); initSettings();
    outlets.forEach(o => { o.currentPower = getRandomPowerForDevice(o); o.energyToday = parseFloat((Math.random() * 0.5).toFixed(3)); });
    todayEnergyTotal = outlets.reduce((s, o) => s + o.energyToday, 0);
    todayCostTotal = todayEnergyTotal * currentTariff.basic;
    updateUI(); renderAlerts(); renderAutomations(); renderLearnedDevices();
    simulationInterval = setInterval(() => updateSimulation(), 1000);
    randomEventInterval = setInterval(() => executeCyclicEvent(), 30000);
    console.log("PLUGI inicializado");
}

// ==================== VERSIÓN SIMPLIFICADA ====================

function updateAllIconsByMode() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Para cada imagen SVG, cambiar la ruta
    document.querySelectorAll('img[src*=".svg"]').forEach(img => {
        let src = img.src;
        
        if (isDarkMode) {
            // Modo oscuro: quitar _black
            src = src.replace('_black.svg', '.svg');
        } else {
            // Modo claro: agregar _black antes de .svg
            src = src.replace('.svg', '_black.svg');
        }
        
        img.src = src;
    });
}

// Detectar cambio de modo
const observer = new MutationObserver(() => updateAllIconsByMode());
observer.observe(document.body, { attributes: true });

// Ejecutar al inicio
document.addEventListener('DOMContentLoaded', updateAllIconsByMode);

// También al hacer toggle del tema
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => setTimeout(updateAllIconsByMode, 50));
}

window.toggleOutlet = toggleOutlet;
window.showOutletHistory = showOutletHistory;
window.editAutomation = editAutomation;
window.deleteAutomation = deleteAutomation;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();