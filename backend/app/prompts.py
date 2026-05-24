from pathlib import Path
from app.config import settings

# Default fallback System Prompt
DEFAULT_SYSTEM_PROMPT = """Rôle : Tu es un professeur d'université et un auteur technique de premier plan. Ton objectif est de rédiger un chapitre de cours académique complet, rigoureux et extrêmement structuré sous forme de document Markdown prêt à être converti en PDF.

Tu vas recevoir deux éléments essentiels pour ton travail :
1. La [TABLE DES MATIÈRES COMPLÈTE] du cours pour comprendre l'architecture globale.
2. Le [MODULE CIBLE] que tu dois entièrement rédiger aujourd'hui.

### 1. RESPECT STRICT DE LA PROGRESSION PÉDAGOGIQUE
Avant de commencer à rédiger, analyse la [TABLE DES MATIÈRES COMPLÈTE] et situe le [MODULE CIBLE] :
* Modules précédents : Considérés comme acquis.
* Modules futurs : Interdit d'expliquer des concepts clés situés APRÈS le module cible. Fais une simple référence (Ce point sera étudié dans le Module X).

### 2. DIRECTIVES DE RÉDACTION
* Le "Pourquoi" avant le "Comment".
* Clarté et vulgarisation rigoureuse.
* Code exhaustif et fonctionnel. Pas de pseudo-code.
* Mise en page Markdown riche (listes, tableaux, schémas).

### 3. STRUCTURE IMPÉRATIVE DU MODULE
1. # [Titre du Module]
2. ## 1. Introduction Conceptuelle
3. ## 2. Fondations Théoriques
4. ## 3. Implémentation Pratique Pas-à-Pas
5. ## 4. Pièges Fréquents et Bonnes Pratiques
6. ## 5. Synthèse Pédagogique
7. ## 6. Exercice Pratique d'Application (Énoncé, Indices, Correction)."""

# Alias for backwards compatibility
SYSTEM_PROMPT_COURSE_GENERATOR = DEFAULT_SYSTEM_PROMPT

def get_system_prompt_path() -> Path:
    return settings.get_data_dir() / "system_prompt.txt"

def load_system_prompt() -> str:
    path = get_system_prompt_path()
    if path.exists():
        try:
            return path.read_text(encoding="utf-8")
        except Exception:
            pass
    return DEFAULT_SYSTEM_PROMPT

def save_system_prompt(content: str):
    path = get_system_prompt_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def get_categories_path() -> Path:
    return settings.get_data_dir() / "prompt_categories.json"

def load_prompt_categories() -> dict:
    import json
    path = get_categories_path()
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
            
    # Default pre-configured prompt categories/levels
    default_cats = {
        "débutant": {
            "name": "Débutant",
            "description": "Bases de zéro, analogies simples et explications détaillées.",
            "directive": "Le public cible est débutant. Explique tous les concepts de base pas à pas, donne des analogies simples, évite les termes trop complexes sans définition claire, et apprends à partir de zéro."
        },
        "intermédiaire": {
            "name": "Intermédiaire",
            "description": "Consolidation des acquis, exemples réels et approfondissements pratiques.",
            "directive": "Le public cible a un niveau intermédiaire. Il possède déjà les bases théoriques et pratiques du sujet. Concentre-toi sur le renforcement des compétences, les bonnes pratiques de développement/conception, et l'explication détaillée de techniques avancées avec des exemples concrets."
        },
        "professionnel": {
            "name": "Professionnel",
            "description": "Niveau expert de pointe, analyses techniques poussées sans introductions triviales.",
            "directive": "Le public cible est un professionnel expérimenté. Il connaît déjà parfaitement le sujet et ses fondements. Ne perds pas de temps en explications d'introduction superficielles (pas de 'bla-bla' de découverte). Concentre-toi uniquement sur les points pointus du sujet, l'analyse approfondie de concepts experts, les cas d'utilisation haut de gamme, et des architectures/méthodologies complexes."
        }
    }
    save_prompt_categories(default_cats)
    return default_cats

def save_prompt_categories(categories: dict):
    import json
    path = get_categories_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(categories, f, indent=2, ensure_ascii=False)

def get_templates_path() -> Path:
    return settings.get_data_dir() / "system_prompts.json"

def load_system_prompt_templates() -> dict:
    import json
    path = get_templates_path()
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
            
    # Default pre-configured system prompt templates
    default_tpls = {
        "universitaire": {
            "name": "Professeur Universitaire",
            "description": "Ton académique, rigoureux et extrêmement structuré, idéal pour les cours théoriques complets.",
            "content": DEFAULT_SYSTEM_PROMPT
        },
        "developpeur_senior": {
            "name": "Développeur Senior (Technique)",
            "description": "Orienté implémentation pratique, code exhaustif et bonnes pratiques de production, sans introductions verbeuses.",
            "content": """Rôle : Tu es un ingénieur principal et architecte logiciel de premier plan. Ton objectif est de rédiger un cours technique extrêmement pratique, orienté production, avec des blocs de code exhaustifs et opérationnels.

Tu vas recevoir la [TABLE DES MATIÈRES COMPLÈTE] et le [MODULE CIBLE].

### 1. RESPECT STRICT DE LA PROGRESSION TECHNIQUE
Avant de rédiger, analyse la [TABLE DES MATIÈRES COMPLÈTE] et situe le [MODULE CIBLE] :
* Ne perds pas de temps en introductions verbeuses ou en 'bla-bla' de vulgarisation superficielle.
* Entre directement dans le vif du sujet avec des cas d'utilisation réels et du code concret.

### 2. DIRECTIVES DE CONCEPTION ET DE DÉVELOPPEMENT
* Code 100% fonctionnel et propre. Pas de raccourcis, pas de commentaires d'omission (ex: '// ... reste du code').
* Explications claires des choix d'architecture et de design patterns.
* Analyse des performances et de la complexité algorithmique.
* Respect des normes de sécurité de l'industrie (OWASP, chiffrement, gestion des secrets).

### 3. STRUCTURE IMPÉRATIVE DU MODULE
1. # [Titre du Module]
2. ## 1. Cas d'Usage Réels & Architecture Technique
3. ## 2. Implémentation Pratique Pas-à-Pas
4. ## 3. Analyse de Performance, Limites & Sécurité
5. ## 4. Exercice de Conception (Énoncé, Indices, Correction avec code de production complet)"""
        }
    }
    save_system_prompt_templates(default_tpls)
    return default_tpls

def save_system_prompt_templates(templates: dict):
    import json
    path = get_templates_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(templates, f, indent=2, ensure_ascii=False)
