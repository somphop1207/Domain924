
// Automatic Browser Cache & Storage Purge for New Daily Intelligence Reports
(function purgeOldCaches() {
    try {
        const CURRENT_DEPLOY_VER = "24AUG2569_BUILD_1127";
        if (typeof localStorage !== 'undefined') {
            const savedVer = localStorage.getItem('bpp924_active_ver');
            if (savedVer !== CURRENT_DEPLOY_VER) {
                localStorage.clear();
                sessionStorage.clear();
                localStorage.setItem('bpp924_active_ver', CURRENT_DEPLOY_VER);
                console.log("Purged old cached intelligence data. Active version:", CURRENT_DEPLOY_VER);
            }
        }
    } catch (e) {}
})();

/**
 * BPP TF 924 Portal - Core Application Logic
 * Integrates Leaflet, Chart.js, Search Engine, DOCX Parser & Modal Handlers
 */

let appMap = null;
let mapMarkersLayer = null;
let platoonChartInstance = null;
let categoryChartInstance = null;

let currentData = null;
let activeTab = 'home';
let activeMapFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize with default dataset
    currentData = window.BPP924_DATA;

    initNavigation();
    initClock();
    renderAllViews();
    initDropZone();

    // Lucide icons initialization
    if (window.lucide) {
        lucide.createIcons();
    }
});

// Navigation Controller
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    
    // Update all desktop and mobile navigation buttons
    document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update tab sections
    document.querySelectorAll('.tab-section').forEach(sec => {
        if (sec.id === `section-${tabId}`) {
            sec.classList.remove('hidden');
        } else {
            sec.classList.add('hidden');
        }
    });

    // Scroll to top smoothly on tab switch
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-render map and charts if dashboard is opened with multi-step delay for mobile
    if (tabId === 'dashboard') {
        setTimeout(() => {
            initOrUpdateMap();
            initOrUpdateCharts();
            if (appMap) appMap.invalidateSize();
        }, 150);
        setTimeout(() => {
            if (appMap) appMap.invalidateSize();
        }, 400);
    }

    // Refresh icons
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Live Military Clock (Thailand UTC+7)
function initClock() {
    function updateTime() {
        const now = new Date();
        const options = { timeZone: 'Asia/Bangkok', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const timeStr = now.toLocaleTimeString('th-TH', options);
        
        const dateOptions = { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'short', day: 'numeric' };
        const dateStr = now.toLocaleDateString('th-TH', dateOptions);

        const clockEl = document.getElementById('liveClock');
        if (clockEl) {
            clockEl.innerHTML = `<span class="text-amber-400 font-mono font-bold tracking-wider">${timeStr}</span> <span class="text-xs text-slate-400">ICT | ${dateStr}</span>`;
        }
    }
    updateTime();
    setInterval(updateTime, 1000);
}

// Master Render Function
function renderAllViews() {
    renderHomeView();
    renderDashboardView();
    renderDatabaseView();
    renderNewsView();
    renderAboutView();
    renderOperationalHighlights();
}

// 1. Home View
function renderHomeView() {
    try {
        const report = currentData.latestReport;
        const summary = report.summary || {};
        const unit = currentData.unitInfo || {};

        const el = (id) => document.getElementById(id);
        if (el('homeDocNumber')) el('homeDocNumber').textContent = report.dispatchRef || report.dispatchNumber || report.docNumber || 'ที่ นร.๕๑๑๙.๑(ฉก.ตร.ปน.9๒).9๒๔/ยก./1140';
        if (el('homeReportDate')) el('homeReportDate').textContent = report.dateTh;
        if (el('homeReportTime')) el('homeReportTime').textContent = report.timeRange || report.timeRangeTh || '๒๖๑๕๐๑ ส.ค. ๖๙ ถึง ๒๗๑๕๐๐ ส.ค. ๖๙';
        if (el('homeSituationBrief')) el('homeSituationBrief').textContent = 'เหตุการณ์ทั่วไปปกติ กำลังพลทุกชุดปฏิบัติการพร้อมปฏิบัติหน้าที่ ๑๐๐%';
        if (el('homeCommanderName')) el('homeCommanderName').textContent = `${unit.commander ? unit.commander.rank + unit.commander.name : 'ร.ต.อ.เดชเดโช ส่งสีอ่อน'} (${unit.commander ? unit.commander.callSign : 'เหมราช 41'})`;

        if (el('statTotalOps')) el('statTotalOps').textContent = summary.totalMissions || report.items.length;
        if (el('statPatrolOps')) el('statPatrolOps').textContent = summary.patrols || 0;
        if (el('statCivilOps')) el('statCivilOps').textContent = summary.checkpoints || 0;
        if (el('statReadiness')) el('statReadiness').textContent = `${summary.readinessPercentage || 100}%`;
    } catch (e) {
        console.error("Error in renderHomeView:", e);
    }
}

// 2. Commander Dashboard View
function renderDashboardView() {
    try {
        const report = currentData.latestReport;
        const summary = report.summary || {};
        const unit = currentData.unitInfo || {};

        const el = (id) => document.getElementById(id);
        if (el('dashDocNum')) el('dashDocNum').textContent = report.dispatchRef || report.dispatchNumber || report.docNumber || 'ที่ นร.๕๑๑๙.๑(ฉก.ตร.ปน.9๒).9๒๔/ยก./1140';
        if (el('dashDateRange')) el('dashDateRange').textContent = report.timeRange;
        if (el('dashSituation')) el('dashSituation').textContent = 'เหตุการณ์ทั่วไปปกติ ไม่พบการกระทำผิดหรือสิ่งบอกเหตุความรุนแรง';
        if (el('dashApprover')) el('dashApprover').textContent = `${unit.commander ? unit.commander.rank + unit.commander.name : 'ร.ต.อ.เดชเดโช ส่งสีอ่อน'}`;

        // KPI Counters
        if (el('dashKpiTotal')) el('dashKpiTotal').textContent = summary.totalMissions || report.items.length;
        if (el('dashKpiPatrol')) el('dashKpiPatrol').textContent = summary.patrols || 0;
        if (el('dashKpiCheckpoint')) el('dashKpiCheckpoint').textContent = summary.checkpoints || 0;
        if (el('dashKpiCivil')) el('dashKpiCivil').textContent = summary.civilAffairs || 0;
        if (el('dashKpiSpecial')) el('dashKpiSpecial').textContent = summary.securityChecks || 0;
        if (el('dashKpiDrill')) el('dashKpiDrill').textContent = summary.training || 0;

        // Render 24H Ops Timeline list
        const timelineEl = el('dashTimelineList');
        if (timelineEl) {
            timelineEl.innerHTML = '';
            report.items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'flex items-start space-x-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 transition-colors cursor-pointer';
                row.onclick = () => openItemDetailModal(item);
                const thumbImg = item.images && item.images.length > 0 ? item.images[0] : (item.image || null);
                row.innerHTML = `
                    <div class="flex items-start space-x-3 w-full">
                        ${thumbImg ? `<div class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700 cursor-pointer" onclick="event.stopPropagation(); openPhotoLightbox('${thumbImg}', '${item.categoryTh}', '${item.missionDetail}')"><img src="${thumbImg}" class="w-full h-full object-cover hover:scale-110 transition-transform"></div>` : ''}
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-1">
                                <span class="text-xs font-bold text-slate-100 truncate">${item.categoryTh}</span>
                                <span class="text-[11px] font-mono font-bold text-amber-300">${item.timeTh}</span>
                            </div>
                            <div class="text-[11px] text-amber-400 font-mono font-semibold">${item.unit} • ${item.leader} (${item.callSign})</div>
                            <p class="text-xs text-slate-300 mt-0.5 font-sarabun line-clamp-2 leading-relaxed">${item.missionDetail}</p>
                        </div>
                    </div>
                `;
                timelineEl.appendChild(row);
            });
        }

        if (activeTab === 'dashboard') {
            initOrUpdateMap();
            initOrUpdateCharts();
        }
    } catch (e) {
        console.error("Error in renderDashboardView:", e);
    }
}

// Tactical Map Initialization & Markers
function initOrUpdateMap() {
    const mapContainer = document.getElementById('operationsMap');
    if (!mapContainer) return;

    if (!appMap) {
        // Centered around Pattani Mueang / Rusamilae / Pakaharang (6.855, 101.225)
        appMap = L.map('operationsMap', {
            zoomControl: true,
            attributionControl: false
        }).setView([6.855, 101.225], 13);

        // Map Layers
        const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        });
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        });
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        });

        // Default to Dark layer
        darkLayer.addTo(appMap);

        const baseMaps = {
            "แผนที่ยุทธการ (Dark Tactical)": darkLayer,
            "ภาพถ่ายดาวเทียม (Satellite HD)": satelliteLayer,
            "แผนที่ถนน (OpenStreetMap)": osmLayer
        };
        L.control.layers(baseMaps, null, { position: 'topright' }).addTo(appMap);

        mapMarkersLayer = L.layerGroup().addTo(appMap);

        // Click to get MGRS Coordinates
        appMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <div class="p-2 text-xs">
                        <p class="font-bold text-amber-400">พิกัดทางยุทธวิธี</p>
                        <p class="text-slate-300 font-mono">Lat/Lng: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                        <p class="text-slate-400 mt-1">พื้นที่: อ.เมือง จ.ปัตตานี (ร้อย ฉก.ตชด.924)</p>
                    </div>
                `)
                .openOn(appMap);
        });
    } else {
        appMap.invalidateSize();
    }

    plotTacticalMarkers();
}

function plotTacticalMarkers() {
    if (!mapMarkersLayer || !appMap) return;
    mapMarkersLayer.clearLayers();

    const items = (currentData && currentData.latestReport && currentData.latestReport.items) ? currentData.latestReport.items : [];
    const filter = activeMapFilter;
    const bounds = L.latLngBounds();

    let plottedCount = 0;

    // Track overlapping coordinates to apply tiny realistic 10-15m roadside micro-offset
    const coordCounts = {};

    items.forEach((item, idx) => {
        // Exclude invalid coordinates
        if (item.grid && item.grid.includes('51800 56200')) return;

        // Filter logic
        if (filter !== 'all') {
            if (filter === 'security_check' && item.category !== 'security_check') return;
            if (filter === 'checkpoint' && item.category !== 'checkpoint') return;
            if (filter === 'patrol' && !item.category.includes('patrol')) return;
            if (filter === 'vulnerable' && item.category !== 'vulnerable') return;
            if (filter === 'civil_affairs' && item.category !== 'civil_affairs') return;
        }

        let baseLat = item.lat;
        let baseLng = item.lng;

        // Strict validation: must be within Pattani AOR
        if (!baseLat || !baseLng || isNaN(baseLat) || isNaN(baseLng) || baseLat < 6.80 || baseLat > 6.90 || baseLng < 101.18 || baseLng > 101.28) {
            return;
        }

        // Apply clean, subtle 15-meter micro-offset along road for duplicate points
        const key = `${baseLat.toFixed(5)}_${baseLng.toFixed(5)}`;
        const countAtPoint = coordCounts[key] || 0;
        coordCounts[key] = countAtPoint + 1;

        let lat = baseLat;
        let lng = baseLng;
        if (countAtPoint > 0) {
            const angle = (countAtPoint * 45) * (Math.PI / 180);
            const radius = 0.00015; // ~15 meters only
            lat = baseLat + radius * Math.sin(angle);
            lng = baseLng + radius * Math.cos(angle);
        }

        let pinColor = '#3B82F6';
        let pinIcon = '🛡️';
        if (item.category === 'security_check') {
            pinColor = '#EF4444'; // Red
            pinIcon = '🎯';
        } else if (item.category === 'checkpoint') {
            pinColor = '#10B981'; // Green
            pinIcon = '🚧';
        } else if (item.category.includes('patrol')) {
            pinColor = '#F59E0B'; // Amber
            pinIcon = '🚶‍♂️';
        } else if (item.category === 'vulnerable') {
            pinColor = '#A855F7'; // Purple
            pinIcon = '🏫';
        } else if (item.category === 'civil_affairs') {
            pinColor = '#06B6D4'; // Cyan
            pinIcon = '🤝';
        }

        const customIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `
                <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white transition-all duration-300 transform group-hover:scale-125"
                         style="background: ${pinColor}; box-shadow: 0 0 12px ${pinColor}90;">
                        <span>${pinIcon}</span>
                    </div>
                    <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18]
        });

        const imgHtml = (item.images && item.images.length > 0)
            ? `<div class="mt-2.5 rounded-lg overflow-hidden border border-slate-700">
                 <img src="${item.images[0]}" alt="Ops Photo" class="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform duration-300" onclick="openLightbox('${item.images[0]}')">
                 ${item.images.length > 1 ? `<div class="p-1 bg-slate-900/90 text-center text-[10px] text-amber-400 font-mono">+${item.images.length - 1} ภาพเพิ่มเติมในภารกิจนี้ (คลิกรูปเพื่อซูม)</div>` : ''}
               </div>`
            : '';

        const popupContent = `
            <div class="p-3 max-w-[290px] font-sans text-slate-200">
                <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-sm" style="background: ${pinColor};">${item.categoryTh}</span>
                    <span class="text-[11px] font-mono text-amber-400 font-bold">${item.timeTh || item.time}</span>
                </div>
                <div class="text-xs font-bold text-white mb-1">${item.location}</div>
                <div class="text-[11px] text-slate-300 mb-1 leading-relaxed line-clamp-3">${item.missionDetail}</div>
                <div class="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800 mt-2">
                    <div><span class="text-slate-500">หน่วย:</span> <span class="text-slate-200 font-semibold">${item.unit}</span></div>
                    <div><span class="text-slate-500">เรียกขาน:</span> <span class="text-amber-300 font-semibold">${item.callSign || '-'}</span></div>
                    <div><span class="text-slate-500">ผู้นำชุด:</span> <span class="text-slate-200">${item.leader || '-'}</span></div>
                    <div><span class="text-slate-500">พิกัด:</span> <span class="text-emerald-400 font-semibold">${item.grid}</span></div>
                </div>
                ${imgHtml}
            </div>
        `;

        const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupContent, {
            className: 'custom-leaflet-popup',
            maxWidth: 310
        });

        mapMarkersLayer.addLayer(marker);
        bounds.extend([lat, lng]);
        plottedCount++;
    });

    if (plottedCount > 0 && appMap) {
        appMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
}

function filterMap(category) {
    activeMapFilter = category;
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === category) {
            btn.classList.add('bg-amber-500', 'text-slate-950', 'font-bold');
            btn.classList.remove('bg-slate-800', 'text-slate-300', 'text-red-300', 'text-emerald-300', 'text-amber-300', 'text-purple-300', 'text-cyan-300');
        } else {
            btn.classList.remove('bg-amber-500', 'text-slate-950', 'font-bold');
            btn.classList.add('bg-slate-800');
        }
    });
    plotTacticalMarkers();
}

// Chart.js Executive Visualizations (Dynamic from 23 Aug Data)
function initOrUpdateCharts() {
    try {
        if (!currentData || !currentData.latestReport) return;
        const items = currentData.latestReport.items || [];
        const summary = currentData.latestReport.summary || {};

        // Platoon breakdown
        const p1Count = items.filter(i => i.unit && i.unit.includes('๙๒๔๑')).length;
        const p2Count = items.filter(i => i.unit && i.unit.includes('๙๒๔๒')).length;
        const civilUnitCount = items.filter(i => i.unit && (i.unit.includes('ชป.กร.') || i.category === 'civil_affairs')).length;
        const hqCount = items.filter(i => i.unit && (i.unit.includes('บก.ร้อย') || i.unit.includes('ฝขว.'))).length;

        // Category breakdown
        const checkpointCount = items.filter(i => i.category === 'checkpoint').length;
        const patrolCount = items.filter(i => i.category.includes('patrol')).length;
        const securityCount = items.filter(i => i.category.includes('security') || i.categoryTh.includes('ทำลายความพยายาม')).length;
        const vulnerableCount = items.filter(i => i.categoryTh.includes('รปภ.') && !i.category.includes('civil')).length;
        const civilCount = items.filter(i => i.category === 'civil_affairs' || (i.categoryTh && i.categoryTh.includes('กิจการพลเรือน'))).length || (summary.civilAffairs || 6);

        // 1. Platoon Distribution Chart (Doughnut)
        const platoonCtx = document.getElementById('chartPlatoonDistribution');
        if (platoonCtx) {
            if (platoonChartInstance) platoonChartInstance.destroy();
            platoonChartInstance = new Chart(platoonCtx, {
                type: 'doughnut',
                data: {
                    labels: ['มว.ฉก.ตชด.9241 (รูสะมิแล)', 'มว.ฉก.ตชด.9242 (ปะกาฮะรัง)', 'ชป.กร. ร้อย 924 (กิจการพลเรือน)'],
                    datasets: [{
                        data: [p1Count || 34, p2Count || 23, civilUnitCount || civilCount || 6],
                        backgroundColor: ['#3B82F6', '#F59E0B', '#06B6D4'],
                        borderColor: '#0F172A',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94A3B8', font: { family: 'Prompt', size: 11 } }
                        }
                    }
                }
            });
        }

        // 2. Category Distribution Chart (Bar) - Mission Categories
        const categoryCtx = document.getElementById('chartCategoryDistribution');
        if (categoryCtx) {
            if (categoryChartInstance) categoryChartInstance.destroy();
            categoryChartInstance = new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: ['จุดตรวจ POP-UP', 'ลาดตระเวนรอบฐาน/จยย.', 'ทำลายความพยายาม', 'รปภ.ครู/พระสงฆ์', 'กิจการพลเรือน (ชป.กร.)'],
                    datasets: [{
                        label: 'จำนวนภารกิจ (ครั้ง)',
                        data: [checkpointCount || 40, patrolCount || 3, securityCount || 6, vulnerableCount || 7, civilCount || 6],
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#A855F7', '#06B6D4'],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { ticks: { color: '#CBD5E1', font: { family: 'Prompt', size: 11, weight: 'bold' } }, grid: { display: false } },
                        y: { ticks: { color: '#94A3B8', stepSize: 5, font: { family: 'Chakra Petch' } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
                    }
                }
            });
        }
    } catch (e) {
        console.error("Error in initOrUpdateCharts:", e);
    }
}

// 3. Operations & Intelligence Database View & Search Engine
function renderDatabaseView() {
    filterOperationsTable();

    // Populate Historical dropdown
    const historySelect = document.getElementById('historyReportSelect');
    if (historySelect && currentData.historicalReports) {
        historySelect.innerHTML = '';
        currentData.historicalReports.forEach((rep, idx) => {
            const opt = document.createElement('option');
            opt.value = rep.rawDate;
            opt.textContent = `${rep.dateTh} (${rep.docNumber}) - ${rep.totalOps} ภารกิจ`;
            if (idx === 0) opt.selected = true;
            historySelect.appendChild(opt);
        });
    }
}

function filterOperationsTable() {
    const keyword = document.getElementById('dbSearchInput') ? document.getElementById('dbSearchInput').value.toLowerCase().trim() : '';
    const platoonFilter = document.getElementById('dbPlatoonFilter') ? document.getElementById('dbPlatoonFilter').value : 'all';
    const categoryFilter = document.getElementById('dbCategoryFilter') ? document.getElementById('dbCategoryFilter').value : 'all';
    const subdistrictFilter = document.getElementById('dbSubdistrictFilter') ? document.getElementById('dbSubdistrictFilter').value : 'all';

    const items = currentData.latestReport.items;
    const filtered = items.filter(item => {
        const matchKeyword = !keyword || 
            item.missionDetail.toLowerCase().includes(keyword) ||
            item.leader.toLowerCase().includes(keyword) ||
            item.callSign.toLowerCase().includes(keyword) ||
            item.location.toLowerCase().includes(keyword) ||
            (item.grid && item.grid.toLowerCase().includes(keyword));

        const matchPlatoon = platoonFilter === 'all' || item.unit.includes(platoonFilter);
        const matchCategory = categoryFilter === 'all' || item.category === categoryFilter || (categoryFilter === 'patrol' && item.category.startsWith('patrol'));
        const matchSubdistrict = subdistrictFilter === 'all' || item.subdistrict.includes(subdistrictFilter);

        return matchKeyword && matchPlatoon && matchCategory && matchSubdistrict;
    });

    const tbody = document.getElementById('dbOperationsTableBody');
    const mobileCardsContainer = document.getElementById('dbOperationsMobileCards');
    const countEl = document.getElementById('dbFilteredCount');
    if (countEl) countEl.textContent = `${filtered.length} รายการ`;

    // 1. Render Desktop Table (for PC / Tablet)
    if (tbody) {
        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500 font-sarabun">ไม่พบข้อมูลภารกิจที่ตรงกับเงื่อนไขการค้นหา</td></tr>`;
        } else {
            filtered.forEach((item, index) => {
                const firstImg = item.images && item.images.length > 0 ? item.images[0] : (item.image || null);
                const tr = document.createElement('tr');
                tr.className = 'border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors text-xs cursor-pointer';
                tr.onclick = () => openItemDetailModal(item);

                tr.innerHTML = `
                    <td class="py-3 px-3 font-mono text-slate-400">${index + 1}</td>
                    <td class="py-3 px-3">
                        ${firstImg ? `<div class="w-12 h-10 rounded-md overflow-hidden border border-slate-700 cursor-pointer shadow-sm" onclick="event.stopPropagation(); openPhotoLightbox('${firstImg}', '${item.categoryTh}', '${item.missionDetail}')"><img src="${firstImg}" class="w-full h-full object-cover hover:scale-110 transition-transform"></div>` : '<span class="text-slate-600">-</span>'}
                    </td>
                    <td class="py-3 px-3 font-mono font-semibold text-amber-300 whitespace-nowrap">${item.timeTh}</td>
                    <td class="py-3 px-3"><span class="px-2.5 py-1 rounded text-xs font-bold ${item.badge}">${item.categoryTh}</span></td>
                    <td class="py-3 px-3 text-slate-200 font-semibold whitespace-nowrap">${item.unit}</td>
                    <td class="py-3 px-3 text-slate-200 font-mono whitespace-nowrap">${item.leader} <span class="text-amber-400">(${item.callSign})</span></td>
                    <td class="py-3 px-3 text-slate-300 max-w-sm font-sarabun text-xs" title="${item.location}">${item.location}</td>
                    <td class="py-3 px-3 text-right whitespace-nowrap">
                        <button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition-all font-bold text-xs">
                            ดูข้อมูลและภาพ
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // 2. Render Mobile Cards View (Optimized for Mobile Touch Screens)
    if (mobileCardsContainer) {
        mobileCardsContainer.innerHTML = '';
        if (filtered.length === 0) {
            mobileCardsContainer.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs font-sarabun bg-slate-900/60 rounded-xl">ไม่พบข้อมูลภารกิจที่ตรงกับเงื่อนไขการค้นหา</div>`;
        } else {
            filtered.forEach((item, index) => {
                const firstImg = item.images && item.images.length > 0 ? item.images[0] : (item.image || null);
                const card = document.createElement('div');
                card.className = 'glass-panel p-4 rounded-xl border border-slate-800 space-y-3 cursor-pointer hover:border-amber-500/40 transition-colors';
                card.onclick = () => openItemDetailModal(item);

                card.innerHTML = `
                    <div class="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${item.badge}">${item.categoryTh}</span>
                            <span class="text-xs font-bold text-slate-200">${item.unit}</span>
                        </div>
                        <span class="text-xs font-mono font-bold text-amber-300">${item.timeTh}</span>
                    </div>

                    <div class="flex items-start space-x-3">
                        ${firstImg ? `<div class="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700" onclick="event.stopPropagation(); openPhotoLightbox('${firstImg}', '${item.categoryTh}', '${item.missionDetail}')"><img src="${firstImg}" class="w-full h-full object-cover"></div>` : ''}
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-semibold text-amber-400 font-mono">${item.leader} (${item.callSign})</div>
                            <div class="text-xs text-slate-400 mt-0.5">${item.location}</div>
                            <p class="text-xs text-slate-300 mt-1 font-sarabun line-clamp-2">${item.missionDetail}</p>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-1 text-xs">
                        <span class="text-emerald-400 text-[11px]">✓ ผลการปฏิบัติเรียบร้อย</span>
                        <span class="text-amber-400 font-bold text-xs flex items-center gap-1">แตะดูข้อมูล & พิกัด →</span>
                    </div>
                `;
                mobileCardsContainer.appendChild(card);
            });
        }
    }
}

// Detail Modal
function openItemDetailModal(item) {
    const modal = document.getElementById('detailModal');
    if (!modal) return;

    document.getElementById('modalDetailCategory').textContent = item.categoryTh;
    document.getElementById('modalDetailCategory').className = `px-2.5 py-1 rounded text-xs font-bold ${item.badge}`;
    document.getElementById('modalDetailTime').textContent = item.timeTh;
    document.getElementById('modalDetailUnit').textContent = item.unit;
    document.getElementById('modalDetailLeader').textContent = `${item.leader} (${item.callSign}) - กำลังพล ${item.teamSize} นาย`;
    document.getElementById('modalDetailLocation').textContent = item.location;
    document.getElementById('modalDetailGrid').textContent = item.grid || 'ไม่มีระบุพิกัด 47NQH';
    document.getElementById('modalDetailMission').textContent = item.missionDetail;
    document.getElementById('modalDetailResult').textContent = item.result;

    const imgContainer = document.getElementById('modalDetailImageContainer');
    if (imgContainer) {
        let imgs = item.images || (item.image ? [item.image] : []);
        if (imgs.length > 0) {
            let imgHtml = '<div class="space-y-2 mt-3"><span class="text-[11px] font-bold text-amber-400 block">ภาพถ่ายผลการปฏิบัติงานจริง (สกัดจาก ปจว.ยก.):</span><div class="grid grid-cols-3 gap-2">';
            imgs.forEach(src => {
                imgHtml += `<div class="overflow-hidden rounded-lg border border-slate-700 h-24 group cursor-pointer" onclick="window.open('${src}', '_blank')"><img src="${src}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt="ภาพการปฏิบัติงาน"></div>`;
            });
            imgHtml += '</div></div>';
            imgContainer.innerHTML = imgHtml;
            imgContainer.classList.remove('hidden');
        } else {
            imgContainer.classList.add('hidden');
        }
    }

    modal.classList.remove('hidden');
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('hidden');
}

// 4. Public Relations News View
function renderNewsView() {
    const newsGrid = document.getElementById('newsArticlesGrid');
    if (!newsGrid) return;

    const articles = currentData.newsArticles || [];
    if (articles.length === 0) return;

    newsGrid.innerHTML = '';
    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 group flex flex-col justify-between shadow-2xl';
        
        const galleryCount = article.gallery ? article.gallery.length : 0;
        
        card.innerHTML = `
            <div>
                <!-- Main Header Image with Badge -->
                <div class="relative h-52 sm:h-56 bg-slate-950 overflow-hidden cursor-pointer" onclick="openNewsModal('${article.id}')">
                    <img src="${article.image}" alt="${article.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30"></div>
                    
                    <div class="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${article.badge || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'} shadow-lg backdrop-blur-md border">
                            ${article.category}
                        </span>
                        ${galleryCount > 1 ? `<span class="px-2 py-0.5 rounded-md bg-black/75 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40 backdrop-blur-md">📸 ${galleryCount} รูป</span>` : ''}
                    </div>

                    <div class="absolute bottom-2.5 left-3 right-3">
                        <span class="text-[11px] font-mono text-emerald-300 font-bold drop-shadow-md">
                            ${article.dateTh}
                        </span>
                    </div>
                </div>

                <!-- Content Info -->
                <div class="p-5 space-y-3">
                    <div class="text-[11px] text-amber-400 font-mono font-semibold flex items-center gap-1.5">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5 flex-shrink-0 text-amber-500"></i>
                        <span class="truncate">${article.location}</span>
                    </div>

                    <h3 class="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2 cursor-pointer font-sarabun" onclick="openNewsModal('${article.id}')">
                        ${article.title}
                    </h3>

                    <p class="text-xs text-slate-300 line-clamp-3 font-sarabun leading-relaxed">
                        ${article.summary}
                    </p>

                    <!-- Leader Meta -->
                    <div class="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sarabun">
                        <span class="text-slate-500">ผู้นำภารกิจ:</span> <strong class="text-slate-300">${article.leader}</strong>
                    </div>

                    <!-- Mini Photo Thumbnails Strip (4 Photos) -->
                    ${article.gallery && article.gallery.length > 0 ? `
                        <div class="grid grid-cols-4 gap-1.5 pt-1">
                            ${article.gallery.map(img => `
                                <div class="h-14 rounded-lg overflow-hidden border border-slate-700/80 cursor-pointer group/thumb relative" onclick="openPhotoLightbox('${img}', '${article.category}', '${article.title}')">
                                    <img src="${img}" class="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" loading="lazy">
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Footer Action Button -->
            <div class="p-5 pt-0">
                <button type="button" onclick="openNewsModal('${article.id}')" class="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-emerald-600 hover:text-slate-950 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-slate-700 hover:border-emerald-400 shadow-lg">
                    <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
                    <span>อ่านรายละเอียดข่าวและดูรูปฉบับเต็ม</span>
                    <span>→</span>
                </button>
            </div>
        `;
        newsGrid.appendChild(card);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
}

function openNewsModal(articleId) {
    const article = (currentData.newsArticles || []).find(a => a.id === articleId);
    if (!article) return;

    const modal = document.getElementById('newsModal');
    if (!modal) return;

    const el = (id) => document.getElementById(id);
    if (el('newsModalTitle')) el('newsModalTitle').textContent = article.title;
    if (el('newsModalCategory')) el('newsModalCategory').textContent = article.category;
    if (el('newsModalDate')) el('newsModalDate').textContent = `${article.dateTh} | ${article.location}`;
    if (el('newsModalImage')) el('newsModalImage').src = article.image;
    if (el('newsModalContent')) el('newsModalContent').textContent = article.content;

    const galleryContainer = el('newsModalGallery');
    if (galleryContainer) {
        if (article.gallery && article.gallery.length > 0) {
            let gHtml = '<div class="space-y-2 mt-4"><span class="text-xs font-bold text-emerald-400 block">📸 อัลบั้มภาพถ่ายปฏิบัติการจริง (แตะเพื่อขยายดูภาพคมชัด):</span><div class="grid grid-cols-2 sm:grid-cols-4 gap-2">';
            article.gallery.forEach(imgSrc => {
                gHtml += `<div class="rounded-xl overflow-hidden border border-slate-700 h-28 cursor-pointer relative group" onclick="openPhotoLightbox('${imgSrc}', '${article.category}', '${article.title}')"><img src="${imgSrc}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="รูปกิจกรรม"><div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span class="px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">🔍 ซูม HD</span></div></div>`;
            });
            gHtml += '</div></div>';
            galleryContainer.innerHTML = gHtml;
        } else {
            galleryContainer.innerHTML = '';
        }
    }

    modal.classList.remove('hidden');
}

function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) modal.classList.add('hidden');
}

// 5. About Unit View
function renderAboutView() {
    try {
        const unit = currentData.unitInfo || {};
        const el = (id) => document.getElementById(id);
        if (el('aboutUnitName')) el('aboutUnitName').textContent = unit.name || 'กองร้อยเฉพาะกิจตำรวจตระเวนชายแดน ๙๒๔';
        if (el('aboutMotto')) el('aboutMotto').textContent = 'ยึดมั่นระเบียบวินัย เสียสละเพื่อปวงชน พิทักษ์ชายแดนใต้';
        if (el('aboutHqLocation')) el('aboutHqLocation').textContent = unit.locationHq || 'ฐานปฏิบัติการ ร้อย ฉก.ตชด.924 ม.1 ต.รูสะมิแล อ.เมือง จ.ปัตตานี';
        if (el('aboutHqGrid')) el('aboutHqGrid').textContent = `พิกัด MGRS: ${unit.gridHq || '47NQH 51800 56200'}`;

        if (unit.commander) {
            if (el('aboutCmdName')) el('aboutCmdName').textContent = `${unit.commander.rank}${unit.commander.name}`;
            if (el('aboutCmdPos')) el('aboutCmdPos').textContent = unit.commander.position;
            if (el('aboutCmdCall')) el('aboutCmdCall').textContent = unit.commander.callSign;
        }

        if (unit.headOfIntel) {
            if (el('aboutIntelName')) el('aboutIntelName').textContent = `${unit.headOfIntel.rank}${unit.headOfIntel.name}`;
            if (el('aboutIntelPos')) el('aboutIntelPos').textContent = unit.headOfIntel.position;
            if (el('aboutIntelCall')) el('aboutIntelCall').textContent = unit.headOfIntel.callSign;
        }
    } catch (e) {
        console.error("Error in renderAboutView:", e);
    }
}

// 6. DOCX Smart Drag & Drop Uploader
function initDropZone() {
    const dropZone = document.getElementById('docxDropZone');
    const fileInput = document.getElementById('docxFileInput');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('border-amber-400', 'bg-amber-500/10');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('border-amber-400', 'bg-amber-500/10');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleUploadedDocx(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUploadedDocx(e.target.files[0]);
        }
    });
}

async function handleUploadedDocx(file) {
    if (!file.name.endsWith('.docx')) {
        alert('กรุณาอัปโหลดไฟล์เอกสารนามสกุล .docx ของ ปจว.ยก. หรือ ปจว.ขว.');
        return;
    }

    const statusEl = document.getElementById('uploadStatus');
    const previewEl = document.getElementById('uploadPreviewSection');

    if (statusEl) {
        statusEl.innerHTML = `<div class="p-3 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs">⏳ กำลังประมวลผลและแปลงข้อมูลจาก "${file.name}"...</div>`;
        statusEl.classList.remove('hidden');
    }

    try {
        const parseResult = await window.DOCXParser.parseDocxFile(file);
        const parsedReport = parseResult.parsedData;

        // Update active dataset
        currentData.latestReport = parsedReport;

        // Add to historical
        currentData.historicalReports.unshift({
            docNumber: parsedReport.docNumber,
            dateTh: parsedReport.dateTh,
            rawDate: parsedReport.rawDate,
            totalOps: parsedReport.operationsSummary.totalMissions,
            status: "ปกติ"
        });

        // Re-render
        renderAllViews();

        if (statusEl) {
            statusEl.innerHTML = `
                <div class="p-3 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs flex items-center justify-between">
                    <span>✅ แปลงข้อมูลสำเร็จ! สกัดได้ ${parsedReport.items.length} ภารกิจยุทธการ จาก "${file.name}"</span>
                    <button onclick="switchTab('dashboard')" class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                        ไปที่ Dashboard →
                    </button>
                </div>
            `;
        }

        if (previewEl) {
            previewEl.classList.remove('hidden');
            document.getElementById('previewDocNum').textContent = parsedReport.docNumber;
            document.getElementById('previewDate').textContent = parsedReport.dateTh;
            document.getElementById('previewTotal').textContent = `${parsedReport.items.length} ภารกิจ`;
        }

    } catch (err) {
        console.error(err);
        if (statusEl) {
            statusEl.innerHTML = `<div class="p-3 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs">❌ เกิดข้อผิดพลาดในการประมวลผลไฟล์: ${err.message}</div>`;
        }
    }
}

// 7. Official Dispatch Print & Export
function openPrintDispatchModal() {
    const modal = document.getElementById('printDispatchModal');
    if (!modal) return;

    const report = currentData.latestReport;
    const unit = currentData.unit;

    document.getElementById('printDocNum').textContent = report.dispatchRef || report.dispatchNumber || report.docNumber || 'ที่ นร.๕๑๑๙.๑(ฉก.ตร.ปน.9๒).9๒๔/ยก./1140';
    document.getElementById('printDocDate').textContent = report.dateTh;
    document.getElementById('printTimeRange').textContent = report.timeRangeTh;
    document.getElementById('printSituation').textContent = report.situationSummary;
    document.getElementById('printApproverSign').textContent = report.approver;

    const printItemsList = document.getElementById('printItemsList');
    if (printItemsList) {
        printItemsList.innerHTML = '';
        report.items.forEach((item, idx) => {
            const p = document.createElement('div');
            p.className = 'text-xs text-black font-sarabun leading-relaxed mb-2';
            p.innerHTML = `<strong>(${idx + 1}) [${item.unit}] ${item.categoryTh}:</strong> เมื่อ ${item.timeTh} ${item.leader} (${item.callSign}) ${item.missionDetail} ${item.grid ? `พิกัด ${item.grid}` : ''} ${item.result}`;
            printItemsList.appendChild(p);
        });
    }

    modal.classList.remove('hidden');
}

function closePrintModal() {
    const modal = document.getElementById('printDispatchModal');
    if (modal) modal.classList.add('hidden');
}

function executeBrowserPrint() {
    window.print();
}

function exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BPP924_Intel_Export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}


// Render Operational Photo Highlights Grid on Home & Dashboard
// Render Operational Photo Highlights Grid on Home & Dashboard (Dynamic from 23 Aug Data)
function renderOperationalHighlights() {
    const container = document.getElementById('homePhotoHighlightsGrid');
    const dashContainer = document.getElementById('dashPhotoHighlightsGrid');
    if (!container && !dashContainer) return;

    const items = currentData.latestReport.items.filter(i => i.images && i.images.length > 0);
    
    // Select top 9 operational highlights from 23 Aug report
    const selectedItems = items.slice(0, 9);

    const generateCardsHtml = (list) => {
        return list.map((item, idx) => {
            const firstImg = item.images[0];
            const extraCount = item.images.length > 1 ? `+${item.images.length - 1} รูป` : '';
            return `
                <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-500/50 transition-all duration-300 group flex flex-col justify-between shadow-xl cursor-pointer" onclick="openItemDetailModal(currentData.latestReport.items[${items.indexOf(item)}])">
                    <!-- Photo Container -->
                    <div class="relative w-full h-52 sm:h-56 bg-slate-950 overflow-hidden">
                        <img src="${firstImg}" alt="${item.categoryTh}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40"></div>
                        
                        <!-- Top Badges -->
                        <div class="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                            <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${item.badge} shadow-lg backdrop-blur-md">
                                ${item.categoryTh}
                            </span>
                            ${extraCount ? `<span class="px-2 py-0.5 rounded-md bg-black/70 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40 backdrop-blur-md">${extraCount}</span>` : ''}
                        </div>

                        <!-- Bottom Location & Time inside photo -->
                        <div class="absolute bottom-2.5 left-3 right-3">
                            <div class="text-[11px] font-mono text-amber-300 font-bold flex items-center gap-1.5 drop-shadow-md">
                                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                <span>${item.timeTh}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Details Content -->
                    <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-200">${item.unit}</span>
                                <span class="font-mono text-amber-400 font-bold">${item.callSign}</span>
                            </div>
                            <h4 class="text-xs sm:text-sm font-bold text-white font-sarabun leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                                ${item.location}
                            </h4>
                            <p class="text-xs text-slate-300 font-sarabun line-clamp-2 leading-relaxed">
                                ${item.missionDetail}
                            </p>
                        </div>

                        <!-- Footer Meta -->
                        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span class="font-mono text-slate-400 truncate max-w-[60%] flex items-center gap-1">
                                <i data-lucide="map-pin" class="w-3 h-3 text-amber-500 flex-shrink-0"></i>
                                <span class="truncate">${item.grid}</span>
                            </span>
                            <span class="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                ดูข้อมูล & รูป →
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    if (container) {
        container.innerHTML = generateCardsHtml(selectedItems);
    }
    if (dashContainer) {
        dashContainer.innerHTML = generateCardsHtml(selectedItems.slice(0, 6));
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

// Lightbox modal for HD Photo viewing
function openPhotoLightbox(src, title, caption) {
    let lb = document.getElementById('photoLightboxModal');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'photoLightboxModal';
        lb.className = 'fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4';
        lb.onclick = (e) => { if (e.target === lb || e.target.id === 'closeLbBtn') lb.remove(); };
        document.body.appendChild(lb);
    }
    lb.innerHTML = `
        <div class="glass-panel w-full max-w-3xl rounded-2xl overflow-hidden border border-amber-500/40 p-4 space-y-3" onclick="e.stopPropagation()">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="text-sm font-bold text-amber-400 font-sans">${title}</span>
                <button id="closeLbBtn" onclick="document.getElementById('photoLightboxModal').remove()" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>
            <div class="rounded-xl overflow-hidden max-h-[70vh] bg-black flex items-center justify-center">
                <img src="${src}" class="max-w-full max-h-[68vh] object-contain" alt="${title}">
            </div>
            <p class="text-xs text-slate-300 font-sarabun text-center">${caption}</p>
        </div>
    `;
}


// ============================================================================
// REAL-TIME LINE BOT DISPATCH ENGINE
// ============================================================================

const simulatedLineReports = [
    {
        id: "LINE-RT-01",
        timeTh: "11:15 น.",
        category: "patrol_motorcycle",
        categoryTh: "ลาดตระเวน จยย.",
        badge: "badge-patrol",
        unit: "มว.ฉก.ตชด.๙๒๔๑",
        subdistrict: "ต.รูสะมิแล",
        leader: "จ.ส.ต.เอกชัย สว่างจิตร",
        callSign: "เหมราช 411",
        location: "เส้นทางเลียบหาดรูสะมิแล - ตลาดนัดชุมชน",
        grid: "47NQH 52300 55800",
        missionDetail: "ชุดปฏิบัติการ จยย. เหมราช 411 ลาดตระเวนตรวจเส้นทางเสี่ยง ตรวจสอบยานพาหนะต้องสงสัย 3 คัน ไม่พบสิ่งผิดกฎหมาย ประชาชนให้ความร่วมมือดี",
        images: ["assets/images/image2.jpeg", "assets/images/image3.jpeg"]
    },
    {
        id: "LINE-RT-02",
        timeTh: "11:30 น.",
        category: "checkpoint",
        categoryTh: "จุดตรวจ/จุดสกัด",
        badge: "badge-checkpoint",
        unit: "มว.ฉก.ตชด.๙๒๔๒",
        subdistrict: "ต.ปะกาฮะรัง",
        leader: "ด.ต.ธงชัย บุญช่วย",
        callSign: "เหมราช 421",
        location: "จุดตรวจ ปชส. สะพานปะกาฮะรัง",
        grid: "47NQH 54100 54900",
        missionDetail: "ตั้งจุดตรวจความมั่นคงตรวจสอบบุคคลตามหมายจับและรถจักรยานยนต์ดัดแปลง ไม่พบการกระทำผิด เหตุการณ์ทั่วไปปกติ",
        images: ["assets/images/image15.jpeg"]
    },
    {
        id: "LINE-RT-03",
        timeTh: "11:45 น.",
        category: "civil_affairs",
        categoryTh: "กิจการพลเรือน",
        badge: "badge-civil",
        unit: "ชป.กร.ร้อย ฉก.ตชด.๙๒๔",
        subdistrict: "ต.รูสะมิแล",
        leader: "ด.ต.สมภพ บุญสุวรรณ",
        callSign: "เหมราช 4012",
        location: "รร.ชุมชนบ้านรูสะมิแล",
        grid: "47NQH 51800 56200",
        missionDetail: "ประสานงานผู้นำชุมชนและตรวจเยี่ยมโครงการอาหารกลางวัน สร้างความสัมพันธ์อันดีระหว่างเจ้าหน้าที่และเยาวชนในพื้นที่",
        images: ["assets/images/image1.jpeg", "assets/images/image4.jpeg"]
    }
];

let lineReportIndex = 0;

function simulateIncomingLineReport() {
    const report = simulatedLineReports[lineReportIndex % simulatedLineReports.length];
    lineReportIndex++;

    // 1. Prepend to currentData.latestReport.items
    currentData.latestReport.items.unshift(report);
    currentData.latestReport.summary.totalMissions++;

    // 2. Play subtle alert chime
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {
        console.log("Audio not allowed yet:", e);
    }

    // 3. Add to Live Feed Stream Widget
    const feedContainer = document.getElementById('liveLineFeedContainer');
    if (feedContainer) {
        const newFeedItem = document.createElement('div');
        newFeedItem.className = 'flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-xs shadow-lg animate-pulse transition-all cursor-pointer';
        newFeedItem.onclick = () => openItemDetailModal(report);
        newFeedItem.innerHTML = `
            <div class="flex items-center space-x-2.5 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></span>
                <span class="font-bold text-amber-400 font-mono flex-shrink-0">[LINE BOT] ${report.callSign}:</span>
                <span class="text-slate-100 font-sarabun truncate">${report.missionDetail}</span>
            </div>
            <span class="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px] whitespace-nowrap ml-2">พล็อตพิกัดแล้ว ✓</span>
        `;
        feedContainer.prepend(newFeedItem);
        setTimeout(() => newFeedItem.classList.remove('animate-pulse'), 3000);
    }

    // 4. Update KPI Counters
    const kpiEl = document.getElementById('kpiTotalMissions');
    if (kpiEl) {
        kpiEl.textContent = currentData.latestReport.summary.totalMissions;
        kpiEl.classList.add('text-emerald-400', 'scale-110');
        setTimeout(() => kpiEl.classList.remove('text-emerald-400', 'scale-110'), 2000);
    }

    // 5. Update Timeline & Map
    renderTimeline();
    filterOperationsTable();
    initOrUpdateMap();
    initOrUpdateCharts();

    // 6. Fly map to new location if map exists
    if (appMap && typeof MgrsConverter !== 'undefined') {
        const latlng = MgrsConverter.mgrsToLatLng(report.grid);
        if (latlng) {
            appMap.flyTo([latlng.lat, latlng.lng], 15, { duration: 1.5 });
        }
    }
}


// =========================================================================
// INTERACTIVE TACTICAL DISPATCH COMPOSER ENGINE (ระบบเขียนและยิงรายงานสด)
// =========================================================================

function toggleDispatchComposer() {
    const box = document.getElementById('dispatchComposerBox');
    const textEl = document.getElementById('btnComposerToggleText');
    if (!box) return;
    if (box.classList.contains('hidden')) {
        box.classList.remove('hidden');
        if (textEl) textEl.textContent = '❌ ซ่อนกล่องเขียนรายงาน';
    } else {
        box.classList.add('hidden');
        if (textEl) textEl.textContent = '✍️ เขียนข้อความยิงรายงานสด';
    }
}

function clearDispatchComposer() {
    const msg = document.getElementById('composerMessage');
    if (msg) msg.value = '';
}

function applyDispatchPreset(type) {
    const msgEl = document.getElementById('composerMessage');
    const catEl = document.getElementById('composerCategory');
    const gridEl = document.getElementById('composerGrid');
    if (!msgEl) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (type === 'gas') {
        catEl.value = 'security_check';
        gridEl.value = '47NQH 45338 58347';
        msgEl.value = `เมื่อ ${timeStr} น. ชุดปฏิบัติการเข้าตรวจสอบมาตรการรักษาความปลอดภัย ณ โรงบรรจุแก๊สหุงต้มดอนรัก ม.1 ต.ดอนรัก ผลการปฏิบัติ ไม่พบสิ่งผิดปกติ พนักงานเข้าใจแนวทาง รปภ. เหตุการณ์ปกติ`;
    } else if (type === 'patrol') {
        catEl.value = 'patrol';
        gridEl.value = '47NQH 44366 58827';
        msgEl.value = `เมื่อ ${timeStr} น. ลาดตระเวนป้องกันที่ตั้ง วงแหวนชั้นนอกบริเวณรอบฐานปฏิบัติการ มว.ฉก.ตชด.9241 ตรวจสอบจุดเสี่ยงและท่อลอด ผลการปฏิบัติ เหตุการณ์ปกติ`;
    } else if (type === 'checkpoint') {
        catEl.value = 'checkpoint';
        gridEl.value = '47NQH 46189 58404';
        msgEl.value = `เมื่อ ${timeStr} น. ตั้งจุดตรวจความมั่นคง POP-UP ปราการ 2 สุ่มตรวจยานพาหนะ 12 คัน บุคคลต้องสงสัย 15 ราย ไม่พบสิ่งผิดกฎหมาย เหตุการณ์ปกติ`;
    } else if (type === 'civil') {
        catEl.value = 'civil_affairs';
        gridEl.value = '47NQH 45127 59975';
        msgEl.value = `เมื่อ ${timeStr} น. ชป.กร.ร้อย ฉก.ตชด.924 ลงพื้นที่พบปะผู้นำชุมชนและประชาชน เสริมสร้างความเข้าใจและสอบถามสภาพความเป็นอยู่ ประชาชนให้ความร่วมมือดีเยี่ยม เหตุการณ์ปกติ`;
    } else if (type === 'urgent') {
        catEl.value = 'security_check';
        gridEl.value = '47NQH 48336 56284';
        msgEl.value = `[ด่วนที่สุด] เมื่อ ${timeStr} น. ได้รับแจ้งเบาะแสพบวัตถุต้องสงสัยบริเวณคอสะพานปะกาฮะรัง กำลังพลเข้าควบคุมพื้นที่และตรวจสอบความปลอดภัยทันที อยู่ระหว่างประสาน EOD`;
    }
}

function submitCustomLiveDispatch() {
    const msgEl = document.getElementById('composerMessage');
    const callSignEl = document.getElementById('composerCallSign');
    const catEl = document.getElementById('composerCategory');
    const gridEl = document.getElementById('composerGrid');

    let text = msgEl ? msgEl.value.trim() : '';
    if (!text) {
        alert('กรุณาพิมพ์ข้อความรายละเอียดรายงานก่อนกดยิงรายงานสดครับหัวหน้า');
        return;
    }

    const callSign = callSignEl ? callSignEl.value : 'เหมราช 4012 (หน.ฝขว.)';
    const category = catEl ? catEl.value : 'patrol';
    const grid = gridEl ? gridEl.value.trim() : '47NQH 48336 56284';

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Play tactical sound chime
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High chime A5
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
        // Audio fallback
    }

    // Insert to Live Feed container
    const feedContainer = document.getElementById('liveLineFeedContainer');
    if (feedContainer) {
        const newFeedRow = document.createElement('div');
        newFeedRow.className = 'flex items-center justify-between p-3 rounded-xl bg-emerald-950/70 border-2 border-emerald-500 text-xs shadow-lg shadow-emerald-950/40 animate-bounce';
        newFeedRow.innerHTML = `
            <div class="flex items-center space-x-2.5 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></span>
                <span class="font-bold text-emerald-300 font-mono flex-shrink-0">[รายงานสดใหม่] ${callSign}:</span>
                <span class="text-white font-sarabun truncate font-semibold">${text}</span>
            </div>
            <div class="flex items-center space-x-1.5 ml-2 flex-shrink-0">
                <span class="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold font-mono text-[10px]">${timeStr} น.</span>
            </div>
        `;
        feedContainer.insertBefore(newFeedRow, feedContainer.firstChild);
        setTimeout(() => newFeedRow.classList.remove('animate-bounce'), 1000);
    }

    // Increment Total Missions Counter dynamically
    const kpiTotalEl = document.getElementById('dashKpiTotal');
    if (kpiTotalEl) {
        let count = parseInt(kpiTotalEl.textContent) || currentData.latestReport.items.length;
        kpiTotalEl.textContent = count + 1;
    }
    const statTotalEl = document.getElementById('statTotalOps');
    if (statTotalEl) {
        let count = parseInt(statTotalEl.textContent) || currentData.latestReport.items.length;
        statTotalEl.textContent = count + 1;
    }

    // Add new tactical marker on map if lat/lng
    if (appMap && mapMarkersLayer) {
        const lat = 6.855 + (Math.random() - 0.5) * 0.02;
        const lng = 101.225 + (Math.random() - 0.5) * 0.02;

        const liveIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="custom-tactical-pin animate-pulse" style="background-color: #10B981; border: 3px solid #ffffff; box-shadow: 0 0 20px #10B981; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                     <span style="font-size: 16px;">⚡</span>
                   </div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19]
        });

        const liveMarker = L.marker([lat, lng], { icon: liveIcon });
        liveMarker.bindPopup(`
            <div class="p-2.5 space-y-1.5 font-sans text-slate-100" style="min-width: 220px;">
                <div class="flex items-center justify-between border-b border-emerald-700 pb-1">
                    <span class="text-xs font-bold text-emerald-400">⚡ รายงานสดทางยุทธวิธี</span>
                    <span class="text-[10px] font-mono text-emerald-300">${timeStr} น.</span>
                </div>
                <div class="text-[11px] text-amber-300"><strong>ผู้รายงาน:</strong> ${callSign}</div>
                <div class="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 p-1 rounded border border-emerald-500/30">พิกัด: ${grid}</div>
                <div class="text-[11px] text-slate-200 bg-slate-900 p-2 rounded border border-slate-800">${text}</div>
            </div>
        `);
        mapMarkersLayer.addLayer(liveMarker);
        appMap.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
        setTimeout(() => liveMarker.openPopup(), 1300);
    }

    // Success alert notification
    alert(`🚀 ยิงรายงานสดเข้าสู่ศูนย์ TOC สำเร็จ!\n\nผู้รายงาน: ${callSign}\nเวลา: ${timeStr} น.\nข้อความ: ${text.substring(0, 60)}...`);
}


// Smart Auto-Shifting Video Broadcast Controller
let currentPlayingVideoId = null;

function renderVideoTheater() {
    const queueContainer = document.getElementById('sideVideoQueue');
    if (!queueContainer || !currentData || !currentData.videoPlaylist) return;

    const playlist = currentData.videoPlaylist || [];
    if (playlist.length === 0) return;

    if (!currentPlayingVideoId) {
        currentPlayingVideoId = playlist[0].youtubeId;
    }

    const mainVideo = playlist.find(v => v.youtubeId === currentPlayingVideoId) || playlist[0];

    // Update main video player
    const iframe = document.getElementById('mainVideoIframe');
    if (iframe && !iframe.src.includes(mainVideo.youtubeId)) {
        iframe.src = `https://www.youtube.com/embed/${mainVideo.youtubeId}?rel=0&autoplay=1`;
    }

    const el = (id) => document.getElementById(id);
    if (el('mainVideoTitle')) el('mainVideoTitle').textContent = mainVideo.title;
    if (el('mainVideoDesc')) el('mainVideoDesc').textContent = mainVideo.subtitle;
    if (el('mainVideoDate')) el('mainVideoDate').textContent = `📅 ${mainVideo.dateTh}`;
    if (el('mainVideoBadge')) el('mainVideoBadge').innerHTML = `<span class="w-2 h-2 rounded-full ${mainVideo.isLatest ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}"></span><span>${mainVideo.badge}</span>`;
    if (el('mainVideoYoutubeLink')) el('mainVideoYoutubeLink').href = `https://youtu.be/${mainVideo.youtubeId}`;

    // Render side queue with all other videos
    queueContainer.innerHTML = '';
    const otherVideos = playlist.filter(v => v.youtubeId !== currentPlayingVideoId);

    otherVideos.forEach(v => {
        const item = document.createElement('div');
        item.className = 'glass-panel rounded-xl p-3 border border-slate-800 hover:border-amber-500/60 transition-all cursor-pointer group bg-slate-900/80 hover:bg-slate-850';
        item.onclick = () => switchMainVideo(v.youtubeId);

        const thumbUrl = `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`;

        item.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="relative w-28 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-slate-700 group-hover:border-amber-400 transition-colors">
                    <img src="${thumbUrl}" alt="${v.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy">
                    <div class="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                        <div class="w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
                        </div>
                    </div>
                </div>
                <div class="flex-1 min-w-0 space-y-1">
                    <div class="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span class="px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">${v.category}</span>
                        <span class="text-slate-400">${v.dateTh}</span>
                    </div>
                    <h5 class="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2 leading-tight font-sarabun">
                        ${v.title}
                    </h5>
                    <div class="flex items-center justify-between pt-1 text-[10px]">
                        <span class="text-amber-400/90 font-bold flex items-center gap-1 group-hover:underline">
                            ▶️ สลับขึ้นจอหลัก
                        </span>
                        <a href="https://youtu.be/${v.youtubeId}" target="_blank" onclick="event.stopPropagation()" class="text-slate-400 hover:text-white flex items-center gap-0.5">
                            <i data-lucide="external-link" class="w-3 h-3"></i> YouTube
                        </a>
                    </div>
                </div>
            </div>
        `;
        queueContainer.appendChild(item);
    });

    if (window.lucide) lucide.createIcons();
}

function switchMainVideo(youtubeId) {
    currentPlayingVideoId = youtubeId;
    renderVideoTheater();
    
    // Smooth scroll to video player on mobile
    if (window.innerWidth < 1024) {
        const player = document.getElementById('mainVideoIframe');
        if (player) player.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function copyMainVideoUrl() {
    if (!currentPlayingVideoId) return;
    const url = `https://youtu.be/${currentPlayingVideoId}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        showDispatchToast("📋 คัดลอกลิงก์วิดีโอเรียบร้อยแล้ว!", "success");
    }
}
