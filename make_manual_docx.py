# -*- coding: utf-8 -*-
"""
TIGER System - Comprehensive User Manual (A to Z)
Generates a highly styled, professional Word document (.docx)
Architected & Developed by Dr. Samer Mohammad
"""

import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def set_rtl(p):
    """Set right-to-left direction on a paragraph"""
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

def set_ltr(p):
    """Set left-to-right direction on a paragraph"""
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '0')
    pPr.append(bidi)

def set_cell_background(cell, hex_color):
    """Set background color of a table cell"""
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    """Set internal padding in cell in twips (1 pt = 20 twips)"""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_rtl(table):
    """Make the whole table RTL in Word"""
    tblPr = table._tbl.tblPr
    bidiVisual = OxmlElement('w:bidiVisual')
    tblPr.append(bidiVisual)

def add_callout(doc, title, text, box_type='note'):
    """Add a professional styled callout box in RTL"""
    colors = {
        'note': {'bg': 'FFF7ED', 'border': 'EA580C', 'icon': '💡 ملحوظة هامة: '},
        'tip': {'bg': 'F0FDF4', 'border': '16A34A', 'icon': '✨ نصيحة احترافية: '},
        'warning': {'bg': 'FEF2F2', 'border': 'DC2626', 'icon': '⚠️ تنبيه أمني / نظام: '},
        'law': {'bg': 'F8FAFC', 'border': '0284C7', 'icon': '⚖️ بند قانوني معتمد: '}
    }
    cfg = colors.get(box_type, colors['note'])
    
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(table)
    cell = table.cell(0, 0)
    set_cell_background(cell, cfg['bg'])
    set_cell_margins(cell, top=160, bottom=160, left=220, right=220)
    
    # Border on right (RTL accent)
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="single" w:sz="36" w:space="0" w:color="{cfg["border"]}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.25
    
    run_t = p.add_run(cfg['icon'] + title + '\n')
    run_t.font.bold = True
    run_t.font.size = Pt(11.5)
    run_t.font.name = 'Arial'
    if box_type == 'note':
        run_t.font.color.rgb = RGBColor(234, 88, 12)
    elif box_type == 'tip':
        run_t.font.color.rgb = RGBColor(22, 163, 74)
    elif box_type == 'warning':
        run_t.font.color.rgb = RGBColor(220, 38, 38)
    else:
        run_t.font.color.rgb = RGBColor(2, 132, 199)
        
    run_body = p.add_run(text)
    run_body.font.size = Pt(10.5)
    run_body.font.name = 'Arial'
    run_body.font.color.rgb = RGBColor(51, 65, 85)
    
    # Space after table
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

def format_styled_table(table, col_widths, headers, data):
    """Format an Arabic RTL table with headers and alternating row shading"""
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(table)
    
    # Format header row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], '1E293B') # Dark Navy
        set_cell_margins(hdr_cells[i], top=140, bottom=140, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        set_rtl(p)
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.runs[0].font.bold = True
        p.runs[0].font.size = Pt(10.5)
        p.runs[0].font.name = 'Arial'
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        
    # Data rows
    for r_idx, row_values in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_col = 'F8FAFC' if r_idx % 2 == 1 else 'FFFFFF'
        for c_idx, val in enumerate(row_values):
            row_cells[c_idx].text = val
            set_cell_background(row_cells[c_idx], bg_col)
            set_cell_margins(row_cells[c_idx], top=120, bottom=120, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            set_rtl(p)
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p.runs[0].font.size = Pt(10)
            p.runs[0].font.name = 'Arial'
            p.runs[0].font.color.rgb = RGBColor(30, 41, 59)
            
    # Set widths
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

def add_header_styled(doc, text, level=1):
    """Add styled headings with brand colors and RTL"""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.keep_with_next = True
    
    run = p.add_run(text)
    run.font.name = 'Arial'
    run.font.bold = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        run.font.size = Pt(17)
        run.font.color.rgb = RGBColor(234, 88, 12) # Tiger Orange
        
        # Add a stylish thin divider line below chapter titles
        p_line = doc.add_paragraph()
        set_rtl(p_line)
        p_line.paragraph_format.space_before = Pt(0)
        p_line.paragraph_format.space_after = Pt(8)
        r_line = p_line.add_run('━' * 52)
        r_line.font.size = Pt(8)
        r_line.font.color.rgb = RGBColor(253, 186, 116) # Light Orange
    elif level == 2:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        run.font.size = Pt(13.5)
        run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(3)
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor(71, 85, 105) # Slate 600

def add_body_p(doc, text, bold_prefix=None):
    """Add a normal RTL paragraph with optional bold lead text"""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.25
    
    if bold_prefix:
        r_bold = p.add_run(bold_prefix + ' ')
        r_bold.font.bold = True
        r_bold.font.size = Pt(10.5)
        r_bold.font.name = 'Arial'
        r_bold.font.color.rgb = RGBColor(15, 23, 42)
        
    r_text = p.add_run(text)
    r_text.font.size = Pt(10.5)
    r_text.font.name = 'Arial'
    r_text.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_bullet_item(doc, title, desc):
    """Add a bullet point with colored bullet symbol"""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.2
    
    # Bullet marker
    r_bullet = p.add_run('🔹 ')
    r_bullet.font.size = Pt(9.5)
    
    r_title = p.add_run(title + ': ')
    r_title.font.bold = True
    r_title.font.size = Pt(10.5)
    r_title.font.name = 'Arial'
    r_title.font.color.rgb = RGBColor(15, 23, 42)
    
    r_desc = p.add_run(desc)
    r_desc.font.size = Pt(10)
    r_desc.font.name = 'Arial'
    r_desc.font.color.rgb = RGBColor(71, 85, 105)

def main():
    print("Initializing document...")
    doc = Document()
    
    # Set page margins (1 inch)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.9)
        section.bottom_margin = Inches(0.9)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        
        # Configure Header & Footer
        footer = section.footer
        p_ftr = footer.paragraphs[0]
        set_rtl(p_ftr)
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_ftr = p_ftr.add_run("نظام تايجر لإدارة المحلات والصيانة • كتيب الاستخدام الشامل • تطوير د. سامر محمد © 2026")
        r_ftr.font.size = Pt(8.5)
        r_ftr.font.name = 'Arial'
        r_ftr.font.color.rgb = RGBColor(148, 163, 184)
        
    # =========================================================================
    # 1. COVER PAGE (صفحة الغلاف الأنيقة)
    # =========================================================================
    logo_path = r"c:\Users\samer\Desktop\Tiger System\public\logo.png"
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(20)
        p_logo.paragraph_format.space_after = Pt(15)
        run_logo = p_logo.add_run()
        run_logo.add_picture(logo_path, width=Inches(2.5))
        
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(10)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("نـظـام تـايـجـر المـعـتـمـد (TIGER SYSTEM)")
    r_title.font.bold = True
    r_title.font.size = Pt(26)
    r_title.font.name = 'Arial'
    r_title.font.color.rgb = RGBColor(234, 88, 12) # Tiger Orange
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(2)
    p_sub.paragraph_format.space_after = Pt(18)
    r_sub = p_sub.add_run("الإصدار المكتبي الاحترافي لإدارة نقاط البيع، الصيانة الذكية، والمخزون\nPOS, Inventory & Smart Repair Management System")
    r_sub.font.size = Pt(12)
    r_sub.font.name = 'Arial'
    r_sub.font.color.rgb = RGBColor(71, 85, 105)
    
    # Cover Box with Author & Version Information
    cov_table = doc.add_table(rows=1, cols=1)
    cov_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(cov_table)
    c_cell = cov_table.cell(0, 0)
    set_cell_background(c_cell, 'FFF7ED')
    set_cell_margins(c_cell, top=220, bottom=220, left=240, right=240)
    
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="18" w:space="0" w:color="FDBA74"/>'
        f'<w:left w:val="single" w:sz="18" w:space="0" w:color="FDBA74"/>'
        f'<w:bottom w:val="single" w:sz="18" w:space="0" w:color="FDBA74"/>'
        f'<w:right w:val="single" w:sz="36" w:space="0" w:color="EA580C"/>'
        f'</w:tcBorders>'
    )
    c_cell._tc.get_or_add_tcPr().append(tcBorders)
    
    cp = c_cell.paragraphs[0]
    set_rtl(cp)
    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cp.paragraph_format.line_spacing = 1.4
    
    r1 = cp.add_run("📖 دَلِيلُ الْمُسْتَخْدِمِ الشَّامِلِ وَكُتَيِّبُ التَّعْلِيمَاتِ (مِنَ الأَلِفِ إِلَى الْيَاءِ)\n")
    r1.font.bold = True
    r1.font.size = Pt(14)
    r1.font.color.rgb = RGBColor(194, 65, 12)
    
    r2 = cp.add_run("تَمَّ تَصْمِيمُ وَتَطْوِيرُ النِّظَامِ بِالْكَامِلِ بِوَاسِطَةِ: ")
    r2.font.size = Pt(11.5)
    r2.font.color.rgb = RGBColor(30, 41, 59)
    
    r3 = cp.add_run("د. ســامــر مـحـمـد (Dr. Samer Mohammad)\n")
    r3.font.bold = True
    r3.font.size = Pt(13)
    r3.font.color.rgb = RGBColor(234, 88, 12)
    
    r4 = cp.add_run("الإصدار: v1.0.0 Stable | الإصدار المعتمد لعام 2026\nقاعدة بيانات محلية فائقة الأمان ومحمية بالكامل 100% Offline")
    r4.font.size = Pt(10)
    r4.font.color.rgb = RGBColor(100, 116, 139)
    
    doc.add_page_break()
    
    # =========================================================================
    # 2. الفهرس وجدول المحتويات (TABLE OF CONTENTS)
    # =========================================================================
    add_header_styled(doc, "فـهـرس الـمـحـتـويـات (دليل سريع لكافة الفصول)", level=1)
    
    toc_data = [
        ["الفصل الأول", "مقدمة عامة، التثبيت والتشغيل الأول ومتطلبات النظام", "البداية السريعة وإعداد بيئة العمل"],
        ["الفصل الثاني", "إدارة المستخدمين، الصلاحيات، وتسجيل الدخول بالـ PIN", "المدير، الموظفون، حماية الخصوصية"],
        ["الفصل الثالث", "شاشة نقطة البيع المباشرة (POS) ومبيعات الباركود", "بيع الأجهزة، الإكسسوارات، والقطع"],
        ["الفصل الرابع", "خيارات الدفع، الدفع المركب (Split)، والبيع الآجل (الذمم)", "كاش، كليك، فيزا، وجدولة المتبقي"],
        ["الفصل الخامس", "نظام إدارة قسم الصيانة واستلام الأجهزة المتقدم", "سندات الاستلام، الحالات، وقطع الغيار"],
        ["الفصل السادس", "منظومة إشعارات واتساب الفورية بنقرة واحدة (WhatsApp API)", "إشعار الجاهزية، والفاتورة للعميل"],
        ["الفصل السابع", "إدارة المخزون والمستودع ومنبهات النواقص الحرجة (Alerts)", "تنبيه وميضي للقطع (أقل من 2)"],
        ["الفصل الثامن", "حركة الصندوق اليومي وفتح درج الكاش باختصار الكيبورد", "اختصار الكيبورد (F12) وتقفيل الشفت"],
        ["الفصل التاسع", "كشف حسابات الزبائن، وسندات القبض، وتحصيل الديون", "إدارة الذمم المدينة وكشوف الحساب"],
        ["الفصل العاشر", "التقارير المالية، الأرباح الحقيقية، والتحليلات البيانية", "المبيعات، تكلفة البضاعة، وصافي الربح"],
        ["الفصل الحادي عشر", "إعدادات النظام، العملة، النسخ الاحتياطي، والتحديثات", "النسخ لفلاشة USB، وتحديث GitHub"],
        ["الفصل الثاني عشر", "اتفاقية الاستخدام الرسمية والشروط القانونية (مهلة 40 يوماً)", "إخلاء المسؤولية وسياسة الأمان"],
        ["الفصل الثالث عشر", "جدول اختصارات الكيبورد السريعة والأسئلة الشائعة (FAQ)", "استكشاف الأعطال وحلولها السريعة"]
    ]
    
    tbl_toc = doc.add_table(rows=len(toc_data) + 1, cols=3)
    format_styled_table(
        tbl_toc,
        [Inches(1.2), Inches(3.6), Inches(2.2)],
        ["الفصل", "موضوع الفصل", "التركيز الرئيسي"],
        toc_data
    )
    
    add_callout(
        doc,
        "إرشاد قراءة الكتيب",
        "تمت كتابة هذا الكتيب بأسلوب تطبيقي مباشر وعملي. يمكنك قراءة الكتيب كاملاً لأول مرة لتدريب كادر المحل، أو استخدام الفهرس أعلاه للوصول مباشرة إلى أي ميزة أو شاشة تريد معرفة أسرار تشغيلها.",
        box_type='tip'
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الأول: مقدمة عامة والتثبيت
    # =========================================================================
    add_header_styled(doc, "الفصل الأول: مقدمة عامة، التثبيت، والتشغيل الأول", level=1)
    
    add_body_p(
        doc,
        "نظام تايجر (TIGER System) هو منظومة متكاملة متخصصة ومصممة من الصفر لتلبية متطلبات محلات ومراكز الهواتف الذكية والصيانة والإكسسوارات. يجمع النظام بين سرعة نقاط البيع الفورية، وقوة محرك تتبع الصيانة الذكي، ودقة الحسابات المالية والديون، مع الحفاظ الكامل على الخصوصية والأمان المحلي.",
        bold_prefix="عن المنظومة:"
    )
    
    add_header_styled(doc, "1. متطلبات التشغيل والمواصفات الموصى بها", level=2)
    add_bullet_item(doc, "نظام التشغيل", "Windows 10 أو Windows 11 (نسخة 64-bit).")
    add_bullet_item(doc, "المعالج (CPU)", "معالج Intel Core i3 أو AMD Ryzen 3 أو أعلى (أي معالج يدعم ويندوز 10/11 بسلاسة).")
    add_bullet_item(doc, "الذاكرة العشوائية (RAM)", "4 جيجابايت كحد أدنى (ويفضل 8 جيجابايت لتعدد المهام وسرعة التقارير).")
    add_bullet_item(doc, "التخزين", "200 ميجابايت فارغة على القرص الصلب (SSD مفضل للسرعة القصوى).")
    add_bullet_item(doc, "الملحقات المدعومة", "طابعات الفواتير الحرارية (80mm و 58mm)، طابعات الباركود، قوارئ الباركود السلكية واللاسلكية، وأدراج الكاش الإلكترونية.")
    
    add_header_styled(doc, "2. طريقة التثبيت والتشغيل", level=2)
    add_body_p(
        doc,
        "يتوفر نظام TIGER بصيغتين لتناسب كافة احتياجات المحل دون أي تعقيد:",
        bold_prefix="خيارات التشغيل:"
    )
    add_bullet_item(doc, "حزمة التثبيت (TIGER-Setup.exe)", "الملف المعتمد للتثبيت على الكمبيوتر، يقوم بإنشاء اختصار رسمي على سطح المكتب وقائمة ابدأ، ويثبت كافة ملفات الربط والاعتماديات تلقائياً بنقرة واحدة.")
    add_bullet_item(doc, "النسخة المحمولة (TIGER.exe)", "نسخة محمولة (Portable) جاهزة للعمل الفوري دون تثبيت، يمكن وضعها على فلاشة USB وتشغيلها على أي جهاز فوراً.")
    
    add_callout(
        doc,
        "حفظ البيانات بنسبة 100% Offline",
        "يعتمد النظام على قاعدة بيانات محلية مشفرة بالكامل على جهازك. لا يتطلب النظام اتصالاً بالإنترنت لإجراء عمليات البيع أو الصيانة، ولا يتم نقل أي أرقام هواتف أو حسابات أو فواتير خارج جهازك نهائياً.",
        box_type='law'
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الثاني: إدارة المستخدمين والصلاحيات
    # =========================================================================
    add_header_styled(doc, "الفصل الثاني: إدارة المستخدمين والصلاحيات وتسجيل الدخول", level=1)
    
    add_body_p(
        doc,
        "يحتوي نظام تايجر على نظام حماية أمني متعدد الرتب، يمنع أي موظف من الوصول إلى أسرار الحسابات، الأرباح، أو تعديل الإعدادات الأساسية دون صلاحيات من المدير.",
        bold_prefix="الأمان المؤسسي:"
    )
    
    add_header_styled(doc, "1. رتب وصلاحيات المستخدمين", level=2)
    roles_data = [
        ["المدير (Admin)", "صلاحية غير مقيدة", "الاطلاع على صافي الأرباح، تكلفة شراء البضاعة، تقارير اليومية والأرباح، حذف وتعديل المستخدمين، وتغيير إعدادات النظام والنسخ الاحتياطي."],
        ["الموظف (Employee)", "صلاحية تشغيلية مقيدة", "البيع عبر الكاشير، استلام وتسليم أجهزة الصيانة، تسجيل دفعات الزبائن، والبحث في المخزون بالأسعار المعتمدة دون إمكانية رؤية أسعار الشراء أو الأرباح."]
    ]
    tbl_roles = doc.add_table(rows=3, cols=3)
    format_styled_table(
        tbl_roles,
        [Inches(1.5), Inches(1.8), Inches(3.7)],
        ["الرتبة", "مستوى الصلاحية", "المهام المسموحة والمحظورة"],
        roles_data
    )
    
    add_header_styled(doc, "2. تسجيل الدخول بالرمز السري (PIN Code)", level=2)
    add_body_p(
        doc,
        "يتم تسجيل الدخول أو التبديل بين كادر العمل بواسطة رمز سري (PIN) مكون من 4 أو 6 أرقام. عند بدء تشغيل النظام لأول مرة، يكون حساب المدير الافتراضي مهيأً، ويمكنك فوراً من صفحة الإعدادات تعديل الرمز السري وإضافة أسماء كادر المحل وأرقام هواتفهم ورموز الـ PIN الخاصة بكل موظف.",
        bold_prefix="سرعة التبديل بين الكاشيرات:"
    )
    
    add_callout(
        doc,
        "نصيحة أمنية هامة لتسجيل الدخول",
        "تأكد دائماً من عدم مشاركة رمز الـ PIN الخاص بحساب المدير مع موظفي الكاشير أو الصيانة. إذا اضطررت لمغادرة المحل لفترة قصيرة، انقر على زر القفل في الشريط العلوي لتأمين الشاشة بنقرة واحدة.",
        box_type='warning'
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الثالث: شاشة البيع ونقطة البيع السريعة
    # =========================================================================
    add_header_styled(doc, "الفصل الثالث: شاشة نقطة البيع السريعة (POS)", level=1)
    
    add_body_p(
        doc,
        "تم تصميم واجهة نقطة البيع في تايجر لتمنح الكاشير سرعة فائقة في أوقات الذروة، مع مرونة تامة في التعامل مع الباركود، المنتجات السريعة، وأجهزة الهواتف الذكية.",
        bold_prefix="تجربة الكاشير:"
    )
    
    add_header_styled(doc, "1. خطوات إتمام فاتورة بيع جديدة", level=2)
    add_bullet_item(doc, "إضافة صنف عبر الباركود", "وجّه قارئ الباركود على المنتج، وسيقوم النظام فوراً بإدراجه في سلة المشتريات مع إصدار نغمة تأكيد مسموعة.")
    add_bullet_item(doc, "البحث السريع بالاسم أو الصنف", "اكتب حرفين أو ثلاثة من اسم القطعة (مثال: 'شاحن 20w' أو 'كفر شفاف') واضغط Enter ليتم إدراج الصنف مباشرة.")
    add_bullet_item(doc, "تعديل الكميات والأسعار", "يمكن زيادة الكمية عبر أزرار (+ و -) أو كتابتها يدوياً، كما يمكن للمدير تعديل السعر النهائي عند الحاجة.")
    add_bullet_item(doc, "تطبيق الخصم (Discount)", "يتيح النظام خيارين للخصم: إما خصم مبلغ محدد (مثال: خصم 2 د.أ) أو نسبة مئوية (مثال: خصم 10%).")
    add_bullet_item(doc, "اختيار العميل", "بشكل افتراضي تسجل الفاتورة باسم 'زبون نقدي'. إذا كان العميل مسجلاً أو يريد فاتورة باسمه، اكتب اسمه للبحث عنه أو انقر زر (+) لإضافته برقم هاتفه فوراً.")
    
    add_header_styled(doc, "2. مبيعات الهواتف الذكية (تسجيل IMEI)", level=2)
    add_body_p(
        doc,
        "عند بيع جهاز هاتف ذكي (سواء كان جديداً أو مستعملاً)، يطلب النظام إدخال الرقم التسلسلي (IMEI) وتفاصيل بطاقة الضمان، ليتم طباعتها رسمياً على فاتورة العميل لضمان حقوق المحل والعميل في حال المراجعة أو الفحص الفني.",
        bold_prefix="توثيق الأجهزة المبيعة:"
    )
    
    add_callout(
        doc,
        "الطباعة الحرارية السريعة وفواتير A4",
        "يدعم النظام الطباعة الفورية على الورق الحراري (Thermal Receipts) مقاس 80 ملم أو 58 ملم متضمناً اسم المحل، اللوجو، تفاصيل الأصناف، رمز QR للفاتورة، والشروط والسياسات المعتمدة.",
        box_type='tip'
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الرابع: خيارات الدفع المركب والجزئي والآجل
    # =========================================================================
    add_header_styled(doc, "الفصل الرابع: الدفع المركب، كليك، والبيع الآجل (الذمم)", level=1)
    
    add_body_p(
        doc,
        "حل النظام مشكلة شائعة جداً في محلات الهواتف: تنوع طرق دفع العميل (جزء كاش وجزء كليك وجزء فيزا، أو دفع جزء وتأجيل جزء آخر).",
        bold_prefix="المرونة المالية الكاملة:"
    )
    
    add_header_styled(doc, "1. أزرار الدفع السريع والجاهز", level=2)
    add_bullet_item(doc, "نقداً بالكامل (Cash)", "دفع كامل قيمة الفاتورة نقداً بنقرة زر واحدة وإصدار الفاتورة فوراً.")
    add_bullet_item(doc, "تحويل إلكتروني كليك (CliQ)", "تسجيل الدفع كاملاً كحوالة بنكية CliQ وربطها برقم المرجع المصرفي.")
    add_bullet_item(doc, "بطاقة بنكية / فيزا (Card)", "دفع كامل الفاتورة عبر جهاز الـ POS البنكي.")
    
    add_header_styled(doc, "2. الدفع المركب الذكي (Split Payment)", level=2)
    add_body_p(
        doc,
        "عند فتح نافذة الدفع، يوفر النظام أزرار توزيع ذكية معدة مسبقاً توفر وقت الحسابات:",
        bold_prefix="أزرار التوزيع الفوري:"
    )
    add_bullet_item(doc, "زر (نصف كاش + نصف CliQ)", "يقسم المبلغ تلقائياً 50% نقد و50% كليك.")
    add_bullet_item(doc, "زر (نصف كاش + نصف فيزا)", "يقسم المبلغ تلقائياً بالتساوي بين الكاش والبطاقة.")
    add_bullet_item(doc, "زر (أثلاث متساوية)", "يقسم إجمالي الفاتورة على الطرق الثلاث (كاش، كليك، فيزا).")
    add_bullet_item(doc, "زر (+ الباقي)", "عند كتابة أي مبلغ دفعه العميل كاش (مثلاً 20 دينار)، انقر على زر '+ الباقي' بجانب خانة كليك ليقوم النظام بحساب وإدراج المتبقي تلقائياً دون أي حسابات ذهنية.")
    
    add_header_styled(doc, "3. الدفع الجزئي والبيع الآجل (دفع جزء وتبقى جزء)", level=2)
    add_body_p(
        doc,
        "إذا دفع العميل جزءاً من الفاتورة وتبقى في ذمته مبلغ، يفتح النظام تلقائياً لوحة تسجيل الذمة (Debt Panel) لإدراج العميل وتحديد تاريخ الاستحقاق المتفق عليه. يتم تسجيل المبلغ المتبقي فوراً في كشف حساب العميل دون إيقاف عملية البيع، وتصدر الفاتورة موضحة بوضوح: المبلغ الإجمالي، المبلغ المدفوع، والمتبقي بذمة العميل.",
        bold_prefix="إدارة الذمم اللحظية:"
    )
    
    add_callout(
        doc,
        "منع الأخطاء المحاسبية في فواتير الآجل",
        "في حال كان المشتري 'زبون نقدي' عادي، يطلب النظام كتابة اسم العميل ورقم هاتفه قبل حفظ الفاتورة الآجلة، لضمان عدم ضياع أي دين في الهواء ولتتمكن من متابعته لاحقاً عبر كشوف الحسابات ورسائل واتساب.",
        box_type='note'
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الخامس: نظام إدارة الصيانة والأجهزة المستلمة
    # =========================================================================
    add_header_styled(doc, "الفصل الخامس: إدارة قسم الصيانة واستلام الأجهزة المتقدم", level=1)
    
    add_body_p(
        doc,
        "يمثل قسم الصيانة العمود الفقري لمحلات الهواتف. يوفر نظام تايجر إدارة محكمة لكل كرت صيانة من لحظة تسليم الزبون لهاتفه وحتى استلامه وتسديد الحساب.",
        bold_prefix="تنظيم ورشة الصيانة:"
    )
    
    add_header_styled(doc, "1. دورة حياة تذكرة الصيانة (Maintenance Ticket Lifecycle)", level=2)
    
    repair_steps = [
        ["1. قيد الفحص (Pending)", "تسجيل الجهاز فور استلامه من الزبون، مع توثيق ملحقاته (جراب، شريحة، كارت ميموري) والعطل المشتكى منه."],
        ["2. بانتظار الموافقة (Waiting Approval)", "يتم الاتصال بالزبون بعد كشف الفني وإبلاغه بالتكلفة، وتغيير الحالة لانتظار موافقته."],
        ["3. قيد الصيانة (In Progress)", "موافقة العميل والبدء بالعمل الفعلي على الجهاز في ورشة الصيانة."],
        ["4. جاهز للاستلام (Ready)", "تم إصلاح الجهاز وفحصه بنجاح، ويصبح جاهزاً مع إرسال إشعار واتساب فوري للعميل."],
        ["5. تم التسليم والإغلاق (Delivered)", "حضور الزبون، تجربة الجهاز أمامه، استلام المبلغ المتبقي، وإغلاق التذكرة نهائياً."]
    ]
    tbl_rep = doc.add_table(rows=6, cols=2)
    format_styled_table(
        tbl_rep,
        [Inches(2.5), Inches(4.5)],
        ["حالة التذكرة", "الإجراء والهدف العملي"],
        repair_steps
    )
    
    add_header_styled(doc, "2. خصم قطع الغيار تلقائياً وحساب الربح الصافي", level=2)
    add_body_p(
        doc,
        "عند إجراء الصيانة (مثلاً تبديل شاشة iPhone 13)، يمكن للفني اختيار الشاشة من قائمة قطع الغيار في المستودع. يقوم النظام تلقائياً بخصم الشاشة من رصيد المخزون، واحتساب تكلفتها من تكلفة الصيانة لإظهار صافي الربح الحقيقي للمحل بدقة سنتيمترية.",
        bold_prefix="الربط بين الصيانة والمخزون:"
    )
    
    add_callout(
        doc,
        "إيصال استلام الصيانة والشروط القانونية",
        "يطبع النظام إيصال استلام صيانة رسمي يحتوي على الرقم المرجعي للجهاز (Barcode)، وتكلفة التقدير، والدفعة المقدمة إن وجدت، بالإضافة إلى الشرط القانوني الصارم (يحق للمحل التصرف بالجهاز بعد مرور 40 يوماً من تاريخ الإنجاز في حال عدم الاستلام).",
        box_type='law'
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل السادس: إشعارات واتساب الفورية
    # =========================================================================
    add_header_styled(doc, "الفصل السادس: منظومة إشعارات واتساب الفورية (WhatsApp Direct)", level=1)
    
    add_body_p(
        doc,
        "وفر النظام ميزة نوعية لا تتطلب أي اشتراكات شهرية أو ربط خوادم خارجية معقدة: إرسال رسائل وفواتير وإشعارات الصيانة لعملاء المحل بنقرة واحدة عبر تطبيق WhatsApp الرسمي أو WhatsApp Web.",
        bold_prefix="التواصل المباشر مع الزبائن:"
    )
    
    add_header_styled(doc, "1. زر إشعار الصيانة الفوري (بجانب كل جهاز)", level=2)
    add_body_p(
        doc,
        "بجانب كل كرت صيانة في النظام يوجد زر مخصص: [إرسال للواتساب (جاهز)]. عند النقر عليه، يقوم النظام فوراً بفتح محادثة العميل على واتساب مع رسالة جاهزة ومنسقة ومهيأة بالكامل، مثل:",
        bold_prefix="كيف تعمل الميزة:"
    )
    
    add_callout(
        doc,
        "نص رسالة جاهزية الصيانة التلقائية",
        "أهلاً بك زبوننا العزيز (أحمد) 🌹\nيسعدنا إعلامك بأن جهازك (iPhone 13 - أسود) أصبح جاهزاً للاستلام من مركز تايجر موبايل.\nالمبلغ المتبقي: 35.000 د.أ.\nأهلاً وسهلاً بك في أي وقت!",
        box_type='note'
    )
    
    add_header_styled(doc, "2. المعالجة الذكية لأرقام الهواتف الأردنية", level=2)
    add_body_p(
        doc,
        "لا تحتاج لكتابة مفتاح الدولة عند تسجيل زبونك! اكتب الرقم المحلي العادي (مثل 0791234567)، وسيقوم المحرك الذكي في النظام بتحويله تلقائياً لصيغة واتساب الدولية المعتمدة (962791234567) دون أي تدخل منك.",
        bold_prefix="تصحيح الأرقام التلقائي:"
    )
    
    add_header_styled(doc, "3. إرسال فواتير المبيعات وكشوف الحسابات", level=2)
    add_bullet_item(doc, "فاتورة البيع الحرارية", "زر واتساب في شاشة الفاتورة لإرسال ملخص المنتجات والضمان للعميل ورقياً أو إلكترونياً.")
    add_bullet_item(doc, "كشف حساب الذمم", "إرسال ملخص الديون والدفعات المسددة للعميل لتذكيره بمواعيد السداد بأعلى درجات اللباقة.")
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل السابع: إدارة المخزون ومنبهات النواقص الحرجة
    # =========================================================================
    add_header_styled(doc, "الفصل السابع: إدارة المخزون والمستودع ومنبهات النواقص الحرجة", level=1)
    
    add_body_p(
        doc,
        "يضمن قسم المخزون في نظام تايجر عدم نفاد أي شاشة، بطارية، أو إكسسوار مهم فجأة، مما يحمي المحل من ضياع فرص البيع أو تعطل الصيانة.",
        bold_prefix="الرقابة الدقيقة على المواد:"
    )
    
    add_header_styled(doc, "1. منبهات النواقص التلقائية (Stock Alert Beacons)", level=2)
    add_body_p(
        doc,
        "يحتوي النظام على رادار ذكي يراقب أرصدة المواد لحظة بلحظة. بمجرد وصول رصيد أي مادة (شاشة، فلاتة، بطارية، كيبل شحن) إلى قطعتين أو أقل (<= 2)، تظهر الإشارات الآتية فوراً:",
        bold_prefix="كيف ينبهك النظام قبل النفاد:"
    )
    add_bullet_item(doc, "وميض جرس الإشعارات العلوي", "يومض جرس الإشعارات في أعلى الشاشة بنبض راداري أحمر ساطع ومتحرك يلفت انتباه الكاشير والمدير فوراً.")
    add_bullet_item(doc, "قائمة النواقص المنبثقة", "بالنقر على الجرس، تظهر قائمة بكافة القطع الحرجة التي شارفت على النفاد مع رصيدها الحالي واسم الصنف.")
    add_bullet_item(doc, "زر النسخ للواتساب بنقرة واحدة", "زر مخصص داخل القائمة يقوم بنسخ كافة النواقص بصيغة رسالة مرتبة لإرسالها فوراً لمورد قطع الغيار أو التاجر عبر واتساب.")
    add_bullet_item(doc, "فلتر النواقص الحرجة في المخزون", "زر فلترة سريع في جدول الإكسسوارات يفرز بنقرة واحدة فقط المواد التي رصيدها قطعتين أو أقل لسرعة الجرد والطلب.")
    
    add_header_styled(doc, "2. جرد الأصناف وتعديل الأسعار", level=2)
    add_body_p(
        doc,
        "يمكنك في أي وقت تحديث كميات المخزون، أو تعديل أسعار التكلفة وأسعار البيع، أو طباعة باركود خاص للمنتجات التي لا تحتوي على باركود مصنعي لسهولة مسحها ضوئياً عند البيع.",
        bold_prefix="مرونة التحديث:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الثامن: حركة الصندوق اليومي وفتح درج الكاش
    # =========================================================================
    add_header_styled(doc, "الفصل الثامن: حركة الصندوق اليومي واختصار فتح درج الكاش", level=1)
    
    add_body_p(
        doc,
        "يوفر النظام ضبطاً صارماً لكل فلس يدخل أو يخرج من درج المحل، مع إمكانية فتح الدرج باختصار لوحة المفاتيح دون لمس الماوس.",
        bold_prefix="إدارة التدفق المالي:"
    )
    
    add_header_styled(doc, "1. اختصار لوحة المفاتيح لفتح درج الكاش (Cash Drawer Shortcut)", level=2)
    add_body_p(
        doc,
        "بناءً على طلب أصحاب المحلات لتسريع العمل، يمكنك تعيين أي كبسة في الكيبورد لتفتح درج الكاش فوراً بمجرد الضغط عليها من أي مكان في النظام.",
        bold_prefix="الفتح الفوري:"
    )
    add_bullet_item(doc, "الكبسة الافتراضية", "تم ضبط الكبسة تلقائياً على زر (F12) في الكيبورد.")
    add_bullet_item(doc, "تخصيص أي كبسة أخرى", "من صفحة [الإعدادات] -> [درج الكاش]، انقر على 'تعيين كبسة جديدة' ثم اضغط على أي كبسة تفضلها في الكيبورد (مثال: F9، F8، Space، أو أي زر تريده)، وسيقوم النظام بحفظها فوراً.")
    add_bullet_item(doc, "زر تجربة الفتح", "يوجد زر مباشر لاختبار استجابة الدرج والتأكد من سلامة التوصيل بالطابعة.")
    
    add_header_styled(doc, "2. دورة اليومية والشفت (Cash Shifts)", level=2)
    add_bullet_item(doc, "افتتاح الشفت (Shift Opening)", "تسجيل رصيد بداية الدرج (الفكة / الصرافة) قبل بدء عمليات البيع.")
    add_bullet_item(doc, "المصروفات النثرية (Expenses)", "تسجيل أي مصروف نثري للمحل (فواتير كهرباء، ضيافة، أدوات نظافة) مع تحديد السبب لخصمه من صافي الدرج.")
    add_bullet_item(doc, "إغلاق الشفت (Shift Closing)", "في نهاية الدوام، يقوم الكاشير بإدخال المبلغ النقدي الموجود فعلياً بالدرج. يقوم النظام بمقارنته مع المبيعات المسجلة وإظهار أي زيادة أو نقص بدقة بالغة وطباعة تقرير إغلاق الشفت الحراري.")
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل التاسع: كشف الحسابات والذمم وسندات القبض
    # =========================================================================
    add_header_styled(doc, "الفصل التاسع: كشف حسابات الزبائن، والذمم، وسندات القبض", level=1)
    
    add_body_p(
        doc,
        "إدارة الديون والذمم المدينة من أصعب التحديات في تجارة الهواتف والصيانة. يحول نظام تايجر هذا العبء إلى عملية آلية سهلة وموثقة بنسبة 100%.",
        bold_prefix="متابعة الذمم وتحصيل الديون:"
    )
    
    add_header_styled(doc, "1. كشف الحساب التفصيلي للعميل", level=2)
    add_body_p(
        doc,
        "لكل عميل مسجل ملف مالي كامل يوضح: إجمالي المشتريات، إجمالي الصيانة، المبالغ المسددة، والرصيد المتبقي بذمته. يمكن استعراض كشف حساب تفصيلي يوضح تواريخ كل عملية ورقم الفاتورة المرتبطة بها.",
        bold_prefix="سجل العمليات:"
    )
    
    add_header_styled(doc, "2. إصدار سند قبض رسمي (Payment Voucher)", level=2)
    add_body_p(
        doc,
        "عندما يحضر العميل لسداد دفعة من حسابه القديم (مثلاً سداد 50 دينار):",
        bold_prefix="خطوات السداد:"
    )
    add_bullet_item(doc, "الخطوة الأولى", "ادخل إلى شاشة الزبائن وابحث عن اسم العميل.")
    add_bullet_item(doc, "الخطوة الثانية", "انقر على زر [قبض دفعة]، واكتب المبلغ المسدد وطريقة القبض (كاش أو كليك).")
    add_bullet_item(doc, "الخطوة الثالثة", "انقر حفظ ليقوم النظام فوراً بخصم المبلغ من ذمة العميل، وإيداعه في صندوق الكاش اليومي، وطباعة سند قبض حراري للعميل يوضح رصيده السابق والمبلغ المقبوض ورصيده المتبقي الجديد.")
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل العاشر: التقارير المالية والإحصائيات
    # =========================================================================
    add_header_styled(doc, "الفصل العاشر: التقارير المالية، الأرباح الحقيقية، والتحليلات", level=1)
    
    add_body_p(
        doc,
        "يوفر النظام لوحة مؤشرات وتحليلات بيانية ذكية (Dashboard & Reports) تمنح صاحب المحل رؤية كاملة لاتخاذ القرارات التجارية السليمة.",
        bold_prefix="ذكاء الأعمال والمحاسبة:"
    )
    
    add_header_styled(doc, "1. أنواع التقارير المتاحة في النظام", level=2)
    rep_types = [
        ["تقرير المبيعات الشامل", "حركة البيع اليومية، الأسبوعية، والشهرية، مع تفصيل طرق الدفع (كاش، كليك، فيزا)."],
        ["تقرير الأرباح الصافية", "حساب المبيعات مطروحاً منها تكلفة الشراء الحقيقية والمصروفات، لإعطاء صافي الربح الفعلي."],
        ["تقرير أداء قسم الصيانة", "عدد الأجهزة المستلمة، المنجزة، قيد الفحص، وصافي أرباح أجور الصيانة وقطع الغيار."],
        ["تقرير الأصناف الأكثر مبيعاً", "ترتيب المواد والإكسسوارات الأكثر طلباً لمعرفة ما يجب إعادة شرائه وتكثيفه."],
        ["تقرير حركة الصندوق والمصاريف", "سجل كامل لكافة المبالغ النثرية المسحوبة من الدرج مع أسماء الموظفين والتواريخ."]
    ]
    tbl_rep_types = doc.add_table(rows=6, cols=2)
    format_styled_table(
        tbl_rep_types,
        [Inches(2.5), Inches(4.5)],
        ["اسم التقرير", "محتواه والهدف منه"],
        rep_types
    )
    
    add_header_styled(doc, "2. التصدير والطباعة", level=2)
    add_body_p(
        doc,
        "يمكن طباعة أي تقرير فورياً على الطابعة الحرارية الصغيرة، أو تصديره إلى ملف Excel منظم، أو تصديره بصيغة PDF عالية الدقة لحفظ السجلات أو مشاركتها مع المحاسب المالي.",
        bold_prefix="خيارات الحفظ:"
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الحادي عشر: إعدادات النظام والنسخ الاحتياطي
    # =========================================================================
    add_header_styled(doc, "الفصل الحادي عشر: إعدادات النظام، النسخ الاحتياطي، والتحديثات", level=1)
    
    add_body_p(
        doc,
        "تتميز شاشة الإعدادات الجديدة في تايجر بتصميم فائق الأناقة والنعومة، حيث تم فرز كل قسم في تبويب مستقل لتجنب أي تشتيت.",
        bold_prefix="التحكم الكامل بالمنظومة:"
    )
    
    add_header_styled(doc, "1. تبويبات الإعدادات الأربعة المنفصلة", level=2)
    add_bullet_item(doc, "1. المتجر والعملة (Store & Currency)", "تحديد اسم المحل، الهاتف، العنوان، اختيار العملة (د.أ، JOD، $، أو عملة مخصصة)، تحديد الكسور العشرية (3 خانات للقروش الأردنية أو خانتان)، نسبة الضريبة، وتعيين كبسة اختصار درج الكاش.")
    add_bullet_item(doc, "2. الموظفون (Employees)", "إدارة كادر العمل وتعديل رموز الـ PIN وإضافة وحذف المستخدمين وتحديد صلاحياتهم.")
    add_bullet_item(doc, "3. النسخ الاحتياطي (Backups)", "أخذ نسخة احتياطية فورية للبيانات بنقرة زر، أو تصدير النسخة لمجلد مخصص أو فلاشة USB خارجية، واستعادة البيانات عند الحاجة.")
    add_bullet_item(doc, "4. التحديثات السحابية (Cloud Updates)", "التحقق المباشر من وجود إصدارات جديدة على مستودع GitHub وتثبيت التحديث بنقرة زر دون المساس بقاعدة البيانات السابقة نهائياً.")
    
    add_callout(
        doc,
        "القاعدة الذهبية لأمان بيانات المحل",
        "يُوصى دائماً بأخذ نسخة احتياطية أسبوعية وتصديرها إلى فلاشة USB خارجية والاحتفاظ بها خارج جهاز الكمبيوتر. في حال حدوث أي عطل مفاجئ بنظام الويندوز أو بالقرص الصلب، يمكنك استعادة كافة فواتيرك وحساباتك وزبائنك في أقل من دقيقة واحدة!",
        box_type='warning'
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الثاني عشر: الشروط والسياسات القانونية
    # =========================================================================
    add_header_styled(doc, "الفصل الثاني عشر: اتفاقية الاستخدام والسياسات القانونية", level=1)
    
    add_body_p(
        doc,
        "تم تضمين الشروط والسياسات القانونية والاتفاقية المعتمدة رسمياً داخل النظام وتظهر في إيصالات الصيانة لحماية حقوق المحل من أي نزاع قضائي أو مالي.",
        bold_prefix="الحماية القانونية لمحلك:"
    )
    
    laws_data = [
        ["1. الخصوصية والأمان المحلي (100% Offline)", "جميع سجلات المبيعات، الصيانة، وقواعد البيانات مشفرة ومحفوظة محلياً على القرص الصلب للجهاز فقط، ولا يتم إرسال أو تسريب أي بيانات محاسبية أو أرقام هواتف خارج جهازك نهائياً."],
        ["2. إخلاء مسؤولية الصيانة القانوني (مهلة 40 يوماً)", "يلتزم المحل بإصدار إيصال استلام رسمي لكل جهاز. يعتبر العميل متنازلاً عن جهازه ويحق للمحل التصرف فيه بعد مرور 40 يوماً من تاريخ الإنجاز دون استلام، لتغطية تكاليف قطع الغيار وأجور الفحص."],
        ["3. النسخ الاحتياطي الدوري", "يُوصى بأخذ نسخة احتياطية دورية أسبوعياً على فلاشة USB خارجية لضمان سلامة العمليات والفواتير في حال حدوث أي عطل فني في نظام تشغيل الويندوز."],
        ["4. التحديثات والترقية السحابية", "ترقية النظام عبر GitHub مصممة ذاتياً للحفاظ على سلامة قاعدة البيانات السابقة بالكامل دون المساس بأي فواتير أو حسابات مسجلة مسبقاً."]
    ]
    tbl_laws = doc.add_table(rows=5, cols=2)
    format_styled_table(
        tbl_laws,
        [Inches(2.5), Inches(4.5)],
        ["البند والسياسة القانونية", "التفاصيل القانونية المعتمدة"],
        laws_data
    )
    
    doc.add_page_break()
    
    # =========================================================================
    # الفصل الثالث عشر: اختصارات الكيبورد والأسئلة الشائعة
    # =========================================================================
    add_header_styled(doc, "الفصل الثالث عشر: اختصارات الكيبورد السريعة وحلول المشكلات (FAQ)", level=1)
    
    add_header_styled(doc, "1. جدول اختصارات لوحة المفاتيح السريعة", level=2)
    shortcuts_data = [
        ["F12 (أو الكبسة المختارة)", "فتح درج الكاش الإلكتروني فوراً من أي شاشة"],
        ["F1 / Ctrl + B", "الانتقال المباشر لشاشة نقطة البيع (POS)"],
        ["F2 / Ctrl + R", "الانتقال السريع لورشة الصيانة وتذاكر الأجهزة"],
        ["Enter", "إدراج الصنف أو تأكيد السعر في سلة البيع"],
        ["Ctrl + P", "طباعة الفاتورة الحالية أو الإيصال الحراري"],
        ["Esc", "إلغاء النافذة المنبثقة أو العودة للشاشة السابقة"]
    ]
    tbl_sc = doc.add_table(rows=7, cols=2)
    format_styled_table(
        tbl_sc,
        [Inches(2.5), Inches(4.5)],
        ["الكبسة في لوحة المفاتيح", "الوظيفة والإجراء الفوري"],
        shortcuts_data
    )
    
    add_header_styled(doc, "2. الأسئلة الشائعة واستكشاف الأعطال (Troubleshooting)", level=2)
    
    add_bullet_item(doc, "س: الطابعة الحرارية لا تطبع الفاتورة؟", "ج: تأكد من توصيل كيبل USB وتشغيل الطابعة، ثم تأكد من تعيين الطابعة كـ 'Default Printer' في إعدادات الويندوز، وتأكد من وجود ورق حراري بالاتجاه الصحيح.")
    add_bullet_item(doc, "س: درج الكاش لا يفتح كهربائياً؟", "ج: تأكد من توصيل سلك الدرج (كيبل RJ11 الصغير مثل سلك الهاتف) في المنفذ المخصص خلف طابعة الفواتير الحرارية.")
    add_bullet_item(doc, "س: كيف أقوم بنقل النظام لجهاز كمبيوتر آخر جديد؟", "ج: من جهازك القديم: اذهب للإعدادات -> النسخ الاحتياطي -> خذ نسخة على فلاشة USB. في الجهاز الجديد: ثبّت برنامج TIGER، ثم ادخل للإعدادات واضغط 'استعادة من ملف' واختر نسختك؛ ستعود كافة بياناتك في ثوانٍ معدودة.")
    add_bullet_item(doc, "س: نسيت رمز الـ PIN لحساب الموظف؟", "ج: يمكن للمدير الدخول بحساب المدير والذهاب لقسم الموظفين في الإعدادات وتعيين رمز PIN جديد للموظف فوراً.")
    
    # Final Sign-off Box
    sp_end = doc.add_paragraph()
    sp_end.paragraph_format.space_before = Pt(15)
    
    add_callout(
        doc,
        "خاتمة ودعم فني",
        "تم بحمد الله إعداد هذا الكتيب ليكون مرجعاً متكاملاً لكافة أعمال محلك اليومية. نتمنى لكم تجارة رابحة وتطوراً مستمراً مع نظام TIGER.\n\nتطوير وهندسة النظام: د. سامر محمد (Dr. Samer Mohammad)\nجميع الحقوق محفوظة © 2026",
        box_type='tip'
    )
    
    # Save output to Desktop
    out_path = r"C:\Users\samer\Desktop\كتيب_تعليمات_نظام_تايجر_TIGER_Manual_A_to_Z.docx"
    print(f"Saving manual to: {out_path} ...")
    doc.save(out_path)
    print("Done! Handbook successfully generated.")

if __name__ == '__main__':
    main()
