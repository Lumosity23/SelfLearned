import os
import sys
import json
import shutil
from pathlib import Path

# Add app to path
sys.path.append(str(Path(__file__).parent))

print("=== DEBUT DES TESTS DU BACKEND ===")

# Test 1: Import modules
print("1. Vérification des imports...")
try:
    from app.config import settings
    from app.llm import generate_toc
    from app.pipeline import run_generation_pipeline, jobs_status, slugify
    from app.pdf import compile_course_to_pdf
    from app.main import app
    print("   [OK] Tous les modules importés avec succès.")
except Exception as e:
    print(f"   [ERREUR] Échec de l'import: {e}")
    sys.exit(1)

# Test 2: Test du compilateur PDF avec des données de simulation (mock)
print("2. Test du moteur de génération PDF (xhtml2pdf & markdown)...")
try:
    # Setup a mock course directory in the temporary data folder
    test_data_dir = Path(__file__).parent / "SelfLearned_Data_Test"
    if test_data_dir.exists():
        shutil.rmtree(test_data_dir)
    test_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Temporarily override settings
    settings.DATA_DIR = str(test_data_dir)
    
    course_id = "test-course-quantum"
    course_dir = test_data_dir / course_id
    course_dir.mkdir(parents=True, exist_ok=True)
    
    # 2.1 Write a mock toc.json
    mock_toc = {
        "title": "Introduction à la Mécanique Quantique",
        "description": "Un cours fondamental sur la physique quantique et ses applications modernes.",
        "modules": [
            {
                "id": "module_01",
                "title": "Les Fondations de la Dualité",
                "submodules": [
                    {
                        "id": "module_1.1",
                        "title": "La Dualité Onde-Corpuscule",
                        "file": "module_1.1.md"
                    }
                ]
            }
        ]
    }
    with open(course_dir / "toc.json", "w", encoding="utf-8") as f:
        json.dump(mock_toc, f, indent=2, ensure_ascii=False)
        
    # 2.2 Write a mock submodule file
    module_01_dir = course_dir / "module_01"
    module_01_dir.mkdir(parents=True, exist_ok=True)
    
    mock_markdown = """# La Dualité Onde-Corpuscule

## 1. Introduction Conceptuelle
La dualité onde-corpuscule est un principe fondamental de la physique quantique selon lequel tous les objets physiques peuvent présenter à la fois des propriétés ondulatoires et des propriétés corpusculaires.

## 2. Fondations Théoriques
La relation de De Broglie relie la longueur d'onde $\lambda$ à l'impulsion $p$ :
$$\lambda = \frac{h}{p}$$

## 3. Implémentation Pratique Pas-à-Pas
Voici un exemple d'implémentation en Python pour simuler l'expérience des fentes de Young :
```python
import numpy as np

def simulate_young_slits(slits_distance, wavelength, screen_distance):
    # Simulation simplifiée
    return np.random.normal(0, 1, 1000)
```

## 4. Pièges Fréquents et Bonnes Pratiques
* **Piège** : Croire que l'objet est *soit* une onde, *soit* une particule.
* **Réalité** : Il est les deux à la fois jusqu'à la mesure.

## 5. Synthèse Pédagogique
Ce chapitre a introduit la nature double de la matière à l'échelle quantique.
"""
    with open(module_01_dir / "module_1.1.md", "w", encoding="utf-8") as f:
        f.write(mock_markdown)
        
    # 2.3 Write a mock exercise file
    mock_exercise = """# Exercices d'Application : La Dualité Onde-Corpuscule

## Exercice 1 : Calcul de la longueur d'onde de De Broglie
### Énoncé
Calculez la longueur d'onde de De Broglie pour un électron se déplaçant à $10^6$ m/s.
### Indices
Utilisez la formule $\lambda = h / mv$ avec $h \approx 6.626 \times 10^{-34}$ J.s et $m_e \approx 9.1 \times 10^{-31}$ kg.
### Correction Détaillée
$$\lambda = \frac{6.626 \times 10^{-34}}{9.1 \times 10^{-31} \times 10^6} \approx 7.28 \times 10^{-10} \text{ m} = 0.728 \text{ nm}$$
"""
    with open(module_01_dir / "exo_module_1.1.md", "w", encoding="utf-8") as f:
        f.write(mock_exercise)
        
    # 2.4 Compile to PDF
    print("   Compilation du PDF de test...")
    pdf_bytes = compile_course_to_pdf(course_id)
    
    if pdf_bytes and len(pdf_bytes) > 0:
        pdf_path = course_dir / f"{course_id}.pdf"
        print(f"   [OK] Fichier PDF généré avec succès dans {pdf_path} (taille: {len(pdf_bytes)} octets).")
    else:
        print("   [ERREUR] Le PDF compilé est vide.")
        sys.exit(1)
        
    # Cleanup test data directory
    shutil.rmtree(test_data_dir)
    print("   [OK] Nettoyage des fichiers temporaires de test effectué.")
    
except Exception as e:
    print(f"   [ERREUR] Échec lors du test PDF: {e}")
    sys.exit(1)

print("\n=== TESTS DU BACKEND REUSSIS AVEC SUCCÈS ! ===")
sys.exit(0)
