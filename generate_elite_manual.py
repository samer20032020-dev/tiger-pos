# -*- coding: utf-8 -*-
"""
TIGER SYSTEM - Official Standard Operating Procedures (SOP) & Comprehensive Manual
Architected & Developed by Dr. Samer Mohammad
Designed as an Enterprise-Grade Technical Manual
"""

import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

# Corporate Color Palette
COLOR_NAVY = RGBColor(15, 39, 68)       # #0F2744 Deep Corporate Navy
COLOR_ORANGE = RGBColor(194, 65, 12)    # #C2410C Deep Professional Terracotta / Orange
COLOR_SLATE_DARK = RGBColor(51, 65, 85) # #334155 Slate 700
COLOR_SLATE_MID = RGBColor(100, 116, 139) # #64748B Slate 500
COLOR_BLACK = RGBColor(15, 23, 42)      # #0F172A Body Black

HEX_NAVY = "0F2744"
HEX_ORANGE = "C2410C"
HEX_LIGHT_ORANGE = "FFF7ED"
HEX_LIGHT_GRAY = "F8FAFC"
HEX_BORDER = "CBD5E1"

def set_rtl(p):
    """Set right-to-left direction on a paragraph with proper Arabic alignment"""
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

def set_run_font(run, font_name="Calibri", size_pt=10.5, bold=False, color=COLOR_BLACK):
    """Set font parameters including explicit complex-script (Arabic) tags"""
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>')
    rPr.append(rFonts)

def set_cell_background(cell, hex_color):
    """Apply background color fill to a table cell"""
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    """Set cell padding in twips (1 pt = 20 twips)"""
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    cell._tc.get_or_add_tcPr().append(tcMar)

def set_cell_borders(cell, top="CBD5E1", bottom="CBD5E1", left="CBD5E1", right="CBD5E1", sz="8"):
    """Apply borders to a specific cell"""
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
    """Ensure table flows Right-to-Left in Word"""
    tblPr = table._tbl.tblPr
    bidiVisual = OxmlElement('w:bidiVisual')
    tblPr.append(bidiVisual)

def add_executive_heading(doc, text, level=1):
    """Add clean executive numbered headings without childish decoration"""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.keep_with_next = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(22)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        set_run_font(run, font_name="Calibri", size_pt=15.5, bold=True, color=COLOR_NAVY)
        
        # Elegant thin hairline separator under major sections
        p_line = doc.add_paragraph()
        set_rtl(p_line)
        p_line.paragraph_format.space_before = Pt(0)
        p_line.paragraph_format.space_after = Pt(10)
        r_line = p_line.add_run('━' * 65)
        set_run_font(r_line, font_name="Calibri", size_pt=7, color=COLOR_SLATE_MID)
    elif level == 2:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        set_run_font(run, font_name="Calibri", size_pt=12.5, bold=True, color=COLOR_ORANGE)
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(text)
        set_run_font(run, font_name="Calibri", size_pt=11, bold=True, color=COLOR_SLATE_DARK)

def add_body_p(doc, text, bold_prefix=None, space_after=4):
    """Standard body paragraph with proper typography and spacing"""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    
    if bold_prefix:
        r_prefix = p.add_run(bold_prefix + " ")
        set_run_font(r_prefix, font_name="Calibri", size_pt=10.5, bold=True, color=COLOR_BLACK)
        
    r_body = p.add_run(text)
    set_run_font(r_body, font_name="Calibri", size_pt=10.5, bold=False, color=COLOR_SLATE_DARK)
    return p

def add_bullet_item(doc, title, desc):
    """Professional bullet with solid square marker and bold title"""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3.5)
    p.paragraph_format.line_spacing = 1.25
    
    r_bullet = p.add_run("▪  ")
    set_run_font(r_bullet, font_name="Calibri", size_pt=9.5, bold=True, color=COLOR_ORANGE)
    
    r_title = p.add_run(title + ": ")
    set_run_font(r_title, font_name="Calibri", size_pt=10.5, bold=True, color=COLOR_NAVY)
    
    r_desc = p.add_run(desc)
    set_run_font(r_desc, font_name="Calibri", size_pt=10, bold=False, color=COLOR_SLATE_DARK)

def add_formal_box(doc, title, body_text, box_style="standard"):
    """Create a crisp, bordered corporate callout box"""
    styles = {
        "standard": {"bg": "F8FAFC", "border": "0F2744", "title_col": COLOR_NAVY},
        "highlight": {"bg": "FFF7ED", "border": "C2410C", "title_col": COLOR_ORANGE},
        "legal": {"bg": "F0FDF4", "border": "15803D", "title_col": RGBColor(21, 128, 61)},
        "critical": {"bg": "FEF2F2", "border": "B91C1C", "title_col": RGBColor(185, 28, 28)}
    }
    cfg = styles.get(box_style, styles["standard"])
    
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(tbl)
    cell = tbl.cell(0, 0)
    set_cell_background(cell, cfg["bg"])
    set_cell_margins(cell, top=160, bottom=160, left=200, right=200)
    
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

def format_corporate_table(table, col_widths, headers, data):
    """Build a sharp, corporate table with dark navy headers and subtle alternating rows"""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(table)
    
    # Ensure table has exactly the required number of rows
    needed_rows = len(data) + 1
    while len(table.rows) < needed_rows:
        table.add_row()
    
    # Header Row
    hdr_cells = table.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        set_cell_background(hdr_cells[i], HEX_NAVY)
        set_cell_margins(hdr_cells[i], top=140, bottom=140, left=140, right=140)
        set_cell_borders(hdr_cells[i], top="0F2744", bottom="0F2744", left="1E3A8A", right="1E3A8A", sz="8")
        p = hdr_cells[i].paragraphs[0]
        set_rtl(p)
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_run_font(p.runs[0], font_name="Calibri", size_pt=10, bold=True, color=RGBColor(255, 255, 255))
        
    # Data Rows
    for r_idx, row in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = val
            set_cell_background(row_cells[c_idx], bg_color)
            set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=140, right=140)
            set_cell_borders(row_cells[c_idx], top="E2E8F0", bottom="E2E8F0", left="E2E8F0", right="E2E8F0", sz="4")
            p = row_cells[c_idx].paragraphs[0]
            set_rtl(p)
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            set_run_font(p.runs[0], font_name="Calibri", size_pt=9.5, bold=False, color=COLOR_BLACK)
            
    # Widths
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

def add_page_number_field(p):
    """Insert dynamic PAGE / NUMPAGES in Word footer"""
    r1 = p.add_run("الصفحة ")
    set_run_font(r1, font_name="Calibri", size_pt=8.5, color=COLOR_SLATE_MID)
    
    fld1 = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
    p._p.append(fld1)
    
    r2 = p.add_run(" من ")
    set_run_font(r2, font_name="Calibri", size_pt=8.5, color=COLOR_SLATE_MID)
    
    fld2 = parse_xml(r'<w:fldSimple %s w:instr="NUMPAGES"/>' % nsdecls('w'))
    p._p.append(fld2)

def main():
    print("Building Enterprise TIGER Manual...")
    doc = Document()
    
    # Configure 1-inch margins and document header/footer
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
        r_hdr = p_hdr.add_run("وثيقة تشغيلية قياسية (SOP) • نظام تايجر لإدارة نقاط البيع والصيانة (TIGER SYSTEM)")
        set_run_font(r_hdr, font_name="Calibri", size_pt=8, color=COLOR_SLATE_MID)
        
        # Footer with dynamic page numbering
        ftr = section.footer
        p_ftr = ftr.paragraphs[0]
        set_rtl(p_ftr)
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_page_number_field(p_ftr)
        r_ftr_div = p_ftr.add_run("  |  وثيقة معتمدة ومحمية بموجب حقوق الملكية الفكرية للمطور د. سامر محمد © 2026")
        set_run_font(r_ftr_div, font_name="Calibri", size_pt=8, color=COLOR_SLATE_MID)
        
    # =========================================================================
    # صفحة الغلاف التنفيذية (EXECUTIVE COVER PAGE)
    # =========================================================================
    
    # Header Reference Box
    p_ref = doc.add_paragraph()
    set_rtl(p_ref)
    p_ref.paragraph_format.space_before = Pt(0)
    p_ref.paragraph_format.space_after = Pt(12)
    r_ref = p_ref.add_run("DOCUMENT CODE: TGR-SOP-2026-V1.0  |  DISTRIBUTION: RESTRICTED - SHOP LEVEL")
    set_run_font(r_ref, font_name="Calibri", size_pt=8, bold=True, color=COLOR_SLATE_MID)
    
    # Embedded Official High-Res Logo
    logo_path = r"c:\Users\samer\Desktop\Tiger System\public\logo.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(15)
        p_logo.paragraph_format.space_after = Pt(15)
        r_logo = p_logo.add_run()
        r_logo.add_picture(logo_path, width=Inches(2.6))
        
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(6)
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("دَلِيلُ التَّشْغِيلِ وَإِجْرَاءَاتِ الْعَمَلِ الْقِيَاسِيَّةِ (SOP)")
    set_run_font(r_title, font_name="Calibri", size_pt=24, bold=True, color=COLOR_NAVY)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(2)
    p_sub.paragraph_format.space_after = Pt(16)
    r_sub = p_sub.add_run("مَنْظُومَةُ تَايْجِر الْمُعْتَمَدَةُ لِإِدَارَةِ مَرَاكِزِ الْهَوَاتِفِ الذَّكِيَّةِ، نِقَاطِ الْبَيْعِ، وَوَرْشَاتِ الصِّيَانَةِ\nTIGER SYSTEM: POS, Smart Repair Lifecycle & Inventory Management")
    set_run_font(r_sub, font_name="Calibri", size_pt=11.5, bold=False, color=COLOR_SLATE_DARK)
    
    # Formal Document Metadata Card
    meta_table = doc.add_table(rows=6, cols=2)
    format_corporate_table(
        meta_table,
        [Inches(2.4), Inches(4.6)],
        ["بند التوثيق المؤسسي", "البيانات المعتمدة"],
        [
            ["الجهة المطورة والمهندس المعماري", "د. ســامــر مـحـمـد (Dr. Samer Mohammad)"],
            ["الإصدار البرمجي المعتمد", "v1.0.0 Production Stable (نسخة 2026)"],
            ["بيئة التشغيل المعتمدة", "نظام Windows 10/11 (64-bit) المكتبي المنفصل (100% Offline)"],
            ["نطاق التطبيق", "محلات بيع الهواتف، ورشات الصيانة، نقاط البيع ومستودعات الإكسسوارات"],
            ["مستوى السرية والأمان", "مشفر محلياً بالكامل - بدون خوادم خارجية - حماية مطلقة للبيانات"],
            ["تاريخ النشر والاعتماد النهائي", "22 تشرين الثاني / نوفمبر 2026"]
        ]
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # جدول ضبط الوثيقة وتاريخ الإصدارات (DOCUMENT CONTROL)
    # =========================================================================
    add_executive_heading(doc, "سِجِلُّ ضَبْطِ الْوَثِيقَةِ وَالْمُرَاجَعَاتِ التَّشْغِيلِيَّةِ", level=1)
    
    add_body_p(
        doc,
        "تخضع هذه الوثيقة لمعايير الجودة والتشغيل القياسي الخاصة بمنظومة TIGER SYSTEM. يُحظر تعديل أي بند من بنود السياسات أو التعليمات دون اعتماد كتابي من المطور وإدارة النظام.",
        bold_prefix="سياسة التوثيق:"
    )
    
    doc_control_data = [
        ["v1.0.0", "22/11/2026", "د. سامر محمد", "اعتماد الإصدار التأسيسي الشامل وتفعيل ميزات الدفع المركب والواتساب"],
        ["v1.0.1", "مستمر عبر GitHub", "إدارة التحديثات", "الترقيات السحابية التلقائية لقواعد البيانات دون المساس بفواتير المبيعات"]
    ]
    tbl_ctrl = doc.add_table(rows=3, cols=4)
    format_corporate_table(
        tbl_ctrl,
        [Inches(1.0), Inches(1.4), Inches(1.8), Inches(2.8)],
        ["الإصدار", "التاريخ", "المسؤول", "طبيعة التعديل والاعتماد"],
        doc_control_data
    )
    
    add_executive_heading(doc, "فِهْرِسُ الْمُحْتَوَيَاتِ التَّشْغِيلِيَّةِ", level=2)
    
    toc_data = [
        ["القسم الأول", "الملخص التنفيذي والأهداف الاستراتيجية للمنظومة", "الفلسفة، الأداء، والمقارنة مع الأنظمة القديمة"],
        ["القسم الثاني", "المتطلبات الفنية والتهيئة العتادية في بيئة المحل", "الطابعات الحرارية، درج الكاش، وقوارئ الباركود"],
        ["القسم الثالث", "إجراءات العمل القياسية للكاشير (POS Workflow)", "بدء الوردية، بيع الأجهزة، تسجيل IMEI، والخصم"],
        ["القسم الرابع", "المعالجات المالية والمدفوعات المركبة والآجلة", "كاش، كليك، فيزا، الدفع المجزأ، وجدولة الذمم"],
        ["القسم الخامس", "دليل الإجراءات القياسية لقسم الصيانة (Repair SOP)", "الفحص الأولي، إيصال الاستلام، التكلفة، والتسليم"],
        ["القسم السادس", "منظومة إشعارات واتساب والتواصل مع الزبائن", "إشعار الجاهزية بنقرة واحدة، ومعالجة أرقام الهواتف"],
        ["القسم السابع", "الرقابة على المخزون ومنظومة منبهات النواقص", "مستويات الأمان (<=2)، منبهات الرادار، وطلبيات التوريد"],
        ["القسم الثامن", "إدارة حركة الصندوق ومطابقة الإغلاق اليومي", "رصيد الصباح، سحوبات المصاريف، وجرد الكاش الفعلي"],
        ["القسم التاسع", "إدارة الذمم المدينة وسندات القبض المعتمدة", "سجل الزبائن، كشوف الحساب، وتحصيل الديون"],
        ["القسم العاشر", "التقارير المالية والتحليلات وقوائم الأرباح", "حساب صافي الأرباح، أداء الفنيين، وتصدير Excel"],
        ["القسم الحادي عشر", "أمان البيانات والنسخ الاحتياطي وإدارة الطوارئ", "تصدير الفلاشة USB، واستعادة البيانات من الصفر"],
        ["القسم الثاني عشر", "الإطار القانوني المعتمد وسياسات إخلاء المسؤولية", "شرط مهلة 40 يوماً للصيانة، وسياسة الخصوصية"],
        ["القسم الثالث عشر", "دليل استكشاف الأعطال وحلها (Troubleshooting & FAQ)", "أعطال الطابعة، درج الكاش، وجدول الاختصارات"]
    ]
    tbl_toc = doc.add_table(rows=len(toc_data) + 1, cols=3)
    format_corporate_table(
        tbl_toc,
        [Inches(1.2), Inches(3.4), Inches(2.4)],
        ["القسم", "الموضوع الرئيسي", "النطاق التشغيلي"],
        toc_data
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الأول: الملخص التنفيذي والأهداف
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الأَوَّلُ: الْمُلَخَّصُ التَّنْفِيذِيُّ وَالأَهْدَافُ الاسْتِرَاتِيجِيَّةُ", level=1)
    
    add_body_p(
        doc,
        "تمثل منظومة TIGER SYSTEM الجيل الأحدث من أنظمة إدارة نقاط البيع ومراكز الصيانة الموجهة خصيصاً لسوق الاتصالات ومحلات الهواتف الذكية. تم بناء النظام بمعمارية حديثة تجمع بين واجهة مستخدم فائقة الاستجابة (React + Vite) ومحرك مكتبي آمن (Electron) مدعوماً بقاعدة بيانات محلية علائقية (SQLite) مشفرة ومصممة للعمل دون أي اعتماد على خوادم سحابية خارجية، مما يحقق استقلالية تامة واستقراراً بنسبة 100% حتى في حال انقطاع شبكة الإنترنت.",
        bold_prefix="1.1 النظرة المعمارية العامة:"
    )
    
    add_executive_heading(doc, "1.2 مصفوفة المقارنة التشغيلية: الأنظمة التقليدية مقابل منظومة TIGER", level=2)
    
    comp_data = [
        ["الاعتماد على الإنترنت", "تتوقف عن العمل فور انقطاع الاتصال بالسيرفر", "استقلالية تامة (100% Offline)، وتعمل بدون إنترنت نهائياً"],
        ["حماية وسرية البيانات", "بيانات وأرقام العملاء مخزنة على خوادم مستأجرة", "تشفير محلي صارم على قرص جهاز المحل فقط ولا تغادره مطلقاً"],
        ["إشعارات الصيانة للزبائن", "رسائل SMS مدفوعة أو اتصال يدوي يستنزف الوقت", "إرسال رسالة واتساب جاهزة بنقرة واحدة (بدون حفظ الرقم)"],
        ["المدفوعات المركبة (Split)", "خيارات جامدة تسبب عجوزات محاسبية للموظف", "توزيع فوري بنقرة زر (كاش + كليك + فيزا + آجل) بمرونة مطلقة"],
        ["تتبع مهلة الصيانة القانونية", "نزاعات مستمرة مع الزبائن حول الأجهزة المتروكة", "توثيق قانوني فوري لمهلة 40 يوماً على الفاتورة وسند الاستلام"],
        ["رصد نواقص قطع الغيار", "انتظار نفاد الشاشة أو البطارية المفاجئ لطلبها", "منظومة إنذار وميضية رادارية فور وصول الرصيد لقطعتين أو أقل"]
    ]
    tbl_comp = doc.add_table(rows=7, cols=3)
    format_corporate_table(
        tbl_comp,
        [Inches(1.8), Inches(2.6), Inches(2.6)],
        ["المعيار التشغيلي", "البرامج والحلول التقليدية", "مزايا منظومة TIGER المعتمدة"],
        comp_data
    )
    
    add_formal_box(
        doc,
        "الهدف الاستراتيجي من المنظومة",
        "القضاء التام على الهدر المالي، ضبط حركة الكاش والذمم المدينة، حماية المحل من النزاعات القانونية المتعلقة بأجهزة الصيانة المتروكة، وتوفير تجربة استثنائية لزبائن المحل تعزز ثقتهم وتزيد من ولاءهم.",
        box_style="highlight"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الثاني: المتطلبات الفنية والتهيئة الميدانية
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الثَّانِي: الْمُتَطَلَّبَاتُ الْفَنِّيَّةُ وَالتَّهْيِئَةُ الْعَتَادِيَّةُ", level=1)
    
    add_body_p(
        doc,
        "لضمان أقصى كفاءة تشغيلية للمنظومة وسرعة استجابة لا تتعدى أجزاء من الثانية أثناء فترات الذروة، يجب اتباع المعايير الهندسية الآتية عند تجهيز نقطة الكاشير والمكتب الفني.",
        bold_prefix="2.1 معايير البنية التحتية:"
    )
    
    add_executive_heading(doc, "2.2 متطلبات العتاد ومواصفات أجهزة الكاشير", level=2)
    add_bullet_item(doc, "وحدة المعالجة المركزية (CPU)", "معالج Intel Core i3 (الجيل الخامس أو أحدث) أو ما يعادله من AMD، لتأمين معالجة فورية لقواعد البيانات ومحرك البحث.")
    add_bullet_item(doc, "ذاكرة الوصول العشوائي (RAM)", "الحد الأدنى 4 جيجابايت، ويفضل بشدة 8 جيجابايت لتشغيل النظام بسلاسة بجانب تطبيقات ويندوز الأخرى وتطبيق واتساب.")
    add_bullet_item(doc, "وحدة التخزين الصلبة (Storage)", "قرص SSD بسعة لا تقل عن 120 جيجابايت. إن استخدام أقراص SSD يرفع سرعة إصدار الفواتير والتقارير بمعدل 10 أضعاف مقارنة بالأقراص التقليدية HDD.")
    add_bullet_item(doc, "نظام التشغيل المعتمد", "Windows 10 Pro أو Windows 11 Pro بنواة 64-bit، مع تثبيت أحدث تحديثات حزم Visual C++ Redistributable.")
    
    add_executive_heading(doc, "2.3 تهيئة الملحقات الطرفية (Printers, Drawer, Scanners)", level=2)
    
    hw_data = [
        ["طابعة الفواتير الحرارية (Receipt Printer)", "تدعم مقاس 80mm أو 58mm عبر منفذ USB، وتعرف كطابعة افتراضية (Default Printer) في ويندوز."],
        ["درج الكاش الإلكتروني (Cash Drawer)", "يوصل عبر كيبل هاتف قياسي (RJ11 / RJ12) في المنفذ المخصص خلف الطابعة الحرارية لتلقي نبضة الفتح الكهربائية."],
        ["قارئ الباركود (Barcode Scanner)", "يعمل عبر USB بنمط التوصيل والتشغيل (Plug & Play)، ويجب ضبطه لإرسال إشارة Enter (Carriage Return) بعد كل مسح."],
        ["طابعة لواصق الباركود (Barcode Label)", "طابعة حرارية مخصصة للواصق لعنونة وتوسيم كروت الصيانة والأصناف المستودعية غير المرمزة مصنعياً."]
    ]
    tbl_hw = doc.add_table(rows=5, cols=2)
    format_corporate_table(
        tbl_hw,
        [Inches(2.4), Inches(4.6)],
        ["الملحق الطرفي", "المواصفات الفنية وطريقة التهيئة"],
        hw_data
    )
    
    add_formal_box(
        doc,
        "إجراء وقائي لمسار قاعدة البيانات",
        "تستقر قاعدة البيانات المشفرة للنظام في المسار المحلي المحمي للنظام. لا تقم بنقل أو مسح ملفات مجلد النظام يدويياً، واعتمد حصراً على أداة النسخ الاحتياطي المدمجة في تبويب الإعدادات لتجنب تلف الفهارس المحاسبية.",
        box_style="critical"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الثالث: إجراءات العمل القياسية للكاشير
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الثَّالِثُ: إِجْرَاءَاتُ الْعَمَلِ الْقِيَاسِيَّةِ لِلْكَاشِيرِ (POS SOP)", level=1)
    
    add_body_p(
        doc,
        "تحدد هذه الإجراءات التسلسل القياسي لعمليات البيع اليومية بما يضمن عدم حدوث أي عجز في الصندوق، وسرعة خدمة الزبائن، والتوثيق الدقيق لمبيعات الأجهزة والإكسسوارات.",
        bold_prefix="3.1 سياسة نقطة البيع:"
    )
    
    add_executive_heading(doc, "3.2 الإجراء القياسي لبدء الوردية (Opening Shift Protocol)", level=2)
    add_bullet_item(doc, "الخطوة الأولى: تسجيل الدخول", "يقوم الكاشير بإدخال رمز الـ PIN المخصص له. تظهر هويته وصلاحياته أعلى الشاشة لتسجيل كل فاتورة باسمه.")
    add_bullet_item(doc, "الخطوة الثانية: فتح الوردية وتوثيق عهدة الصرافة", "يقوم الكاشير بعدّ الفكة النقدية الموجودة في الدرج (رصيد البداية) وتسجيلها في النظام لتكون أساس المطابقة عند الإغلاق.")
    add_bullet_item(doc, "الخطوة الثالثة: التحقق من جاهزية الأجهزة", "التأكد من تشغيل الطابعة الحرارية وتوفر ورق الفواتير، وتجربة فتح درج الكاش باختصار لوحة المفاتيح.")
    
    add_executive_heading(doc, "3.3 دورة إتمام فاتورة البيع خطوة بخطوة", level=2)
    
    pos_flow = [
        ["1. مسح الأصناف", "مسح باركود المنتج بواسطة القارئ، أو كتابة جزء من اسم المنتج أو رقمه في شريط البحث السريع والضغط على Enter."],
        ["2. ضبط الكميات", "تعديل الكميات بالزيادة أو النقصان عبر مفاتيح (+ و -) أو كتابة الرقم المطلوب في حقل الكمية مباشرة."],
        ["3. بيع الأجهزة الذكية", "عند إضافة جهاز هاتف، يفتح النظام نافذة توثيق الرقم التسلسلي (IMEI 1 & IMEI 2) وحالة الضمان ونوع الجهاز."],
        ["4. تطبيق التخفيضات", "إدخال الخصم المصرح به (مبلغ نقدي أو نسبة مئوية) مع التأكد من أن السعر لا ينزل دون سعر التكلفة المحدد للمادة."],
        ["5. تحديد هوية العميل", "اختيار 'زبون نقدي' للمبيعات العابرة، أو اختيار/إضافة العميل باسمه ورقم هاتفه إذا كان يطلب فاتورة ضريبية أو بيعاً آجلاً."],
        ["6. السداد والطباعة", "الضغط على مفتاح الدفع، اختيار آلية السداد، وخروج الفاتورة الحرارية تلقائياً مع فتح درج الكاش لاستلام المبلغ."]
    ]
    tbl_pos = doc.add_table(rows=7, cols=2)
    format_corporate_table(
        tbl_pos,
        [Inches(2.2), Inches(4.8)],
        ["المرحلة", "الخطوات التشغيلية التفصيلية"],
        pos_flow
    )
    
    add_formal_box(
        doc,
        "إلزامية تسجيل الرقم التسلسلي (IMEI) للهواتف",
        "تعد طباعة رقم الـ IMEI على فاتورة بيع الأجهزة (جديدة أو مستعملة) التزاماً مهنياً وقانونياً يحمي المحل من ادعاءات تبديل الأجهزة أو النزاعات حول سريان فترة الضمان التجاري.",
        box_style="highlight"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الرابع: المعالجات المالية والمدفوعات المركبة والآجلة
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الرَّابِعُ: الْمُعَالَجَاتُ الْمَالِيَّةُ وَالْمَدْفُوعَاتُ الْمُرَكَّبَةُ وَالآجِلَةُ", level=1)
    
    add_body_p(
        doc,
        "تتميز منظومة TIGER بمعالجة فائقة المرونة لعمليات السداد الحديثة، حيث تتيح للموظف إتمام العمليات المعقدة في ثوانٍ معدودة دون الحاجة لحسابات يدوية تعرض الصندوق للخطأ أو العجز.",
        bold_prefix="4.1 فلسفة السداد المرن:"
    )
    
    add_executive_heading(doc, "4.2 بروتوكول المدفوعات النقدية والإلكترونية", level=2)
    add_bullet_item(doc, "السداد النقدي الكامل (Cash)", "استلام النقد باليد، إدخال المبلغ المستلم، واحتساب الفكة المرجعة للزبون بدقة سنتيمترية مع ترحيل المبلغ للصندوق النقدي.")
    add_bullet_item(doc, "السداد عبر كليك (CliQ)", "يجب على الكاشير التأكد من وصول إشعار التحويل البنكي على هاتف المحل وتطابق الرقم المرجعي للحوالة مع قيمة الفاتورة قبل تسليم البضاعة.")
    add_bullet_item(doc, "السداد بالبطاقات المصرفية (Visa / Master)", "تمرير البطاقة على جهاز الـ POS البنكي، والتحقق من طباعة إيصال القبول البنكي وتطابق المبلغ.")
    
    add_executive_heading(doc, "4.3 الدفع المركب المتقدم (Split Payment Scenarios)", level=2)
    add_body_p(
        doc,
        "عندما يرغب العميل في سداد الفاتورة بأكثر من طريقة في نفس العملية، توفر المنظومة أدوات ذكية تحسب التوزيع فورياً:",
        bold_prefix="أمثلة تشغيلية حية:"
    )
    
    split_examples = [
        ["السيناريو الأول: كاش + CliQ بالتساوي", "فاتورة بقيمة 100 د.أ: الضغط على زر (50/50 كاش وكليك) يوزع تلقائياً 50 د.أ نقد في الصندوق و 50 د.أ حوالة بنكية."],
        ["السيناريو الثاني: كاش بمبلغ محدد والمتبقي كليك", "فاتورة بقيمة 75 د.أ: العميل دفع 25 د.أ نقداً، يكتب الكاشير 25 في خانة النقد ثم يضغط زر (+ الباقي) بجانب كليك، ليدرج النظام 50 د.أ فوراً."],
        ["السيناريو الثالث: توزيع ثلاثي (كاش + فيزا + كليك)", "فاتورة هاتف بقيمة 300 د.أ: الضغط على زر (أثلاث متساوية) يقسم المبلغ بالتساوي 100 د.أ لكل وسيلة، مع إمكانية تعديلها يدوياً."],
        ["السيناريو الرابع: سداد جزء نقدي وتأجيل المتبقي (آجل)", "فاتورة بقيمة 150 د.أ: دفع العميل 100 د.أ نقداً وتبقى 50 د.أ؛ يفتح النظام تلقائياً لوحة تسجيل الذمة لربط المتبقي باسم العميل وتاريخ السداد."]
    ]
    tbl_split = doc.add_table(rows=5, cols=2)
    format_corporate_table(
        tbl_split,
        [Inches(2.5), Inches(4.5)],
        ["نمط الدفع المركب", "آلية التنفيذ والترحيل المحاسبي"],
        split_examples
    )
    
    add_formal_box(
        doc,
        "قاعدة عدم البيع بالآجل لمجهول الهوية",
        "يمنع النظام بصورة آلية ترحيل أي مبلغ آجل أو متبقي بذمة 'زبون نقدي' عام. يفرض النظام إلزامية إدخال اسم الزبون ورقم هاتفه لفتح ملف ذمة مدين مستقل وتوثيق الاستحقاق لحماية أموال المحل.",
        box_style="critical"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الخامس: دليل الإجراءات القياسية لقسم الصيانة
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الْخَامِسُ: دَلِيلُ الإِجْرَاءَاتِ الْقِيَاسِيَّةِ لِقِسْمِ الصِّيَانَةِ", level=1)
    
    add_body_p(
        doc,
        "يهدف هذا البروتوكول إلى تحويل ورشة الصيانة إلى بيئة مؤسسية منظمة تقضي على الفوضى، وتمنع تبديل الأجهزة أو نسيانها، وتضمن احتساب أرباح الصيانة وقطع الغيار المستهلكة بدقة متناهية.",
        bold_prefix="5.1 أهداف بروتوكول الصيانة:"
    )
    
    add_executive_heading(doc, "5.2 قائمة الفحص الميداني عند استلام الجهاز (Check-in Checklist)", level=2)
    add_body_p(
        doc,
        "يجب على موظف الاستلام إجراء فحص ظاهري وتقني للجهاز أمام العميل قبل إصدار السند، وتوثيق الآتي في كرت الصيانة:",
        bold_prefix="بنود الفحص الإلزامية:"
    )
    add_bullet_item(doc, "حالة الشاشة واللمس", "هل الشاشة تعمل بصورة طبيعية؟ هل توجد بقع حبر، خطوط، أو كسور مسبقة في الزجاج الخارجي؟")
    add_bullet_item(doc, "حساسات البصمة والوجه", "فحص عمل FaceID أو TouchID وتوثيق ذلك في حقل الملاحظات.")
    add_bullet_item(doc, "الكاميرات والصوتيات", "اختبار الكاميرا الأمامية والخلفية، ومكبر الصوت والميكروفون وسماعة المكالمات.")
    add_bullet_item(doc, "الملحقات والشرائح", "هل يحتوي الجهاز على شريحة SIM أو كرت ذاكرة MicroSD أو كفر حماية؟ يتم توثيق ذلك بدقة.")
    add_bullet_item(doc, "رمز القفل (Passcode)", "تسجيل رمز فتح الشاشة لتجربة الجهاز بعد إتمام الإصلاح.")
    
    add_executive_heading(doc, "5.3 دورة التذكرة الفنية وإدارة الحالات", level=2)
    
    repair_states = [
        ["قيد الفحص (Pending)", "استلام الجهاز، طباعة استيكر الباركود وإلصاقه على الجهاز، وطباعة إيصال الاستلام للعميل."],
        ["بانتظار الموافقة (Waiting Approval)", "تحديد العطل وتكلفة الإصلاح وقطع الغيار، والاتصال بالزبون لنيل موافقته وتوثيق السعر النهائي."],
        ["قيد الصيانة (In Progress)", "مباشرة الفني عملية الفك والإصلاح واستبدال القطع المعطوبة."],
        ["جاهز للاستلام (Ready)", "إتمام الإصلاح بنجاح، وتفعيل زر (إرسال للواتساب) لإشعار العميل فورياً بجاهزية جهازه والمبلغ المطلوب."],
        ["تم التسليم والإغلاق (Delivered)", "حضور الزبون، تجربة الجهاز وفحصه أمامه، سداد المبلغ المتبقي، وإغلاق التذكرة وترحيل الإيراد."]
    ]
    tbl_states = doc.add_table(rows=6, cols=2)
    format_corporate_table(
        tbl_states,
        [Inches(2.3), Inches(4.7)],
        ["حالة كرت الصيانة", "الإجراء التشغيلي الإلزامي"],
        repair_states
    )
    
    add_executive_heading(doc, "5.4 صرف قطع الغيار من المستودع وحساب صافي الربح", level=2)
    add_body_p(
        doc,
        "عند استبدال شاشة أو بطارية، يقوم الفني بربط القطعة من قائمة المخزون بالتذكرة. يقوم النظام تلقائياً بخصم القطعة من المستودع واحتساب تكلفتها من إجمالي المبلغ المتفق عليه، ليظهر النظام الربح الصافي الفعلي لأجور يد الفني مطروحاً منها تكلفة الشراء المادية للقطعة.",
        bold_prefix="المعادلة المحاسبية للصيانة:"
    )
    
    add_formal_box(
        doc,
        "الإيصال الرسمي وإخلاء المسؤولية القانوني",
        "تتضمن كافة إيصالات الصيانة المطبوعة شرطاً قانونياً صارماً ومعتمداً: (يعتبر العميل متنازلاً عن جهازه ويحق للمركز التصرف فيه بعد مرور 40 يوماً من تاريخ الإنجاز دون استلامه لتغطية تكاليف قطع الغيار وفحصه الفني).",
        box_style="legal"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم السادس: منظومة إشعارات واتساب
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ السَّادِسُ: مَنْظُومَةُ إِشْعَارَاتِ وَاتْسَاب وَالتَّوَاصُلِ الْمُبَاشِرِ", level=1)
    
    add_body_p(
        doc,
        "تعد خدمة WhatsApp Direct المدمجة في TIGER SYSTEM إحدى أقوى أدوات ولاء العملاء والتسويق، حيث تتيح للمحل التواصل مع الزبائن فورياً دون الحاجة لتسجيل أرقامهم في دفتر الهاتف ودون دفع أي اشتراكات لمنصات وسيطة.",
        bold_prefix="6.1 القيمة المضافة للتواصل الفوري:"
    )
    
    add_executive_heading(doc, "6.2 قوالب الرسائل القياسية المعتمدة", level=2)
    
    wa_templates = [
        ["رسالة جاهزية جهاز الصيانة", "أهلاً بك زبوننا العزيز [الاسم] 🌹، يسعدنا إعلامك بأن جهازك ([نوع الجهاز]) أصبح جاهزاً للاستلام من مركز تايجر موبايل. المبلغ المتبقي: [المبلغ] د.أ. أهلاً بك في أي وقت!"],
        ["رسالة تسليم الفاتورة والضمان", "شكراً لتعاملك مع تايجر موبايل 🌟. مرفق تفاصيل فاتورة الشراء لجهازك [نوع الجهاز] والملحقات. تفاصيل الضمان معتمدة لدينا برقم الفاتورة [الرقم]. نتمنى لك تجربة ممتعة!"],
        ["رسالة تذكير بسداد الذمة الآجلة", "زبوننا الكريم [الاسم]، نود تذكيرك بالرصيد المتبقي بذمتكم والبالغ [المبلغ] د.أ المستحق بتاريخ [التاريخ]. نشكر التزامكم الدائم ونرحب بكم لتسديد الدفعة."]
    ]
    tbl_wa = doc.add_table(rows=4, cols=2)
    format_corporate_table(
        tbl_wa,
        [Inches(2.2), Inches(4.8)],
        ["نوع الإشعار", "نص الرسالة القياسي التلقائي"],
        wa_templates
    )
    
    add_executive_heading(doc, "6.3 خوارزمية المعالجة الذكية لأرقام الهواتف", level=2)
    add_body_p(
        doc,
        "تم تزويد المنظومة بخوارزمية معالجة أرقام محلية ذكية؛ فعند قيام الكاشير بكتابة رقم هاتف أردني عادي مثل (079XXXXXXX أو 078XXXXXXX أو 077XXXXXXX)، يقوم النظام تلقائياً بنزع الصفر الأولي وإلحاق مفتاح الاتصال الدولي الأردني (962) ليصبح الرقم مهيأً للتوجيه المباشر عبر بروتوكول واتساب الدولي (9627XXXXXXXX) دون أي خطأ بشري.",
        bold_prefix="المعالجة البرمجية للأرقام:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم السابع: الرقابة على المخزون ومنبهات النواقص
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ السَّابِعُ: الرَّقَابَةُ عَلَى الْمَخْزُونِ وَمَنْظُومَةُ مُنَبِّهَاتِ النَّوَاقِصِ", level=1)
    
    add_body_p(
        doc,
        "تمنع المنظومة توقف ورشة الصيانة أو خسارة مبيعات الإكسسوارات من خلال رادار النواقص التلقائي الذي يرصد مستويات الأمان بصورة مستمرة.",
        bold_prefix="7.1 حماية سلاسل الإمداد:"
    )
    
    add_executive_heading(doc, "7.2 منظومة منبهات النواقص الحرجة (Stock Alert Beacons)", level=2)
    add_bullet_item(doc, "عتبة الأمان المعتمدة (Safety Threshold)", "تم ضبط مؤشر النواقص الحرجة تلقائياً عند وصول رصيد أي قطعة، شاشة، أو إكسسوار إلى قطعتين أو أقل (<= 2).")
    add_bullet_item(doc, "منبه الرادار الوميضي (Beacon Radar)", "يتحول جرس الإشعارات في الشريط العلوي للنظام إلى نبض ضوئي راداري أحمر يلفت انتباه إدارة المحل لحظياً.")
    add_bullet_item(doc, "قائمة التوريد الفورية (Instant Supplier Order)", "عند النقر على منبه الرادار، تفتح قائمة منبثقة تفصل كافة المواد التي شارفت على النفاد، مع زر مخصص [نسخ لطلبية الواتساب]؛ حيث يقوم بنسخ قائمة النواقص بصيغة رسالة مرتبة لإرسالها فوراً لموزع قطع الغيار عبر واتساب.")
    add_bullet_item(doc, "فلتر المواد الحرجة في الجداول", "زر سريع في صفحة المخزون يفرز بنقرة واحدة الأصناف الناقصة لتسهيل فحص الرفوف ومطابقتها.")
    
    add_executive_heading(doc, "7.3 إجراءات الجرد الدوري ومعالجة الفروقات", level=2)
    add_body_p(
        doc,
        "يجب على إدارة المحل إجراء جرد مخزني أسبوعي أو شهري لمطابقة الرصيد الدفتري المسجل في النظام مع العدد الفعلي على الرفوف. في حال وجود تالف ناتج عن الكسر أثناء التركيب، يتم تسجيله كـ 'هدر صيانة' لخصمه من الأرباح وتحديث رصيد المستودع ليبقى الحساب دقيقاً.",
        bold_prefix="سياسة الجرد:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الثامن: حركة الصندوق ومطابقة الإغلاق اليومي
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الثَّامِنُ: حَرَكَةُ الصُّنْدُوقِ وَمُطَابَقَةُ الإِغْلاقِ الْيَوْمِيِّ", level=1)
    
    add_body_p(
        doc,
        "يعد الصندوق النقدي عصب المحل التجاري، وتوفر المنظومة دورة رقابية محكمة تمنع أي تلاعب أو تسريب مالي غير موثق.",
        bold_prefix="8.1 الحوكمة النقدية:"
    )
    
    add_executive_heading(doc, "8.2 زر اختصار فتح درج الكاش المباشر (Cash Drawer Shortcut)", level=2)
    add_bullet_item(doc, "الكبسة الافتراضية المعتمدة", "تم ضبط النظام تلقائياً لفتح الدرج عند الضغط على زر (F12) في لوحة المفاتيح.")
    add_bullet_item(doc, "تخصيص الكبسة بحسب رغبة المحل", "من تبويب [الإعدادات] -> [المتجر والعملة] -> قسم [درج الكاش]، يمكن النقر على زر 'تعيين كبسة جديدة' والضغط على أي زر في الكيبورد (مثل Space أو F8 أو F9) لحفظه فوراً في النظام والذاكرة.")
    add_bullet_item(doc, "التحكم في الصوت الميكانيكي", "يدعم النظام محاكاة صوتية احترافية لتأكيد فتح الدرج كهربائياً لتعزيز انتباه الكاشير.")
    
    add_executive_heading(doc, "8.3 ورقة عمل مطابقة الصندوق اليومي (Cash Reconciliation Worksheet)", level=2)
    
    cash_reconcile = [
        ["1. رصيد البداية (Opening Float)", "تسجيل النقد الأولي الموجود في الدرج عند الصباح (الفكة)."],
        ["2. مبيعات النقد الفعلية (Cash Sales)", "إجمالي المبالغ النقدية المحصلة من فواتير البيع وإيرادات الصيانة."],
        ["3. مقبوضات الذمم (Debt Inflow)", "سندات القبض النقدية المحصلة من زبائن الديون خلال اليوم."],
        ["4. المصروفات النثرية (Expenses Outflow)", "أي مبالغ خرجت من الدرج لنثريات المحل (فواتير، ضيافة، مشتريات طارئة)."],
        ["5. الرصيد الدفتري النظري المتوقع", "المعادلة: (رصيد البداية + مبيعات الكاش + مقبوضات الديون) - المصروفات النثرية."],
        ["6. الجرد الفعلي بالعد اليدوي", "عد الأوراق النقدية والقطع المعدنية الموجودة في الدرج عند نهاية الدوام."],
        ["7. احتساب الفارق (عجز / فائض)", "مقارنة الفعلي بالنظري وإصدار تقرير إغلاق الوردية وتوقيع الكاشير والمدير."]
    ]
    tbl_rec = doc.add_table(rows=8, cols=2)
    format_corporate_table(
        tbl_rec,
        [Inches(2.5), Inches(4.5)],
        ["بند المطابقة والتدقيق", "آلية الاحتساب والتسجيل"],
        cash_reconcile
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم التاسع: إدارة الذمم وسندات القبض
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ التَّاسِعُ: إِدَارَةُ الذِّمَمِ الْمَدِينَةِ وَسَنَدَاتُ الْقَبْضِ", level=1)
    
    add_body_p(
        doc,
        "تتضمن المنظومة دفتراً إلكترونياً محكماً للديون والذمم، يحمي أصحاب المحلات من ضياع المستحقات ويمنحهم أدوات متابعة احترافية ومهذبة مع الزبائن.",
        bold_prefix="9.1 حماية مستحقات المحل:"
    )
    
    add_executive_heading(doc, "9.2 كشف الحساب المالي الموحد للعميل", level=2)
    add_body_p(
        doc,
        "بمجرد فتح ملف أي زبون، يظهر كشف حساب تاريخي يبين كل عملية شراء، كل جهاز تم إدخاله للصيانة، المبالغ المسددة، والرصيد المتبقي الصافي بذمته. يمكن طباعة هذا الكشف أو تصديره إلى ملف PDF أو إرسال خلاصته عبر رسالة واتساب رسمية بنقرة واحدة.",
        bold_prefix="شفافية الحسابات:"
    )
    
    add_executive_heading(doc, "9.3 إصدار سند القبض الرسمي (Payment Voucher)", level=2)
    add_bullet_item(doc, "الخطوة الأولى", "البحث عن اسم العميل في شاشة الزبائن، والضغط على خيار [قبض دفعة].")
    add_bullet_item(doc, "الخطوة الثانية", "إدخال المبلغ المقبوض واختيار طريقة القبض (نقداً لتغذية الدرج، أو تحويل كليك لتغذية الحساب البنكي).")
    add_bullet_item(doc, "الخطوة الثالثة", "حفظ العملية ليقوم النظام فوراً بخصم المبلغ من ذمة العميل، وترحيل النقد للصندوق اليومي، وطباعة سند قبض حراري رسمي يسلم للعميل موضحاً: رصيده القديم، المبلغ المقبوض، ورصيده الجديد المتبقي.")
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم العاشر: التقارير المالية والتحليلات
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الْعَاشِرُ: التَّقَارِيرُ الْمَالِيَّةُ، الأَرْبَاحُ الْحَقِيقِيَّةُ، وَالْمُؤَشِّرَاتُ", level=1)
    
    add_body_p(
        doc,
        "لا يكتفي النظام بتسجيل المبيعات، بل يحلل الأداء المالي للمحل بدقة لمساعدة الإدارة على اتخاذ قرارات الشراء والتسعير بناءً على أرقام حقيقية وموثوقة.",
        bold_prefix="10.1 ذكاء الأعمال المالي:"
    )
    
    add_executive_heading(doc, "10.2 منظومة التقارير المدمجة", level=2)
    
    reports_matrix = [
        ["تقرير الأرباح الحقيقية الصافية", "يحسب إجمالي المبيعات مطروحاً منها تكلفة الشراء المادية للأصناف ومطروحاً منها المصروفات النثرية."],
        ["تقرير مبيعات طرق الدفع", "تفصيل دقيق لحجم الأموال الداخلة نقداً، وحجم الحوالات البنكية عبر CliQ، وحجم مدفوعات البطاقات البنكية."],
        ["تقرير المواد الأكثر مبيعاً وربحية", "ترتيب تصاعدي وتنازلي للإكسسوارات وقطع الغيار التي تحقق أعلى معدل دوران وأعلى هامش ربحي."],
        ["تقرير إنتاجية قسم الصيانة", "عدد الأجهزة المنجزة لكل فني، متوسط زمن الإصلاح، وإجمالي إيرادات اليد العاملة المستحقة."],
        ["تقرير الديون والذمم المعلقة", "حصر كامل لكافة المبالغ المتبقية في السوق بذمة الزبائن مع تواريخ استحقاقها لترتيب جدول التحصيل."]
    ]
    tbl_rep = doc.add_table(rows=6, cols=2)
    format_corporate_table(
        tbl_rep,
        [Inches(2.5), Inches(4.5)],
        ["اسم التقرير المالي", "القيمة التحليلية والهدف الإداري"],
        reports_matrix
    )
    
    add_executive_heading(doc, "10.3 خيارات التصدير والأرشفة", level=2)
    add_body_p(
        doc,
        "تتيح المنظومة تصدير أي تقرير مالي إلى جداول Excel بصيغة (.xlsx) منسقة وجاهزة لإجراء التحليلات المتقدمة أو إرسالها للمدقق المالي، بالإضافة لإمكانية الطباعة الورقية والحرارية السريعة.",
        bold_prefix="المرونة البرمجية:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الحادي عشر: أمان البيانات والنسخ الاحتياطي
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الْحَادِي عَشَرَ: أَمَانُ الْبَيَانَاتِ وَالنَّسْخُ الاحْتِيَاطِيُّ وَإِدَارَةُ الطَّوَارِئِ", level=1)
    
    add_body_p(
        doc,
        "البيانات المحاسبية وفواتير الزبائن هي الأصول الأثمن لأي محل تجاري. تم تصميم منظومة TIGER لتأمين هذه الأصول ضد الانهيار الفني لأنظمة ويندوز أو أعطال الأجهزة المفاجئة.",
        bold_prefix="11.1 استراتيجية الحماية الشاملة:"
    )
    
    add_executive_heading(doc, "11.2 بروتوكول النسخ الاحتياطي الدوري (Disaster Recovery Plan)", level=2)
    add_bullet_item(doc, "النسخ الاحتياطي اليومي", "يقوم الكاشير أو المدير بنقرة زر واحدة في نهاية الدوام بأخذ نسخة احتياطية محلية مشفرة تحفظ تلقائياً في مجلد النسخ الاحتياطي للنظام.")
    add_bullet_item(doc, "النسخ الأسبوعي الخارجي على فلاشة USB", "يجب تصدير نسخة احتياطية أسبوعياً على فلاشة USB خارجية والاحتفاظ بها خارج جهاز الكمبيوتر؛ لضمان استرجاع كامل العمليات في حال احتراق القرص الصلب أو تعرض الويندوز لفيروسات.")
    add_bullet_item(doc, "استعادة البيانات في ثوانٍ معدودة", "في حال الانتقال لجهاز كمبيوتر جديد، كل ما عليك هو تثبيت برنامج TIGER ثم الدخول لصفحة الإعدادات واختيار [استعادة من ملف] واختيار نسخة الفلاشة؛ لتعود كافة الفواتير، الزبائن، والديون فوراً بنسبة 100%.")
    
    add_executive_heading(doc, "11.3 التحديثات البرمجية الذكية عبر GitHub", level=2)
    add_body_p(
        doc,
        "يتضمن النظام محرك تحديث سحابي ذاتي مرتبط بمستودع التحديثات المعتمد. يقوم المحرك بفحص التحديثات وتنزيل التحسينات وميزات النظام الجديدة تلقائياً، مع تطبيق تقنية الحفاظ على هياكل البيانات السابقة (Migration Safe) دون المساس بأي فاتورة أو حساب مسجل مسبقاً.",
        bold_prefix="الترقية الآمنة:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الثاني عشر: الإطار القانوني والسياسات الرسمية
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الثَّانِي عَشَرَ: الإِطَارُ الْقَانُونِيُّ الْمُعْتَمَدُ وَسِيَاسَاتُ إِخْلاءِ الْمَسْؤُولِيَّةِ", level=1)
    
    add_body_p(
        doc,
        "تتضمن المنظومة بنود اتفاقية ترخيص وسياسات تشغيل رسمية معتمدة لحماية صاحب المحل والعاملين فيه من أي تبعات قانونية أو مطالبات غير محقة.",
        bold_prefix="12.1 الحصانة القانونية للمركز:"
    )
    
    legal_articles = [
        ["المادة الأولى: الخصوصية والأمان المحلي (100% Offline)", "جميع سجلات المبيعات، الصيانة، وقواعد البيانات مشفرة ومحفوظة محلياً على القرص الصلب للجهاز فقط، ولا يتم إرسال أو تسريب أي بيانات محاسبية أو أرقام هواتف خارج جهازك نهائياً."],
        ["المادة الثانية: إخلاء مسؤولية الصيانة القانوني (مهلة 40 يوماً)", "يلتزم المحل بإصدار إيصال استلام رسمي لكل جهاز. يعتبر العميل متنازلاً عن جهازه ويحق للمحل التصرف فيه بعد مرور 40 يوماً من تاريخ الإنجاز دون استلامه، لتغطية تكاليف قطع الغيار وأجور الفحص الفني."],
        ["المادة الثالثة: النسخ الاحتياطي الدوري وسلامة التشغيل", "يُوصى بأخذ نسخة احتياطية دورية أسبوعياً على فلاشة USB خارجية لضمان سلامة العمليات والفواتير في حال حدوث أي عطل فني في نظام تشغيل الويندوز."],
        ["المادة الرابعة: التحديثات السحابية وصيانة البيانات", "ترقية النظام عبر GitHub مصممة ذاتياً للحفاظ على سلامة قاعدة البيانات السابقة بالكامل دون المساس بأي فواتير أو حسابات مسجلة مسبقاً."]
    ]
    tbl_legal = doc.add_table(rows=5, cols=2)
    format_corporate_table(
        tbl_legal,
        [Inches(2.5), Inches(4.5)],
        ["البند والسياسة القانونية", "الصيغة القانونية المعتمدة رسمياً في النظام"],
        legal_articles
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # القسم الثالث عشر: استكشاف الأعطال وحلها والأسئلة الشائعة
    # =========================================================================
    add_executive_heading(doc, "الْقِسْمُ الثَّالِثُ عَشَرَ: دَلِيلُ اسْتِكْشَافِ الأَعْطَالِ وَحَلِّهَا (TROUBLESHOOTING & FAQ)", level=1)
    
    add_executive_heading(doc, "13.1 مصفوفة تشخيص الأعطال الشائعة", level=2)
    
    trouble_data = [
        ["الطابعة الحرارية لا تطبع الفاتورة", "1. التأكد من توصيل كيبل USB.\n2. التأكد من وجود ورق حراري بالاتجاه الصحيح.\n3. تعيين الطابعة كطابعة افتراضية (Default Printer) في لوحة تحكم ويندوز."],
        ["درج الكاش لا يفتح كهربائياً", "1. التأكد من توصيل كيبل RJ11 الصغير في منفذ الدرج خلف الطابعة الحرارية.\n2. التأكد من أن الطابعة قيد التشغيل (الدرج يستمد النبضة من الطابعة).\n3. مراجعة كبسة الاختصار المحددة في إعدادات النظام."],
        ["قارئ الباركود لا يدرج الصنف تلقائياً", "1. مسح باركود التهيئة (Enter / Carriage Return Suffix) المرفق مع دليل القارئ.\n2. التأكد من أن مؤشر الفأرة مستقر في حقل البحث أو الباركود في النظام."],
        ["نسيان الرمز السري (PIN) لأحد الموظفين", "يقوم المدير بالدخول بحساب الإدارة، والتوجه لصفحة [الإعدادات] -> [الموظفون]، والنقر على تعديل لتعيين رمز PIN جديد للموظف فوراً."]
    ]
    tbl_tr = doc.add_table(rows=5, cols=2)
    format_corporate_table(
        tbl_tr,
        [Inches(2.4), Inches(4.6)],
        ["العَرَض والمشكلة الفنية", "الإجراء التشخيصي والحل الفوري المعتمد"],
        trouble_data
    )
    
    add_executive_heading(doc, "13.2 جدول الاختصارات السريعة للوحة المفاتيح", level=2)
    
    shortcuts = [
        ["F12 (أو الكبسة المختارة)", "فتح درج الكاش الإلكتروني فوراً من أي شاشة في النظام دون استخدام الماوس"],
        ["F1 / Ctrl + B", "الانتقال الفوري والمباشر لشاشة نقطة البيع (POS) في أوقات الزحام"],
        ["F2 / Ctrl + R", "الانتقال المباشر لورشة الصيانة وتذاكر استلام الأجهزة"],
        ["Enter", "تأكيد إضافة الصنف لسلة المشتريات أو اعتماد البحث السريع"],
        ["Ctrl + P", "إعادة طباعة الفاتورة الحالية أو الإيصال الحراري فورياً"],
        ["Esc", "إغلاق أي نافذة منبثقة أو إلغاء الإجراء والعودة للشاشة السابقة"]
    ]
    tbl_sc = doc.add_table(rows=7, cols=2)
    format_corporate_table(
        tbl_sc,
        [Inches(2.4), Inches(4.6)],
        ["الكبسة في لوحة المفاتيح", "الوظيفة والإجراء الفوري"],
        shortcuts
    )
    
    # Final Executive Endorsement
    sp_f = doc.add_paragraph()
    sp_f.paragraph_format.space_before = Pt(16)
    
    add_formal_box(
        doc,
        "اعتماد وتطوير المنظومة والدعم الفني",
        "تم إعداد وهندسة هذا الدليل التشغيلي القياسي ومنظومة TIGER SYSTEM بالكامل بواسطة:\nد. ســامــر مـحـمـد (Dr. Samer Mohammad)\nاستشاري وهندسة برمجيات نقاط البيع والأنظمة الذكية المعتمدة لعام 2026\nكافة الحقوق محفوظة © 2026 TIGER SYSTEM - All Rights Reserved.",
        box_style="highlight"
    )
    
    # Save output files
    primary_out = r"C:\Users\samer\Desktop\دليل_تشغيل_نظام_تايجر_الاحترافي_TIGER_SYSTEM_MANUAL.docx"
    alt_out = r"C:\Users\samer\Desktop\كتيب_تعليمات_نظام_تايجر_TIGER_Manual_A_to_Z.docx"
    
    print(f"Saving primary handbook to: {primary_out} ...")
    doc.save(primary_out)
    
    try:
        print(f"Updating existing handbook: {alt_out} ...")
        doc.save(alt_out)
        print("Updated existing file successfully.")
    except Exception as e:
        print(f"Note on existing file: {e} (User likely has it open in MS Word). Primary file saved successfully.")
        
    print("Done! Elite manual successfully generated.")

if __name__ == '__main__':
    main()
