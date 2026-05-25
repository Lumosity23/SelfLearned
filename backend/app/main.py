import json
import logging
import uuid
from typing import Dict, Any, List, Optional
from pathlib import Path
import asyncio

# Setup logging before importing custom modules to ensure startup logs are captured
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

from fastapi import FastAPI, BackgroundTasks, HTTPException, Response, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import zipfile
import shutil
from app.pipeline import slugify
from app.llm import generate_toc, fetch_available_models
from app.prompts import load_system_prompt, save_system_prompt, load_prompt_categories, save_prompt_categories, load_system_prompt_templates, save_system_prompt_templates

from app.config import settings
from app.settings_manager import settings_manager
from app.pipeline import run_generation_pipeline, jobs_status
from app.pdf import compile_course_to_pdf

app = FastAPI(
    title="SelfLearned API",
    description="Backend API for local self-hosted course generator powered by LLMs.",
    version="1.0.0"
)

# Enable CORS for the Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_title(title: str) -> str:
    if not title:
        return ""
    import re
    # Remove case-insensitive prefix "Nom du cours :" or variations
    cleaned = re.sub(r'^(?i)nom\s+du\s+cours\s*[:-]\s*', '', title)
    return cleaned.strip()

class GenerateRequest(BaseModel):
    sujet: str = ""
    avec_exercices: bool = False
    profile_id: Optional[str] = None
    model: Optional[str] = None
    custom_toc_markdown: Optional[str] = None
    custom_instructions: Optional[str] = None
    level: Optional[str] = "débutant"
    system_prompt_id: Optional[str] = None

@app.get("/api/courses")
def list_courses():
    """
    List all generated courses on the server disk.
    Reads directories under the configuration DATA_DIR.
    """
    data_dir = settings.get_data_dir()
    courses = []
    
    # Iterate through child directories
    for course_path in data_dir.iterdir():
        if course_path.is_dir() and not course_path.name.startswith("tmp_import_"):
            toc_path = course_path / "toc.json"
            if toc_path.exists():
                try:
                    with open(toc_path, "r", encoding="utf-8") as f:
                        toc_data = json.load(f)
                    
                    total_submodules = 0
                    for m in toc_data.get("modules", []):
                        total_submodules += len(m.get("submodules", []))
                        
                    courses.append({
                        "id": course_path.name,
                        "title": clean_title(toc_data.get("title", course_path.name)),
                        "description": toc_data.get("description", ""),
                        "created_at": course_path.stat().st_mtime,
                        "partial": toc_data.get("partial", False),
                        "status": toc_data.get("status", "completed"),
                        "error": toc_data.get("error", None),
                        "job_id": toc_data.get("job_id", None),
                        "pinned": toc_data.get("pinned", False),
                        "archived": toc_data.get("archived", False),
                        "total_submodules": total_submodules
                    })
                except Exception as e:
                    logger.error(f"Error reading TOC for {course_path.name}: {e}")
                    
    # Sort courses by modified time (newest first), but pinned ones are always first
    courses.sort(key=lambda x: (not x.get("pinned", False), -x["created_at"]))
    return courses


@app.get("/api/graph")
def get_knowledge_graph():
    """
    Scans all course directories and returns nodes (courses) and links (common tags) for the graph representation.
    """
    from app.config import settings
    data_dir = settings.get_data_dir()
    
    nodes = []
    links = []
    
    # 1. Retrieve all courses and their tags
    courses = []
    for entry in data_dir.iterdir():
        if entry.is_dir() and not entry.name.startswith("."):
            toc_path = entry / "toc.json"
            if toc_path.exists():
                try:
                    with open(toc_path, "r", encoding="utf-8") as f:
                        toc = json.load(f)
                    
                    course_id = entry.name
                    title = clean_title(toc.get("title", course_id))
                    description = toc.get("description", "")
                    
                    # Read or heuristically compute tags if missing
                    tags = toc.get("tags")
                    if tags is None:
                        # Apply fast heuristics to classify older courses dynamically
                        heuristics = []
                        combined = (title + " " + description).lower()
                        keywords_map = {
                            "python": "python",
                            "rust": "rust",
                            "javascript": "javascript",
                            "typescript": "typescript",
                            "java": "java",
                            "cpp": "c++",
                            "programmation": "programmation",
                            "quantique": "quantique",
                            "physique": "physique",
                            "chimie": "chimie",
                            "math": "mathématiques",
                            "vulkan": "vulkan",
                            "graphics": "infographie",
                            "3d": "3d",
                            "ia": "intelligence artificielle",
                            "machine learning": "ia",
                            "docker": "docker",
                            "git": "git",
                            "reseau": "réseau",
                            "securite": "sécurité",
                            "data": "data science",
                            "web": "web",
                            "dev": "développement",
                            "react": "react",
                            "node": "node.js",
                            "sql": "base de données",
                            "database": "base de données"
                        }
                        for kw, tag in keywords_map.items():
                            if kw in combined:
                                if tag not in heuristics:
                                    heuristics.append(tag)
                        if not heuristics:
                            heuristics = ["informatique" if any(x in combined for x in ["program", "code", "logiciel"]) else "général"]
                        tags = heuristics
                        
                        # Dynamically save back tags to toc.json so we cache them!
                        try:
                            toc["tags"] = tags
                            with open(toc_path, "w", encoding="utf-8") as f_out:
                                json.dump(toc, f_out, indent=2, ensure_ascii=False)
                        except Exception as e_write:
                            logger.error(f"Failed to write dynamically resolved tags to toc.json: {e_write}")
                    
                    courses.append({
                        "id": course_id,
                        "title": title,
                        "description": description,
                        "tags": tags
                    })
                except Exception as e:
                    logger.error(f"Error reading toc.json in {entry.name}: {e}")
                    
    # 2. Build nodes list
    for course in courses:
        title = clean_title(course["title"])
        words = title.split()
        label = " ".join(words[:2]) + "..." if len(words) > 2 else title
        nodes.append({
            "id": course["id"],
            "label": label,
            "fullTitle": title,
            "description": course["description"],
            "tags": course["tags"],
            "group": course["tags"][0] if course["tags"] else "général"
        })
        
    # 3. Create links between courses sharing at least one common tag
    created_pairs = set()
    for i in range(len(courses)):
        for j in range(i + 1, len(courses)):
            c1 = courses[i]
            c2 = courses[j]
            
            # Find intersection of tags
            common = set(c1["tags"]).intersection(set(c2["tags"]))
            if common:
                # Create a link
                link_id = f"{c1['id']}--{c2['id']}"
                if link_id not in created_pairs:
                    links.append({
                        "source": c1["id"],
                        "target": c2["id"],
                        "value": len(common),
                        "common_tags": list(common)
                    })
                    created_pairs.add(link_id)
                    
    return {
        "nodes": nodes,
        "links": links
    }


@app.get("/api/courses/{course_id}/toc")
def get_course_toc(course_id: str):
    """
    Returns the complete toc.json file for a given course.
    """
    data_dir = settings.get_data_dir()
    toc_path = data_dir / course_id / "toc.json"
    
    if not toc_path.exists():
        raise HTTPException(status_code=404, detail="Cours ou plan de cours introuvable.")
        
    try:
        with open(toc_path, "r", encoding="utf-8") as f:
            toc = json.load(f)
        if "title" in toc:
            toc["title"] = clean_title(toc["title"])
        return toc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la lecture de la TOC: {e}")

@app.get("/api/courses/{course_id}/content/{module_path:path}")
def get_course_content(course_id: str, module_path: str):
    """
    Returns the content of a specific module file (Markdown).
    Supports paths like 'module_01/module_1.1.md' or just 'module_1.1.md' via search.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    
    if not course_dir.exists():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    # Check 1: direct relative path on disk (e.g. module_01/module_1.1.md)
    direct_path = (course_dir / module_path).resolve()
    if direct_path.exists() and direct_path.is_file() and direct_path.is_relative_to(course_dir):
        try:
            with open(direct_path, "r", encoding="utf-8") as f:
                return {"content": f.read()}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur de lecture: {e}")
            
    # Check 2: Flat search by filename or ID if user passes a simplified ID
    # Clean the path and append extension if not present
    filename = module_path
    if not filename.endswith(".md"):
        filename += ".md"
        
    # Perform recursive search inside course folder
    for md_file in course_dir.glob("**/*.md"):
        if md_file.name == filename:
            try:
                with open(md_file, "r", encoding="utf-8") as f:
                    return {"content": f.read()}
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Erreur de lecture: {e}")
                
    raise HTTPException(status_code=404, detail=f"Fichier de contenu '{module_path}' introuvable.")

@app.get("/api/courses/{course_id}/export-pdf")
def export_course_pdf(course_id: str):
    """
    Generates a consolidated PDF for the entire course and returns it for download.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    
    if not course_dir.exists():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    # Check if compiled PDF already exists on disk, else compile it
    pdf_path = course_dir / f"{course_id}.pdf"
    
    # If the PDF does not exist or we want to ensure fresh compilation
    # Let's compile it on the fly (it's extremely fast using xhtml2pdf!)
    pdf_bytes = compile_course_to_pdf(course_id)
    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="Échec de la compilation du fichier PDF.")
        
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{course_id}.pdf"',
            "Content-Length": str(len(pdf_bytes))
        }
    )

@app.post("/api/courses/import")
async def import_course(file: UploadFile = File(...)):
    """
    Upload a course ZIP file. Extracts it and registers it as a local course.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers .zip sont acceptés.")
        
    data_dir = settings.get_data_dir()
    tmp_import_dir = data_dir / f"tmp_import_{uuid.uuid4()}"
    tmp_import_dir.mkdir(parents=True, exist_ok=True)
    
    zip_path = tmp_import_dir / "uploaded.zip"
    try:
        # Save zip file
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract ZIP
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(tmp_import_dir)
            
        # Find toc.json
        toc_matches = list(tmp_import_dir.glob("**/toc.json"))
        if not toc_matches:
            raise HTTPException(status_code=400, detail="Fichier toc.json introuvable dans l'archive ZIP.")
            
        toc_file_path = toc_matches[0]
        source_dir = toc_file_path.parent
        
        # Read TOC to validate and get title
        with open(toc_file_path, "r", encoding="utf-8") as f:
            toc_data = json.load(f)
            
        if "title" not in toc_data:
            raise HTTPException(status_code=400, detail="Le fichier toc.json est invalide (titre manquant).")
            
        course_title = toc_data["title"]
        course_id = slugify(course_title)
        
        final_course_dir = data_dir / course_id
        if final_course_dir.exists():
            shutil.rmtree(final_course_dir)
            
        # Move the contents of source_dir to final_course_dir
        shutil.move(str(source_dir), str(final_course_dir))
        
        return {
            "success": True,
            "message": "Cours importé avec succès !",
            "course_id": course_id,
            "title": course_title
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Error during course zip import")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'importation: {str(e)}")
    finally:
        # Clean up temp folder
        if tmp_import_dir.exists():
            shutil.rmtree(tmp_import_dir)

@app.post("/api/generate")
def generate_course(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Starts a background job to generate a full course.
    Returns a unique Job ID.
    """
    subject_text = request.sujet.strip()
    
    # If custom TOC is supplied, we don't strictly need a subject (we can parse it from TOC)
    if not subject_text and not request.custom_toc_markdown:
        raise HTTPException(status_code=422, detail="Le sujet ou le plan personnalisé ne peut pas être vide.")
        
    # Generate unique job id
    job_id = str(uuid.uuid4())
    
    # Trigger the background pipeline task
    background_tasks.add_task(
        run_generation_pipeline, 
        job_id, 
        subject_text, 
        request.avec_exercices,
        request.profile_id,
        request.model,
        request.custom_toc_markdown,
        request.custom_instructions,
        request.level,
        None, # resume_course_id is None for a fresh generation
        request.system_prompt_id
    )
    
    return {
        "job_id": job_id,
        "message": "Le pipeline de génération du cours a été lancé en arrière-plan.",
        "status": "starting"
    }

class TOCRequest(BaseModel):
    sujet: str
    profile_id: Optional[str] = None
    model: Optional[str] = None

@app.post("/api/generate/toc")
def generate_toc_only(request: TOCRequest):
    """
    Generates only the TOC JSON and returns it alongside a human-editable Markdown list version.
    """
    if not request.sujet.strip():
        raise HTTPException(status_code=422, detail="Le sujet ne peut pas être vide.")
        
    try:
        # Load API Profile
        api_profile = None
        if request.profile_id:
            for p in settings_manager.profiles:
                if p.id == request.profile_id:
                    api_profile = p
                    break
        if not api_profile:
            api_profile = settings_manager.get_active_profile()
            
        profile_model = request.model or api_profile.model or "gemini-flash-latest"
        
        # Generate the TOC
        toc, usage = generate_toc(request.sujet.strip(), api_profile, profile_model)
        
        # Convert to Markdown list format
        def toc_json_to_markdown(toc_data: dict) -> str:
            lines = []
            lines.append(f"# Nom du Cours : {toc_data.get('title', request.sujet)}")
            lines.append(f"{toc_data.get('description', '')}\n")
            
            for m in toc_data.get("modules", []):
                lines.append(f"- Module : {m.get('title', '')}")
                for sm in m.get("submodules", []):
                    lines.append(f"  - {sm.get('title', '')}")
            return "\n".join(lines)
            
        toc_markdown = toc_json_to_markdown(toc)
        
        return {
            "success": True,
            "toc_json": toc,
            "toc_markdown": toc_markdown,
            "usage": usage
        }
    except Exception as e:
        logger.exception("Error generating TOC only")
        raise HTTPException(status_code=500, detail=f"Échec de la planification du cours : {str(e)}")

class SystemPromptUpdate(BaseModel):
    system_prompt: str

@app.get("/api/settings/system-prompt")
def get_system_prompt_route():
    """
    Returns the currently configured system prompt from disk.
    """
    return {"system_prompt": load_system_prompt()}

@app.post("/api/settings/system-prompt")
def update_system_prompt_route(payload: SystemPromptUpdate):
    """
    Saves a new system prompt to disk.
    """
    if not payload.system_prompt.strip():
        raise HTTPException(status_code=422, detail="Le prompt système ne peut pas être vide.")
    try:
        save_system_prompt(payload.system_prompt)
        return {"success": True, "message": "Prompt système mis à jour avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde : {str(e)}")

class PromptCategoryPayload(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    directive: str

@app.get("/api/settings/prompt-categories")
def get_prompt_categories_route():
    """
    Returns the dynamic system prompt categories / levels.
    """
    return load_prompt_categories()

@app.post("/api/settings/prompt-categories")
def save_prompt_category_route(payload: PromptCategoryPayload):
    """
    Creates or updates a system prompt category.
    """
    if not payload.name.strip() or not payload.directive.strip():
        raise HTTPException(status_code=422, detail="Le nom et la directive ne peuvent pas être vides.")
        
    categories = load_prompt_categories()
    
    cat_id = payload.id
    if not cat_id:
        # Create new ID slug from name
        base_id = slugify(payload.name)
        cat_id = base_id
        if not cat_id or cat_id in categories:
            cat_id = f"{base_id}_{str(uuid.uuid4())[:8]}" if base_id else str(uuid.uuid4())[:8]
            
    categories[cat_id] = {
        "name": payload.name.strip(),
        "description": payload.description.strip(),
        "directive": payload.directive.strip()
    }
    save_prompt_categories(categories)
    return {"success": True, "message": "Catégorie de prompt enregistrée avec succès !", "categories": categories}

@app.delete("/api/settings/prompt-categories/{category_id}")
def delete_prompt_category_route(category_id: str):
    """
    Deletes a system prompt category.
    """
    categories = load_prompt_categories()
    if category_id in categories:
        del categories[category_id]
        save_prompt_categories(categories)
        return {"success": True, "message": "Catégorie supprimée avec succès !", "categories": categories}
    else:
        raise HTTPException(status_code=404, detail="Catégorie introuvable.")

class SystemPromptTemplatePayload(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    content: str

@app.get("/api/settings/system-prompts")
def get_system_prompts_route():
    """
    Returns the list of custom system prompt templates.
    """
    return load_system_prompt_templates()

@app.post("/api/settings/system-prompts")
def save_system_prompt_template_route(payload: SystemPromptTemplatePayload):
    """
    Creates or updates a system prompt template.
    """
    if not payload.name.strip() or not payload.content.strip():
        raise HTTPException(status_code=422, detail="Le nom et le contenu ne peuvent pas être vides.")
        
    templates = load_system_prompt_templates()
    
    tpl_id = payload.id
    if not tpl_id:
        # Create a new slug ID
        tpl_id = slugify(payload.name)
        if not tpl_id or tpl_id in templates:
            tpl_id = f"{tpl_id}_{str(uuid.uuid4())[:8]}" if tpl_id else str(uuid.uuid4())[:8]
            
    templates[tpl_id] = {
        "name": payload.name.strip(),
        "description": payload.description.strip(),
        "content": payload.content
    }
    save_system_prompt_templates(templates)
    return {"success": True, "message": "Gabarit de prompt enregistré avec succès !", "templates": templates}

@app.delete("/api/settings/system-prompts/{template_id}")
def delete_system_prompt_template_route(template_id: str):
    """
    Deletes a system prompt template.
    """
    templates = load_system_prompt_templates()
    if template_id in templates:
        if len(templates) <= 1:
            raise HTTPException(status_code=400, detail="Impossible de supprimer le dernier gabarit restant.")
        del templates[template_id]
        save_system_prompt_templates(templates)
        return {"success": True, "message": "Gabarit supprimé avec succès !", "templates": templates}
    else:
        raise HTTPException(status_code=404, detail="Gabarit introuvable.")

@app.get("/api/generate/status/{job_id}")
def get_generation_status(job_id: str):
    """
    Returns the current status and progress of a background generation job.
    Suitable for frontend HTTP polling.
    """
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="Job de génération introuvable.")
    return jobs_status[job_id]

@app.get("/api/generate/status/{job_id}/stream")
def get_generation_status_stream(job_id: str):
    """
    Server-Sent Events (SSE) endpoint to stream progress updates in real-time.
    """
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="Job de génération introuvable.")
        
    async def event_generator():
        last_task = None
        last_progress = -1.0
        last_logs_len = 0
        last_completed_reqs = -1
        
        while True:
            job = jobs_status.get(job_id)
            if not job:
                break
                
            current_logs_len = len(job.get("logs", []))
            current_completed = job.get("completed_requests", 0)
            
            # Yield event only if progress, task description, logs, or completed count changed, or if it finished
            if (job["current_task"] != last_task or 
                job["progress"] != last_progress or 
                current_logs_len != last_logs_len or
                current_completed != last_completed_reqs or
                job["status"] in ["completed", "failed"]):
                
                last_task = job["current_task"]
                last_progress = job["progress"]
                last_logs_len = current_logs_len
                last_completed_reqs = current_completed
                
                yield f"data: {json.dumps(job, ensure_ascii=False)}\n\n"
                
            if job["status"] in ["completed", "failed"]:
                break
                
            # Poll status every 200ms
            await asyncio.sleep(0.2)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

class ProfileCreate(BaseModel):
    name: str
    type: str  # 'openai' | 'openrouter' | 'gemini' | 'ollama' | 'custom'
    api_key: str
    base_url: str
    model: str = ""

@app.get("/api/settings")
def get_settings():
    """
    Returns the current settings including the active profile, list of profiles and data directory.
    """
    active = settings_manager.get_active_profile()
    return {
        "llm_api_key": active.api_key,
        "llm_base_url": active.base_url,
        "llm_model": active.model,
        "data_dir": str(settings.get_data_dir()),
        "profiles": [p.to_dict() for p in settings_manager.profiles],
        "active_profile_id": active.id,
        "mecaprof": settings_manager.mecaprof_settings
    }

@app.post("/api/settings/profile")
def add_profile(profile: ProfileCreate):
    """
    Adds a new LLM profile.
    """
    try:
        new_prof = settings_manager.add_profile(
            name=profile.name.strip(),
            type=profile.type.strip(),
            api_key=profile.api_key.strip(),
            base_url=profile.base_url.strip(),
            model=profile.model.strip()
        )
        return {"message": "Profil ajouté avec succès !", "profile": new_prof.to_dict()}
    except Exception as e:
        logger.error(f"Error adding profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/settings/profile/{profile_id}")
def update_profile(profile_id: str, profile: ProfileCreate):
    """
    Updates an existing LLM profile.
    """
    try:
        settings_manager.update_profile(
            profile_id=profile_id,
            name=profile.name.strip(),
            type=profile.type.strip(),
            api_key=profile.api_key.strip(),
            base_url=profile.base_url.strip(),
            model=profile.model.strip()
        )
        return {"message": "Profil mis à jour avec succès !"}
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/settings/profile/{profile_id}")
def delete_profile(profile_id: str):
    """
    Deletes an LLM profile.
    """
    try:
        settings_manager.delete_profile(profile_id)
        return {"message": "Profil supprimé avec succès !"}
    except Exception as e:
        logger.error(f"Error deleting profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/profile/{profile_id}/activate")
def activate_profile(profile_id: str):
    """
    Activates an LLM profile.
    """
    try:
        settings_manager.set_active_profile(profile_id)
        return {"message": "Profil activé avec succès !", "active_profile_id": profile_id}
    except Exception as e:
        logger.error(f"Error activating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings/profile/{profile_id}/models")
def get_profile_models(profile_id: str):
    """
    Returns the list of available models for a given profile, dynamically fetched or fallback.
    """
    profile = None
    for p in settings_manager.profiles:
        if p.id == profile_id:
            profile = p
            break
            
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable.")
        
    try:
        models = fetch_available_models(profile)
        return {"models": models}
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def update_course_toc_fields(course_id: str, updates: Dict[str, Any]):
    data_dir = settings.get_data_dir()
    toc_path = data_dir / course_id / "toc.json"
    if not toc_path.exists():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
    try:
        with open(toc_path, "r", encoding="utf-8") as f:
            toc_data = json.load(f)
        toc_data.update(updates)
        with open(toc_path, "w", encoding="utf-8") as f:
            json.dump(toc_data, f, indent=2, ensure_ascii=False)
        return toc_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de mise à jour: {e}")

@app.post("/api/courses/{course_id}/pin")
def pin_course(course_id: str):
    update_course_toc_fields(course_id, {"pinned": True})
    return {"success": True, "message": "Cours épinglé avec succès !"}

@app.post("/api/courses/{course_id}/unpin")
def unpin_course(course_id: str):
    update_course_toc_fields(course_id, {"pinned": False})
    return {"success": True, "message": "Cours désépinglé avec succès !"}

@app.post("/api/courses/{course_id}/archive")
def archive_course(course_id: str):
    update_course_toc_fields(course_id, {"archived": True})
    return {"success": True, "message": "Cours archivé avec succès !"}

@app.post("/api/courses/{course_id}/unarchive")
def unarchive_course(course_id: str):
    update_course_toc_fields(course_id, {"archived": False})
    return {"success": True, "message": "Cours désarchivé avec succès !"}

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: str):
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    if not course_dir.exists():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
    try:
        shutil.rmtree(course_dir)
        return {"success": True, "message": "Cours supprimé avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {e}")

@app.get("/api/courses/{course_id}/export")
def export_course(course_id: str):
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    if not course_dir.exists():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    import tempfile
    temp_dir = Path(tempfile.mkdtemp())
    zip_path = temp_dir / f"{course_id}.zip"
    
    try:
        # Create ZIP without full path prefixing
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_ref:
            for file_path in course_dir.rglob("*"):
                if file_path.is_file() and not file_path.name.endswith(".pdf"):
                    zip_ref.write(file_path, file_path.relative_to(course_dir))
                    
        with open(zip_path, "rb") as f:
            zip_bytes = f.read()
            
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{course_id}.zip"',
                "Content-Length": str(len(zip_bytes))
            }
        )
    except Exception as e:
        logger.error(f"Error exporting course: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {e}")
    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

@app.post("/api/generate/cancel/{job_id}")
def cancel_generation(job_id: str):
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="Job de génération introuvable.")
    
    jobs_status[job_id]["status"] = "canceled"
    jobs_status[job_id]["current_task"] = "Génération interrompue par l'utilisateur."
    
    # Also write a canceled flag directly into the course folder if it has started, to save as RAW
    course_id = jobs_status[job_id].get("course_id")
    if course_id:
        try:
            update_course_toc_fields(course_id, {
                "partial": True,
                "status": "failed",
                "error": "Génération annulée par l'utilisateur."
            })
        except Exception:
            pass
            
    return {"success": True, "message": "Génération interrompue avec succès !"}

@app.get("/api/courses/{course_id}/files")
def list_course_files(course_id: str):
    """
    Returns a recursive directory tree of the files in a course folder.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    if not course_dir.exists():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    def build_tree(path: Path, relative_root: Path) -> list:
        tree = []
        for item in sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name)):
            # Skip temp folders
            if item.name.startswith("tmp_") or item.name == "__pycache__":
                continue
                
            rel_path = str(item.relative_to(relative_root))
            is_dir = item.is_dir()
            
            node = {
                "name": item.name,
                "path": rel_path,
                "is_dir": is_dir
            }
            if is_dir:
                node["children"] = build_tree(item, relative_root)
            else:
                node["size"] = item.stat().st_size
            tree.append(node)
        return tree
        
    try:
        files_tree = build_tree(course_dir, course_dir)
        return files_tree
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CourseMetadataPayload(BaseModel):
    notes: Optional[str] = ""

class CourseLogPayload(BaseModel):
    action: str

def write_course_log(course_id: str, message: str):
    """
    Appends a timestamped log message to the course.log file inside the course directory.
    """
    try:
        data_dir = settings.get_data_dir()
        course_dir = data_dir / course_id
        if course_dir.exists() and course_dir.is_dir():
            log_path = course_dir / "course.log"
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] {message}\n")
    except Exception as e:
        logger.error(f"Failed to write course log: {e}")

@app.get("/api/courses/{course_id}/metadata")
def get_course_metadata(course_id: str):
    """
    Returns the course metadata (notes, progress checkpoints, etc.) from its folder.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    if not course_dir.exists() or not course_dir.is_dir():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    metadata_path = course_dir / "course_metadata.json"
    if metadata_path.exists():
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading course metadata: {e}")
            
    return {"notes": "", "progress": {}}

@app.post("/api/courses/{course_id}/metadata")
def save_course_metadata(course_id: str, payload: CourseMetadataPayload):
    """
    Saves/updates course metadata (notes, progress checkpoints, etc.) in its folder.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    if not course_dir.exists() or not course_dir.is_dir():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    metadata_path = course_dir / "course_metadata.json"
    
    metadata = {}
    if metadata_path.exists():
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception:
            pass
            
    metadata["notes"] = payload.notes
    
    try:
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
            
        write_course_log(course_id, "Mise à jour des notes d'étude personnelles.")
        return {"success": True, "message": "Notes enregistrées avec succès !"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de sauvegarde: {str(e)}")

@app.post("/api/courses/{course_id}/log")
def log_course_action(course_id: str, payload: CourseLogPayload):
    """
    Logs a custom client-side action in the course log.
    """
    write_course_log(course_id, payload.action)
    return {"success": True}

@app.post("/api/courses/{course_id}/resume")
def resume_course_generation(course_id: str, background_tasks: BackgroundTasks):
    """
    Resumes a failed, partial, or interrupted course generation job.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    toc_path = course_dir / "toc.json"
    if not toc_path.exists():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    try:
        with open(toc_path, "r", encoding="utf-8") as f:
            toc_data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de lecture de toc.json: {e}")
        
    # Generate unique job id
    job_id = str(uuid.uuid4())
    
    # Log resumption request
    write_course_log(course_id, "Demande de reprise de génération reçue (action utilisateur).")
    
    # Extract details from toc_data or fallback
    background_tasks.add_task(
        run_generation_pipeline,
        job_id=job_id,
        subject=toc_data.get("title", course_id),
        avec_exercices=toc_data.get("avec_exercices", False),
        profile_id=toc_data.get("profile_id"),
        model=toc_data.get("model"),
        custom_toc_markdown=None,
        custom_instructions=toc_data.get("custom_instructions"),
        level=toc_data.get("level", "débutant"),
        resume_course_id=course_id
    )
    
    return {
        "job_id": job_id,
        "message": "La génération du cours a été relancée.",
        "status": "starting"
    }


class AskRequest(BaseModel):
    context_paragraph: str
    question: str
    selected_text: Optional[str] = ""

@app.post("/api/courses/{course_id}/{module_id}/ask")
def ask_virtual_teacher_route(course_id: str, module_id: str, payload: AskRequest):
    """
    POST /api/courses/{course_id}/{module_id}/ask
    Sends context paragraph, course TOC, module contents, and student question to the virtual teacher.
    Saves the QA session into course questions.json for persistence.
    """
    data_dir = settings.get_data_dir()
    course_dir = data_dir / course_id
    
    if not course_dir.exists() or not course_dir.is_dir():
        raise HTTPException(status_code=404, detail="Cours introuvable.")
        
    toc_path = course_dir / "toc.json"
    if not toc_path.exists():
        raise HTTPException(status_code=404, detail="Plan de cours introuvable.")
        
    try:
        with open(toc_path, "r", encoding="utf-8") as f:
            toc = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de lecture de toc.json: {e}")
        
    course_title = toc.get("title", course_id)
    
    # Try to find module file contents
    module_content = ""
    filename = module_id
    if not filename.endswith(".md"):
        filename += ".md"
        
    found_file = None
    for md_file in course_dir.glob("**/*.md"):
        if md_file.name == filename or md_file.stem == module_id:
            found_file = md_file
            break
            
    if not found_file:
        raise HTTPException(status_code=404, detail=f"Module {module_id} introuvable.")
        
    try:
        with open(found_file, "r", encoding="utf-8") as f:
            module_content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de lecture du module: {e}")
        
    # Get MecaProf LLM settings
    mecaprof = settings_manager.mecaprof_settings
    
    # Extract profile and model
    profile_id = mecaprof.get("profile_id") or toc.get("profile_id")
    model = mecaprof.get("model") or toc.get("model")
    
    api_profile = None
    if profile_id:
        for p in settings_manager.profiles:
            if p.id == profile_id:
                api_profile = p
                break
    if not api_profile:
        api_profile = settings_manager.get_active_profile()
        
    chosen_model = model or api_profile.model or "gemini-flash-latest"
    system_prompt = mecaprof.get("system_prompt")
    temperature = mecaprof.get("temperature", 0.3)
    
    from app.llm import ask_virtual_teacher
    
    try:
        answer, usage = ask_virtual_teacher(
            course_title=course_title,
            toc=toc,
            module_content=module_content,
            context_paragraph=payload.context_paragraph,
            question=payload.question,
            api_profile=api_profile,
            override_model=chosen_model,
            system_prompt=system_prompt,
            temperature=temperature,
            selected_text=payload.selected_text
        )
        
        # Persist this Q&A into questions.json
        questions_path = course_dir / "questions.json"
        all_questions = {}
        if questions_path.exists():
            try:
                with open(questions_path, "r", encoding="utf-8") as f:
                    all_questions = json.load(f)
            except Exception:
                pass
                
        if module_id not in all_questions:
            all_questions[module_id] = {}
            
        para_key = payload.context_paragraph
        if para_key not in all_questions[module_id]:
            all_questions[module_id][para_key] = []
            
        all_questions[module_id][para_key].append({
            "q": payload.question,
            "a": answer,
            "selected_text": payload.selected_text or ""
        })
        
        try:
            with open(questions_path, "w", encoding="utf-8") as f:
                json.dump(all_questions, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save questions.json: {e}")
            
        return {
            "success": True,
            "answer": answer,
            "usage": usage
        }
    except Exception as e:
        logger.exception("Error in ask_virtual_teacher_route")
        raise HTTPException(status_code=500, detail=f"Échec de l'appel au professeur virtuel : {str(e)}")

@app.get("/api/courses/{course_id}/{module_id}/questions")
def get_module_questions(course_id: str, module_id: str):
    """
    GET /api/courses/{course_id}/{module_id}/questions
    Retrieves all Q&As stored in questions.json for the specified module.
    """
    data_dir = settings.get_data_dir()
    questions_path = data_dir / course_id / "questions.json"
    if not questions_path.exists():
        return {}
        
    try:
        with open(questions_path, "r", encoding="utf-8") as f:
            all_questions = json.load(f)
        return all_questions.get(module_id, {})
    except Exception as e:
        logger.error(f"Error loading questions.json for {course_id}: {e}")
        return {}

class MecaProfSettingsPayload(BaseModel):
    profile_id: str
    model: str
    system_prompt: str
    temperature: float

@app.post("/api/settings/mecaprof")
def update_mecaprof_settings(payload: MecaProfSettingsPayload):
    """
    POST /api/settings/mecaprof
    Updates MecaProf teacher settings in the global settings_manager.
    """
    try:
        settings_manager.mecaprof_settings.update({
            "profile_id": payload.profile_id.strip(),
            "model": payload.model.strip(),
            "system_prompt": payload.system_prompt.strip(),
            "temperature": payload.temperature
        })
        settings_manager.save_profiles()
        return {"success": True, "message": "Paramètres de MecaProf mis à jour avec succès !", "mecaprof": settings_manager.mecaprof_settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


