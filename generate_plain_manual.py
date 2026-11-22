# -*- coding: utf-8 -*-
"""
TIGER SYSTEM - Plain Language User Manual (Zero Tashkeel, 100% Practical & Clear)
Architected & Developed by Dr. Samer Mohammad
"""

import os
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

COLOR_NAVY = RGBColor(15, 39, 68)       # #0F2744 Navy
COLOR_ORANGE = RGBColor(194, 65, 12)    # #C2410C Tiger Orange
COLOR_SLATE_DARK = RGBColor(51, 65, 85) # #334155 Slate
COLOR_SLATE_MID = RGBColor(100, 116, 139) # #64748B
COLOR_BLACK = RGBColor(15, 23, 42)

HEX_NAVY = "0F2744"
HEX_ORANGE = "C2410C"

def strip_tashkeel(text):
    """Ensure absolutely zero Arabic diacritics/tashkeel remain in text"""
    tashkeel_regex = re.compile(r'[\u0617-\u061A\u064B-\u0652]')
    return re.sub(tashkeel_regex, '', text)

def set_rtl(p):
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

def set_run_font(run, font_name="Calibri", size_pt=10.5, bold=False, color=COLOR_BLACK):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>')
    rPr.append(rFonts)

def set_cell_background(cell, hex_color):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=130, bottom=130, left=160, right=160):
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    cell._tc.get_or_add_tcPr().append(tcMar)

def set_cell_borders(cell, top="CBD5E1", bottom="CBD5E1", left="CBD5E1", right="CBD5E1", sz="6"):
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{top}"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{left}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{bottom}"/>'
        f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{right}"/>'
        f'</w:tcBorders>'
    )
    cell._tc.get_or_add_tcPr().append(tcBorders)

def set_table_rtl(table):
    tblPr = table._tbl.tblPr
    bidiVisual = OxmlElement('w:bidiVisual')
    tblPr.append(bidiVisual)

def add_clean_heading(doc, text, level=1):
    text = strip_tashkeel(text)
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.keep_with_next = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(20)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        set_run_font(run, font_name="Calibri", size_pt=15, bold=True, color=COLOR_NAVY)
        
        p_line = doc.add_paragraph()
        set_rtl(p_line)
        p_line.paragraph_format.space_before = Pt(0)
        p_line.paragraph_format.space_after = Pt(8)
        r_line = p_line.add_run('━' * 65)
        set_run_font(r_line, font_name="Calibri", size_pt=7, color=COLOR_SLATE_MID)
    elif level == 2:
        p.paragraph_format.space_before = Pt(13)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text)
        set_run_font(run, font_name="Calibri", size_pt=12, bold=True, color=COLOR_ORANGE)
    elif level == 3:
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        set_run_font(run, font_name="Calibri", size_pt=10.5, bold=True, color=COLOR_SLATE_DARK)

def add_body_p(doc, text, bold_prefix=None, space_after=4):
    text = strip_tashkeel(text)
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    
    if bold_prefix:
        bold_prefix = strip_tashkeel(bold_prefix)
        r_prefix = p.add_run(bold_prefix + " ")
        set_run_font(r_prefix, font_name="Calibri", size_pt=10.5, bold=True, color=COLOR_BLACK)
        
    r_body = p.add_run(text)
    set_run_font(r_body, font_name="Calibri", size_pt=10.5, bold=False, color=COLOR_SLATE_DARK)
    return p

def add_bullet_item(doc, title, desc):
    title = strip_tashkeel(title)
    desc = strip_tashkeel(desc)
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.25
    
    r_bullet = p.add_run("▪  ")
    set_run_font(r_bullet, font_name="Calibri", size_pt=9.5, bold=True, color=COLOR_ORANGE)
    
    r_title = p.add_run(title + ": ")
    set_run_font(r_title, font_name="Calibri", size_pt=10.5, bold=True, color=COLOR_NAVY)
    
    r_desc = p.add_run(desc)
    set_run_font(r_desc, font_name="Calibri", size_pt=10, bold=False, color=COLOR_SLATE_DARK)

def add_clean_box(doc, title, body_text, box_style="standard"):
    title = strip_tashkeel(title)
    body_text = strip_tashkeel(body_text)
    styles = {
        "standard": {"bg": "F8FAFC", "border": "0F2744", "title_col": COLOR_NAVY},
        "highlight": {"bg": "FFF7ED", "border": "C2410C", "title_col": COLOR_ORANGE},
        "green": {"bg": "F0FDF4", "border": "15803D", "title_col": RGBColor(21, 128, 61)},
        "red": {"bg": "FEF2F2", "border": "B91C1C", "title_col": RGBColor(185, 28, 28)}
    }
    cfg = styles.get(box_style, styles["standard"])
    
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(tbl)
    cell = tbl.cell(0, 0)
    set_cell_background(cell, cfg["bg"])
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        f'<w:right w:val="single" w:sz="28" w:space="0" w:color="{cfg["border"]}"/>'
        f'</w:tcBorders>'
    )
    cell._tc.get_or_add_tcPr().append(tcBorders)
    
    p = cell.paragraphs[0]
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.25
    
    r_t = p.add_run(f"【 {title} 】\n")
    set_run_font(r_t, font_name="Calibri", size_pt=10.5, bold=True, color=cfg["title_col"])
    
    r_b = p.add_run(body_text)
    set_run_font(r_b, font_name="Calibri", size_pt=9.5, bold=False, color=COLOR_SLATE_DARK)
    
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

def format_clean_table(table, col_widths, headers, data):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(table)
    
    needed_rows = len(data) + 1
    while len(table.rows) < needed_rows:
        table.add_row()
        
    # Header Row
    hdr_cells = table.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = strip_tashkeel(h_text)
        set_cell_background(hdr_cells[i], HEX_NAVY)
        set_cell_margins(hdr_cells[i], top=130, bottom=130, left=130, right=130)
        set_cell_borders(hdr_cells[i], top="0F2744", bottom="0F2744", left="1E3A8A", right="1E3A8A", sz="6")
        p = hdr_cells[i].paragraphs[0]
        set_rtl(p)
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_run_font(p.runs[0], font_name="Calibri", size_pt=10, bold=True, color=RGBColor(255, 255, 255))
        
    # Data Rows
    for r_idx, row in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = strip_tashkeel(str(val))
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=90, bottom=90, left=130, right=130)
            set_cell_borders(row_cells[c_idx], top="E2E8F0", bottom="E2E8F0", left="E2E8F0", right="E2E8F0", sz="4")
            p = row_cells[c_idx].paragraphs[0]
            set_rtl(p)
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            set_run_font(p.runs[0], font_name="Calibri", size_pt=9.5, bold=False, color=COLOR_BLACK)
            
    for r in table.rows:
        for idx, width in enumerate(col_widths):
            r.cells[idx].width = width

def add_page_number_field(p):
    r1 = p.add_run("الصفحة ")
    set_run_font(r1, font_name="Calibri", size_pt=8.5, color=COLOR_SLATE_MID)
    fld1 = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
    p._p.append(fld1)
    r2 = p.add_run(" من ")
    set_run_font(r2, font_name="Calibri", size_pt=8.5, color=COLOR_SLATE_MID)
    fld2 = parse_xml(r'<w:fldSimple %s w:instr="NUMPAGES"/>' % nsdecls('w'))
    p._p.append(fld2)

def main():
    print("Generating plain language manual (0 tashkeel)...")
    doc = Document()
    
    for section in doc.sections:
        section.top_margin = Inches(0.9)
        section.bottom_margin = Inches(0.9)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        
        # Header
        hdr = section.header
        p_hdr = hdr.paragraphs[0]
        set_rtl(p_hdr)
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_hdr = p_hdr.add_run("دليل تشغيل نظام تايجر للمحلات ونقاط البيع والصيانة (TIGER SYSTEM)")
        set_run_font(r_hdr, font_name="Calibri", size_pt=8, color=COLOR_SLATE_MID)
        
        # Footer
        ftr = section.footer
        p_ftr = ftr.paragraphs[0]
        set_rtl(p_ftr)
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_page_number_field(p_ftr)
        r_ftr_div = p_ftr.add_run("  |  برمجة وتطوير د. سامر محمد © 2026")
        set_run_font(r_ftr_div, font_name="Calibri", size_pt=8, color=COLOR_SLATE_MID)

    # =========================================================================
    # صفحة الغلاف
    # =========================================================================
    p_ref = doc.add_paragraph()
    set_rtl(p_ref)
    p_ref.paragraph_format.space_before = Pt(0)
    p_ref.paragraph_format.space_after = Pt(10)
    r_ref = p_ref.add_run("دليل المستخدم الشامل من الألف إلى الياء - TIGER POS SYSTEM 2026")
    set_run_font(r_ref, font_name="Calibri", size_pt=8.5, bold=True, color=COLOR_SLATE_MID)
    
    logo_path = r"c:\Users\samer\Desktop\Tiger System\public\logo.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(15)
        p_logo.paragraph_format.space_after = Pt(15)
        r_logo = p_logo.add_run()
        r_logo.add_picture(logo_path, width=Inches(2.5))
        
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("كتيب تشغيل نظام تايجر (TIGER SYSTEM)")
    set_run_font(r_title, font_name="Calibri", size_pt=23, bold=True, color=COLOR_NAVY)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(2)
    p_sub.paragraph_format.space_after = Pt(16)
    r_sub = p_sub.add_run("دليل عملي مبسط وسهل لإدارة محلات الهواتف الذكية، نقاط البيع، ورشات الصيانة، والمخزون\nشرح خطوة بخطوة بلغة واضحة ومباشرة بدون أي تعقيد")
    set_run_font(r_sub, font_name="Calibri", size_pt=11, bold=False, color=COLOR_SLATE_DARK)
    
    meta_table = doc.add_table(rows=6, cols=2)
    format_clean_table(
        meta_table,
        [Inches(2.4), Inches(4.6)],
        ["البيان", "التفاصيل"],
        [
            ["المطور والمهندس المسؤول", "د. سامر محمد"],
            ["الإصدار المعتمد", "v1.0.0 المستقر (إصدار سنة 2026)"],
            ["بيئة العمل والتشغيل", "يعمل على كمبيوترات ويندوز 10 و 11 (بدون الحاجة لإنترنت نهائيا)"],
            ["طريقة التثبيت", "ملف تثبيت تلقائي بنقرة واحدة TIGER-Setup.exe أو نسخة محمولة فورا TIGER.exe"],
            ["الأمان والخصوصية", "كل الحسابات والفواتير وأرقام الزبائن مشفرة ومحفوظة على جهازك فقط"],
            ["تاريخ الكتيب", "تشرين الثاني 2026"]
        ]
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفهرس العام
    # =========================================================================
    add_clean_heading(doc, "فهرس الكتيب (المحتويات كاملة من A إلى Z)", level=1)
    
    add_body_p(
        doc,
        "هذا الكتيب معمول بأسلوب بسيط ومباشر، عشان يسهل عليك وعلى الموظفين عندك فهم كل صغيرة وكبيرة بالنظام بسرعة، وتعرف كيف تمشي شغلك بالمحل بدون ما تتعطل.",
        bold_prefix="كيف تقرأ هذا الكتيب؟"
    )
    
    toc_data = [
        ["1", "البداية وتثبيت البرنامج على الكمبيوتر", "كيف تنزل البرنامج وتفتحه لأول مرة وتعرف متطلباته"],
        ["2", "تسجيل الدخول والموظفين والصلاحيات", "الفرق بين حساب المدير والموظف، وتغيير رمز الـ PIN"],
        ["3", "شاشة البيع ونقطة البيع السريعة (POS)", "كيف تبيع بالباركود أو بالاسم، وتسجيل أجهزة الهواتف والـ IMEI"],
        ["4", "طرق الدفع وتقسيم المبالغ والديون (Split)", "كاش، كليك، فيزا، دفع نص بنص، والزبون اللي بده يدفع جزء ويأجل جزء"],
        ["5", "قسم الصيانة واستلام وتتبع الأجهزة", "استلام الجهاز، فحص الشاشة، وصل الاستلام، وتكلفة قطع الغيار"],
        ["6", "إرسال رسائل واتساب للزبائن بنقرة وحدة", "إشعار العميل لما يجهز جهازه، وتعديل أرقام الأردن تلقائيا 07..."],
        ["7", "المخزون ومنبه النواقص التلقائي (أقل من 2)", "جرس التنبيه الوميضي، وزر نسخ النواقص لمورد القطع فورا"],
        ["8", "حركة الصندوق اليومي وفتح درج الكاش بالكيبورد", "كبسة F12 لفتح الدرج، مصاريف المحل، وتقفيل الكاش وجرد اليومية"],
        ["9", "حسابات الزبائن والديون وسندات القبض", "كيف تتابع الديون وتسجل وصل قبض لما الزبون يسد دفعة من حسابه"],
        ["10", "التقارير المالية وحساب الأرباح الحقيقية", "كم ربحت اليوم؟ حركة المبيعات وتصدير الحسابات على إكسل"],
        ["11", "النسخ الاحتياطي على فلاشة USB والتحديثات", "كيف تحمي فواتيرك لو خرب الويندوز، وكيف تنزل التحديثات بأمان"],
        ["12", "الشروط القانونية ومهلة الـ 40 يوم للصيانة", "حقوق المحل، إخلاء المسؤولية، وحفظ خصوصية الزبائن"],
        ["13", "حل المشاكل السريعة واختصارات الكيبورد", "لو علقت الطابعة أو الدرج ما فتح، وجدول الأزرار السريعة"]
    ]
    tbl_toc = doc.add_table(rows=len(toc_data) + 1, cols=3)
    format_clean_table(
        tbl_toc,
        [Inches(0.8), Inches(3.4), Inches(2.8)],
        ["رقم", "الموضوع", "عن شو بحكي؟"],
        toc_data
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 1: التثبيت والتشغيل
    # =========================================================================
    add_clean_heading(doc, "1. البداية وتثبيت البرنامج وتشغيله لأول مرة", level=1)
    
    add_body_p(
        doc,
        "نظام تايجر مصمم خصيصا لأصحاب محلات ومراكز الهواتف والصيانة في الأردن والعالم العربي. الهدف منه إنه يخلي شغلك سريع، منظم، وما يضيع عليك ولا قرش، بدون أي تعقيد بالاستخدام وبدون ما تحتاج تدفع اشتراكات شهرية أو تعتمد على إنترنت بطيء.",
        bold_prefix="عن النظام:"
    )
    
    add_clean_heading(doc, "المواصفات المطلوبة لتشغيل النظام بسلاسة", level=2)
    add_bullet_item(doc, "نظام التشغيل", "ويندوز 10 أو ويندوز 11 (64 بت).")
    add_bullet_item(doc, "الكمبيوتر", "أي كمبيوتر مكتبي أو لابتوب بمعالج Core i3 أو أعلى.")
    add_bullet_item(doc, "الرامات (RAM)", "4 جيجا كحد أدنى، و 8 جيجا بكون ممتاز وسريع جدا.")
    add_bullet_item(doc, "الهارديسك (SSD)", "بفضل يكون عندك SSD عشان النظام يفتح ويطبع بلمح البصر.")
    add_bullet_item(doc, "الطابعات والدرج", "النظام بتوافق مع كل طابعات الفواتير الحرارية (مقاس 80 ملم أو 58 ملم)، وأدراج الكاش، وقوارئ الباركود.")
    
    add_clean_heading(doc, "كيف تشغل وتثبت البرنامج؟", level=2)
    add_body_p(
        doc,
        "النظام بيجيك بملفين على سطح المكتب، وهاي ميزة مريحة جدا:",
        bold_prefix="الملفات الجاهزة عندك:"
    )
    add_bullet_item(doc, "ملف التثبيت (TIGER-Setup.exe)", "بتكبس عليه مرتين، بنزل النظام تلقائيا وبعملك اختصار على الديسك توب وقائمة ابدأ، وجاهز للشغل فورا بدون ما تسوي أي إعدادات إضافية.")
    add_bullet_item(doc, "النسخة المحمولة (TIGER.exe)", "هاي نسخة بتقدر تحطها على فلاشة ميموري وتشغلها على أي جهاز فورا بدون تثبيت.")
    
    add_clean_box(
        doc,
        "النظام شغال 100% بدون إنترنت (Offline)",
        "كل عمليات البيع والصيانة وحسابات الزبائن محفوظة على هارد ديسك كمبيوترك ومقفلة بأمان. يعني حتى لو فصل النت عن المحل، النظام بضل شغال طبيعي وبسرعة فائقة ولا بتوقف شغلك ثانية وحدة.",
        box_style="green"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 2: تسجيل الدخول والموظفين
    # =========================================================================
    add_clean_heading(doc, "2. تسجيل الدخول وإدارة الموظفين والـ PIN", level=1)
    
    add_body_p(
        doc,
        "عشان تحمي أسرار محلك وأرباحك وفواتيرك، النظام فيه نظام مستخدمين ذكي ومحمي برمز PIN سري لكل موظف.",
        bold_prefix="الأمان في المحل:"
    )
    
    add_clean_heading(doc, "الفرق بين رتبة (مدير) ورتبة (موظف)", level=2)
    
    roles_table = [
        ["المدير (Admin)", "صلاحيات كاملة", "بشوف كل التقارير، أرباح المحل الصافية، أسعار الشراء، بقدر يعدل الإعدادات، يضيف أو يحذف موظفين، وياخد نسخ احتياطية."],
        ["الموظف (Employee)", "صلاحيات كاشير وصيانة فقط", "بقدر يبيع عبر الكاشير، يستلم ويسلم أجهزة الصيانة، ويقبض دفعات، لكن ممنوع يشوف أرباح المحل أو أسعار التكلفة أو يحذف شي مهم."]
    ]
    tbl_r = doc.add_table(rows=3, cols=3)
    format_clean_table(
        tbl_r,
        [Inches(1.5), Inches(1.8), Inches(3.7)],
        ["الرتبة", "نوع الصلاحية", "شو مسموح اله وشو ممنوع؟"],
        roles_table
    )
    
    add_clean_heading(doc, "كيف تسجل دخول أو تبدل بين الموظفين؟", level=2)
    add_body_p(
        doc,
        "أول ما تفتح النظام، بطلب منك رمز الـ PIN. بتدخل أرقامك (مثلا 1234 أو الرمز اللي اخترته) وبفتح النظام باسمك. وإذا بدك تترك الكاشير وتروح مشوار صغير، بتكبس على كبسة القفل فوق بالشريط لتأمين الشاشة برمشة عين.",
        bold_prefix="طريقة الدخول السريع:"
    )
    
    add_clean_heading(doc, "كيف تضيف موظف جديد أو تغير الـ PIN؟", level=2)
    add_bullet_item(doc, "الخطوة الأولى", "ادخل بحساب المدير واضغط على تبويب [الإعدادات] ثم قسم [الموظفون].")
    add_bullet_item(doc, "الخطوة الثانية", "بتقدر تعدل اسم أو رمز أي موظف موجود، أو تنزل لتحت وتكتب اسم الموظف الجديد وتحدد رتبته ورمزه السري وتضغط [إضافة موظف جديد].")
    add_bullet_item(doc, "الخطوة الثالثة", "لو موظف ترك الشغل، بتقدر توقف حسابه أو تحذفه بكبسة زر وحدة.")
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 3: شاشة البيع ونقطة البيع (POS)
    # =========================================================================
    add_clean_heading(doc, "3. شاشة البيع السريعة ونقطة البيع (POS)", level=1)
    
    add_body_p(
        doc,
        "شاشة البيع في تايجر معمولة عشان تكون أسرع ما يمكن بوقت الأزمة، وما تضيع وقت لا أنت ولا الزبون.",
        bold_prefix="واجهة الكاشير اليومية:"
    )
    
    add_clean_heading(doc, "كيف تبيع صنف جديد بالخطوات؟", level=2)
    add_bullet_item(doc, "إذا المنتج عليه باركود", "بس اضرب الباركود بالمسدس (القارئ)، بنزل الصنف فورا بالسلة مع صوت نغمة تأكيد واضحة.")
    add_bullet_item(doc, "إذا بدك تبحث بالاسم", "اكتب أي كلمة أو حرفين من اسم القطعة (مثلا: 'شاحن' أو 'سماعة' أو 'شاشة') واضغط Enter، بنزل فورا بالسلة.")
    add_bullet_item(doc, "تغيير الكمية والخصم", "بتقدر تزيد الكمية بكبسة (+) أو تنقصها بكبسة (-)، وبتقدر تعمل خصم للزبون إما مبلغ مباشر (مثلا خصم دينار أو دينارين) أو نسبة مئوية (مثلا خصم 5%).")
    add_bullet_item(doc, "اختيار الزبون", "بشكل تلقائي بكون مكتوب 'زبون نقدي'. لو بدك تسجل الفاتورة باسم شخص معين، اكتب اسمه أو اضغط (+) وسجل اسمه ورقمه بسرعة.")
    
    add_clean_heading(doc, "بيع الهواتف الذكية وتوثيق الـ IMEI", level=2)
    add_body_p(
        doc,
        "لما تبيع جهاز هاتف (جديد أو مستعمل)، النظام بطلب منك تدخل رقم الـ IMEI وتفاصيل الكفالة. هاي الميزة بتحميك وبتحمي المحل، لأنها بتنطبع على الفاتورة وبتبين إنه هذا الجهاز طلع من عندك بهذا السيريال بالذات.",
        bold_prefix="توثيق الأجهزة المباعة:"
    )
    
    add_clean_box(
        doc,
        "الطباعة الحرارية السريعة",
        "بمجرد ما تكبس دفع وتأكد الفاتورة، الطابعة بتطلع الفاتورة الحرارية فورا متضمنة اسم المحل، اللوجو، الأصناف، الأسعار، رمز QR، ومعلومات التواصل ودرج الكاش بفتح تلقائيا.",
        box_style="highlight"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 4: طرق الدفع وتقسيم المبالغ والديون
    # =========================================================================
    add_clean_heading(doc, "4. طرق الدفع وتقسيم المبالغ والبيع بالدين (Split Payment)", level=1)
    
    add_body_p(
        doc,
        "كثير بصير بالمحل مواقف دفع مختلفة: زبون بده يدفع كاش، زبون كليك، زبون بده يدفع نص كاش ونص كليك، أو زبون بده يدفع دفعة والباقي يسجله على حسابه. نظام تايجر بحل كل هاي الحالات بضغطة زر.",
        bold_prefix="حلول الدفع الذكية:"
    )
    
    add_clean_heading(doc, "طرق الدفع الجاهزة بنقرة وحدة", level=2)
    add_bullet_item(doc, "نقدا بالكامل (Cash)", "دفع الفاتورة كاملة كاش واستلام المبلغ بالدرج.")
    add_bullet_item(doc, "تحويل إلكتروني كليك (CliQ)", "تسجيل الدفعة كحوالة بنكية CliQ عشان حسابات البنك عندك تضل مضبوطة وتطابق إشعار الموبايل.")
    add_bullet_item(doc, "بطاقة بنكية / فيزا (Card)", "دفع كامل الفاتورة عبر جهاز الفيزا البنكي POS.")
    
    add_clean_heading(doc, "الدفع المركب (تقسيم الفاتورة بأكثر من طريقة)", level=2)
    add_body_p(
        doc,
        "لما تفتح شاشة الدفع، بتلاقي أزرار ذكية بتريحك من الحسابات الذهنية والآلة الحاسبة:",
        bold_prefix="أزرار التوزيع الفوري:"
    )
    
    split_table = [
        ["نصف كاش + نصف كليك", "بكبسة وحدة بقسم الفاتورة بالنص (50% كاش و 50% كليك)."],
        ["نصف كاش + نصف فيزا", "بقسم الفاتورة بالتساوي بين الكاش وبطاقة الفيزا."],
        ["أثلاث متساوية", "بقسم المبلغ على 3 أجزاء متساوية (كاش، كليك، فيزا)."],
        ["زر (+ الباقي)", "لو الزبون حكالك 'خذ هاي 20 دينار كاش والباقي بدي أحولك ياه كليك'، اكتب 20 بخانة الكاش واضغط (+ الباقي) جنب خانة كليك، فورا بنزل المبلغ المتبقي بدون ما تحسب على إيدك!"]
    ]
    tbl_s = doc.add_table(rows=5, cols=2)
    format_clean_table(
        tbl_s,
        [Inches(2.4), Inches(4.6)],
        ["الزر أو الموقف", "شو بسوي وكيف بشتغل؟"],
        split_table
    )
    
    add_clean_heading(doc, "شو تعمل لو الزبون بده يدفع جزء ويأجل جزء (دين على الزبون)؟", level=2)
    add_body_p(
        doc,
        "إذا الفاتورة مثلا 100 دينار، والزبون دفع 60 دينار وحكالك 'الـ 40 الباقية مسافة يومين وبجيبلك ياها':\n1. اكتب 60 بخانة الكاش.\n2. بتلاحظ إنه النظام فورا بينلك باللون الأحمر: (المتبقي ذمة على العميل: 40.000 د.أ).\n3. النظام فورا بفتحلك بوكس تحت وبحكيلك سجل اسم العميل ورقمه وتاريخ السداد.\n4. بتضغط حفظ الفاتورة؛ بنزل الـ 60 بالصندوق كاش، والـ 40 بتتسجل دين رسمي على اسم العميل بصفحة الزبائن بدون ما تتعطل حركة البيع نهائيا!",
        bold_prefix="طريقة تسجيل البيع بالدين:"
    )
    
    add_clean_box(
        doc,
        "تنبيه مهم للبيع بالدين",
        "النظام بمنع حفظ أي فاتورة فيها باقي دين لو كان الزبون 'زبون نقدي' عام. لازم تكتب اسم الزبون ورقمه عشان حق محلك يضل محفوظ وما تضيع الديون بالهوا.",
        box_style="red"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 5: قسم الصيانة واستلام الأجهزة
    # =========================================================================
    add_clean_heading(doc, "5. قسم الصيانة وإدارة وتتبع الأجهزة المستلمة", level=1)
    
    add_body_p(
        doc,
        "قسم الصيانة هو قلب محل الهواتف. نظام تايجر بنظملك كل تذكرة صيانة من لحظة ما يدخل الزبون ويسلم جهازه، لحد ما يستلمه ويدفع الحساب كامل.",
        bold_prefix="ترتيب ورشة الصيانة:"
    )
    
    add_clean_heading(doc, "خطوات استلام جهاز صيانة جديد", level=2)
    add_bullet_item(doc, "تسجيل بيانات العميل والجهاز", "اسم الزبون، رقم تلفونه، نوع الجهاز (مثلا iPhone 14 Pro)، واللون.")
    add_bullet_item(doc, "تسجيل العطل والملاحظات", "شو مشكلة الجهاز؟ (كسر شاشة، شحن، ما بفتح، واقع بمي...) مع كتابة رمز قفل الشاشة (Passcode) عشان الفني يقدر يجرب الجهاز بعد التصليح.")
    add_bullet_item(doc, "فحص ملحقات الجهاز", "هل الجهاز معه شريحة SIM؟ كرت ذاكرة؟ كفر؟ عشان ما يصير أي خلاف مع الزبون وقت التسليم.")
    add_bullet_item(doc, "السعر التقديري والدفعة المقدمة", "كم اتفقنا مع الزبون؟ وهل دفع دفعة تحت الحساب؟ تسجل الدفعة وتدخل الصندوق فورا.")
    add_bullet_item(doc, "طباعة وصل الاستلام", "النظام بطبع وصل استلام حراري رسمي للزبون فيه كود الجهاز والعطل والسعر المتفق عليه وشرط الـ 40 يوم.")
    
    add_clean_heading(doc, "حالات كرت الصيانة وطريقة المتابعة", level=2)
    
    repair_table = [
        ["قيد الفحص (Pending)", "الجهاز مستلم جديد وبستنى الفني يفحصه."],
        ["بانتظار الموافقة (Waiting)", "تم فحص الجهاز وتحديد العطل، وبنستنى نتصل بالزبون ليوافق على السعر."],
        ["قيد الصيانة (In Progress)", "الزبون وافق والفني شغال بفك وتصليح الجهاز بالورشة."],
        ["جاهز للاستلام (Ready)", "الجهاز تصلح وتجرب وصار جاهز مية بالمية؛ بيظهر زر الواتساب لإشعار العميل."],
        ["تم التسليم والإغلاق (Delivered)", "الزبون اجى واستلم جهازه ودفع باقي الحساب، وتسكر الكرت نهائيا."]
    ]
    tbl_rep = doc.add_table(rows=6, cols=2)
    format_clean_table(
        tbl_rep,
        [Inches(2.5), Inches(4.5)],
        ["الحالة في النظام", "شو بتعني وشو الإجراء؟"],
        repair_table
    )
    
    add_clean_heading(doc, "خصم قطع الغيار من المستودع وحساب صافي الربح", level=2)
    add_body_p(
        doc,
        "لما الفني يركب شاشة مثلا، بقدر يختار الشاشة من مستودع قطع الغيار بالنظام. النظام تلقائيا بخصم الشاشة من رصيد المستودع، وبحسب تكلفتها من سعر الصيانة، عشان يظهرلك بالضبط كم ربحت أجور يد صافية بعد خصم ثمن القطعة.",
        bold_prefix="الربط بين الصيانة والقطع:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 6: إشعارات واتساب الفورية
    # =========================================================================
    add_clean_heading(doc, "6. إرسال إشعارات الصيانة والفواتير عبر واتساب بنقرة وحدة", level=1)
    
    add_body_p(
        doc,
        "بدون ما تدفع ولا شلن اشتراكات شهرية، وبدون ما تضطر تخزن رقم الزبون بجهات اتصال تلفونك وتستنى ليتزامن، نظام تايجر بفتح محادثة واتساب العميل بنقرة زر وحدة ورسالة جاهزة ومرتبة.",
        bold_prefix="التواصل الفوري مع الزبائن:"
    )
    
    add_clean_heading(doc, "زر (إرسال للواتساب) بجانب كل جهاز", level=2)
    add_body_p(
        doc,
        "أول ما الفني يخلص تصليح الجهاز ويحط حالته (جاهز للاستلام)، بيظهر زر برتقالي مباشر جنب الجهاز: [إرسال للواتساب (جاهز)].\nبس تكبس عليه، بفتح تطبيق WhatsApp فورا على رقم الزبون مع رسالة مكتوبة وجاهزة:",
        bold_prefix="كيف بتشتغل الميزة؟"
    )
    
    add_clean_box(
        doc,
        "نص رسالة الواتساب التلقائية اللي بتوصل للزبون",
        "أهلا بك زبوننا العزيز [أحمد] 🌹\nيسعدنا إعلامك بأن جهازك ([iPhone 13 - أسود]) أصبح جاهزا للاستلام من مركز تايجر موبايل.\nالمبلغ المتبقي: 35.000 د.أ.\nأهلا وسهلا بك في أي وقت!",
        box_style="highlight"
    )
    
    add_clean_heading(doc, "تعديل أرقام الأردن تلقائيا (ميزة ذكية)", level=2)
    add_body_p(
        doc,
        "ما في داعي تقعد تكتب 96279 أو تعدل الأرقام بإيدك! بس اكتب رقم الزبون المحلي زي ما بعطيك ياه عادي (مثلا 0791234567 أو 078 أو 077)، والنظام لحاله بشيل الصفر وبحط كود الأردن الدولي وببعت عليه بدون أي غلط.",
        bold_prefix="ذكاء التعامل مع الأرقام:"
    )
    
    add_clean_heading(doc, "إرسال فواتير المبيعات وكشوف الحسابات", level=2)
    add_body_p(
        doc,
        "نفس الشي في شاشة البيع وشاشة الزبائن؛ بتقدر تبعت تفاصيل الفاتورة أو كشف حساب الذمة للزبون على الواتساب بضغطة زر عشان تذكره بحسابه بكل ذوق وأدب.",
        bold_prefix="رسائل الفواتير والديون:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 7: المخزون ومنبهات النواقص
    # =========================================================================
    add_clean_heading(doc, "7. إدارة المخزون ومنبهات النواقص التلقائية (أقل من قطعتين)", level=1)
    
    add_body_p(
        doc,
        "من أكبر المشاكل اللي بتصير بالمحلات إنه يدخل زبون بده يركب شاشة أو ياخد شاحن، وتتفاجأ إنه القطعة مخلصة! نظام تايجر عملك نظام إنذار مبكر بنبهك قبل ما تخلص أي قطعة.",
        bold_prefix="مراقبة البضاعة أولا بأول:"
    )
    
    add_clean_heading(doc, "منبهات النواقص التلقائية (Stock Alert Beacons)", level=2)
    add_body_p(
        doc,
        "النظام فيه رادار ذكي براقب كميات كل قطعة بالمستودع. أول ما يوصل رصيد أي شاشة أو بطارية أو كيبل إلى قطعتين أو أقل (<= 2)، بصير معك الآتي فورا:",
        bold_prefix="كيف النظام بنبهك قبل النفاد؟"
    )
    add_bullet_item(doc, "وميض راداري أحمر بجرس الإشعارات", "جرس الإشعارات فوق بأعلى الشاشة بصير يومض بنبض أحمر متحرك يلفت نظرك إنه في قطع صارت حرجة وشارفت على النفاد.")
    add_bullet_item(doc, "قائمة منبثقة بالنواقص", "بس تكبس على الجرس، بتفتحلك قائمة واضحة بكل القطع اللي رصيدها 2 أو أقل وكم باقي منها بالزبط.")
    add_bullet_item(doc, "زر (نسخ لطلبية الواتساب)", "كبسة وحدة داخل القائمة بتنسخلك أسماء القطع الناقصة كرسالة جاهزة، عشان تفتح واتساب موزع قطع الغيار وتعمل لصق (Paste) وتبعت الطلبية بثانية وحدة!")
    add_bullet_item(doc, "فلتر النواقص في جدول المخزون", "بصفحة الإكسسوارات والمخزون، في كبسة فلتر سريعة [نواقص حرجة 2 أو أقل] بتفرزلك كل المواد الناقصة بضغطة وحدة.")
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 8: الصندوق واليومية ودرج الكاش بالكيبورد
    # =========================================================================
    add_clean_heading(doc, "8. حركة الصندوق واليومية واختصار فتح درج الكاش بالكيبورد", level=1)
    
    add_body_p(
        doc,
        "النظام بضمنلك إنه كل قرش دخل أو طلع من المحل يكون موثق، مع ميزة فتح درج الكاش بضغطة زر بالكيبورد بدون ما تلمس الماوس.",
        bold_prefix="التحكم الكامل بالكاش:"
    )
    
    add_clean_heading(doc, "كبسة فتح درج الكاش من الكيبورد (Cash Drawer Shortcut)", level=2)
    add_body_p(
        doc,
        "عشان الكاشير يكون سريع جدا وما يقعد يدور على الماوس:",
        bold_prefix="كيف تفتح الدرج فورا؟"
    )
    add_bullet_item(doc, "الكبسة التلقائية", "الكبسة مضبوطة من المصنع على زر (F12) في الكيبورد؛ بس تضغط F12 من أي شاشة بالنظام بفتح الدرج فورا مع نغمة صوتية مريحة.")
    add_bullet_item(doc, "تغيير الكبسة لأي زر بدك ياه", "لو بتحب تفتح الدرج بزر ثاني (مثلا مسطرة المسافة Space، أو F8، أو أي كبسة)، ادخل على [الإعدادات] -> [المتجر والعملة] واضغط على 'تعيين كبسة جديدة' واكبس الزر اللي بدك ياه بالكيبورد، وبحفظه فورا.")
    add_bullet_item(doc, "زر تجربة الفتح", "في زر مخصص للتجربة عشان تتأكد إنه سلك الدرج واصل تمام بالطابعة الحرارية وشغال 100%.")
    
    add_clean_heading(doc, "دورة الشفت واليومية وتقفيل الكاش", level=2)
    add_bullet_item(doc, "رصيد بداية اليومية (الفكة)", "أول ما تفتح الصبح، بتسجل كم في كاش بالدرج صرافة وفكة عشان يبدأ الحساب صح.")
    add_bullet_item(doc, "تسجيل المصروفات النثرية", "لو طلعت أي مصاري من الدرج (مثلا شريت شاي وقهوة للمحل، دفعت فاتورة كهرباء، أو غدا للشباب)، بتسجل المبلغ وسببه بكبسة [إضافة مصروف] عشان ينخصم من الصندوق.")
    add_bullet_item(doc, "تقفيل اليومية ومطابقة الكاش (End Shift)", "بآخر الدوام، بتعد الكاش اللي بالدرج وبتكتبه بالنظام. النظام بحسبلك تلقائيا: كم بعت كاش + كم سددت ديون - كم صرفت مصاريف، وبقارن المبلغ الفعلي بالدفتري وببينلك إذا في زيادة أو نقص بقرش واحد وبطبع وصل التقفيل.")
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 9: حسابات الزبائن والديون وسندات القبض
    # =========================================================================
    add_clean_heading(doc, "9. حسابات الزبائن والديون وسندات القبض", level=1)
    
    add_body_p(
        doc,
        "دفتر الديون المكتوب على ورق دائما بضيع أو بنكب عليه شاي أو بنسى الموظف يسجل فيه! في نظام تايجر، كل دين مسجل باسم صاحبه وتاريخه وتفاصيل فواتيره بأعلى دقة.",
        bold_prefix="متابعة ديون المحل:"
    )
    
    add_clean_heading(doc, "كشف حساب الزبون التفصيلي", level=2)
    add_body_p(
        doc,
        "بشاشة الزبائن، بتبحث عن أي زبون؛ ببينلك فورا رصيده الحالي، مجموع مشترياته، وأجهزته بالصيانة، وبتقدر تطبع كشف حساب كامل فيه كل فاتورة متى طلعت وكم دفع منها وكم ضل عليه.",
        bold_prefix="كل عملية بحسابها:"
    )
    
    add_clean_heading(doc, "كيف تقبض دفعة من الزبون وتطبع سند قبض؟", level=2)
    add_body_p(
        doc,
        "لما يجي الزبون يسد جزء من حسابه (مثلا عليه 80 دينار واجا دفع 30 دينار):\n1. ابحث عن اسم الزبون واضغط على زر [قبض دفعة].\n2. اكتب المبلغ المسدد (30 دينار) وحدد هل دفعها كاش بالدرج أو حولها كليك.\n3. اضغط حفظ؛ النظام فورا بخصم الـ 30 من دين الزبون (بصير باقيه 50)، وبدخل الـ 30 بصندوق اليومية، وبطبع سند قبض حراري مرتب للزبون يثبت إنه سدد هذا المبلغ وشو ضل عليه رصيد جديد.",
        bold_prefix="خطوات السداد المريح:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 10: التقارير المالية وحساب الأرباح
    # =========================================================================
    add_clean_heading(doc, "10. التقارير المالية وحساب الأرباح الحقيقية", level=1)
    
    add_body_p(
        doc,
        "النظام مش بس كاشير ببيع وبشتري، النظام بعطيك تقارير ذكية بتفهمك وضع محلك المالي بالكامل عشان تعرف شو تكثر بضاعة وشو توقف.",
        bold_prefix="لوحة الإحصائيات والأرباح:"
    )
    
    add_clean_heading(doc, "أهم التقارير المتوفرة بضغطة زر", level=2)
    
    rep_table = [
        ["تقرير المبيعات اليومي والشهري", "بفرجيك مجموع المبيعات بأي يوم أو شهر، ومفصلة: كم كاش، كم كليك، وكم فيزا."],
        ["تقرير الأرباح الحقيقية الصافية", "بحسبلك إجمالي المبيعات، وبطرح منها تكلفة شراء البضاعة، وبطرح مصاريف المحل، ليعطيك صافي ربح جيبتك بالزبط."],
        ["تقرير أكثر المواد مبيعا", "برتبلك الإكسسوارات والقطع من الأكثر طلبا للأقل، عشان تعرف شو البضاعة اللي ماشية وشو الراكد."],
        ["تقرير أداء قسم الصيانة", "كم جهاز دخل الصيانة هذا الشهر؟ كم جهاز تصلح؟ وكم ربحت أجور يد من الصيانة؟"],
        ["تقرير الديون المعلقة", "قائمة بكل الزبائن اللي عليهم ذمم ومواعيد سدادهم عشان ترتب مواعيد التحصيل."]
    ]
    tbl_rpt = doc.add_table(rows=6, cols=2)
    format_clean_table(
        tbl_rpt,
        [Inches(2.5), Inches(4.5)],
        ["اسم التقرير", "شو الفايدة منه وشو بفرجيك؟"],
        rep_table
    )
    
    add_clean_heading(doc, "تصدير التقارير لملف Excel", level=2)
    add_body_p(
        doc,
        "أي تقرير بالنظام بتقدر بضغطة زر تصدره لملف إكسل (.xlsx) مرتب ومنسق، بتقدر تفتحه على تليفونك أو تبعته للمحاسب أو تحتفظ فيه بسجلاتك.",
        bold_prefix="سهولة المشاركة والحفظ:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 11: النسخ الاحتياطي والتحديثات
    # =========================================================================
    add_clean_heading(doc, "11. النسخ الاحتياطي على فلاشة USB والتحديثات الآمنة", level=1)
    
    add_body_p(
        doc,
        "فواتيرك وحسابات زبائنك وديونك هي تعب سنين ومستحيل نسمح تضيع بسبب عطل مفاجئ بالكمبيوتر أو انضرب الويندوز. عشان هيك صممنا نظام نسخ احتياطي سهل وبسيط.",
        bold_prefix="حماية تعبك وشغلك:"
    )
    
    add_clean_heading(doc, "كيف تاخد نسخة احتياطية على فلاشة USB؟ (نصيحة ذهبية)", level=2)
    add_bullet_item(doc, "الخطوة الأولى", "ركب فلاشة ميموري بالكمبيوتر، وادخل على تبويب [الإعدادات] وافتح قسم [النسخ الاحتياطي].")
    add_bullet_item(doc, "الخطوة الثانية", "اضغط على زر [إنشاء نسخة احتياطية الآن] أو زر [تصدير لفلاشة USB].")
    add_bullet_item(doc, "الخطوة الثالثة", "النظام بعمل ملف مضغوط ومشفر فيه كل قواعد البيانات والحسابات والفواتير بثانية وحدة. شيل الفلاشة وحطها بجيبتك أو بمكان آمن.")
    
    add_clean_heading(doc, "كيف ترجع بياناتك لو غيرت الكمبيوتر؟", level=2)
    add_body_p(
        doc,
        "لو اشتريت كمبيوتر جديد أو عملت فورمات للويندوز، كل اللي عليك:\n1. نزل برنامج TIGER وشغله.\n2. ادخل على الإعدادات -> النسخ الاحتياطي -> اضغط [استعادة من ملف].\n3. اختار ملف النسخة من الفلاشة، وخلال ثانيتين بس كل فواتيرك القديمة وحساباتك وزبائنك بترجع كاملة مية بالمية زي ما كانت!",
        bold_prefix="الاسترجاع السريع من الصفر:"
    )
    
    add_clean_heading(doc, "التحديثات السحابية عبر GitHub بدون مساس بالبيانات", level=2)
    add_body_p(
        doc,
        "بقسم التحديثات في الإعدادات، بتقدر تفحص التحديثات الجديدة للنظام بضغطة زر. النظام مبرمج إنه لما ينزل ميزات جديدة يحدث نفسه بأمان تام وبدون ما يلمس أي فاتورة سابقة أو يعدل على أسعارك وحساباتك.",
        bold_prefix="الترقية الآمنة:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 12: الشروط القانونية ومهلة الـ 40 يوم
    # =========================================================================
    add_clean_heading(doc, "12. الشروط القانونية المعتمدة ومهلة الـ 40 يوم للصيانة", level=1)
    
    add_body_p(
        doc,
        "كثير محلات صيانة بتعاني من زبائن بتركوا أجهزتهم شهور طويلة وما برجعوا ياخدوها بعد ما يكون المحل ركب شاشة أو بطارية من جيبته! النظام بحميك قانونيا من خلال البنود المعتمدة في وصل الاستلام والإعدادات.",
        bold_prefix="حماية المحل من المشاكل:"
    )
    
    laws_table = [
        ["1. الخصوصية والأمان المحلي (100% Offline)", "جميع سجلات المبيعات والصيانة وقواعد البيانات مشفرة ومحفوظة محليا على هارد ديسك جهازك فقط، ولا يتم إرسال أو تسريب أي بيانات محاسبية أو أرقام هواتف خارج جهازك نهائيا."],
        ["2. مهلة الـ 40 يوما القانونية لأجهزة الصيانة", "يلتزم المحل بإصدار إيصال استلام رسمي لكل جهاز. يعتبر العميل متنازلا عن جهازه ويحق للمحل التصرف فيه بعد مرور 40 يوما من تاريخ إنجاز الإصلاح دون استلام، لتغطية تكاليف قطع الغيار وفحص الفني."],
        ["3. النسخ الاحتياطي الدوري", "يوصى بأخذ نسخة احتياطية دورية أسبوعيا على فلاشة USB خارجية لضمان سلامة العمليات والفواتير في حال حدوث أي عطل فني في نظام الويندوز."],
        ["4. ترقية وتحديثات النظام", "ترقية النظام وتحديثاته مصممة للحفاظ على سلامة قاعدة البيانات السابقة بالكامل دون المساس بأي فواتير أو حسابات مسجلة مسبقا."]
    ]
    tbl_l = doc.add_table(rows=5, cols=2)
    format_clean_table(
        tbl_l,
        [Inches(2.4), Inches(4.6)],
        ["البند القانوني", "النص المعتمد والواضح"],
        laws_table
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل 13: حل المشاكل السريعة واختصارات الكيبورد
    # =========================================================================
    add_clean_heading(doc, "13. حل المشاكل الشائعة السريعة وجدول أزرار الكيبورد", level=1)
    
    add_clean_heading(doc, "حلول المشاكل اليومية الأكثر شيوعا", level=2)
    
    faq_table = [
        ["الطابعة الحرارية ما بتطبع الفاتورة", "1. تأكد إنه كيبل الـ USB موصول بالكمبيوتر وشغال.\n2. تأكد إنه في رول ورق حراري محطوط بالاتجاه الصح مش مقلوب.\n3. ادخل على إعدادات ويندوز وتأكد إنه الطابعة معرفة ومعمول عليها Default Printer."],
        ["درج الكاش ما بفتح لحاله لما أطبع", "1. تأكد إنه سلك الدرج الصغير (كيبل RJ11 اللي بشبه سلك التلفون) راكب بالمنفذ المخصص ورا الطابعة الحرارية مش بالكمبيوتر.\n2. تأكد إنه الطابعة نفسها شغالة وشابكة كهربا."],
        ["قارئ الباركود ما بنزل الصنف تلقائي", "1. اتأكد إنك حاطط مؤشر الماوس بخانة البحث أو الباركود.\n2. اضرب كود التهيئة اللي بيجي مع كتيب القارئ عشان يعمل Enter بعد المسح."],
        ["نسيت رمز الـ PIN لحساب موظف", "المدير بدخل بحسابه الرئيسي، وبروح على صفحة [الإعدادات] -> [الموظفون] وبحط رمز جديد للموظف بثانية وحدة."]
    ]
    tbl_faq = doc.add_table(rows=5, cols=2)
    format_clean_table(
        tbl_faq,
        [Inches(2.4), Inches(4.6)],
        ["المشكلة اللي صارت معك", "شو تعمل فورا لتحلها؟"],
        faq_table
    )
    
    add_clean_heading(doc, "جدول اختصارات الكيبورد السريعة", level=2)
    
    shortcuts = [
        ["F12 (أو الكبسة اللي اخترتها)", "فتح درج الكاش الإلكتروني فورا من أي شاشة بدون ما تلمس الماوس"],
        ["F1 أو Ctrl + B", "الانتقال السريع والمباشر لشاشة البيع (POS) بوقت الزحمة"],
        ["F2 أو Ctrl + R", "الانتقال المباشر لشاشة الصيانة وتذاكر الأجهزة"],
        ["Enter", "تأكيد إضافة الصنف لسلة المشتريات أو تأكيد السعر"],
        ["Ctrl + P", "إعادة طباعة الفاتورة الحالية أو الإيصال الحراري فورا"],
        ["Esc", "إغلاق أي نافذة منبثقة أو إلغاء والرجوع للشاشة السابقة"]
    ]
    tbl_sc = doc.add_table(rows=7, cols=2)
    format_clean_table(
        tbl_sc,
        [Inches(2.4), Inches(4.6)],
        ["الكبسة في الكيبورد", "شو بتسوي فورا؟"],
        shortcuts
    )
    
    sp_end = doc.add_paragraph()
    sp_end.paragraph_format.space_before = Pt(16)
    
    add_clean_box(
        doc,
        "خاتمة ودعم فني معتمد",
        "تم بحمد الله إعداد هذا الكتيب ليكون مرجعا سهلا وعمليا يساعدك في إدارة وتطوير محلك بكل ثقة واحترافية.\n\nتطوير وبرمجة النظام بالكامل بواسطة:\nد. سامر محمد (Dr. Samer Mohammad)\nجميع الحقوق محفوظة © 2026 TIGER SYSTEM",
        box_style="highlight"
    )
    
    # Paths
    primary_out = r"C:\Users\samer\Desktop\دليل_تشغيل_نظام_تايجر_الاحترافي_TIGER_SYSTEM_MANUAL.docx"
    alt_out = r"C:\Users\samer\Desktop\كتيب_تعليمات_نظام_تايجر_TIGER_Manual_A_to_Z.docx"
    
    print(f"Saving to {primary_out}...")
    doc.save(primary_out)
    
    try:
        print(f"Saving to {alt_out}...")
        doc.save(alt_out)
        print("Updated both files.")
    except Exception as e:
        print(f"Note: {e}")
        
    print("Done! Plain language manual generated successfully.")

if __name__ == '__main__':
    main()
