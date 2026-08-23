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
        if (el('homeDocNumber')) el('homeDocNumber').textContent = report.dispatchRef || 'ที่ นร.๕๑๑๙.๑(ฉก.ตร.ปน.9๒).9๒๔/ยก./1122';
        if (el('homeReportDate')) el('homeReportDate').textContent = report.dateTh;
        if (el('homeReportTime')) el('homeReportTime').textContent = report.timeRange || '221501 ส.ค. 69 ถึง 231500 ส.ค. 69';
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
        if (el('dashDocNum')) el('dashDocNum').textContent = report.dispatchRef || '';
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
    if (!mapMarkersLayer) return;
    mapMarkersLayer.clearLayers();

    const items = currentData.latestReport.items;
    const filter = activeMapFilter;

    items.forEach(item => {
        if (filter !== 'all') {
            if (filter === 'patrol' && !item.category.startsWith('patrol')) return;
            if (filter === 'checkpoint' && item.category !== 'checkpoint') return;
            if (filter === 'civil_affairs' && item.category !== 'civil_affairs') return;
            if (filter === 'special_ops' && item.category !== 'special_ops') return;
            if (filter === 'drill' && item.category !== 'drill') return;
        }

        let pinColor = '#3B82F6';
        let pinIcon = '🛡️';
        if (item.category.startsWith('patrol')) { pinColor = '#F59E0B'; pinIcon = '🚶‍♂️'; }
        else if (item.category === 'checkpoint') { pinColor = '#10B981'; pinIcon = '🚧'; }
        else if (item.category === 'civil_affairs') { pinColor = '#06B6D4'; pinIcon = '🤝'; }
        else if (item.category === 'special_ops') { pinColor = '#A855F7'; pinIcon = '🎯'; }
        else if (item.category === 'drill') { pinColor = '#EF4444'; pinIcon = '🚨'; }

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="custom-tactical-pin" style="background-color: ${pinColor}; border-color: #ffffff; box-shadow: 0 0 12px ${pinColor};">
                     <span style="font-size: 14px;">${pinIcon}</span>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon });

        const popupContent = `
            <div class="p-2 space-y-1.5 font-sans" style="min-width: 220px;">
                <div class="flex items-center justify-between border-b border-slate-700 pb-1">
                    <span class="text-xs font-bold text-amber-400">${item.unit}</span>
                    <span class="text-[10px] font-mono text-slate-400">${item.timeTh}</span>
                </div>
                <div class="text-xs font-semibold text-slate-100">${item.categoryTh}</div>
                <div class="text-[11px] text-slate-300"><strong>ผู้นำชุด:</strong> ${item.leader} (${item.callSign})</div>
                <div class="text-[11px] text-slate-300"><strong>สถานที่:</strong> ${item.location}</div>
                ${item.grid ? `<div class="text-[10px] font-mono text-amber-300 bg-amber-950/40 p-1 rounded border border-amber-500/30">พิกัด: ${item.grid}</div>` : ''}
                <div class="text-[11px] text-slate-300 bg-slate-800/80 p-1.5 rounded">${item.missionDetail}</div>
                <div class="text-[10px] text-emerald-400">${item.result}</div>
            </div>
        `;

        marker.bindPopup(popupContent);
        mapMarkersLayer.addLayer(marker);
    });
}

function filterMap(category) {
    activeMapFilter = category;
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === category) {
            btn.classList.add('bg-amber-500', 'text-slate-950', 'font-bold');
            btn.classList.remove('bg-slate-800', 'text-slate-300');
        } else {
            btn.classList.remove('bg-amber-500', 'text-slate-950', 'font-bold');
            btn.classList.add('bg-slate-800', 'text-slate-300');
        }
    });
    plotTacticalMarkers();
}

// Chart.js Executive Visualizations
function initOrUpdateCharts() {
    const summary = currentData.latestReport.operationsSummary;

    // Platoon Distribution Chart
    const platoonCtx = document.getElementById('chartPlatoonDistribution');
    if (platoonCtx) {
        if (platoonChartInstance) platoonChartInstance.destroy();
        platoonChartInstance = new Chart(platoonCtx, {
            type: 'doughnut',
            data: {
                labels: ['มว.ฉก.ตชด.9241 (ต.รูสะมิแล)', 'มว.ฉก.ตชด.9242 (ต.ปะกาฮะรัง)', 'บก.ร้อย ฉก.ตชด.924'],
                datasets: [{
                    data: [summary.platoon1Missions, summary.platoon2Missions, summary.hqMissions],
                    backgroundColor: ['#3B82F6', '#F59E0B', '#10B981'],
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

    // Category Distribution Chart
    const categoryCtx = document.getElementById('chartCategoryDistribution');
    if (categoryCtx) {
        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: ['ลาดตระเวน', 'จุดตรวจ', 'กิจการพลเรือน', 'ภารกิจพิเศษ/สืบสวน', 'ซักซ้อมแผน'],
                datasets: [{
                    label: 'จำนวนภารกิจ (ครั้ง)',
                    data: [
                        summary.patrolCount,
                        summary.checkpointCount,
                        summary.civilAffairsCount,
                        summary.specialMissionsCount,
                        summary.drillCount
                    ],
                    backgroundColor: ['#F59E0B', '#10B981', '#06B6D4', '#A855F7', '#EF4444'],
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
                    x: { ticks: { color: '#94A3B8', font: { family: 'Prompt', size: 11 } }, grid: { display: false } },
                    y: { ticks: { color: '#94A3B8', stepSize: 1, font: { family: 'Chakra Petch' } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
                }
            }
        });
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
    if (!newsGrid || !currentData.newsArticles) return;

    newsGrid.innerHTML = '';
    currentData.newsArticles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'glass-panel rounded-xl overflow-hidden hover:border-amber-500/50 transition-all group flex flex-col justify-between';
        card.innerHTML = `
            <div>
                <div class="relative h-48 overflow-hidden">
                    <img src="${article.image}" alt="${article.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur-md text-amber-400 text-xs font-bold border border-amber-500/30">
                        ${article.category}
                    </div>
                </div>
                <div class="p-5">
                    <div class="flex items-center space-x-2 text-xs text-slate-400 mb-2 font-mono">
                        <span>📅 ${article.dateTh}</span>
                        <span>•</span>
                        <span>📍 ${article.location}</span>
                    </div>
                    <h3 class="text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2 mb-2">
                        ${article.title}
                    </h3>
                    <p class="text-xs text-slate-300 line-clamp-3 font-sarabun">
                        ${article.summary}
                    </p>
                </div>
            </div>
            <div class="p-5 pt-0">
                <button onclick="openNewsModal('${article.id}')" class="w-full py-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all flex items-center justify-center space-x-1.5">
                    <span>อ่านรายละเอียดข่าว</span>
                    <span>→</span>
                </button>
            </div>
        `;
        newsGrid.appendChild(card);
    });
}

function openNewsModal(articleId) {
    const article = currentData.newsArticles.find(a => a.id === articleId);
    if (!article) return;

    const modal = document.getElementById('newsModal');
    if (!modal) return;

    document.getElementById('newsModalTitle').textContent = article.title;
    document.getElementById('newsModalCategory').textContent = article.category;
    document.getElementById('newsModalDate').textContent = `${article.dateTh} | ${article.location}`;
    document.getElementById('newsModalImage').src = article.image;
    document.getElementById('newsModalContent').textContent = article.content;

    const galleryContainer = document.getElementById('newsModalGallery');
    if (galleryContainer) {
        if (article.gallery && article.gallery.length > 0) {
            let gHtml = '<div class="space-y-1.5 mt-3"><span class="text-[11px] font-bold text-emerald-400 block">ภาพถ่ายกิจกรรมชุดปฏิบัติการจริง:</span><div class="grid grid-cols-3 gap-2">';
            article.gallery.forEach(imgSrc => {
                gHtml += `<div class="rounded-lg overflow-hidden border border-slate-700 h-28 cursor-pointer" onclick="window.open('${imgSrc}', '_blank')"><img src="${imgSrc}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt="รูปกิจกรรม"></div>`;
            });
            gHtml += '</div></div>';
            galleryContainer.innerHTML = gHtml;
            galleryContainer.classList.remove('hidden');
        } else {
            galleryContainer.classList.add('hidden');
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

    document.getElementById('printDocNum').textContent = report.docNumber;
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
