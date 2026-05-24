import os
import json
import logging
from pathlib import Path
from typing import Optional
import markdown
import weasyprint
from app.config import settings

logger = logging.getLogger(__name__)

def compile_course_to_pdf(course_id: str) -> Optional[bytes]:
    """
    Concatenates all course modules in chronological order and compiles them into a premium PDF using WeasyPrint.
    Supports modern CSS layout, paged media, page breaks, elegant tables, and styled code blocks.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    toc_path = course_dir / "toc.json"
    
    if not toc_path.exists():
        logger.error(f"Table of contents not found for course: {course_id}")
        return None
        
    try:
        with open(toc_path, "r", encoding="utf-8") as f:
            toc = json.load(f)
            
        course_title = toc.get("title", "Cours Académique")
        course_description = toc.get("description", "Généré via SelfLearned")
        
        # We start building the complete HTML string
        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    /* Google Fonts import */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {{
        size: A4;
        margin: 2.5cm 2cm 2.5cm 2cm;
        @bottom-right {{
            content: "Page " counter(page) " / " counter(pages);
            font-family: 'Inter', sans-serif;
            font-size: 8pt;
            color: #64748b;
        }}
        @bottom-left {{
            content: "{course_title} — SelfLearned";
            font-family: 'Inter', sans-serif;
            font-size: 8pt;
            color: #94a3b8;
        }}
    }}
    
    /* Cover page has no headers/footers */
    @page :first {{
        @bottom-right {{ content: normal; }}
        @bottom-left {{ content: normal; }}
    }}
    
    body {{
        font-family: 'Lora', 'Georgia', serif;
        color: #1e293b;
        line-height: 1.7;
        font-size: 11pt;
    }}
    
    h1, h2, h3, h4, .cover-title, .cover-subtitle, .cover-footer, pre, code {{
        font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    }}
    
    /* Cover Page styling */
    .cover-page {{
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        height: 100vh;
        page-break-after: always;
        padding: 2cm 0;
    }}
    
    .cover-header {{
        margin-bottom: auto;
        font-size: 10pt;
        color: #3b82f6;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 2px;
    }}
    
    .cover-title {{
        font-size: 34pt;
        color: #0f172a;
        margin-top: auto;
        margin-bottom: 20px;
        font-weight: 800;
        line-height: 1.2;
    }}
    
    .cover-subtitle {{
        font-size: 14pt;
        color: #64748b;
        margin-bottom: 40px;
        text-transform: uppercase;
        letter-spacing: 3px;
        font-weight: 500;
    }}
    
    .cover-divider {{
        width: 120px;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6, #6366f1);
        border: none;
        margin: 0 auto 40px auto;
        border-radius: 2px;
    }}
    
    .cover-description {{
        font-size: 12pt;
        color: #475569;
        max-width: 550px;
        margin: 0 auto;
        line-height: 1.8;
        font-style: italic;
    }}
    
    .cover-footer {{
        margin-top: auto;
        font-size: 9pt;
        color: #94a3b8;
        letter-spacing: 1px;
    }}
    
    .page-break {{
        page-break-before: always;
    }}
    
    /* Markdown Element Styles */
    h1 {{
        font-size: 24pt;
        color: #0f172a;
        margin-top: 40px;
        margin-bottom: 20px;
        font-weight: 700;
        border-bottom: 2px solid #f1f5f9;
        padding-bottom: 10px;
        page-break-after: avoid;
    }}
    
    h2 {{
        font-size: 16pt;
        color: #1e293b;
        margin-top: 35px;
        margin-bottom: 15px;
        font-weight: 600;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 6px;
        page-break-after: avoid;
    }}
    
    h3 {{
        font-size: 13pt;
        color: #334155;
        margin-top: 25px;
        margin-bottom: 10px;
        font-weight: 600;
        page-break-after: avoid;
    }}
    
    p {{
        margin-bottom: 18px;
        text-align: justify;
    }}
    
    ul, ol {{
        margin-bottom: 18px;
        padding-left: 25px;
    }}
    
    li {{
        margin-bottom: 8px;
    }}
    
    /* Elegant Code block blocks styled for premium look */
    pre {{
        background-color: #0f172a;
        border: 1px solid #1e293b;
        padding: 16px;
        margin-bottom: 20px;
        font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
        font-size: 9pt;
        color: #f8fafc;
        border-radius: 8px;
        overflow-x: auto;
        line-height: 1.5;
        page-break-inside: avoid;
    }}
    
    code {{
        font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
        font-size: 9.5pt;
        background-color: #f1f5f9;
        color: #0f172a;
        padding: 3px 6px;
        border-radius: 4px;
        font-weight: 500;
    }}
    
    pre code {{
        background-color: transparent;
        color: inherit;
        padding: 0;
        border-radius: 0;
        font-weight: normal;
    }}
    
    blockquote {{
        border-left: 4px solid #3b82f6;
        background-color: #f0f9ff;
        padding: 14px 20px;
        margin: 0 0 20px 0;
        color: #1e40af;
        border-radius: 0 8px 8px 0;
        font-style: italic;
        page-break-inside: avoid;
    }}
    
    /* Elegant Tables styled properly */
    table {{
        width: 100%;
        border-collapse: collapse;
        margin-top: 25px;
        margin-bottom: 25px;
        page-break-inside: avoid;
    }}
    
    th {{
        background-color: #f8fafc;
        border-bottom: 2px solid #e2e8f0;
        padding: 12px 14px;
        font-weight: 600;
        text-align: left;
        color: #0f172a;
        font-size: 10pt;
    }}
    
    td {{
        border-bottom: 1px solid #f1f5f9;
        padding: 12px 14px;
        color: #334155;
        font-size: 10pt;
    }}
    
    tr:nth-child(even) {{
        background-color: #fafafa;
    }}
    
    .module-header-page {{
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        page-break-after: always;
    }}
</style>
</head>
<body>

<div class="cover-page">
    <div class="cover-header">Self-Hosted Academy</div>
    <div class="cover-title">{course_title}</div>
    <div class="cover-subtitle">Cours Académique Complet</div>
    <hr class="cover-divider" />
    <div class="cover-description">{course_description}</div>
    <div class="cover-footer">Généré par SelfLearned &bull; Technologie AI-Driven</div>
</div>

"""

        # Setup Markdown parser with extensions
        md_parser = markdown.Markdown(extensions=["fenced_code", "tables"])
        
        modules = toc.get("modules", [])
        for m_index, m in enumerate(modules):
            module_id = m.get("id")
            module_title = m.get("title")
            
            # Module separator page using modern layout
            html_content += f"""
<div class="module-header-page">
    <div style="font-size: 12pt; color: #3b82f6; text-transform: uppercase; letter-spacing: 3px; font-weight: 600; margin-bottom: 15px;">Module {m_index + 1}</div>
    <h2 style="border: none; font-size: 26pt; color: #0f172a; font-weight: 800; margin: 0; max-width: 600px; line-height: 1.3;">{module_title}</h2>
</div>
"""
            
            # Get submodules inside this module
            submodules = m.get("submodules", [])
            for sm_index, sm in enumerate(submodules):
                sm_id = sm.get("id")
                sm_title = sm.get("title")
                sm_file = sm.get("file")
                
                # Check for module file
                sm_path = course_dir / module_id / sm_file
                if sm_path.exists():
                    with open(sm_path, "r", encoding="utf-8") as f:
                        md_text = f.read()
                        
                    sm_html = md_parser.convert(md_text)
                    
                    html_content += f"""
<div class="submodule-section">
    {sm_html}
</div>
<div class="page-break"></div>
"""
                else:
                    logger.warning(f"File not found: {sm_path}")
                    
                # Check for associated exercise file
                exo_file = f"exo_{sm_file}"
                exo_path = course_dir / module_id / exo_file
                if exo_path.exists():
                    with open(exo_path, "r", encoding="utf-8") as f:
                        exo_md_text = f.read()
                        
                    exo_html = md_parser.convert(exo_md_text)
                    
                    # Exercise starts on its own page
                    html_content += f"""
<div class="exercises-section" style="background-color: #f8fafc; border-left: 6px solid #6366f1; padding: 25px; border-radius: 8px; margin-top: 30px; margin-bottom: 30px; page-break-inside: avoid;">
    {exo_html}
</div>
<div class="page-break"></div>
"""

        # Wrap up HTML
        html_content += """
</body>
</html>
"""
        
        # Step 3: Run WeasyPrint to compile HTML into PDF in memory
        logger.info(f"Compiling PDF for course {course_id} using WeasyPrint...")
        pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
        
        # Save PDF on server disk too for easy access
        pdf_output_path = course_dir / f"{course_id}.pdf"
        with open(pdf_output_path, "wb") as f:
            f.write(pdf_bytes)
            
        logger.info(f"Successfully compiled PDF using WeasyPrint: {pdf_output_path}")
        return pdf_bytes
        
    except Exception as e:
        logger.exception(f"Failed compiling PDF using WeasyPrint for course: {course_id}")
        return None
