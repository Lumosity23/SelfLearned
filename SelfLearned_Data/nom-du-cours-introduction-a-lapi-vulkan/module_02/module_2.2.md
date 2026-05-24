# Module 2.2 : Configuration des fonctions fixes de la Pipeline (PSO)

Dans le module précédent (Module 2.1), nous avons vu comment programmer les étapes de traitement des Shaders (Vertex et Fragment) et les compiler au format universel SPIR-V. Cependant, une carte graphique (GPU) ne se contente pas d'exécuter du code de shader. Entre le moment où vous lui envoyez des coordonnées géométriques et celui où les pixels s'affichent à l'écran, les données traversent une série d'étapes matérielles non programmables mais hautement configurables : ce sont les **fonctions fixes**.

Ce module détaille comment configurer ces étapes matérielles à travers l'objet central de Vulkan : le **Pipeline State Object (PSO)**.

---

## 1. Introduction Conceptuelle

### 1.1 Qu'est-ce qu'un Pipeline State Object (PSO) ?
Dans les API graphiques historiques (comme OpenGL), la pipeline graphique était gérée comme une "machine à états" globale. Vous pouviez modifier n'importe quel état (activer le test de profondeur, changer la couleur de fond, modifier le mode de dessin) à tout moment, juste avant de dessiner. 

Bien que flexible, cette approche pose un problème majeur sur les GPU modernes : chaque fois qu'un état change, le pilote de la carte graphique doit réévaluer la cohérence de toute la configuration et souvent recompiler ou réorganiser les instructions matérielles en arrière-plan. Cela provoque des micro-saccades (*stutters*) imprévisibles durant le jeu ou l'application.

**Vulkan résout ce problème en introduisant le PSO (`VkPipeline`).** 

Un PSO est un objet monolithique et **immuable** qui contient la configuration absolue et complète de la pipeline :
* Les shaders compilés (Vertex, Fragment, etc.).
* Le format des données d'entrée (Vertex Input).
* La manière d'assembler les géométries (Input Assembly).
* La configuration de la caméra et de la zone d'affichage (Viewport & Scissor).
* Le comportement de la rasterisation (Rasterizer).
* Les calculs de transparence et de mélange (Color Blending).
* Les tests de visibilité (Depth & Stencil).

```
[Données de sommets] ──> [Vertex Input] ──> [Input Assembly] ──> [Vertex Shader]
                                                                        │
[Color Blending] <── [Fragment Shader] <── [Rasterizer] <── [Viewport & Scissor]
```

Une fois créé, un PSO ne peut plus être modifié. Si vous voulez dessiner un objet en fil de fer (wireframe) puis un autre en relief plein, vous devez créer **deux** objets `VkPipeline` distincts et basculer de l'un à l'autre. Le GPU connaît ainsi instantanément et à l'avance la configuration matérielle requise, garantissant des performances maximales et constantes.

### 1.2 Le compromis : Les États Dynamiques (Dynamic States)
Parce que reconstruire une pipeline entière pour un simple changement de taille de fenêtre serait extrêmement coûteux, Vulkan permet de déclarer certains états comme **dynamiques**. Ces états spécifiques sont extraits du PSO et pourront être modifiés directement dans les tampons de commandes (étudiés au Module 3.1). Les exemples les plus courants sont la taille de la zone d'affichage (*Viewport*) et le rectangle de découpe (*Scissor*).

---

## 2. Fondations Théoriques

Pour configurer correctement notre PSO, nous devons comprendre le rôle de chaque étape matérielle fixe du GPU.

### 2.1 L'Entrée des Sommets (Vertex Input)
Cette étape décrit la structure des données que vous allez envoyer au Vertex Shader.
* **Bindings (Liaisons) :** Définissent l'espacement en mémoire (*stride*) entre deux sommets consécutifs et le mode de lecture (par sommet ou par instance).
* **Attributes (Attributs) :** Définissent le type de données de chaque variable (ex: une position 3D sous forme de 3 *floats*, une couleur sous forme de 4 *floats*) et leur décalage (*offset*) mémoire par rapport au début du sommet.

*Note : Pour notre premier triangle (Module 3.3), nous coderons les coordonnées directement dans le Vertex Shader. Cette étape sera donc temporairement configurée pour n'attendre aucune donnée d'entrée.*

### 2.2 L'Assemblage des Primitives (Input Assembly)
Cette étape prend le flux de sommets et détermine comment ils doivent être reliés pour former des formes géométriques.
* **Topologies courantes :**
  * `VK_PRIMITIVE_TOPOLOGY_POINT_LIST` : Chaque sommet est un point isolé.
  * `VK_PRIMITIVE_TOPOLOGY_LINE_LIST` : Chaque paire de sommets forme un segment indépendant.
  * `VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST` : Chaque groupe de 3 sommets forme un triangle indépendant.
* **Primitive Restart :** Permet de briser une bande continue de lignes ou de triangles (strip) en utilisant un index spécial (ex: `0xFFFF`).

### 2.3 Le Viewport et le Scissor
Ces deux concepts définissent la zone de rendu finale sur l'écran ou l'image cible.

```
+---------------------------------------------------+
| Fenêtre d'affichage (Render Target)               |
|   +----------------------------------+            |
|   | Viewport (Zone de dessin)        |            |
|   |   +------------+                 |            |
|   |   | Scissor    |                 |            |
|   |   | (Découpe)  |                 |            |
|   |   +------------+                 |            |
|   +----------------------------------+            |
+---------------------------------------------------+
```

* **Viewport (Fenêtre d'affichage) :** Définit la transformation des coordonnées normalisées du GPU (NDC, allant de -1 à 1) vers l'espace pixel de votre écran (ex: de 0 à 1920 en X, et de 0 à 1080 en Y). Il gère également la profondeur (Z, généralement de 0.0 à 1.0).
* **Scissor (Rectangle de découpe) :** Agit comme un masque de pixels. Tout pixel situé en dehors de ce rectangle défini sera purement et simplement jeté par le GPU, sans même exécuter le Fragment Shader.

### 2.4 La Rasterisation (Rasterizer)
La rasterisation est l'étape clé qui transforme la géométrie vectorielle (les triangles mathématiques) en fragments (les futurs pixels potentiels à l'écran).
* **Polygon Mode :** Détermine si les triangles sont dessinés pleins (`VK_POLYGON_MODE_FILL`), sous forme de lignes (`VK_POLYGON_MODE_LINE` / wireframe) ou de points (`VK_POLYGON_MODE_POINT`).
* **Culling (Élimination des faces cachées) :** Permet de ne pas dessiner les faces arrière des objets 3D (les faces orientées vers l'intérieur d'un cube par exemple). Cela double virtuellement les performances géométriques.
* **Front Face :** Définit le sens d'enroulement des sommets pour déterminer quelle face est l'avant (sens horaire `CW` ou trigonométrique `CCW`).

### 2.5 Le Multisampling (Antialiasing)
Le multisampling (MSAA) permet de lisser les bords crénelés (l'effet d'escalier ou *aliasing*) des géométries en combinant les informations de plusieurs échantillons par pixel. Pour débuter, nous désactiverons cette option en la configurant sur 1 seul échantillon par pixel.

### 2.6 Le Mélange des Couleurs (Color Blending)
Une fois que le Fragment Shader a calculé une couleur pour un pixel, cette couleur doit être écrite dans l'image de destination (le *Framebuffer*). Le mélange définit comment combiner cette nouvelle couleur (*Source*) avec la couleur déjà présente à cet endroit (*Destination*).
* **Mode Écriture Directe :** La nouvelle couleur écrase l'ancienne.
* **Mode Mélange Alpha (Transparence) :** Combine les couleurs en fonction de la valeur de transparence (Alpha). La formule mathématique standard appliquée par le GPU est :

$$\text{Couleur}_{\text{finale}} = (\text{Couleur}_{\text{source}} \times \text{Alpha}_{\text{source}}) + (\text{Couleur}_{\text{destination}} \times (1 - \text{Alpha}_{\text{source}}))$$

### 2.7 Le Pipeline Layout (Agencement de la Pipeline)
Bien que nous n'utilisions pas encore de variables globales (appelées *Descriptors* ou *Uniforms* en Vulkan) pour notre premier triangle, le GPU doit savoir à l'avance quelles ressources externes la pipeline va utiliser. Cet agencement est décrit par l'objet `VkPipelineLayout`.

---

## 3. Implémentation Pratique Pas-à-Pas

Vulkan étant une API C, la configuration de chaque étape passe par le remplissage de structures de données spécifiques. Nous allons détailler chaque structure nécessaire à la création de notre pipeline fixe.

### 3.1 Comprendre le motif de conception Vulkan
Toutes les structures Vulkan commencent par deux champs obligatoires :
1. `sType` (Structure Type) : Indique explicitement au pilote le type de la structure (ex: `VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO`).
2. `pNext` : Un pointeur vers une autre structure pour étendre les fonctionnalités de l'API (généralement initialisé à `nullptr`).

### 3.2 Code C++ de Configuration des Structures

Voici l'implémentation complète et rigoureuse de la configuration des fonctions fixes.

```cpp
#include <vulkan/vulkan.h>
#include <vector>
#include <iostream>

// Fonction globale de configuration de la pipeline fixe
VkPipelineLayout pipelineLayout;

void setupFixedFunctions() {
    
    // =========================================================================
    // 1. CONFIGURATION DE L'ENTRÉE DES SOMMETS (VERTEX INPUT)
    // =========================================================================
    VkPipelineVertexInputStateCreateInfo vertexInputInfo{};
    vertexInputInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO;
    vertexInputInfo.pNext = nullptr;
    vertexInputInfo.flags = 0;
    
    // Pour notre premier triangle, nous n'injectons pas de données de sommets directes.
    // Les données seront codées en dur dans le Vertex Shader (Module 2.1).
    vertexInputInfo.vertexBindingDescriptionCount = 0;
    vertexInputInfo.pVertexBindingDescriptions = nullptr; 
    vertexInputInfo.vertexAttributeDescriptionCount = 0;
    vertexInputInfo.pVertexAttributeDescriptions = nullptr;

    // =========================================================================
    // 2. CONFIGURATION DE L'ASSEMBLAGE DES PRIMITIVES (INPUT ASSEMBLY)
    // =========================================================================
    VkPipelineInputAssemblyStateCreateInfo inputAssembly{};
    inputAssembly.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO;
    inputAssembly.pNext = nullptr;
    inputAssembly.flags = 0;
    
    // Nous voulons dessiner des triangles à partir de nos sommets
    inputAssembly.topology = VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST;
    
    // Désactivé car nous n'utilisons pas de topologies indexées de type "Strip"
    inputAssembly.primitiveRestartEnable = VK_FALSE;

    // =========================================================================
    // 3. CONFIGURATION DU VIEWPORT ET DU SCISSOR
    // =========================================================================
    // Nous définissons ici une configuration de base, mais nous la rendrons
    // dynamique plus bas pour éviter de recréer la pipeline lors du redimensionnement.
    VkViewport viewport{};
    viewport.x = 0.0f;
    viewport.y = 0.0f;
    viewport.width = 800.0f;  // Largeur par défaut
    viewport.height = 600.0f; // Hauteur par défaut
    viewport.minDepth = 0.0f; // Profondeur minimale du tampon
    viewport.maxDepth = 1.0f; // Profondeur maximale du tampon

    VkRect2D scissor{};
    scissor.offset = {0, 0};
    scissor.extent = {800, 600}; // Découpe identique à la taille de la fenêtre

    VkPipelineViewportStateCreateInfo viewportState{};
    viewportState.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO;
    viewportState.pNext = nullptr;
    viewportState.flags = 0;
    viewportState.viewportCount = 1;
    viewportState.pViewports = &viewport;
    viewportState.scissorCount = 1;
    viewportState.pScissors = &scissor;

    // =========================================================================
    // 4. CONFIGURATION DE LA RASTERISATION (RASTERIZER)
    // =========================================================================
    VkPipelineRasterizationStateCreateInfo rasterizer{};
    rasterizer.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
    rasterizer.pNext = nullptr;
    rasterizer.flags = 0;
    
    // Si TRUE, les fragments au-delà des plans proche/lointain sont projetés sur ceux-ci
    // au lieu d'être éliminés (utile pour les ombres portées). Nécessite une fonctionnalité GPU.
    rasterizer.depthClampEnable = VK_FALSE;
    
    // Si TRUE, la géométrie ne passe jamais à l'étape de rasterisation (désactive l'affichage)
    rasterizer.rasterizerDiscardEnable = VK_FALSE;
    
    // Mode de dessin : Remplissage complet des polygones
    rasterizer.polygonMode = VK_POLYGON_MODE_FILL;
    
    // Épaisseur des lignes (uniquement si polygonMode est configuré sur LINE)
    rasterizer.lineWidth = 1.0f;
    
    // Élimination des faces cachées : On élimine les faces arrière (Back Faces)
    rasterizer.cullMode = VK_CULL_MODE_BACK_BIT;
    
    // Sens de définition de la face avant : Sens horaire (Clockwise)
    rasterizer.frontFace = VK_FRONT_FACE_CLOCKWISE;
    
    // Le "Depth Bias" permet d'ajouter un décalage de profondeur (utile pour éviter le Z-fighting)
    rasterizer.depthBiasEnable = VK_FALSE;
    rasterizer.depthBiasConstantFactor = 0.0f;
    rasterizer.depthBiasClamp = 0.0f;
    rasterizer.depthBiasSlopeFactor = 0.0f;

    // =========================================================================
    // 5. CONFIGURATION DU MULTISAMPLING (MSAA)
    // =========================================================================
    VkPipelineMultisampleStateCreateInfo multisampling{};
    multisampling.sType = VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO;
    multisampling.pNext = nullptr;
    multisampling.flags = 0;
    
    // Désactivé pour le moment (1 seul échantillon par pixel)
    multisampling.sampleShadingEnable = VK_FALSE;
    multisampling.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT;
    multisampling.minSampleShading = 1.0f;
    multisampling.pSampleMask = nullptr;
    multisampling.alphaToCoverageEnable = VK_FALSE;
    multisampling.alphaToOneEnable = VK_FALSE;

    // =========================================================================
    // 6. CONFIGURATION DU MÉLANGE DES COULEURS (COLOR BLENDING)
    // =========================================================================
    // Configuration spécifique pour l'attachement de couleur (notre image cible)
    VkPipelineColorBlendAttachmentState colorBlendAttachment{};
    
    // Masque définissant quelles composantes de couleur (R, G, B, A) seront écrites
    colorBlendAttachment.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | 
                                          VK_COLOR_COMPONENT_G_BIT | 
                                          VK_COLOR_COMPONENT_B_BIT | 
                                          VK_COLOR_COMPONENT_A_BIT;
                                          
    // Configuration pour le mélange Alpha (transparence classique)
    colorBlendAttachment.blendEnable = VK_TRUE;
    colorBlendAttachment.srcColorBlendFactor = VK_BLEND_FACTOR_SRC_ALPHA;
    colorBlendAttachment.dstColorBlendFactor = VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA;
    colorBlendAttachment.colorBlendOp = VK_BLEND_OP_ADD;
    colorBlendAttachment.srcAlphaBlendFactor = VK_BLEND_FACTOR_ONE;
    colorBlendAttachment.dstAlphaBlendFactor = VK_BLEND_FACTOR_ZERO;
    colorBlendAttachment.alphaBlendOp = VK_BLEND_OP_ADD;

    // Configuration globale du mélange de couleurs
    VkPipelineColorBlendStateCreateInfo colorBlending{};
    colorBlending.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO;
    colorBlending.pNext = nullptr;
    colorBlending.flags = 0;
    
    // Permet d'utiliser des opérations logiques binaires au lieu du mélange mathématique
    colorBlending.logicOpEnable = VK_FALSE;
    colorBlending.logicOp = VK_LOGIC_OP_COPY;
    
    // Liaison avec notre attachement unique
    colorBlending.attachmentCount = 1;
    colorBlending.pAttachments = &colorBlendAttachment;
    
    // Constantes de mélange optionnelles
    colorBlending.blendConstants[0] = 0.0f;
    colorBlending.blendConstants[1] = 0.0f;
    colorBlending.blendConstants[2] = 0.0f;
    colorBlending.blendConstants[3] = 0.0f;

    // =========================================================================
    // 7. CONFIGURATION DES ÉTATS DYNAMIQUES (DYNAMIC STATES)
    // =========================================================================
    // Nous déclarons le Viewport et le Scissor comme dynamiques.
    // Cela signifie que nous devrons obligatoirement les définir via des commandes
    // lors de l'enregistrement de notre boucle de rendu (Module 3.1).
    std::vector<VkDynamicState> dynamicStates = {
        VK_DYNAMIC_STATE_VIEWPORT,
        VK_DYNAMIC_STATE_SCISSOR
    };

    VkPipelineDynamicStateCreateInfo dynamicState{};
    dynamicState.sType = VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO;
    dynamicState.pNext = nullptr;
    dynamicState.flags = 0;
    dynamicState.dynamicStateCount = static_cast<uint32_t>(dynamicStates.size());
    dynamicState.pDynamicStates = dynamicStates.data();

    // =========================================================================
    // 8. CRÉATION DE L'AGENCEMENT DE LA PIPELINE (PIPELINE LAYOUT)
    // =========================================================================
    VkPipelineLayoutCreateInfo pipelineLayoutInfo{};
    pipelineLayoutInfo.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
    pipelineLayoutInfo.pNext = nullptr;
    pipelineLayoutInfo.flags = 0;
    
    // Pas de variables uniformes (descriptors) pour notre premier triangle
    pipelineLayoutInfo.setLayoutCount = 0;
    pipelineLayoutInfo.pSetLayouts = nullptr;
    
    // Pas de constantes intégrées (push constants)
    pipelineLayoutInfo.pushConstantRangeCount = 0;
    pipelineLayoutInfo.pPushConstantRanges = nullptr;

    // Note : Dans un code de production, 'device' est le VkDevice logique initialisé au Module 1.1
    VkDevice device; 
    
    // Simulation de la création de l'agencement (Layout)
    /*
    if (vkCreatePipelineLayout(device, &pipelineLayoutInfo, nullptr, &pipelineLayout) != VK_SUCCESS) {
        throw std::runtime_error("Échec de la création du Pipeline Layout !");
    }
    */
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 4.1 L'explosion du nombre de pipelines (Pipeline Explosion)
Puisque chaque état est immuable, si votre jeu contient 50 objets avec des configurations de rendu légèrement différentes (ex: certains transparents, d'autres en fil de fer, d'autres avec ou sans test de profondeur), vous devrez créer 50 objets `VkPipeline` distincts.
* **Bonne pratique :** Utilisez des **Pipeline Caches** (`VkPipelineCache`). Cet objet permet d'enregistrer sur le disque dur de l'utilisateur les pipelines déjà compilées lors des sessions précédentes, réduisant drastiquement le temps de chargement du jeu.

### 4.2 L'oubli de configuration des États Dynamiques
Si vous déclarez un état comme dynamique dans `VkPipelineDynamicStateCreateInfo` (comme le Viewport ou le Scissor), **vous devez obligatoirement** appeler les fonctions de commande correspondantes (`vkCmdSetViewport` et `vkCmdSetScissor`) lors de l'enregistrement de vos commandes de rendu (Module 3.1). Si vous oubliez de le faire, le GPU aura un comportement indéfini et l'application plantera immédiatement.

### 4.3 Incohérence avec la Render Pass
Le nombre d'attachements de couleur définis dans `VkPipelineColorBlendStateCreateInfo` (le champ `attachmentCount`) doit correspondre **exactement** au nombre d'attachements de couleur décrits dans la Render Pass (qui sera étudiée dans le Module 2.3). Une seule erreur à ce niveau provoquera une violation d'accès détectée par les couches de validation.

---

## 5. Synthèse Pédagogique

| Étape de la Pipeline | Rôle Principal | Peut être rendu Dynamique ? | Configuration par défaut (Triangle) |
| :--- | :--- | :--- | :--- |
| **Vertex Input** | Décrit le format des données de sommets en mémoire. | Non | Aucun (0 binding, 0 attribute) |
| **Input Assembly** | Définit comment lier les sommets (points, lignes, triangles). | Non | `VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST` |
| **Viewport & Scissor** | Gère la zone d'affichage et le rectangle de découpe. | **Oui** (Recommandé) | Configuré dynamiquement |
| **Rasterizer** | Transforme les géométries en fragments (pixels potentiels). | Non | Remplissage complet, élimination face arrière |
| **Multisampling** | Gère l'antialiasing (MSAA). | Non | Désactivé (1 échantillon) |
| **Color Blending** | Combine la couleur calculée avec celle déjà présente à l'écran. | Non | Mélange Alpha classique activé |

---

## 6. Exercice Pratique d'Application

### Énoncé
Dans le cadre du développement d'un outil de débogage pour notre moteur de rendu Vulkan, vous devez modifier la configuration de la pipeline présentée dans ce cours pour répondre aux deux exigences suivantes :
1. Les objets doivent être dessinés en **fil de fer (wireframe)** au lieu d'être pleins.
2. L'élimination des faces cachées (Culling) doit être **complètement désactivée** afin que nous puissions voir l'intérieur et l'extérieur des géométries.

### Indices
* Inspectez attentivement la structure `VkPipelineRasterizationStateCreateInfo`.
* Repérez le membre qui contrôle le mode de dessin des polygones (`polygonMode`).
* Repérez le membre qui contrôle le mode d'élimination des faces (`cullMode`).

---

### Correction de l'Exercice

Pour réaliser cette configuration de débogage, il suffit de modifier deux lignes spécifiques dans la configuration de la structure `VkPipelineRasterizationStateCreateInfo` :

```cpp
VkPipelineRasterizationStateCreateInfo debugRasterizer{};
debugRasterizer.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
debugRasterizer.pNext = nullptr;
debugRasterizer.flags = 0;
debugRasterizer.depthClampEnable = VK_FALSE;
debugRasterizer.rasterizerDiscardEnable = VK_FALSE;

// MODIFICATION 1 : Passage du mode de remplissage (FILL) au mode fil de fer (LINE)
debugRasterizer.polygonMode = VK_POLYGON_MODE_LINE; 

// L'épaisseur de la ligne doit être définie. 1.0f est garanti supporté par toutes les cartes.
debugRasterizer.lineWidth = 1.0f; 

// MODIFICATION 2 : Désactivation complète du Culling (élimination des faces cachées)
debugRasterizer.cullMode = VK_CULL_MODE_NONE; 

debugRasterizer.frontFace = VK_FRONT_FACE_CLOCKWISE;
debugRasterizer.depthBiasEnable = VK_FALSE;
```

**Explications de la correction :**
* En changeant `polygonMode` à `VK_POLYGON_MODE_LINE`, le GPU va automatiquement ignorer le remplissage des triangles et dessiner uniquement leurs contours.
* En passant `cullMode` à `VK_CULL_MODE_NONE`, le GPU ne jettera plus les triangles orientés vers l'arrière. Cela nous permet d'inspecter la structure géométrique complète de notre modèle 3D sous tous les angles.