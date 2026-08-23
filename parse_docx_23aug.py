import zipfile
import os
import xml.etree.ElementTree as ET
import re
import json

docx_path = '/Users/somphopboonsuwan/Downloads/BPP924 ปจว.ยก. 23 ส.ค. 69.docx'
out_img_dir = '/Volumes/Extreme_SSD/bpp924-web-portal/assets/images'
os.makedirs(out_img_dir, exist_ok=True)

with zipfile.ZipFile(docx_path, 'r') as docx:
    # 1. Extract all media files
    for item in docx.namelist():
        if item.startswith('word/media/'):
            fname = os.path.basename(item)
            target = os.path.join(out_img_dir, fname)
            with open(target, 'wb') as f:
                f.write(docx.read(item))
    print(f"Extracted all media files to {out_img_dir}")

    # 2. Parse rels
    rels_xml = docx.read('word/_rels/document.xml.rels')
    rels_root = ET.fromstring(rels_xml)
    rel_map = {}
    for rel in rels_root.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        r_id = rel.get('Id')
        target = rel.get('Target')
        if 'media/' in target:
            rel_map[r_id] = os.path.basename(target)

    # 3. Parse document.xml
    doc_xml = docx.read('word/document.xml')
    doc_root = ET.fromstring(doc_xml)

    ns = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }

    paragraphs_data = []
    for p in doc_root.findall('.//w:p', ns):
        texts = []
        for t in p.findall('.//w:t', ns):
            if t.text:
                texts.append(t.text)
        full_p_text = ''.join(texts).strip()

        img_names = []
        for blip in p.findall('.//a:blip', ns):
            embed_id = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
            if embed_id and embed_id in rel_map:
                img_names.append(f"assets/images/{rel_map[embed_id]}")

        if full_p_text or img_names:
            paragraphs_data.append({
                'text': full_p_text,
                'images': img_names
            })

print(f"Total paragraph blocks: {len(paragraphs_data)}")

# Let's inspect paragraphs to find missions
with open('/Volumes/Extreme_SSD/bpp924-web-portal/docx_23aug_raw.json', 'w', encoding='utf-8') as f:
    json.dump(paragraphs_data, f, ensure_ascii=False, indent=2)
print("Saved raw parsed paragraphs to docx_23aug_raw.json")
