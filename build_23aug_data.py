import json
import re

with open('/Volumes/Extreme_SSD/bpp924-web-portal/docx_23aug_raw.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

# Let's inspect all blocks and group them by mission item
thai_digit_map = {'๐':'0', '๑':'1', '๒':'2', '๓':'3', '๔':'4', '๕':'5', '๖':'6', '๗':'7', '๘':'8', '๙':'9'}
def normalize_thai_digits(s):
    res = ''
    for ch in s:
        res += thai_digit_map.get(ch, ch)
    return res

current_category_heading = ""
current_unit_heading = ""
items = []
current_item = None

for i, b in enumerate(raw):
    text = b['text'].strip()
    images = b['images']

    if not text and not images:
        continue

    # Detect category headers like "๑.) ทำลายความพยายาม:", "๒.) การลาดตระเวน...", "๓.) จุดตรวจ..."
    if re.search(r'^[๑-๙0-9]+\.\)\s*', text) or 'มาตรการเชิงรุก' in text or 'มาตรการเชิงรับ' in text or 'งานด้านกิจการพลเรือน' in text or 'การฝึกทบทวน' in text:
        current_category_heading = text
        continue

    # Detect unit headers like "มว.ฉก.ตชด.๙๒๔๑", "มว.ฉก.ตชด.๙๒๔๒", "ชป.กร."
    if ('มว.ฉก.ตชด.' in text or 'ชป.กร.' in text or 'บก.ร้อย' in text) and len(text) < 40 and not text.startswith('ครั้งที่'):
        current_unit_heading = text
        continue

    # Detect item start: "ครั้งที่ ๑. เมื่อ...", "ครั้งที่ 1. เมื่อ...", "๑. เมื่อ..."
    if text.startswith('ครั้งที่') or (re.match(r'^[๑-๙0-9]+\.\s*เมื่อ', text)):
        if current_item:
            items.append(current_item)
        current_item = {
            'header_cat': current_category_heading,
            'header_unit': current_unit_heading,
            'text': text,
            'extra_texts': [],
            'images': list(images)
        }
    else:
        if current_item:
            if text:
                current_item['extra_texts'].append(text)
            if images:
                current_item['images'].extend(images)

if current_item:
    items.append(current_item)

print(f"Total parsed missions for 23 Aug: {len(items)}")

# Process each item into structured format
structured_items = []
for idx, it in enumerate(items):
    full_text = it['text'] + ' ' + ' '.join(it['extra_texts'])
    norm_text = normalize_thai_digits(full_text)

    # 1. Parse time
    # e.g. "เมื่อ ๒๒๑๙๐๐ ส.ค. ๖๙" -> 221900 -> 19:00 น.
    time_match = re.search(r'เมื่อ\s*(\d{2})(\d{2})(\d{2})\s*ส\.ค\.\s*(\d{2})', norm_text)
    if time_match:
        d, h, m, y = time_match.groups()
        time_th = f"{h}:{m} น. ({d} ส.ค.)"
        raw_time = f"{h}:{m}"
    else:
        time_th = "เวลาราชการ"
        raw_time = "10:00"

    # 2. Parse MGRS Grid
    # e.g. "๔๗NQH ๔๕๓๓๘ ๕๘๓๔๗" or "47NQH 45338 58347"
    grid_match = re.search(r'47NQH\s*(\d{5})\s*(\d{5})', norm_text, re.IGNORECASE)
    if grid_match:
        grid = f"47NQH {grid_match.group(1)} {grid_match.group(2)}"
    else:
        grid_match2 = re.search(r'พิกัด\s*([0-9\.\,]+)', norm_text)
        if grid_match2:
            grid = grid_match2.group(1)
        else:
            grid = "47NQH 52300 55800"

    # 3. Parse Leader and Call Sign
    # e.g. "ส.ต.ท.ณัฐพร สะพานทอง พร้อมพวก ๕ นาย" or "ด.ต.สมภพ บุญสุวรรณ (นามเรียกขาน เหมราช ๔๐๑๒)"
    call_sign_match = re.search(r'(?:นามเรียกขาน|เหมราช)\s*([เหมราช\s0-9]+)', norm_text)
    if call_sign_match:
        raw_cs = call_sign_match.group(1).strip()
        if not raw_cs.startswith('เหมราช'):
            call_sign = f"เหมราช {raw_cs}"
        else:
            call_sign = raw_cs
    else:
        if '๙๒๔๑' in it['header_unit'] or '9241' in it['header_unit']:
            call_sign = "เหมราช 41"
        elif '๙๒๔๒' in it['header_unit'] or '9242' in it['header_unit']:
            call_sign = "เหมราช 42"
        elif 'ชป.กร.' in it['header_unit']:
            call_sign = "เหมราช 4012"
        else:
            call_sign = "เหมราช 41"

    # Leader name
    leader_match = re.search(r'(ร\.ต\.อ\.|ร\.ต\.ท\.|ร\.ต\.ต\.|ด\.ต\.|จ\.ส\.ต\.|ส\.ต\.อ\.|ส\.ต\.ท\.|ส\.ต\.ต\.)\s*([ก-๙]+)\s+([ก-๙]+)', it['text'])
    if leader_match:
        leader = f"{leader_match.group(1)}{leader_match.group(2)} {leader_match.group(3)}"
    else:
        leader = "หน.ชุดปฏิบัติการ"

    # 4. Unit & Subdistrict
    if '๙๒๔๑' in it['header_unit'] or '9241' in it['header_unit'] or 'รูสะมิแล' in full_text:
        unit = "มว.ฉก.ตชด.๙๒๔๑"
        subdistrict = "ต.รูสะมิแล"
    elif '๙๒๔๒' in it['header_unit'] or '9242' in it['header_unit'] or 'ปะกาฮะรัง' in full_text:
        unit = "มว.ฉก.ตชด.๙๒๔๒"
        subdistrict = "ต.ปะกาฮะรัง"
    elif 'ชป.กร.' in it['header_unit'] or 'กิจการพลเรือน' in it['header_cat']:
        unit = "ชป.กร.ร้อย ฉก.ตชด.๙๒๔"
        subdistrict = "ต.รูสะมิแล" if 'รูสะมิแล' in full_text else "ต.ปะกาฮะรัง"
    else:
        unit = "ร้อย ฉก.ตชด.๙๒๔"
        subdistrict = "ต.รูสะมิแล"

    # 5. Category & Badge
    cat_header = it['header_cat']
    if 'ทำลายความพยายาม' in cat_header or 'ทำลายความพยายาม' in full_text:
        category = "security_check"
        categoryTh = "ทำลายความพยายาม / ตรวจความปลอดภัย"
        badge = "badge-security"
    elif 'รอบฐาน' in cat_header or 'รอบฐาน' in full_text:
        category = "patrol_base"
        categoryTh = "ลาดตระเวนรอบฐาน"
        badge = "badge-patrol"
    elif 'จยย' in full_text or 'จักรยานยนต์' in full_text:
        category = "patrol_motorcycle"
        categoryTh = "ลาดตระเวน จยย."
        badge = "badge-patrol"
    elif 'เดินเท้า' in full_text:
        category = "patrol_foot"
        categoryTh = "ลาดตระเวนเดินเท้า"
        badge = "badge-patrol"
    elif 'จุดตรวจ' in cat_header or 'จุดตรวจ' in full_text or 'ด่าน' in full_text:
        category = "checkpoint"
        categoryTh = "จุดตรวจ / จุดสกัด (POP-UP)"
        badge = "badge-checkpoint"
    elif 'กิจการพลเรือน' in cat_header or 'มวลชน' in full_text or 'ตาดีกา' in full_text:
        category = "civil_affairs"
        categoryTh = "กิจการพลเรือน / มวลชนสัมพันธ์"
        badge = "badge-civil"
    elif 'ฝึก' in cat_header or 'ฝึก' in full_text:
        category = "training"
        categoryTh = "ฝึกทบทวนยุทธวิธี"
        badge = "badge-training"
    else:
        category = "patrol"
        categoryTh = "ภารกิจยุทธการ"
        badge = "badge-patrol"

    # 6. Location
    loc_match = re.search(r'ณ\s+([^(\n]+)', full_text)
    if loc_match:
        location = loc_match.group(1).strip()
    else:
        location = f"{subdistrict} อ.เมือง จ.ปัตตานี"

    structured_items.append({
        "id": f"OP-23AUG-{idx+1:03d}",
        "time": raw_time,
        "timeTh": time_th,
        "category": category,
        "categoryTh": categoryTh,
        "badge": badge,
        "unit": unit,
        "subdistrict": subdistrict,
        "leader": leader,
        "callSign": call_sign,
        "location": location,
        "grid": grid,
        "missionDetail": full_text.strip(),
        "images": it['images'] if it['images'] else ["assets/images/image1.jpeg"]
    })

print(f"Successfully processed {len(structured_items)} structured items!")
with open('/Volumes/Extreme_SSD/bpp924-web-portal/structured_23aug_items.json', 'w', encoding='utf-8') as f:
    json.dump(structured_items, f, ensure_ascii=False, indent=2)
