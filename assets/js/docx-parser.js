/**
 * Smart DOCX-to-Dashboard Intelligence Parser for BPP 924
 * Parses Royal Thai Police Radio Dispatches & Operations Daily Reports (ปจว.ยก. / ปจว.ขว.)
 */

window.DOCXParser = (function() {
    
    function thaiToDevNum(str) {
        if (!str) return '';
        const thaiNums = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
        let res = str.toString();
        thaiNums.forEach((t, i) => {
            res = res.split(t).join(i.toString());
        });
        return res;
    }

    async function parseDocxFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(event) {
                try {
                    const arrayBuffer = event.target.result;
                    if (!window.mammoth) {
                        throw new Error('Mammoth.js library is not loaded');
                    }
                    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                    const rawText = result.value;
                    const parsedData = processRawIntelligenceText(rawText, file.name);
                    resolve({ rawText, parsedData });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    function processRawIntelligenceText(text, filename = '') {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        let docNumber = "นร.๕๑๑๙.๑(ฉก.ตร.ปน.9๒).9๒๔/ยก./" + Math.floor(1000 + Math.random() * 9000);
        let dateTh = "22 สิงหาคม 2569";
        let timeRangeTh = "211501 ส.ค. 69 ถึง 221500 ส.ค. 69";
        let situationSummary = "ในห้วงเวลาที่ผ่านมา เหตุการณ์ในพื้นที่รับผิดชอบทั่วไปปกติ ไม่พบความเคลื่อนไหวหรือสิ่งบอกเหตุของการเตรียมการก่อเหตุรุนแรง เจ้าหน้าที่ได้ปฏิบัติการเชิงรุกและรับอย่างต่อเนื่อง ทั้งการลาดตระเวน การตั้งจุดตรวจ และงานกิจการพลเรือนเพื่อมวลชนสัมพันธ์";
        let approver = "ร.ต.อ.เดชเดโช ส่งสีอ่อน ผบ.ร้อย ฉก.ตชด.924";

        // Find doc number & date
        lines.forEach(line => {
            if (line.includes('ที่') && line.includes('นร.')) {
                docNumber = line.replace(/.*ที่\s*/, '').split(/\s+วันที่/)[0].trim();
            }
            if (line.includes('วันที่') && (line.includes('สิงหาคม') || line.includes('กุมภาพันธ์') || line.includes('มกราคม') || line.includes('มีนาคม') || line.includes('เมษายน') || line.includes('พฤษภาคม') || line.includes('มิถุนายน') || line.includes('กรกฎาคม') || line.includes('กันยายน') || line.includes('ตุลาคม') || line.includes('พฤศจิกายน') || line.includes('ธันวาคม') || line.includes('ส.ค.') || line.includes('ก.ย.'))) {
                const parts = line.split('วันที่');
                if (parts[1]) dateTh = parts[1].trim();
            }
            if (line.includes('ห้วงเวลาการรายงาน:')) {
                timeRangeTh = line.replace('ห้วงเวลาการรายงาน:', '').trim();
            }
        });

        // Find situation
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('สรุปสถานการณ์') || lines[i].includes('๑.๑)')) {
                let summaryLines = [];
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    if (lines[j].includes('๑.๒)') || lines[j].includes('ด้านการรักษาความปลอดภัย')) break;
                    summaryLines.push(lines[j]);
                }
                if (summaryLines.length > 0) {
                    situationSummary = summaryLines.join(' ');
                }
            }
        }

        // Parse operational items
        const items = [];
        let currentCategory = 'ลาดตระเวน';
        let currentCategoryTh = 'ลาดตระเวนรักษาความปลอดภัย';
        let currentUnit = 'มว.ฉก.ตชด.9241';
        let catBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        let itemIndex = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('ทำลายความพยายาม')) {
                currentCategory = 'patrol';
                currentCategoryTh = 'ลาดตระเวนทำลายความพยายาม';
                catBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            } else if (line.includes('การลาดตระเวนรอบฐาน')) {
                currentCategory = 'patrol_base';
                currentCategoryTh = 'ลาดตระเวนป้องกันที่ตั้ง/ฐาน';
                catBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            } else if (line.includes('พิสูจน์ทราบ') || line.includes('ซุ่มโจมตี')) {
                currentCategory = 'patrol_verify';
                currentCategoryTh = 'ลาดตระเวนพิสูจน์ทราบพื้นที่';
                catBadge = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
            } else if (line.includes('จุดตรวจ') || line.includes('จุดสกัด') || line.includes('ผบ.หน่วยฯ')) {
                currentCategory = 'checkpoint';
                currentCategoryTh = 'กำชับจุดตรวจความมั่นคง';
                catBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            } else if (line.includes('งานกิจการพลเรือน') || line.includes('พบปะประชาชน')) {
                currentCategory = 'civil_affairs';
                currentCategoryTh = 'กิจการพลเรือน / มวลชนสัมพันธ์';
                catBadge = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
            } else if (line.includes('ภารกิจพิเศษ') || line.includes('พลนำทาง') || line.includes('CCTV') || line.includes('เส้นทางเสี่ยง')) {
                currentCategory = 'special_ops';
                currentCategoryTh = 'ภารกิจพิเศษ / สืบสวนหาข่าว';
                catBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            } else if (line.includes('การซักซ้อมแผน')) {
                currentCategory = 'drill';
                currentCategoryTh = 'ซักซ้อมแผนเผชิญเหตุ';
                catBadge = 'bg-red-500/20 text-red-300 border-red-500/30';
            }

            if (line.includes('มว.ฉก.ตชด.๙๒๔๑') || line.includes('มว.ฉก.ตชด.9241') || line.includes('มว.9241')) {
                currentUnit = 'มว.ฉก.ตชด.9241';
            } else if (line.includes('มว.ฉก.ตชด.๙๒๔๒') || line.includes('มว.ฉก.ตชด.9242') || line.includes('มว.9242')) {
                currentUnit = 'มว.ฉก.ตชด.9242';
            } else if (line.includes('ร้อย ฉก.ตชด.๙๒๔') || line.includes('ร้อย ฉก.ตชด.924') || line.includes('ร้อย 924')) {
                currentUnit = 'ร้อย ฉก.ตชด.๙๒๔';
            }

            // Detect operations entries: e.g. "ครั้งที่ ๑: เมื่อ ๒๒๐๙๑๐ ส.ค. ๖๙..."
            if (line.match(/ครั้งที่\s*[๑-๙0-9]+\s*:\s*เมื่อ/) || (line.includes('เมื่อ') && (line.includes('ส.ค.') || line.includes('ก.ย.') || line.includes('นาย')) && !line.includes('ไม่มีการปฏิบัติ'))) {
                const item = parseSingleOperationLine(line, currentCategory, currentCategoryTh, currentUnit, catBadge, itemIndex++);
                if (item) {
                    items.push(item);
                }
            }
        }

        // If items are empty (fallback to default items)
        const finalItems = items.length > 0 ? items : (window.BPP924_DATA ? window.BPP924_DATA.latestReport.items : []);

        const platoon1Count = finalItems.filter(i => i.unit.includes('9241') || i.unit.includes('๙๒๔๑')).length;
        const platoon2Count = finalItems.filter(i => i.unit.includes('9242') || i.unit.includes('๙๒๔๒')).length;
        const hqCount = finalItems.filter(i => i.unit.includes('ร้อย')).length;

        const patrolCount = finalItems.filter(i => i.category.startsWith('patrol')).length;
        const checkpointCount = finalItems.filter(i => i.category === 'checkpoint').length;
        const civilAffairsCount = finalItems.filter(i => i.category === 'civil_affairs').length;
        const specialMissionsCount = finalItems.filter(i => i.category === 'special_ops').length;
        const drillCount = finalItems.filter(i => i.category === 'drill').length;

        return {
            docNumber: docNumber,
            dateTh: dateTh,
            rawDate: new Date().toISOString().split('T')[0],
            timeRangeTh: timeRangeTh,
            situationSummary: situationSummary,
            approver: approver,
            operationsSummary: {
                totalMissions: finalItems.length,
                platoon1Missions: platoon1Count,
                platoon2Missions: platoon2Count,
                hqMissions: hqCount,
                patrolCount: patrolCount,
                checkpointCount: checkpointCount,
                civilAffairsCount: civilAffairsCount,
                specialMissionsCount: specialMissionsCount,
                drillCount: drillCount,
                arrestCount: 0
            },
            items: finalItems
        };
    }

    function parseSingleOperationLine(line, category, categoryTh, unit, badge, index) {
        // Extract time
        let timeTh = "๒๒๐๙๐๐ ส.ค. ๖๙";
        const timeMatch = line.match(/เมื่อ\s*([๑-๙0-9]{6,8}\s*[ก-๙.]+\s*[๑-๙0-9]{2})/);
        if (timeMatch) {
            timeTh = timeMatch[1].trim();
        }

        // Extract leader & team
        let leader = "เจ้าหน้าที่ชุดปฏิบัติการ";
        const leaderMatch = line.match(/(ด\.ต\.[^\s]+|ส\.ต\.ท\.[^\s]+|ร\.ต\.อ\.[^\s]+|ร\.ต\.ท\.[^\s]+|ร\.ต\.ต\.[^\s]+|จ\.ส\.ต\.[^\s]+|ส\.ต\.อ\.[^\s]+|ส\.ต\.ต\.[^\s]+|จนท\.[^\s]+)\s+([^\s]+)?/);
        if (leaderMatch) {
            leader = leaderMatch[0].replace('พร้อมพวก', '').trim();
        }

        // Extract callsign
        let callSign = "เหมราช";
        const callSignMatch = line.match(/\((เหมราช\s*[๑-๙0-9]+|อินทรี\s*[๑-๙0-9]+|ชป\.[^\)]+)\)/);
        if (callSignMatch) {
            callSign = callSignMatch[1];
        } else if (line.includes('นามเรียกขาน')) {
            const cs = line.match(/นามเรียกขาน\s*([^\s]+)/);
            if (cs) callSign = cs[1];
        }

        // Extract team size
        let teamSize = 6;
        const teamMatch = line.match(/พร้อมพวก\s*([๑-๙0-9]+)\s*นาย/);
        if (teamMatch) {
            const devN = thaiToDevNum(teamMatch[1]);
            teamSize = parseInt(devN) + 1;
        }

        // Extract location
        let location = "พื้นที่รับผิดชอบ อ.เมือง จ.ปัตตานี";
        let subdistrict = unit.includes("9242") ? "ตำบลปะกาฮะรัง" : "ตำบลรูสะมิแล";
        if (line.includes("ต.ปะกาฮะรัง") || line.includes("กือยา") || line.includes("ดอนรัก") || line.includes("418") || line.includes("๔๑๘")) {
            subdistrict = "ตำบลปะกาฮะรัง";
        } else if (line.includes("ต.รูสะมิแล") || line.includes("ปราการ") || line.includes("ฟาตอนี") || line.includes("ขจรประชาราม")) {
            subdistrict = "ตำบลรูสะมิแล";
        }

        const locMatch = line.match(/(ม\.[๑-๙0-9]+\s*[^พิกัด
]+|ณ\s*[^พิกัด
]+|บริเวณ[^พิกัด
]+|จุดตรวจ[^พิกัด
]+|ศูนย์ไทยพลัส[^พิกัด
]+)/);
        if (locMatch) {
            location = locMatch[0].replace(/พิกัด.*/, '').trim();
        }

        // Extract grid
        let grid = "";
        let lat = 6.864401;
        let lng = 101.209794;

        const gridMatch = line.match(/(?:พิกัด\s*)?([๔-๙4-9][๗7][A-Za-z][A-Za-z][\s0-9๑-๙]{10,14})/);
        if (gridMatch) {
            grid = gridMatch[1].trim();
            if (window.MGRSConverter) {
                const coords = window.MGRSConverter.parseMGRS(grid);
                if (coords) {
                    lat = coords.lat;
                    lng = coords.lng;
                }
            }
        } else {
            // Default coords based on subdistrict
            if (subdistrict === "ตำบลปะกาฮะรัง") {
                lat = 6.833172 + (Math.random() - 0.5) * 0.008;
                lng = 101.234919 + (Math.random() - 0.5) * 0.008;
            } else {
                lat = 6.862302 + (Math.random() - 0.5) * 0.008;
                lng = 101.210318 + (Math.random() - 0.5) * 0.008;
            }
        }

        // Clean mission detail
        let missionDetail = line.replace(/ครั้งที่\s*[๑-๙0-9]+\s*:\s*/, '').trim();
        let result = "ผลการปฏิบัติเป็นไปด้วยความเรียบร้อย เหตุการณ์ปกติ";
        if (line.includes("ผลการปฏิบัติ")) {
            const parts = line.split("ผลการปฏิบัติ");
            missionDetail = parts[0].trim();
            result = "ผลการปฏิบัติ" + parts[1].trim();
        }

        return {
            id: `OP-${Date.now()}-${index}`,
            category: category,
            categoryTh: categoryTh,
            unit: unit,
            leader: leader,
            callSign: callSign,
            teamSize: teamSize,
            timeTh: timeTh,
            timeIso: new Date().toISOString(),
            location: location,
            subdistrict: subdistrict,
            grid: grid,
            lat: lat,
            lng: lng,
            missionDetail: missionDetail,
            result: result,
            status: "COMPLETED",
            badge: badge
        };
    }

    return {
        parseDocxFile,
        processRawIntelligenceText
    };
})();
