import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from openai import OpenAI
from app.config import settings
from app.settings_manager import settings_manager

logger = logging.getLogger(__name__)

# Pydantic Schemas for Structured JSON Output (TOC)
class SubmoduleSchema(BaseModel):
    id: str = Field(description="Identifiant unique du sous-module (ex: module_1.1)")
    title: str = Field(description="Titre pédagogique et engageant du sous-module")
    file: str = Field(description="Nom du fichier Markdown à générer (ex: module_1.1.md)")

class ModuleSchema(BaseModel):
    id: str = Field(description="Identifiant du module (ex: module_01)")
    title: str = Field(description="Titre global du module")
    submodules: List[SubmoduleSchema] = Field(description="Liste des sous-modules composants ce module")

class CourseTOCSchema(BaseModel):
    title: str = Field(description="Titre global et attractif du cours académique")
    description: str = Field(description="Description concise et engageante du cours (2-3 phrases)")
    modules: List[ModuleSchema] = Field(description="Liste ordonnée des modules constituant le cours")

def call_gemini_api(
    api_key: str, 
    model: str, 
    system_prompt: Optional[str], 
    user_prompt: str, 
    temperature: float = 0.2, 
    response_json: bool = False
) -> tuple[str, dict[str, int]]:
    """
    Calls the Gemini REST API directly using urllib.request.
    """
    model_path = model
    if model_path.startswith("models/"):
        model_path = model_path[7:]
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_path}:generateContent"
    
    payload: Dict[str, Any] = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": temperature
        }
    }
    
    if system_prompt:
        payload["systemInstruction"] = {
            "parts": [{"text": system_prompt}]
        }
        
    if response_json:
        payload["generationConfig"]["responseMimeType"] = "application/json"
        
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key
    }
    
    import urllib.request
    import urllib.error
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        logger.info(f"Sending POST request to Gemini API: {url} with model {model_path}")
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            res_data = json.loads(res_body)
            candidates = res_data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini API")
            
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise ValueError("No text parts in Gemini response")
                
            text = parts[0].get("text", "")
            
            # Extract usage metadata
            usage = res_data.get("usageMetadata", {})
            usage_dict = {
                "prompt_tokens": usage.get("promptTokenCount", 0),
                "completion_tokens": usage.get("candidatesTokenCount", 0),
                "total_tokens": usage.get("totalTokenCount", 0)
            }
            return text, usage_dict
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        logger.error(f"Gemini API HTTP Error {e.code}: {error_body}")
        raise RuntimeError(f"Gemini API error (HTTP {e.code}): {error_body}")
    except Exception as e:
        logger.error(f"Gemini API Exception: {e}")
        raise

def call_bedrock_api(
    api_key: str, 
    base_url: str, 
    model: str, 
    system_prompt: Optional[str], 
    user_prompt: str, 
    temperature: float = 0.2
) -> tuple[str, dict[str, int]]:
    """
    Calls the Amazon Bedrock Converse API using boto3.
    Expects api_key in format "AWS_ACCESS_KEY_ID:AWS_SECRET_ACCESS_KEY" or "AWS_ACCESS_KEY_ID:AWS_SECRET_ACCESS_KEY:AWS_SESSION_TOKEN".
    Expects base_url to be the AWS region name (e.g. "us-east-1").
    """
    import boto3
    
    # Automatically prepend "us." to Amazon Nova model IDs if missing, as AWS requires Cross-Region Inference Profiles
    if model.startswith("amazon.nova-") and not model.startswith("us."):
        model = f"us.{model}"
        logger.info(f"Automatically prefixed Nova model to {model} for Cross-Region Inference Profile support")
        
    aws_access_key_id = None
    aws_secret_access_key = None
    aws_session_token = None
    
    import os
    if api_key and api_key.startswith("ABSK"):
        os.environ["AWS_BEARER_TOKEN_BEDROCK"] = api_key
        logger.info("Using AWS Bedrock API Key bearer token authentication")
    else:
        os.environ.pop("AWS_BEARER_TOKEN_BEDROCK", None)
        
        # Robustly decode base64 AWS credentials if supplied in encoded format
        decoded = None
        if api_key:
            try:
                import base64
                padded_key = api_key + "=" * (4 - len(api_key) % 4)
                decoded_bytes = base64.b64decode(padded_key)
                decoded_str = decoded_bytes.decode("utf-8", errors="ignore")
                decoded_str = "".join(c for c in decoded_str if c.isprintable() or c in ":\n\r\t")
                if ":" in decoded_str:
                    decoded = decoded_str
                    logger.info("Successfully decoded base64 AWS credentials")
            except Exception as e:
                logger.debug(f"AWS api_key is not base64 or failed to decode: {e}")
                
        actual_key = decoded if decoded else api_key
        
        if actual_key and ":" in actual_key:
            parts = actual_key.split(":", 1)
            aws_access_key_id = parts[0].strip()
            rest = parts[1].strip()
            
            if ":" in rest:
                subparts = rest.split(":", 1)
                aws_secret_access_key = subparts[0].strip()
                aws_session_token = subparts[1].strip()
            else:
                aws_secret_access_key = rest
            
    region_name = base_url or "us-east-1"
    
    try:
        logger.info(f"Connecting to AWS Bedrock in region {region_name}...")
        client = boto3.client(
            service_name="bedrock-runtime",
            region_name=region_name,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            aws_session_token=aws_session_token
        )
        
        messages = [
            {
                "role": "user",
                "content": [{"text": user_prompt}]
            }
        ]
        
        system = []
        if system_prompt:
            system = [{"text": system_prompt}]
            
        logger.info(f"Sending request to Bedrock Converse API with model {model}")
        try:
            response = client.converse(
                modelId=model,
                messages=messages,
                system=system,
                inferenceConfig={
                    "temperature": temperature
                }
            )
        except Exception as e:
            error_msg = str(e).lower()
            if "system message" in error_msg or "system messages" in error_msg or "supports system messages" in error_msg:
                logger.warning("Model does not support system messages, retrying by prepending to user prompt...")
                combined_user_prompt = f"{system_prompt}\n\n{user_prompt}" if system_prompt else user_prompt
                messages_retry = [
                    {
                        "role": "user",
                        "content": [{"text": combined_user_prompt}]
                    }
                ]
                response = client.converse(
                    modelId=model,
                    messages=messages_retry,
                    system=[],
                    inferenceConfig={
                        "temperature": temperature
                    }
                )
            else:
                raise
        
        # Safely extract text content to avoid KeyError if multiple blocks are returned or structure differs
        content_blocks = response["output"]["message"]["content"]
        output_text = ""
        for block in content_blocks:
            if "text" in block:
                output_text += block["text"]
                
        if not output_text:
            raise KeyError("No 'text' block found in Bedrock response content.")
            
        usage = response.get("usage", {})
        usage_dict = {
            "prompt_tokens": usage.get("inputTokens", 0),
            "completion_tokens": usage.get("outputTokens", 0),
            "total_tokens": usage.get("totalTokens", 0)
        }
        
        return output_text, usage_dict
    except Exception as e:
        logger.error(f"Amazon Bedrock API Exception: {e}")
        raise RuntimeError(f"Échec de l'appel à Amazon Bedrock: {str(e)}")

def get_llm_client(api_profile: Optional[Any] = None) -> OpenAI:
    """
    Returns an OpenAI client configured based on the active LLM profile or an overridden profile.
    """
    active_profile = api_profile or settings_manager.get_active_profile()
    api_key = active_profile.api_key
    if not api_key:
        api_key = "dummy_key"
        
    return OpenAI(
        api_key=api_key,
        base_url=active_profile.base_url
    )


def generate_toc(
    subject: str, 
    api_profile: Optional[Any] = None, 
    override_model: Optional[str] = None
) -> tuple[dict[str, Any], dict[str, int]]:
    """
    Generates a structured Table of Contents (TOC) in JSON format for the given subject.
    Uses Structured Outputs if supported by the provider, otherwise falls back to standard JSON mode.
    """
    active_profile = api_profile or settings_manager.get_active_profile()
    profile_model = override_model or active_profile.model or "gemini-flash-latest"
    
    prompt = f"""Tu es un concepteur de programmes universitaires de premier plan.
Génére une table des matières (TOC) extrêmement structurée, progressive et complète pour un cours académique sur le sujet suivant : "{subject}".

Le cours doit être divisé en 3 à 5 Modules principaux. Chaque Module principal doit contenir entre 2 et 4 Sous-modules.
Sois précis dans les titres pour assurer une progression pédagogique logique.

Tu DOIS impérativement répondre sous la forme d'un objet JSON contenant :
- un "title" (le titre du cours)
- une "description" (le résumé pédagogique)
- une liste de "modules"
Chaque module a un "id", "title" et une liste de "submodules".
Chaque sous-module a un "id", "title" et "file".
"""

    if active_profile.type == "gemini":
        logger.info(f"Generating TOC using Gemini REST API with model {profile_model}")
        try:
            content, usage = call_gemini_api(
                api_key=active_profile.api_key,
                model=profile_model,
                system_prompt="Tu es un assistant spécialisé dans la génération de plans d'études universitaires structurés en JSON.",
                user_prompt=prompt,
                temperature=0.2,
                response_json=True
            )
            content_clean = content.strip()
            if content_clean.startswith("```"):
                lines = content_clean.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                content_clean = "\n".join(lines).strip()
            
            toc_data = json.loads(content_clean)
            if "title" not in toc_data or "modules" not in toc_data:
                raise ValueError("Le JSON généré ne contient pas les champs requis.")
            return toc_data, usage
        except Exception as e:
            logger.error(f"Gemini TOC generation error: {e}")
            raise RuntimeError(f"Échec de la génération de la Table des Matières avec Gemini: {str(e)}")

    elif active_profile.type == "aws_bedrock":
        logger.info(f"Generating TOC using Amazon Bedrock with model {profile_model}")
        try:
            content, usage = call_bedrock_api(
                api_key=active_profile.api_key,
                base_url=active_profile.base_url,
                model=profile_model,
                system_prompt="Tu es un assistant spécialisé dans la génération de plans d'études universitaires structurés en JSON.",
                user_prompt=prompt,
                temperature=0.2
            )
            content_clean = content.strip()
            if content_clean.startswith("```"):
                lines = content_clean.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                content_clean = "\n".join(lines).strip()
            
            toc_data = json.loads(content_clean)
            if "title" not in toc_data or "modules" not in toc_data:
                raise ValueError("Le JSON généré ne contient pas les champs requis.")
            return toc_data, usage
        except Exception as e:
            logger.error(f"Bedrock TOC generation error: {e}")
            raise RuntimeError(f"Échec de la génération de la Table des Matières avec Bedrock: {str(e)}")

    client = get_llm_client(active_profile)
    usage_dict = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    try:
        # Attempt to use OpenAI's beta.chat.completions.parse for strict Pydantic validation
        logger.info(f"Attempting structured outputs using pydantic schema with model {profile_model}...")
        response = client.beta.chat.completions.parse(
            model=profile_model,
            messages=[
                {"role": "system", "content": "Tu es un assistant spécialisé dans la génération de plans d'études universitaires structurés."},
                {"role": "user", "content": prompt}
            ],
            response_format=CourseTOCSchema,
            temperature=0.2
        )
        
        parsed_data = response.choices[0].message.parsed
        if response.usage:
            usage_dict = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        if parsed_data:
            return parsed_data.model_dump(), usage_dict
            
    except Exception as e:
        logger.warning(f"Structured outputs failed, falling back to standard JSON mode: {e}")
        
    # Fallback to standard JSON Mode
    try:
        response_format = {"type": "json_object"}
        # Add JSON instructions to the prompt to satisfy models requiring it
        prompt_with_json = prompt + "\nRéponds exclusivement en format JSON valide. Le mot 'json' doit être mentionné dans ton invite."
        
        response = client.chat.completions.create(
            model=profile_model,
            messages=[
                {"role": "system", "content": "Tu es un assistant spécialisé dans la génération de plans d'études universitaires structurés en JSON."},
                {"role": "user", "content": prompt_with_json}
            ],
            response_format=response_format,
            temperature=0.2
        )
        
        if response.usage:
            usage_dict = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Le LLM a renvoyé une réponse vide.")
            
        content_clean = content.strip()
        if content_clean.startswith("```"):
            lines = content_clean.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            content_clean = "\n".join(lines).strip()
            
        toc_data = json.loads(content_clean)
        # Validate that basic keys exist, otherwise raise error
        if "title" not in toc_data or "modules" not in toc_data:
            raise ValueError("Le JSON généré ne contient pas les champs requis.")
        return toc_data, usage_dict
        
    except Exception as e:
        logger.error(f"Erreur fatale lors de la génération de la TOC: {e}")
        raise RuntimeError(f"Échec de la génération de la Table des Matières: {str(e)}")


def generate_submodule(
    system_prompt: str, 
    toc: Dict[str, Any], 
    target_module: Dict[str, Any],
    api_profile: Optional[Any] = None,
    override_model: Optional[str] = None
) -> tuple[str, dict[str, int]]:
    """
    Generates a full Markdown chapter for a target sub-module using the provided iterative generation pipeline.
    """
    active_profile = api_profile or settings_manager.get_active_profile()
    profile_model = override_model or active_profile.model or "gemini-flash-latest"
    
    user_prompt = f"""Voici les informations nécessaires pour rédiger le chapitre d'aujourd'hui :

[TABLE DES MATIÈRES COMPLÈTE DU COURS] :
{json.dumps(toc, indent=2, ensure_ascii=False)}

[MODULE CIBLE À RÉDIGER] :
ID: {target_module.get('id')}
Titre: {target_module.get('title')}
Fichier: {target_module.get('file')}

Rédige ce module dans son intégralité sous forme de document Markdown complet, selon la structure impérative du prompt système. Ne mets aucun texte d'introduction ni de bla-bla hors du Markdown.
"""

    if active_profile.type == "gemini":
        logger.info(f"Generating submodule using Gemini REST API with model {profile_model}")
        return call_gemini_api(
            api_key=active_profile.api_key,
            model=profile_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.4
        )

    elif active_profile.type == "aws_bedrock":
        logger.info(f"Generating submodule using Amazon Bedrock with model {profile_model}")
        return call_bedrock_api(
            api_key=active_profile.api_key,
            base_url=active_profile.base_url,
            model=profile_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.4
        )

    client = get_llm_client(active_profile)
    response = client.chat.completions.create(
        model=profile_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.4
    )
    
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Le LLM a renvoyé un contenu vide pour le sous-module.")
        
    usage_dict = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    if response.usage:
        usage_dict = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
    return content.strip(), usage_dict


def generate_exercises(
    submodule_title: str, 
    submodule_content: str,
    api_profile: Optional[Any] = None,
    override_model: Optional[str] = None
) -> tuple[str, dict[str, int]]:
    """
    Generates high-quality targeted exercises, hints, and corrections in a separate markdown file.
    """
    active_profile = api_profile or settings_manager.get_active_profile()
    profile_model = override_model or active_profile.model or "gemini-flash-latest"
    
    system_prompt = """Rôle : Tu es un enseignant assistant et un concepteur d'exercices académiques. Ton but est de rédiger un cahier d'exercices pratiques sous forme de document Markdown prêt à l'emploi.
Tu vas recevoir le titre et le contenu d'un cours théorique. Tu dois rédiger 2 à 3 exercices d'application directe de difficulté progressive.

Pour chaque exercice, tu dois fournir :
1. L'énoncé complet (avec un cas pratique ou un problème concret).
2. Un ou deux indices pédagogiques (pour aider sans donner la réponse).
3. Une correction détaillée pas-à-pas (avec code complet ou calculs détaillés si nécessaire).

Structure de ton document Markdown :
# Exercices d'Application : [Titre du Module]

## Exercice 1 : [Nom de l'exercice 1]
### Énoncé
...
### Indices
...
### Correction Détaillée
...

## Exercice 2 : [Nom de l'exercice 2]
...
"""

    user_prompt = f"""Voici le contenu théorique du cours pour lequel tu dois concevoir les exercices :

[TITRE DU MODULE] : {submodule_title}

[CONTENU DU MODULE] :
{submodule_content}

Génère les exercices d'application directe sous forme de fichier Markdown propre.
"""

    if active_profile.type == "gemini":
        logger.info(f"Generating exercises using Gemini REST API with model {profile_model}")
        return call_gemini_api(
            api_key=active_profile.api_key,
            model=profile_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.5
        )

    elif active_profile.type == "aws_bedrock":
        logger.info(f"Generating exercises using Amazon Bedrock with model {profile_model}")
        return call_bedrock_api(
            api_key=active_profile.api_key,
            base_url=active_profile.base_url,
            model=profile_model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.5
        )

    client = get_llm_client(active_profile)
    response = client.chat.completions.create(
        model=profile_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.5
    )
    
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Le LLM a renvoyé un contenu vide pour les exercices.")
        
    usage_dict = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    if response.usage:
        usage_dict = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
    return content.strip(), usage_dict


def fetch_available_models(api_profile: Any) -> List[str]:
    """
    Dynamically fetches available models from the provider's API.
    Falls back to a high-quality list of predefined models on failure.
    """
    import urllib.request
    import json
    
    provider_type = api_profile.type
    api_key = api_profile.api_key
    base_url = api_profile.base_url
    
    # Predefined fallbacks
    fallbacks = {
        "openai": ["gpt-4o-mini", "gpt-4o", "o1-mini", "gpt-3.5-turbo"],
        "openrouter": [
            "nousresearch/hermes-3-llama-3.1-405b:free",
            "meta-llama/llama-3.1-70b-instruct:free",
            "google/gemini-flash-1.5-exp:free",
            "deepseek/deepseek-chat",
            "meta-llama/llama-3-8b-instruct:free"
        ],
        "gemini": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest", "gemini-pro-latest"],
        "ollama": ["llama3", "mistral", "phi3", "gemma2"],
        "aws_bedrock": [
            "us.amazon.nova-pro-v1:0",
            "us.amazon.nova-lite-v1:0",
            "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            "us.meta.llama3-1-70b-instruct-v1:0"
        ]
    }
    
    try:
        if provider_type == "openai":
            url = f"{base_url.rstrip('/')}/models"
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
            with urllib.request.urlopen(req, timeout=4) as response:
                data = json.loads(response.read().decode("utf-8"))
                models = [m["id"] for m in data.get("data", [])]
                # Filter to only return typical text-chat models
                chat_models = [m for m in models if any(x in m for x in ["gpt-4", "gpt-3", "o1", "o3", "chat"])]
                return chat_models if chat_models else models[:8]
                
        elif provider_type == "openrouter":
            url = "https://openrouter.ai/api/v1/models"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=4) as response:
                data = json.loads(response.read().decode("utf-8"))
                models = [m["id"] for m in data.get("data", [])]
                # Sort free models first, then common premium models
                free_models = [m for m in models if "free" in m]
                popular_paid = [m for m in models if any(p in m for p in ["gpt-4o", "claude-3-5-sonnet", "deepseek-chat"])]
                result = free_models + popular_paid
                return result if result else models[:10]
                
        elif provider_type == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            with urllib.request.urlopen(url, timeout=4) as response:
                data = json.loads(response.read().decode("utf-8"))
                return [m["name"].replace("models/", "") for m in data.get("models", []) if "generateContent" in m.get("supportedGenerationMethods", [])]
                
        elif provider_type == "ollama":
            # Extract root host from standard /v1 OpenAI-compatible proxy URL
            # http://host.docker.internal:11434/v1 -> http://host.docker.internal:11434
            base = base_url.replace("/v1", "")
            url = f"{base.rstrip('/')}/api/tags"
            with urllib.request.urlopen(url, timeout=4) as response:
                data = json.loads(response.read().decode("utf-8"))
                return [m["name"] for m in data.get("models", [])]
                
        elif provider_type == "aws_bedrock":
            import boto3
            aws_access_key_id = None
            aws_secret_access_key = None
            aws_session_token = None
            
            import os
            if api_key and api_key.startswith("ABSK"):
                os.environ["AWS_BEARER_TOKEN_BEDROCK"] = api_key
            else:
                os.environ.pop("AWS_BEARER_TOKEN_BEDROCK", None)
                
                # Robustly decode base64 AWS credentials if supplied in encoded format
                decoded = None
                if api_key:
                    try:
                        import base64
                        padded_key = api_key + "=" * (4 - len(api_key) % 4)
                        decoded_bytes = base64.b64decode(padded_key)
                        decoded_str = decoded_bytes.decode("utf-8", errors="ignore")
                        decoded_str = "".join(c for c in decoded_str if c.isprintable() or c in ":\n\r\t")
                        if ":" in decoded_str:
                            decoded = decoded_str
                    except Exception as e:
                        pass
                        
                actual_key = decoded if decoded else api_key
                
                if actual_key and ":" in actual_key:
                    parts = actual_key.split(":", 1)
                    aws_access_key_id = parts[0].strip()
                    rest = parts[1].strip()
                    
                    if ":" in rest:
                        subparts = rest.split(":", 1)
                        aws_secret_access_key = subparts[0].strip()
                        aws_session_token = subparts[1].strip()
                    else:
                        aws_secret_access_key = rest
            region_name = base_url or "us-east-1"
            client = boto3.client(
                service_name="bedrock",
                region_name=region_name,
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                aws_session_token=aws_session_token
            )
            response = client.list_foundation_models(byOutputModality="TEXT")
            models = []
            for m in response.get("modelSummaries", []):
                model_id = m["modelId"]
                # Prepend "us." to Amazon models automatically to use cross-region inference profiles
                if model_id.startswith("amazon.nova-") or model_id.startswith("anthropic.claude-"):
                    models.append(f"us.{model_id}")
                else:
                    models.append(model_id)
            return models
            
    except Exception as e:
        logger.warning(f"Failed to dynamically query models list for provider {provider_type}: {e}")
        
    return fallbacks.get(provider_type, ["custom"])
