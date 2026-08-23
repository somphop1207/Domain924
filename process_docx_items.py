import json
import re

with open('/Volumes/Extreme_SSD/bpp924-web-portal/docx_23aug_raw.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

# Group text and associated images into items
items = []
current_item = None

# Regex patterns
time_pat = re.compile(r'เมื่อ\s*(\d{6})\s*([ก-๙\.]+)?\s*(\d{2})?', re.UNICODE)
item_num_pat = re.compile(r'^(\d+)\.\s*(.*)', re.UNICODE)

for block in raw:
    text = block['text'].strip()
    images = block['images']

    # Check if this starts a new mission item
    # Usually items start with "๑. เมื่อ ...", "๒. เมื่อ ...", or "1. เมื่อ ...", or "เมื่อ 23..."
    is_new = False
    m_num = item_num_pat.match(text)
    if m_num and ('เมื่อ' in text or 'ว.๔' in text or 'ชป.' in text or 'มว.' in text or 'ร้อย' in text):
        is_new = True
    elif text.startswith('เมื่อ ') and len(text) > 10:
        is_new = True

    if is_new:
        if current_item:
            items.append(current_item)
        current_item = {
            'raw_texts': [text],
            'images': list(images)
        }
    else:
        if current_item:
            if text:
                current_item['raw_texts'].append(text)
            if images:
                current_item['images'].extend(images)
        elif text or images:
            # Header or intro before first item
            pass

if current_item:
    items.append(current_item)

print(f"Total structured items detected: {len(items)}")
for i, it in enumerate(items[:10]):
    full_t = ' '.join(it['raw_texts'])
    print(f"Item {i+1} ({len(it['images'])} imgs): {full_t[:120]}...")
