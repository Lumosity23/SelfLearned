import os
import re
import uuid
import logging
import unicodedata
import json
from typing import Dict, Any, List, Optional
from pathlib import Path
import asyncio

from app.config import settings
from app.llm import generate_toc, generate_submodule, generate_exercises
from app.prompts import load_system_prompt, SYSTEM_PROMPT_COURSE_GENERATOR

logger = logging.getLogger(__name__)

# Global in-memory dictionary for keeping track of background generation jobs
jobs_status: Dict[str, Dict[str, Any]] = {}

def parse_markdown_toc(md_text: str) -> dict:
    lines = md_text.splitlines()
    title = "Cours sans titre"
    description = "Aucune description fournie."
    modules = []
    
    current_module = None
    
    # First search for Title (starting with #)
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#"):
            title = stripped.lstrip("#").strip()
            break
            
    # The description can be any non-empty lines between # Title and the first list item
    desc_lines = []
    found_title = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("#"):
            found_title = True
            continue
        if found_title:
            if stripped.startswith("-") or stripped.startswith("*"):
                break
            if stripped:
                desc_lines.append(stripped)
    if desc_lines:
        description = " ".join(desc_lines)
        
    # Parse modules and submodules
    module_count = 0
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("-") or stripped.startswith("*"):
            # Count leading spaces to determine depth
            leading_spaces = len(line) - len(line.lstrip())
            item_text = stripped.lstrip("-* ").strip()
            
            if leading_spaces < 2:  # Top-level item -> Module
                module_count += 1
                module_id = f"module_{module_count:02d}"
                
                title_text = item_text
                if ":" in title_text:
                    parts = title_text.split(":", 1)
                    if "module" in parts[0].lower():
                        title_text = parts[1].strip()
                        
                current_module = {
                    "id": module_id,
                    "title": title_text,
                    "submodules": []
                }
                modules.append(current_module)
            else:  # Indented item -> Submodule
                if current_module is not None:
                    m_idx = len(modules)
                    sub_idx = len(current_module["submodules"]) + 1
                    submodule_id = f"module_{m_idx}.{sub_idx}"
                    submodule_file = f"module_{m_idx}.{sub_idx}.md"
                    
                    current_module["submodules"].append({
                        "id": submodule_id,
                        "title": item_text,
                        "file": submodule_file
                    })
                    
    return {
        "title": title,
        "description": description,
        "modules": modules
    }

def slugify(text: str) -> str:
    """
    Normalizes and slugifies a string for directory and URL naming.
    """
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

import datetime
from app.settings_manager import settings_manager

def log_to_job(job_id: str, message: str):
    """
    Appends a timestamped log message to the job's logs list.
    """
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    log_line = f"[{timestamp}] {message}"
    if job_id in jobs_status:
        if "logs" not in jobs_status[job_id]:
            jobs_status[job_id]["logs"] = []
        jobs_status[job_id]["logs"].append(log_line)
    logger.info(f"Job {job_id}: {message}")

def write_course_log(course_id: str, message: str):
    """
    Appends a timestamped log message to the course's course.log file.
    """
    try:
        from app.config import settings
        course_dir = settings.get_data_dir() / course_id
        if course_dir.exists() and course_dir.is_dir():
            log_path = course_dir / "course.log"
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] {message}\n")
    except Exception as e:
        logger.error(f"Failed to write course log for {course_id}: {e}")


async def run_generation_pipeline(
    job_id: str, 
    subject: str, 
    avec_exercices: bool,
    profile_id: Optional[str] = None,
    model: Optional[str] = None,
    custom_toc_markdown: Optional[str] = None,
    custom_instructions: Optional[str] = None,
    level: Optional[str] = "débutant",
    resume_course_id: Optional[str] = None,
    system_prompt_id: Optional[str] = None
):
    """
    Asynchronous runner for the two-step AI generation pipeline.
    Supports dynamic profiles, custom Markdown TOC, specific instructions, target level, and backgrounding.
    Includes robust resume capabilities based on file completion tracking.
    """
    jobs_status[job_id] = {
        "job_id": job_id,
        "subject": subject,
        "avec_exercices": avec_exercices,
        "status": "starting",
        "progress": 0.0,
        "current_task": "Initialisation du pipeline...",
        "course_id": None,
        "error": None,
        "logs": [],
        "total_expected_requests": 0,
        "completed_requests": 0,
        "current_submodule_index": -1
    }
    
    log_to_job(job_id, "[DÉMARRAGE] Initialisation du pipeline de génération...")
    
    try:
        # Load API Profile
        api_profile = None
        if profile_id:
            for p in settings_manager.profiles:
                if p.id == profile_id:
                    api_profile = p
                    break
        if not api_profile:
            api_profile = settings_manager.get_active_profile()
            
        profile_model = model or api_profile.model or "gemini-flash-latest"
        profile_name = f"{api_profile.name} ({profile_model})"
        
        loop = asyncio.get_running_loop()
        
        toc = None
        course_id = None
        course_dir = None
        
        if resume_course_id:
            course_id = resume_course_id
            course_dir = settings.get_data_dir() / course_id
            toc_path = course_dir / "toc.json"
            if not toc_path.exists():
                raise ValueError(f"Fichier toc.json introuvable pour le cours {resume_course_id}")
            with open(toc_path, "r", encoding="utf-8") as f:
                toc = json.load(f)
            # Re-read stored params or use provided ones
            avec_exercices = toc.get("avec_exercices", avec_exercices)
            level = toc.get("level", level or "débutant")
            profile_id = toc.get("profile_id", profile_id)
            model = toc.get("model", model)
            custom_instructions = toc.get("custom_instructions", custom_instructions)
            system_prompt_id = toc.get("system_prompt_id", system_prompt_id)
            
            log_to_job(job_id, f"[REPRISE] Reprise de la génération pour le cours : '{toc.get('title')}'")
            write_course_log(course_id, "Relancement / Reprise de la génération du cours pour les éléments manquants.")
        else:
            if custom_toc_markdown:
                log_to_job(job_id, "[CONFIG] Utilisation d'une table des matières personnalisée importée.")
                toc = parse_markdown_toc(custom_toc_markdown)
            else:
                # Step 1: Generate Table of Contents
                jobs_status[job_id]["status"] = "generating_toc"
                jobs_status[job_id]["progress"] = 10.0
                jobs_status[job_id]["current_task"] = "Génération de la table des matières (TOC)..."
                
                log_to_job(job_id, f"[REQUÊTE] Génération de la table des matières... (modèle: {profile_name})")
                
                toc, toc_usage = await loop.run_in_executor(None, generate_toc, subject, api_profile, profile_model)
                
                jobs_status[job_id]["completed_requests"] += 1
                comp_tk = toc_usage.get("completion_tokens", 0)
                log_to_job(job_id, f"[SUCCÈS] Table des matières reçue. (Modèle: {profile_name}, {comp_tk} tokens reçus)")
                
            if not toc:
                raise ValueError("Échec de la préparation de la table des matières.")
                
            course_title = toc.get("title", subject)
            course_id = slugify(course_title)
            
            # Verify and create data directory
            data_dir = settings.get_data_dir()
            course_dir = data_dir / course_id
            course_dir.mkdir(parents=True, exist_ok=True)
            write_course_log(course_id, f"Création du dossier du cours : {course_title}")
            write_course_log(course_id, "Planification de la Table des Matières (TOC) réussie.")
            
        # Collect all submodules to generate and calculate status
        modules_list = toc.get("modules", [])
        all_submodules = []
        missing_submodules_indexes = []
        
        # Ensure 'generated' and 'exercise_generated' exist on all submodules
        for m in modules_list:
            for sm in m.get("submodules", []):
                if "generated" not in sm:
                    sm["generated"] = False
                if avec_exercices and "exercise_generated" not in sm:
                    sm["exercise_generated"] = False
                    
        submodule_counter = 0
        for m in modules_list:
            module_id = m.get("id")
            for sm in m.get("submodules", []):
                theory_path = course_dir / module_id / sm.get("file")
                exo_path = course_dir / module_id / f"exo_{sm.get('file')}"
                
                # Double-check file existence and sync JSON status if needed
                if theory_path.exists():
                    sm["generated"] = True
                if avec_exercices and exo_path.exists():
                    sm["exercise_generated"] = True
                    
                need_theory = not sm.get("generated", False)
                need_exo = avec_exercices and not sm.get("exercise_generated", False)
                
                all_submodules.append({
                    "module_id": module_id,
                    "submodule": sm,
                    "need_theory": need_theory,
                    "need_exercises": need_exo
                })
                if need_theory or need_exo:
                    missing_submodules_indexes.append(submodule_counter)
                submodule_counter += 1
                
        total_submodules = len(all_submodules)
        if total_submodules == 0:
            raise ValueError("Aucun sous-module trouvé dans la table des matières.")
            
        # Calculate completed and remaining requests
        completed_requests = 0
        if resume_course_id:
            completed_requests = sum(
                (1 if sm.get("generated", False) else 0) + 
                (1 if (avec_exercices and sm.get("exercise_generated", False)) else 0)
                for m in modules_list for sm in m.get("submodules", [])
            )
            # Add TOC request if not custom
            if not custom_toc_markdown:
                completed_requests += 1
                
        remaining_requests = sum((1 if item["need_theory"] else 0) + (1 if item["need_exercises"] else 0) for item in all_submodules)
        total_requests = completed_requests + remaining_requests
        
        jobs_status[job_id]["completed_requests"] = completed_requests
        jobs_status[job_id]["total_expected_requests"] = total_requests
        
        log_to_job(job_id, f"[CONFIG] Planification de {total_requests} requêtes API au total ({completed_requests} déjà complétées, {remaining_requests} restantes).")
        
        # Update metadata in toc.json
        toc["partial"] = False
        toc["status"] = "generating"
        toc["job_id"] = job_id
        toc["avec_exercices"] = avec_exercices
        toc["profile_id"] = profile_id
        toc["model"] = model
        toc["custom_instructions"] = custom_instructions
        toc["level"] = level
        toc["system_prompt_id"] = system_prompt_id
        
        # Generate tags for the knowledge graph
        try:
            from app.llm import generate_course_tags
            toc["tags"] = generate_course_tags(
                title=toc.get("title", ""),
                description=toc.get("description", ""),
                api_profile=api_profile,
                override_model=profile_model
            )
        except Exception as e_tags:
            logger.error(f"Error generating tags for course: {e_tags}")
            toc["tags"] = []

        with open(course_dir / "toc.json", "w", encoding="utf-8") as f:
            json.dump(toc, f, indent=2, ensure_ascii=False)
            
        jobs_status[job_id]["course_id"] = course_id
        jobs_status[job_id]["toc"] = toc
        
        # Step 2: Iterative generation of modules
        jobs_status[job_id]["status"] = "generating_modules"
        
        has_failed = False
        partial_error = None
        
        # Read system prompt dynamically
        from app.prompts import load_system_prompt_templates, load_system_prompt
        base_system_prompt = None
        if system_prompt_id:
            try:
                templates = load_system_prompt_templates()
                if system_prompt_id in templates:
                    base_system_prompt = templates[system_prompt_id].get("content")
            except Exception as e:
                logger.error(f"Error loading system prompt template: {e}")
        
        if not base_system_prompt:
            base_system_prompt = load_system_prompt()
            
        effective_system_prompt = base_system_prompt
        if custom_instructions:
            effective_system_prompt += f"\n\n### 4. INSTRUCTIONS SPÉCIFIQUES DE L'UTILISATEUR\nTu DOIS respecter scrupuleusement les consignes de style, de ton ou de contenu suivantes pour la rédaction de ce module :\n{custom_instructions}"
            
        # Target pedagogical depth based on level (dynamic categories)
        from app.prompts import load_prompt_categories
        try:
            prompt_cats = load_prompt_categories()
        except Exception as e:
            logger.error(f"Error loading prompt categories: {e}")
            prompt_cats = {}
            
        level_directive = ""
        if prompt_cats:
            target_lvl_clean = (level or "débutant").lower().strip()
            matched_cat = None
            for cat_key, cat_val in prompt_cats.items():
                if cat_key.lower() == target_lvl_clean or cat_val.get("name", "").lower() == target_lvl_clean:
                    matched_cat = cat_val
                    break
            if matched_cat:
                level_directive = matched_cat.get("directive", "")
            else:
                fallback_cat = prompt_cats.get("débutant") or list(prompt_cats.values())[0]
                level_directive = fallback_cat.get("directive", "")
        else:
            level_directive = "Explique tous les concepts de base pas à pas, donne des analogies simples."
            
        effective_system_prompt += f"\n\n### 5. NIVEAU CIBLE ET DIRECTIVES PÉDAGOGIQUES\n{level_directive}"
        
        # NotebookLM: Inject private context from documents if present
        context_path = course_dir / "context.txt"
        if context_path.exists():
            try:
                with open(context_path, "r", encoding="utf-8") as f:
                    private_context = f.read().strip()
                if private_context:
                    effective_system_prompt += f"\n\n### 6. CONTEXTE DE DOCUMENTS PRIVÉS (NotebookLM Flow)\nTu DOIS rédiger chaque chapitre en intégrant et en t'appuyant rigoureusement sur le contexte privé extrait des documents de l'utilisateur suivant :\n{private_context}"
                    logger.info("Found context.txt! Injected private document context into system prompt.")
            except Exception as e_context:
                logger.error(f"Error reading context.txt: {e_context}")
        
        for index, item in enumerate(all_submodules):
            module_id = item["module_id"]
            submodule = item["submodule"]
            submodule_title = submodule.get("title")
            submodule_file = submodule.get("file")
            
            # Create module subdirectory
            module_dir = course_dir / module_id
            module_dir.mkdir(parents=True, exist_ok=True)
            
            # Progress calculation
            base_progress = 10.0 + (index / total_submodules) * 80.0
            
            # If both theory and exercises are already done, skip!
            if index not in missing_submodules_indexes:
                log_to_job(job_id, f"[INFO] Chapitre {index + 1}/{total_submodules} déjà rédigé : '{submodule_title}' (Saut de l'étape).")
                continue
                
            # Check for cancellation before beginning submodule
            if jobs_status.get(job_id, {}).get("status") == "canceled":
                log_to_job(job_id, "[INTERRUPTION] Génération annulée par l'utilisateur.")
                has_failed = True
                partial_error = "Génération annulée par l'utilisateur."
                break
                
            jobs_status[job_id]["current_submodule_index"] = index
            jobs_status[job_id]["progress"] = round(base_progress, 1)
            
            # Generate Theory if needed
            if item["need_theory"]:
                jobs_status[job_id]["current_task"] = f"Rédaction théorique : {submodule_title} ({index + 1}/{total_submodules})"
                try:
                    log_to_job(job_id, f"[REQUÊTE] Rédaction théorique du chapitre {index + 1}/{total_submodules} : '{submodule_title}'... (modèle: {profile_name})")
                    submodule_content, usage = await loop.run_in_executor(
                        None, 
                        generate_submodule, 
                        effective_system_prompt, 
                        toc, 
                        submodule,
                        api_profile,
                        profile_model
                    )
                    
                    # Write submodule md file
                    with open(module_dir / submodule_file, "w", encoding="utf-8") as f:
                        f.write(submodule_content)
                        
                    # Sync completion in toc.json
                    for m in toc.get("modules", []):
                        if m.get("id") == module_id:
                            for sm in m.get("submodules", []):
                                if sm.get("file") == submodule_file:
                                    sm["generated"] = True
                    with open(course_dir / "toc.json", "w", encoding="utf-8") as f:
                        json.dump(toc, f, indent=2, ensure_ascii=False)
                        
                    jobs_status[job_id]["completed_requests"] += 1
                    comp_tk = usage.get("completion_tokens", 0)
                    log_to_job(job_id, f"[SUCCÈS] Chapitre {index + 1}/{total_submodules} rédigé. ({comp_tk} tokens reçus)")
                    write_course_log(course_id, f"Rédaction théorique réussie du chapitre : '{submodule_title}'")
                    
                except Exception as e:
                    partial_error = f"Erreur lors de la rédaction de '{submodule_title}': {str(e)}"
                    log_to_job(job_id, f"[ERREUR] Échec lors de la rédaction du chapitre : {str(e)}")
                    has_failed = True
                    break
            else:
                log_to_job(job_id, f"[INFO] Partie théorique du chapitre {index + 1}/{total_submodules} déjà rédigée.")
                
            # Generate Exercises if needed
            if avec_exercices and item["need_exercises"]:
                if jobs_status.get(job_id, {}).get("status") == "canceled":
                    log_to_job(job_id, "[INTERRUPTION] Génération annulée par l'utilisateur.")
                    has_failed = True
                    partial_error = "Génération annulée par l'utilisateur."
                    break
                    
                jobs_status[job_id]["progress"] = round(base_progress + (0.5 / total_submodules) * 80.0, 1)
                jobs_status[job_id]["current_task"] = f"Création des exercices : {submodule_title}"
                
                # Load theory file content
                try:
                    with open(module_dir / submodule_file, "r", encoding="utf-8") as f:
                        submodule_content = f.read()
                except Exception:
                    submodule_content = ""
                    
                try:
                    log_to_job(job_id, f"[REQUÊTE] Génération des exercices pour '{submodule_title}'... (modèle: {profile_name})")
                    exercises_content, usage = await loop.run_in_executor(
                        None, 
                        generate_exercises, 
                        submodule_title, 
                        submodule_content,
                        api_profile,
                        profile_model
                    )
                    
                    # Write exercise md file
                    exo_file = f"exo_{submodule_file}"
                    with open(module_dir / exo_file, "w", encoding="utf-8") as f:
                        f.write(exercises_content)
                        
                    # Sync completion in toc.json
                    for m in toc.get("modules", []):
                        if m.get("id") == module_id:
                            for sm in m.get("submodules", []):
                                if sm.get("file") == submodule_file:
                                    sm["exercise_generated"] = True
                    with open(course_dir / "toc.json", "w", encoding="utf-8") as f:
                        json.dump(toc, f, indent=2, ensure_ascii=False)
                        
                    jobs_status[job_id]["completed_requests"] += 1
                    comp_tk = usage.get("completion_tokens", 0)
                    log_to_job(job_id, f"[SUCCÈS] Exercices rédigés. ({comp_tk} tokens reçus)")
                    write_course_log(course_id, f"Rédaction des exercices réussie pour le chapitre : '{submodule_title}'")
                except Exception as e:
                    partial_error = f"Erreur lors de la génération des exercices de '{submodule_title}': {str(e)}"
                    log_to_job(job_id, f"[ERREUR] Échec lors de la génération des exercices : {str(e)}")
                    has_failed = True
                    break
            elif avec_exercices:
                log_to_job(job_id, f"[INFO] Exercices du chapitre {index + 1}/{total_submodules} déjà rédigés.")
                
        # Check if the pipeline encountered a partial failure
        if has_failed:
            toc["partial"] = True
            toc["status"] = "failed"
            toc["error"] = partial_error
            with open(course_dir / "toc.json", "w", encoding="utf-8") as f:
                json.dump(toc, f, indent=2, ensure_ascii=False)
                
            jobs_status[job_id]["status"] = "failed"
            jobs_status[job_id]["current_task"] = f"Génération partielle (interrompue). Erreur: {partial_error}"
            jobs_status[job_id]["error"] = partial_error
            log_to_job(job_id, f"[INTERRUPTION] Le cours a été sauvegardé avec succès en mode PARTIEL (RAW).")
            write_course_log(course_id, f"Génération interrompue ou partielle. Cause: {partial_error or 'Annulation utilisateur'}")
            return
            
        # Completed successfully!
        toc["partial"] = False
        toc["status"] = "completed"
        with open(course_dir / "toc.json", "w", encoding="utf-8") as f:
            json.dump(toc, f, indent=2, ensure_ascii=False)
            
        jobs_status[job_id]["status"] = "completed"
        jobs_status[job_id]["progress"] = 100.0
        jobs_status[job_id]["current_task"] = "Cours généré avec succès !"
        log_to_job(job_id, "[SUCCÈS] Génération du cours complète et finalisée.")
        write_course_log(course_id, "Génération du cours complète et entièrement finalisée avec succès !")
        logger.info(f"Course {course_id} fully generated for job {job_id}")
        
    except Exception as e:
        logger.exception(f"Erreur fatale dans le pipeline de génération du cours pour le job {job_id}")
        jobs_status[job_id]["status"] = "failed"
        jobs_status[job_id]["current_task"] = f"Échec du pipeline de génération."
        jobs_status[job_id]["error"] = str(e)
        log_to_job(job_id, f"[ERREUR FATALE] Échec du pipeline : {str(e)}")
        if course_id:
            write_course_log(course_id, f"ÉCHEC FATAL du pipeline de génération : {str(e)}")

def run_course_generation_pipeline(history: list, next_instruction: str):
    """
    Main optimized generation pipeline using ContextOptimizer.
    Processes the conversation payload through the optimizer before triggering requests.
    """
    from app.utils.context import ContextOptimizer
    from app.llm import get_llm_client
    
    # 1. Initialize optimizer using active profile safely
    api_profile = settings_manager.get_active_profile()
    optimizer = ContextOptimizer(
        provider=api_profile.type,
        model_name=api_profile.model or "gemini-flash-latest",
        api_key=api_profile.api_key
    )
    
    # 2. Optimize conversation payload
    api_kwargs = optimizer.optimize_history(history, next_instruction)
    
    # 3. Perform the optimized API call
    if optimizer.provider == "google" and optimizer.google_client:
        response = optimizer.google_client.models.generate_content(
            model=optimizer.model_name,
            **api_kwargs
        )
        return response.text
    else:
        # Standard OpenAI/OpenRouter client chat completion
        client = get_llm_client(api_profile)
        response = client.chat.completions.create(
            model=optimizer.model_name,
            messages=api_kwargs.get("messages", []),
            temperature=0.3
        )
        return response.choices[0].message.content
