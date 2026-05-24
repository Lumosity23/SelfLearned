# Module 2.1 : Shaders et compilation en bytecode SPIR-V

---

## 1. Introduction Conceptuelle

Dans les API graphiques historiques comme OpenGL, la programmation des processeurs de la carte graphique (les **GPUs**) s'effectuait en soumettant directement le code source des shaders (généralement écrit en GLSL) sous forme de chaînes de caractères textuelles. Le pilote de la carte graphique embarquait alors son propre compilateur pour traduire, à la volée et lors de l'exécution de l'application, ce texte en instructions machines spécifiques à l'architecture du GPU hôte.

Bien que flexible, cette approche présentait des inconvénients majeurs :
1. **Temps de chargement imprévisibles** : La compilation de shaders complexes au lancement d'un jeu ou d'une application CAO provoquait des micro-saccades (*stuttering*) ou des temps de chargement excessivement longs.
2. **Incohérence des pilotes** : Chaque constructeur de GPU (NVIDIA, AMD, Intel) implémentait son propre compilateur GLSL. Un shader fonctionnant parfaitement sur une machine pouvait générer des erreurs de syntaxe ou des comportements indéfinis sur une autre à cause de divergences d'interprétation de la norme.
3. **Exposition de la propriété intellectuelle** : Distribuer du code source de shader en clair dans les fichiers de l'application facilitait le vol de technologies et le rétro-ingénierie.

### La solution Vulkan : SPIR-V

Vulkan résout radicalement ces problèmes en introduisant un standard intermédiaire nommé **SPIR-V** (*Standard Portable Intermediate Representation - V*). 

```
+------------------+
|  Code GLSL/HLSL  |  (Écrit par le développeur)
+------------------+
         |
         | [Compilateur Hors-ligne : glslc / dxc]
         v
+------------------+
| Bytecode SPIR-V  |  (Fichier binaire .spv universel distribué avec l'application)
+------------------+
         |
         | [API Vulkan : VkShaderModule]
         v
+------------------+
|  Pilote GPU      |  (Traduction ultra-rapide en instructions spécifiques au GPU)
+------------------+
         |
         v
+------------------+
| Matériel (GPU)   |  (Exécution physique)
+------------------+
```

SPIR-V est un format binaire intermédiaire, indépendant de la plateforme et du constructeur. Le développeur compile désormais ses shaders **hors-ligne** (pendant la phase de build de l'application) à l'aide d'un compilateur externe. Vulkan ne reçoit donc jamais de code GLSL textuel, mais uniquement ce bytecode binaire pré-analysé et optimisé.

### Pourquoi cette approche est-elle supérieure ?
* **Performance** : Le pilote GPU n'a plus besoin d'analyser la syntaxe du code. Il se contente de traduire un bytecode structuré en instructions machines, ce qui est extrêmement rapide.
* **Fiabilité** : Les erreurs de syntaxe sont détectées lors de la compilation hors-ligne sur la machine du développeur, et non chez l'utilisateur final.
* **Portabilité** : Le compilateur de référence étant unique (géré par le groupe Khronos), le comportement du bytecode est garanti identique sur tous les pilotes conformes à la spécification Vulkan.
* **Flexibilité linguistique** : Bien que le GLSL reste le langage de choix, n'importe quel langage capable de compiler vers SPIR-V (comme le HLSL de Microsoft ou même des langages expérimentaux comme Rust via *rust-gpu*) peut être utilisé pour programmer des shaders Vulkan.

---

## 2. Fondations Théoriques

### Les étapes de la Pipeline Graphique (Shader Stages)

La pipeline graphique de Vulkan est composée de plusieurs étapes, certaines étant configurables (fonctions fixes, étudiées dans le *Module 2.2*), d'autres étant entièrement programmables via des shaders. Pour afficher notre premier triangle, nous devons obligatoirement implémenter deux types de shaders :

1. **Le Vertex Shader (Shader de Sommets)** : 
   * **Rôle** : Traiter individuellement chaque sommet (*vertex*) géométrique.
   * **Entrées** : Les attributs du sommet (coordonnées 3D, couleurs, coordonnées de texture).
   * **Sorties** : La position finale du sommet dans l'espace de projection homogène (écrite dans la variable système globale `gl_Position`) et des variables personnalisées à transmettre à l'étape suivante.
   * **Fréquence d'exécution** : Une fois par sommet soumis au GPU.

2. **Le Fragment Shader (Shader de Pixels)** :
   * **Rôle** : Déterminer la couleur finale de chaque pixel potentiel (appelé *fragment*) couvert par la géométrie projetée à l'écran.
   * **Entrées** : Les variables interpolées en provenance du Vertex Shader (par exemple, si un sommet est rouge et l'autre bleu, le fragment shader recevra une couleur intermédiaire violette selon sa position sur le triangle).
   * **Sorties** : La couleur finale du fragment (généralement écrite dans une variable de sortie liée à un framebuffer).
   * **Fréquence d'exécution** : Potentiellement des millions de fois par seconde, pour chaque pixel couvert par un triangle après l'étape de rastérisation.

### Structure du format SPIR-V

Un fichier SPIR-V (`.spv`) est une suite de mots de 32 bits (4 octets). Il commence par un en-tête fixe contenant :
* Un nombre magique (`0x07230203`) permettant d'identifier le format.
* La version de la spécification SPIR-V utilisée.
* L'identifiant du générateur (par exemple, le compilateur Khronos).
* Les limites d'ID internes utilisées pour l'allocation des registres virtuels.

Le reste du fichier contient des instructions sous forme de *bytecodes* structurés (déclaration des capacités requises, des points d'entrée, des types de données, des variables globales, puis le code d'exécution proprement dit).

### L'objet Vulkan : `VkShaderModule`

Pour exploiter ce bytecode SPIR-V, Vulkan fournit un objet opaque appelé `VkShaderModule`. Cet objet encapsule le code binaire en mémoire CPU et le prépare à être lié à la pipeline graphique. 

Il est crucial de comprendre que `VkShaderModule` n'est qu'un simple conteneur de code. Il ne définit pas encore si le shader est utilisé comme un vertex shader ou un fragment shader, ni comment les variables d'entrée/sortie sont connectées. Cette configuration finale s'effectue lors de la création de la pipeline globale via la structure `VkPipelineShaderStageCreateInfo`.

---

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Écriture des Shaders en GLSL (Vulkan-compliant)

Pour éviter d'introduire la complexité de la gestion des tampons mémoire (buffers) dès maintenant (ce qui sera traité dans un module ultérieur), nous allons concevoir des shaders dits "autonomes". Les coordonnées et les couleurs des sommets du triangle seront directement codées en dur à l'intérieur du Vertex Shader.

Créez un fichier nommé `shader.vert` (extension conventionnelle pour les Vertex Shaders) :

```glsl
#version 450 // Spécifie l'utilisation de GLSL version 4.5

// Variable de sortie interpolée vers le Fragment Shader
// L'attribut 'layout(location = 0)' est obligatoire sous Vulkan pour lier les variables entre étapes
layout(location = 0) out vec3 fragColor;

// Tableau de positions en coordonnées normalisées de périphérique (NDC)
// Sous Vulkan, l'axe Y pointe vers le BAS, contrairement à OpenGL
vec2 positions[3] = vec2[](
    vec2(0.0, -0.5),  // Sommet supérieur (milieu)
    vec2(0.5, 0.5),   // Sommet inférieur droit
    vec2(-0.5, 0.5)   // Sommet inférieur gauche
);

// Tableau de couleurs associées à chaque sommet (Rouge, Vert, Bleu)
vec3 colors[3] = vec3[](
    vec3(1.0, 0.0, 0.0), // Rouge
    vec3(0.0, 1.0, 0.0), // Vert
    vec3(0.0, 0.0, 1.0)  // Bleu
);

void main() {
    // gl_VertexIndex est une variable intégrée contenant l'index du sommet en cours de traitement (0, 1 ou 2)
    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
    
    // Transmission de la couleur correspondante au Fragment Shader
    fragColor = colors[gl_VertexIndex];
}
```

Créez ensuite un fichier nommé `shader.frag` (extension conventionnelle pour les Fragment Shaders) :

```glsl
#version 450

// Variable d'entrée interpolée en provenance du Vertex Shader
// L'index de 'location' doit correspondre exactement à celui du Vertex Shader (0)
layout(location = 0) in vec3 fragColor;

// Variable de sortie : la couleur finale du pixel (RGBA)
// 'location = 0' indique que cette couleur s'adresse au premier framebuffer de rendu
layout(location = 0) out vec4 outColor;

void main() {
    // Affectation de la couleur interpolée avec une opacité de 1.0 (totalement opaque)
    outColor = vec4(fragColor, 1.0);
}
```

### Étape 2 : Compilation des Shaders en SPIR-V via la ligne de commande

Pour compiler ces fichiers sources en bytecode SPIR-V, nous utilisons l'outil `glslc`, qui est le compilateur officiel fourni par Google et inclus par défaut dans le **Vulkan SDK**.

Ouvrez votre terminal dans le dossier contenant vos fichiers shaders et exécutez les commandes suivantes :

```bash
# Compilation du Vertex Shader
glslc shader.vert -o vert.spv

# Compilation du Fragment Shader
glslc shader.frag -o frag.spv
```

Si aucune erreur de syntaxe n'est présente, deux nouveaux fichiers binaires sont générés : `vert.spv` et `frag.spv`. Ce sont ces fichiers que notre programme C++ va charger.

### Étape 3 : Chargement robuste du binaire en C++

Pour lire ces fichiers binaires de manière optimale et sécurisée en C++, nous allons implémenter une fonction utilitaire utilisant la bibliothèque standard `<fstream>`.

```cpp
#include <fstream>
#include <vector>
#include <string>
#include <iostream>
#include <stdexcept>

// Fonction lisant l'intégralité d'un fichier binaire et le retournant sous forme de vecteur d'octets
std::vector<char> readFile(const std::string& filename) {
    // std::ios::ate : ouvre le fichier et place le curseur de lecture directement à la fin
    // std::ios::binary : ouvre le fichier en mode binaire (évite les traductions de caractères de fin de ligne)
    std::ifstream file(filename, std::ios::ate | std::ios::binary);

    if (!file.is_open()) {
        throw std::runtime_error("Échec de l'ouverture du fichier shader : " + filename);
    }

    // Grâce à std::ios::ate, la position actuelle du curseur correspond à la taille du fichier en octets
    size_t fileSize = (size_t) file.tellg();
    std::vector<char> buffer(fileSize);

    // On replace le curseur au début du fichier pour commencer la lecture effective
    file.seekg(0);
    file.read(buffer.data(), fileSize);

    // Fermeture du flux de fichier
    file.close();

    return buffer;
}
```

### Étape 4 : Création du `VkShaderModule`

Le bytecode SPIR-V chargé en mémoire doit être transmis à l'API Vulkan. C'est ici qu'intervient la structure `VkShaderModuleCreateInfo`.

Un point technique crucial doit être soulevé : la spécification de Vulkan exige que le pointeur vers le code binaire (`pCode`) soit aligné sur **4 octets** (type `uint32_t*`), alors que notre fonction de lecture retourne un tableau d'octets génériques (`char*`, aligné sur 1 octet). Heureusement, l'allocateur par défaut de `std::vector` garantit un alignement mémoire suffisant pour stocker n'importe quel type de données de base, ce qui rend le cast sécurisé si nous prenons des précautions.

Voici la fonction C++ permettant de créer un `VkShaderModule` à partir du tampon d'octets :

```cpp
#include <vulkan/vulkan.h>

VkShaderModule createShaderModule(VkDevice device, const std::vector<char>& code) {
    VkShaderModuleCreateInfo createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
    createInfo.pNext = nullptr;
    createInfo.flags = 0;
    
    // Taille du code en octets
    createInfo.codeSize = code.size();
    
    // Cast du pointeur char* vers uint32_t* pour satisfaire l'alignement requis par Vulkan
    createInfo.pCode = reinterpret_cast<const uint32_t*>(code.data());

    VkShaderModule shaderModule;
    // vkCreateShaderModule prend en paramètres :
    // 1. Le périphérique logique (VkDevice) créé lors des étapes précédentes (Module 1.1)
    // 2. Un pointeur vers la structure de configuration
    // 3. Un pointeur vers des allocateurs personnalisés (nullptr ici)
    // 4. Un pointeur vers la variable qui recevra le handle de l'objet créé
    VkResult result = vkCreateShaderModule(device, &createInfo, nullptr, &shaderModule);
    
    if (result != VK_SUCCESS) {
        throw std::runtime_error("Échec de la création du module de shader ! Code erreur : " + std::to_string(result));
    }

    return shaderModule;
}
```

### Étape 5 : Configuration des étapes de pipeline (`VkPipelineShaderStageCreateInfo`)

Une fois les modules créés, nous devons spécifier à Vulkan comment ils s'intègrent dans la pipeline de rendu graphique. Pour chaque shader, nous devons remplir une structure `VkPipelineShaderStageCreateInfo`.

Voici comment configurer l'étape du Vertex Shader et du Fragment Shader dans votre code principal :

```cpp
// 1. Chargement des fichiers binaires SPIR-V
std::vector<char> vertShaderCode = readFile("shaders/vert.spv");
std::vector<char> fragShaderCode = readFile("shaders/frag.spv");

// 2. Création des modules Vulkan correspondants
// Note : 'device' est le VkDevice logique préalablement initialisé
VkShaderModule vertShaderModule = createShaderModule(device, vertShaderCode);
VkShaderModule fragShaderModule = createShaderModule(device, fragShaderCode);

// 3. Configuration de l'étape Vertex Shader
VkPipelineShaderStageCreateInfo vertShaderStageInfo{};
vertShaderStageInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
vertShaderStageInfo.pNext = nullptr;
vertShaderStageInfo.flags = 0;
// Indique que cette structure configure l'étape Vertex
vertShaderStageInfo.stage = VK_SHADER_STAGE_VERTEX_BIT;
// Le module contenant le code
vertShaderStageInfo.module = vertShaderModule;
// Le nom de la fonction d'entrée (entry point) définie dans le code GLSL
vertShaderStageInfo.pName = "main";
// pSpecializationInfo permet de définir des constantes de spécialisation au moment de la compilation de la pipeline.
// Nous n'en utilisons pas pour le moment, donc nous passons nullptr.
vertShaderStageInfo.pSpecializationInfo = nullptr;

// 4. Configuration de l'étape Fragment Shader
VkPipelineShaderStageCreateInfo fragShaderStageInfo{};
fragShaderStageInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
fragShaderStageInfo.pNext = nullptr;
fragShaderStageInfo.flags = 0;
// Indique que cette structure configure l'étape Fragment
fragShaderStageInfo.stage = VK_SHADER_STAGE_FRAGMENT_BIT;
fragShaderStageInfo.module = fragShaderModule;
fragShaderStageInfo.pName = "main";
fragShaderStageInfo.pSpecializationInfo = nullptr;

// 5. Regroupement des configurations dans un tableau pour la création ultérieure de la pipeline
VkPipelineShaderStageCreateInfo shaderStages[] = { vertShaderStageInfo, fragShaderStageInfo };
```

### Étape 6 : Nettoyage des ressources

Une fois que la pipeline graphique globale (`VkPipeline`) a été compilée avec succès (ce qui sera traité dans le *Module 2.2*), le bytecode SPIR-V a été entièrement traduit en instructions machines spécifiques au GPU hôte. 

Les objets intermédiaires `VkShaderModule` ne sont alors plus nécessaires en mémoire. Vous devez impérativement libérer ces ressources pour éviter les fuites de mémoire.

```cpp
// Libération des modules de shader
vkDestroyShaderModule(device, fragShaderModule, nullptr);
vkDestroyShaderModule(device, vertShaderModule, nullptr);
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 1. Le piège de l'alignement mémoire de `pCode`
Comme mentionné précédemment, `VkShaderModuleCreateInfo::pCode` attend un pointeur de type `const uint32_t*`. Si vous lisez votre fichier dans un `std::vector<char>`, la mémoire sous-jacente pourrait théoriquement ne pas être alignée sur une frontière de 4 octets sur certaines architectures exotiques. 
* **Bonne pratique** : Pour une sécurité absolue, vous pouvez lire directement le fichier dans un `std::vector<uint32_t>`. La taille du vecteur doit alors être ajustée car chaque élément fait 4 octets au lieu d'un.
```cpp
std::vector<uint32_t> readShaderFileSecure(const std::string& filename) {
    std::ifstream file(filename, std::ios::ate | std::ios::binary);
    if (!file.is_open()) throw std::runtime_error("Erreur d'ouverture");
    
    size_t fileSize = (size_t)file.tellg();
    // On s'assure que la taille est bien un multiple de 4 octets
    if (fileSize % 4 != 0) throw std::runtime_error("Fichier SPIR-V corrompu (taille non alignée)");

    std::vector<uint32_t> buffer(fileSize / 4);
    file.seekg(0);
    file.read(reinterpret_cast<char*>(buffer.data()), fileSize);
    file.close();
    return buffer;
}
```

### 2. Durée de vie des modules de shader
Un piège classique consiste à détruire les `VkShaderModule` trop tôt, par exemple juste après avoir rempli la structure `VkPipelineShaderStageCreateInfo` mais *avant* d'avoir effectivement appelé la fonction de création de la pipeline (`vkCreateGraphicsPipelines`). 
* **Règle absolue** : Les modules de shader doivent rester valides et ne pas être détruits tant que la pipeline graphique qui les utilise n'a pas été entièrement créée.

### 3. Gestion des chemins d'accès relatifs
Lors de l'exécution de votre programme C++, le répertoire de travail par défaut peut varier selon que vous lancez l'application depuis votre IDE (Visual Studio, CLion) ou directement depuis le terminal. Si l'application ne trouve pas les fichiers `.spv`, elle plantera immédiatement.
* **Bonne pratique** : Utilisez des chemins absolus générés dynamiquement ou configurez le répertoire de travail de votre IDE pour qu'il pointe vers le dossier contenant vos assets/shaders compilés.

---

## 5. Synthèse Pédagogique

### Tableau récapitulatif du cycle de vie d'un Shader sous Vulkan

| Étape | Format de données | Outil / API | Localisation | Rôle principal |
| :--- | :--- | :--- | :--- | :--- |
| **1. Écriture** | Code source textuel (`.vert`, `.frag`) | Éditeur de texte | CPU (Développement) | Définition de l'algorithme graphique par le développeur. |
| **2. Compilation** | Bytecode binaire intermédiaire (`.spv`) | `glslc` (compilateur hors-ligne) | CPU (Build-time) | Validation syntaxique et génération d'un format universel. |
| **3. Chargement** | Tableau d'octets en mémoire vive | `std::ifstream` (C++) | RAM (Runtime) | Lecture du fichier binaire depuis le disque dur. |
| **4. Encapsulation** | `VkShaderModule` | `vkCreateShaderModule` | RAM / Pilote | Enregistrement du bytecode auprès de l'API Vulkan. |
| **5. Liaison** | `VkPipelineShaderStageCreateInfo` | Configuration de la Pipeline | GPU (Compilation interne) | Association du shader à une étape précise de la pipeline. |
| **6. Destruction** | Libération de la mémoire | `vkDestroyShaderModule` | RAM (Runtime) | Nettoyage des objets intermédiaires après création de la pipeline. |

---

## 6. Exercice Pratique d'Application

### Objectif : Inverser le triangle et appliquer un effet de grisaille (Monochrome)

Pour valider votre compréhension du flux de travail des shaders, vous allez modifier les shaders existants pour accomplir deux tâches :
1. **Dans le Vertex Shader** : Inverser verticalement le triangle (le sommet pointant vers le haut doit désormais pointer vers le bas).
2. **Dans le Fragment Shader** : Convertir la couleur interpolée (RGB) en niveaux de gris en utilisant la formule de luminance standard : 
   $$Y = 0.2126 \times R + 0.7152 \times G + 0.0722 \times B$$

### Indices
* Pour inverser verticalement le triangle, observez le tableau `positions` dans `shader.vert`. Les coordonnées Y des sommets inférieurs sont positives (`0.5`), et celle du sommet supérieur est négative (`-0.5`). Rappelez-vous que sous Vulkan, l'axe Y pointe vers le bas.
* Pour le calcul de la luminance dans `shader.frag`, vous pouvez utiliser le produit scalaire (`dot`) entre le vecteur de couleur RGB et un vecteur contenant les coefficients de pondération, ou effectuer une multiplication membre à membre.

---

### Correction de l'exercice

#### 1. Nouveau code pour `shader.vert` (Inversion verticale)
Pour inverser le triangle, il suffit de multiplier la coordonnée Y de chaque position par `-1.0`, ou de modifier directement les valeurs dans le tableau :

```glsl
#version 450

layout(location = 0) out vec3 fragColor;

// Positions modifiées pour pointer vers le bas
vec2 positions[3] = vec2[](
    vec2(0.0, 0.5),   // Sommet désormais en bas (Y positif)
    vec2(0.5, -0.5),  // Sommet en haut à droite (Y négatif)
    vec2(-0.5, -0.5)  // Sommet en haut à gauche (Y négatif)
);

vec3 colors[3] = vec3[](
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0)
);

void main() {
    gl_Position = vec4(positions[gl_VertexIndex], 0.0, 1.0);
    fragColor = colors[gl_VertexIndex];
}
```

#### 2. Nouveau code pour `shader.frag` (Conversion en niveaux de gris)
Nous appliquons la formule de luminance pour calculer une valeur d'intensité unique, puis nous l'assignons aux canaux Rouge, Vert et Bleu de la couleur de sortie.

```glsl
#version 450

layout(location = 0) in vec3 fragColor;
layout(location = 0) out vec4 outColor;

void main() {
    // Coefficients de luminance standards (norme ITU-R BT.709)
    vec3 coefficients = vec3(0.2126, 0.7152, 0.0722);
    
    // Calcul de la luminance via un produit scalaire (dot product)
    float gray = dot(fragColor, coefficients);
    
    // La couleur de sortie possède la même valeur d'intensité sur R, G et B
    outColor = vec4(vec3(gray), 1.0);
}
```

#### 3. Recompilation des shaders
N'oubliez pas de recompiler vos shaders modifiés en exécutant à nouveau les commandes de compilation dans votre terminal :

```bash
glslc shader.vert -o vert.spv
glslc shader.frag -o frag.spv
```

Relancez votre application C++ : le triangle s'affiche désormais la pointe vers le bas, entièrement rendu dans un dégradé de niveaux de gris !