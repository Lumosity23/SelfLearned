# Module 3.3 : Boucle de rendu et affichage du premier triangle

Bienvenue dans l'étape ultime de ce premier cycle d'apprentissage de Vulkan. Dans les modules précédents, vous avez configuré l'instance, sélectionné votre carte graphique (Module 1.1), initialisé la surface d'affichage et la Swapchain (Module 1.2 et 1.3), compilé vos shaders (Module 2.1), configuré la pipeline graphique (Module 2.2), préparé les passes de rendu et les Framebuffers (Module 2.3), enregistré vos commandes de dessin (Module 3.1) et mis en place les primitives de synchronisation (Module 3.2).

Aujourd'hui, nous allons assembler toutes ces pièces pour donner vie à notre application : concevoir la **boucle de rendu** (render loop) et afficher enfin notre **premier triangle** à l'écran. Nous aborderons également la gestion dynamique du redimensionnement de la fenêtre, un aspect crucial pour toute application graphique moderne.

---

## 1. Introduction Conceptuelle

Pour comprendre la boucle de rendu de Vulkan, il faut abandonner la vision séquentielle classique de la programmation CPU. En programmation graphique, nous orchestrons un flux de travail asynchrone entre deux processeurs distincts : le **CPU** (le processeur central) et le **GPU** (le processeur graphique).

### Le paradigme Producteur-Consommateur
Dans notre application :
*   Le **CPU** agit comme le **Producteur** : il prépare les instructions, gère les événements système (clavier, souris, redimensionnement) et soumet le travail au GPU.
*   Le **GPU** agit comme le **Consommateur** : il prend les paquets d'instructions (Command Buffers) soumis par le CPU, exécute les calculs géométriques et de pixellisation, puis écrit le résultat dans une image de la Swapchain pour l'afficher.

### Le cycle de vie d'une image (Frame Lifecycle)
Pour afficher une seule image à l'écran, l'application doit répéter indéfiniment les cinq étapes suivantes :

```
[ Étape 1 : Attente & Reset ]  <-- Le CPU attend que le GPU ait fini de traiter cette frame (Fence)
            │
            ▼
[ Étape 2 : Acquisition ]      <-- Demande d'une image disponible à la Swapchain (Semaphore Image)
            │
            ▼
[ Étape 3 : Soumission ]       <-- Envoi du Command Buffer à la queue graphique (Attente Semaphore Image)
            │
            ▼
[ Étape 4 : Présentation ]     <-- Demande d'affichage de l'image à l'écran (Attente Semaphore Rendu)
            │
            ▼
[ Étape 5 : Transition ]       <-- Passage à la frame suivante (Index circulaire)
```

### Pourquoi le "Multi-buffering" (Frames in Flight) ?
Si le CPU devait attendre que le GPU ait complètement terminé d'afficher l'image $N$ avant de commencer à préparer l'image $N+1$, le GPU resterait inactif pendant que le CPU travaille, et inversement. C'est ce qu'on appelle un **goulot d'étranglement (stall)**.

Pour maximiser les performances, nous utilisons le concept de **Frames in Flight** (cadres en vol). Nous autorisons le CPU à préparer l'image suivante pendant que le GPU dessine la précédente. En pratique, nous définissons une constante :
```cpp
const int MAX_FRAMES_IN_FLIGHT = 2; // Double buffering au niveau de la synchronisation CPU-GPU
```
Cela signifie que nous allons dupliquer nos objets de synchronisation (Semaphores et Fences) pour éviter que le CPU ne prenne trop d'avance sur le GPU.

---

## 2. Fondations Théoriques

Avant d'écrire le code, analysons les fonctions clés de l'API Vulkan que nous allons utiliser.

### A. L'acquisition de l'image : `vkAcquireNextImageKHR`
Cette fonction demande à la Swapchain de nous fournir l'index de la prochaine image disponible pour le dessin.

```cpp
VkResult vkAcquireNextImageKHR(
    VkDevice                         device,
    VkSwapchainKHR                   swapchain,
    uint64_t                         timeout,
    VkSemaphore                      semaphore,
    VkFence                          fence,
    uint32_t*                        pImageIndex
);
```
*   `timeout` : Temps maximum d'attente en nanosecondes. Utiliser `UINT64_MAX` désactive le timeout (l'appel bloque jusqu'à ce qu'une image soit libre).
*   `semaphore` : Le sémaphore qui sera **signalé** par le GPU lorsque l'image sera réellement prête à être écrite.
*   `fence` : Une barrière CPU-GPU optionnelle (nous utiliserons `VK_NULL_HANDLE` ici car nous synchronisons via sémaphore).
*   `pImageIndex` : Pointeur vers un entier qui recevra l'index de l'image de la Swapchain (par exemple `0`, `1` ou `2`).

### B. La soumission des commandes : `vkQueueSubmit`
Une fois que nous connaissons l'index de l'image, nous soumettons le Command Buffer correspondant à la queue graphique.

```cpp
VkResult vkQueueSubmit(
    VkQueue                          queue,
    uint32_t                         submitCount,
    const VkSubmitInfo*              pSubmits,
    VkFence                          fence
);
```
*   `queue` : La file d'attente graphique (Graphics Queue) obtenue lors de l'initialisation du périphérique logique.
*   `pSubmits` : Un pointeur vers une structure `VkSubmitInfo` qui décrit ce que l'on soumet, quels sémaphores attendre, et quels sémaphores signaler à la fin.
*   `fence` : Une Fence qui sera **signalée** par le GPU lorsque l'exécution de ce Command Buffer sera totalement terminée. Cela permet au CPU de savoir qu'il peut réutiliser les ressources de cette frame en toute sécurité.

### C. La présentation de l'image : `vkQueuePresentKHR`
Enfin, nous demandons à la Swapchain d'afficher l'image calculée sur notre écran.

```cpp
VkResult vkQueuePresentKHR(
    VkQueue                          queue,
    const VkPresentInfoKHR*          pPresentInfo
);
```
*   `queue` : La file d'attente de présentation (Present Queue).
*   `pPresentInfo` : Structure contenant les sémaphores à attendre (le rendu doit être fini) et l'index de l'image à présenter.

---

## 3. Implémentation Pratique Pas-à-Pas

Nous allons maintenant intégrer ces concepts dans notre architecture C++. Nous supposerons que vous disposez d'une classe principale `HelloTriangleApplication`.

### Étape 1 : Déclaration des membres de synchronisation
Nous devons stocker nos sémaphores et fences pour chaque "frame in flight". Ajoutez ces variables membres à votre classe :

```cpp
// Nombre maximum d'images traitées simultanément par le CPU/GPU
const int MAX_FRAMES_IN_FLIGHT = 2;

// Objets de synchronisation (un jeu par frame en vol)
std::vector<VkSemaphore> imageAvailableSemaphores;
std::vector<VkSemaphore> renderFinishedSemaphores;
std::vector<VkFence> inFlightFences;

// Index de la frame logique actuelle (0 ou 1 si MAX_FRAMES_IN_FLIGHT = 2)
size_t currentFrame = 0;

// Flag pour gérer le redimensionnement de la fenêtre
bool framebufferResized = false;
```

### Étape 2 : Initialisation des objets de synchronisation
Comme étudié dans le Module 3.2, nous devons instancier ces objets. Voici la fonction d'initialisation complète :

```cpp
void createSyncObjects() {
    imageAvailableSemaphores.resize(MAX_FRAMES_IN_FLIGHT);
    renderFinishedSemaphores.resize(MAX_FRAMES_IN_FLIGHT);
    inFlightFences.resize(MAX_FRAMES_IN_FLIGHT);

    VkSemaphoreCreateInfo semaphoreInfo{};
    semaphoreInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;

    VkFenceCreateInfo fenceInfo{};
    fenceInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    // TRÈS IMPORTANT : On initialise la Fence à l'état SIGNALÉ.
    // Sinon, au tout premier appel de drawFrame, le CPU attendra indéfiniment
    // une Fence qui n'a jamais été soumise au GPU !
    fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;

    for (size_t i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
        if (vkCreateSemaphore(device, &semaphoreInfo, nullptr, &imageAvailableSemaphores[i]) != VK_SUCCESS ||
            vkCreateSemaphore(device, &semaphoreInfo, nullptr, &renderFinishedSemaphores[i]) != VK_SUCCESS ||
            vkCreateFence(device, &fenceInfo, nullptr, &inFlightFences[i]) != VK_SUCCESS) {
            
            throw std::runtime_error("Erreur : Impossible de créer les objets de synchronisation pour une frame !");
        }
    }
}
```

### Étape 3 : La fonction de dessin principale `drawFrame()`
Voici le cœur de notre boucle de rendu. Lisez attentivement les commentaires pour comprendre le rôle de chaque ligne.

```cpp
void drawFrame() {
    // 1. Attendre que la frame précédente associée à cet index soit terminée par le GPU
    // Le paramètre VK_TRUE indique que l'on attend toutes les fences (ici une seule).
    // UINT64_MAX désactive le timeout.
    vkWaitForFences(device, 1, &inFlightFences[currentFrame], VK_TRUE, UINT64_MAX);

    // 2. Acquérir une image de la Swapchain
    uint32_t imageIndex;
    VkResult result = vkAcquireNextImageKHR(
        device, 
        swapChain, 
        UINT64_MAX, 
        imageAvailableSemaphores[currentFrame], // Sera signalé quand l'image sera disponible
        VK_NULL_HANDLE, 
        &imageIndex
    );

    // Vérifier si la Swapchain doit être recréée (ex: redimensionnement de fenêtre)
    if (result == VK_ERROR_OUT_OF_DATE_KHR) {
        recreateSwapChain();
        return;
    } else if (result != VK_SUCCESS && result != VK_SUBOPTIMAL_KHR) {
        throw std::runtime_error("Erreur : Impossible d'acquérir une image de la Swapchain !");
    }

    // N'oublions pas de réinitialiser la Fence uniquement si nous sommes sûrs de soumettre du travail
    vkResetFences(device, 1, &inFlightFences[currentFrame]);

    // 3. Configurer la soumission du Command Buffer
    VkSubmitInfo submitInfo{};
    submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;

    // Quels sémaphores le GPU doit attendre avant de commencer l'exécution
    VkSemaphore waitSemaphores[] = { imageAvailableSemaphores[currentFrame] };
    // À quelle étape du pipeline graphique doit-on attendre ?
    // On attend d'avoir l'image pour écrire les couleurs (Color Attachment Output).
    // Les calculs de Vertex Shaders peuvent commencer avant ! C'est une optimisation majeure.
    VkPipelineStageFlags waitStages[] = { VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT };
    
    submitInfo.waitSemaphoreCount = 1;
    submitInfo.pWaitSemaphores = waitSemaphores;
    submitInfo.pWaitDstStageMask = waitStages;

    // Quel Command Buffer soumettre (celui correspondant à l'image acquise)
    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers = &commandBuffers[imageIndex];

    // Quel sémaphore signaler une fois que le GPU a fini le rendu de ce Command Buffer
    VkSemaphore signalSemaphores[] = { renderFinishedSemaphores[currentFrame] };
    submitInfo.signalSemaphoreCount = 1;
    submitInfo.pSignalSemaphores = signalSemaphores;

    // Soumettre le travail à la Queue Graphique en associant la Fence de la frame courante
    if (vkQueueSubmit(graphicsQueue, 1, &submitInfo, inFlightFences[currentFrame]) != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Échec de la soumission du Command Buffer à la queue !");
    }

    // 4. Configurer la Présentation de l'image à l'écran
    VkPresentInfoKHR presentInfo{};
    presentInfo.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR;

    // Attendre que le rendu soit complètement terminé (renderFinishedSemaphore)
    presentInfo.waitSemaphoreCount = 1;
    presentInfo.pWaitSemaphores = signalSemaphores;

    VkSwapchainKHR swapChains[] = { swapChain };
    presentInfo.swapchainCount = 1;
    presentInfo.pSwapchains = swapChains;
    presentInfo.pImageIndices = &imageIndex;
    presentInfo.pResults = nullptr; // Optionnel

    // Envoyer la demande de présentation
    result = vkQueuePresentKHR(presentQueue, &presentInfo);

    // Vérifier si la Swapchain est obsolète après la présentation
    if (result == VK_ERROR_OUT_OF_DATE_KHR || result == VK_SUBOPTIMAL_KHR || framebufferResized) {
        framebufferResized = false;
        recreateSwapChain();
    } else if (result != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Échec de la présentation de l'image !");
    }

    // 5. Passer à la frame suivante (index circulaire)
    currentFrame = (currentFrame + 1) % MAX_FRAMES_IN_FLIGHT;
}
```

### Étape 4 : Gestion du redimensionnement (Recreate Swapchain)
Si l'utilisateur redimensionne la fenêtre, la taille des buffers de la Swapchain ne correspond plus à la surface d'affichage. Vulkan lève alors l'erreur `VK_ERROR_OUT_OF_DATE_KHR`. Nous devons détruire et reconstruire la Swapchain.

Voici l'implémentation de la reconstruction de la Swapchain :

```cpp
void recreateSwapChain() {
    // Gestion de la minimisation de la fenêtre (taille 0)
    int width = 0, height = 0;
    glfwGetFramebufferSize(window, &width, &height);
    while (width == 0 || height == 0) {
        glfwGetFramebufferSize(window, &width, &height);
        glfwWaitEvents(); // Met l'application en pause en attendant un événement
    }

    // Attendre que le GPU ait fini toutes ses tâches avant de détruire quoi que ce soit
    vkDeviceWaitIdle(device);

    // Nettoyage de l'ancienne Swapchain et de ses dépendances
    cleanupSwapChain();

    // Recréation complète (voir Modules 1.3, 2.3 et 3.1)
    createSwapChain();
    createImageViews();
    createRenderPass();
    createGraphicsPipeline();
    createFramebuffers();
    createCommandBuffers(); // Ré-enregistrement des commandes de dessin
}
```

*Note : La fonction `cleanupSwapChain()` doit détruire les Framebuffers, les Image Views, la Swapchain elle-même, et libérer les Command Buffers associés.*

### Étape 5 : Intégration dans la boucle principale (Main Loop)
Votre fonction principale de boucle d'événements ressemble désormais à ceci :

```cpp
void mainLoop() {
    while (!glfwWindowShouldClose(window)) {
        glfwPollEvents(); // Gère les entrées utilisateur
        drawFrame();      // Dessine la frame suivante
    }

    // Une fois la boucle quittée, on attend que le GPU soit inactif avant de nettoyer la mémoire
    vkDeviceWaitIdle(device);
}
```

### Étape 6 : Nettoyage des ressources (Cleanup)
Il est impératif de détruire les objets de synchronisation lors de la fermeture de l'application pour éviter les fuites de mémoire.

```cpp
void cleanup() {
    // 1. Nettoyage de la Swapchain
    cleanupSwapChain();

    // 2. Destruction des objets de synchronisation
    for (size_t i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
        vkDestroySemaphore(device, renderFinishedSemaphores[i], nullptr);
        vkDestroySemaphore(device, imageAvailableSemaphores[i], nullptr);
        vkDestroyFence(device, inFlightFences[i], nullptr);
    }

    // 3. Destruction du périphérique logique et de l'instance (Modules précédents)
    vkDestroyDevice(device, nullptr);
    // ...
}
```

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 1. Le blocage infini au démarrage (Deadlock)
**Symptôme** : L'application se lance mais reste figée sur un écran noir sans aucun message d'erreur.
**Cause** : Vous avez oublié de configurer le flag `VK_FENCE_CREATE_SIGNALED_BIT` lors de la création de vos Fences. Le CPU exécute `vkWaitForFences` sur la première frame, mais comme aucune tâche GPU n'a encore été soumise, la Fence n'est pas signalée. Le CPU attend indéfiniment.
**Solution** : Assurez-vous d'avoir `fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;`.

### 2. Oubli de réinitialiser la Fence
**Symptôme** : Les Validation Layers de Vulkan crient au scandale ou l'application plante après quelques frames.
**Cause** : Avant de soumettre du travail au GPU avec `vkQueueSubmit`, vous devez réinitialiser la Fence associée via `vkResetFences`. Sinon, Vulkan considère que la Fence est déjà signalée et ne bloquera pas le CPU à la frame suivante, brisant toute la synchronisation.

### 3. Crash lors de la minimisation de la fenêtre
**Symptôme** : L'application crash instantanément lorsque l'on réduit la fenêtre dans la barre des tâches.
**Cause** : Lors de la minimisation, la largeur et la hauteur de la fenêtre deviennent `0`. Créer une Swapchain de taille $0 \times 0$ est interdit par Vulkan et provoque un crash.
**Solution** : Ajouter la boucle d'attente `while (width == 0 || height == 0)` dans `recreateSwapChain()` pour mettre l'application en pause tant que la fenêtre est minimisée.

---

## 5. Synthèse Pédagogique

Voici un tableau récapitulatif du rôle de chaque objet de synchronisation dans notre boucle de rendu :

| Objet | Type | Qui l'attend ? | Qui le signale ? | Rôle exact |
| :--- | :--- | :--- | :--- | :--- |
| `inFlightFences` | **Fence** (CPU-GPU) | **CPU** (au début de `drawFrame`) | **GPU** (à la fin de l'exécution du Command Buffer) | Empêche le CPU de préparer une nouvelle frame si le GPU n'a pas fini de traiter cette même frame du cycle précédent. |
| `imageAvailableSemaphores` | **Semaphore** (GPU-GPU) | **GPU** (étape d'écriture des couleurs dans le pipeline) | **GPU** (moteur de présentation, quand l'image est libérée) | Garantit que le GPU ne commence pas à dessiner sur une image qui est encore affichée à l'écran. |
| `renderFinishedSemaphores` | **Semaphore** (GPU-GPU) | **GPU** (moteur de présentation, avant d'afficher) | **GPU** (pipeline graphique, quand le dessin est fini) | Garantit que l'écran n'affiche pas une image à moitié dessinée (évite le screen tearing). |

---

## 6. Exercice Pratique d'Application

### Objectif : Créer un effet de pulsation colorée en arrière-plan
Pour valider votre compréhension de la boucle de rendu, vous allez modifier la couleur de fond de l'écran (le "Clear Color") de manière dynamique à chaque frame, afin de créer un effet de pulsation lumineuse (par exemple, une transition sinusoïdale de la couleur rouge).

### Indices
1.  **Où est définie la couleur de fond ?**
    Dans le Module 3.1, lors de l'enregistrement du Command Buffer, vous avez défini une structure `VkClearValue` :
    ```cpp
    VkClearValue clearColor = {{{0.0f, 0.0f, 0.0f, 1.0f}}}; // Noir par défaut
    ```
2.  **Le problème de l'enregistrement statique :**
    Si vous avez enregistré vos Command Buffers une fois pour toutes lors de l'initialisation, la couleur de fond restera statique. Pour la rendre dynamique, vous devez **ré-enregistrer le Command Buffer à chaque frame** à l'intérieur de la fonction `drawFrame()`, juste avant de le soumettre.
3.  **Calcul du temps :**
    Utilisez `<chrono>` ou `glfwGetTime()` pour obtenir le temps écoulé en secondes, puis appliquez la fonction sinus `std::sin()` pour obtenir une valeur oscillant entre `0.0f` et `1.0f`.

---

### Correction Complète de l'Exercice

Voici comment modifier votre code pour réaliser cet exercice.

#### 1. Modification de la fonction d'enregistrement du Command Buffer
Nous allons modifier la fonction `recordCommandBuffer` pour qu'elle accepte l'index de l'image et la valeur de couleur dynamique en paramètre.

```cpp
void recordCommandBuffer(VkCommandBuffer commandBuffer, uint32_t imageIndex, float redIntensity) {
    VkCommandBufferBeginInfo beginInfo{};
    beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;

    if (vkBeginCommandBuffer(commandBuffer, &beginInfo) != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Impossible de commencer l'enregistrement du Command Buffer !");
    }

    VkRenderPassBeginInfo renderPassInfo{};
    renderPassInfo.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO;
    renderPassInfo.renderPass = renderPass;
    renderPassInfo.framebuffer = swapChainFramebuffers[imageIndex];
    renderPassInfo.renderArea.offset = {0, 0};
    renderPassInfo.renderArea.extent = swapChainExtent;

    // Application de la couleur dynamique (pulsation sur le canal Rouge)
    VkClearValue clearColor = {{{redIntensity, 0.0f, 0.0f, 1.0f}}};
    renderPassInfo.clearValueCount = 1;
    renderPassInfo.pClearValues = &clearColor;

    vkCmdBeginRenderPass(commandBuffer, &renderPassInfo, VK_SUBPASS_CONTENTS_INLINE);

    // Liaison de la pipeline graphique
    vkCmdBindPipeline(commandBuffer, VK_PIPELINE_BIND_POINT_GRAPHICS, graphicsPipeline);

    // Commande de dessin du triangle (3 sommets, 1 instance)
    vkCmdDraw(commandBuffer, 3, 1, 0, 0);

    vkCmdEndRenderPass(commandBuffer);

    if (vkEndCommandBuffer(commandBuffer) != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Impossible de finaliser l'enregistrement du Command Buffer !");
    }
}
```

#### 2. Mise à jour de la boucle de rendu `drawFrame()`
Dans `drawFrame()`, nous calculons l'intensité du rouge en fonction du temps, nous ré-enregistrons le Command Buffer de la frame courante, puis nous le soumettons.

```cpp
void drawFrame() {
    // 1. Attente de la Fence
    vkWaitForFences(device, 1, &inFlightFences[currentFrame], VK_TRUE, UINT64_MAX);

    // 2. Acquisition de l'image
    uint32_t imageIndex;
    VkResult result = vkAcquireNextImageKHR(device, swapChain, UINT64_MAX, imageAvailableSemaphores[currentFrame], VK_NULL_HANDLE, &imageIndex);

    if (result == VK_ERROR_OUT_OF_DATE_KHR) {
        recreateSwapChain();
        return;
    } else if (result != VK_SUCCESS && result != VK_SUBOPTIMAL_KHR) {
        throw std::runtime_error("Erreur : Échec de l'acquisition de l'image !");
    }

    // Réinitialisation de la Fence
    vkResetFences(device, 1, &inFlightFences[currentFrame]);

    // --- DEBUT DE LA MODIFICATION POUR L'EXERCICE ---
    // Calcul du temps écoulé pour créer une pulsation sinusoïdale
    float time = static_cast<float>(glfwGetTime());
    // std::sin renvoie une valeur entre -1 et 1. 
    // On la transforme pour obtenir une valeur entre 0.0 et 1.0.
    float redIntensity = (std::sin(time * 2.0f) + 1.0f) / 2.0f; 

    // On ré-enregistre le Command Buffer avec la nouvelle couleur de fond
    vkResetCommandBuffer(commandBuffers[imageIndex], 0);
    recordCommandBuffer(commandBuffers[imageIndex], imageIndex, redIntensity);
    // --- FIN DE LA MODIFICATION ---

    // 3. Soumission du Command Buffer
    VkSubmitInfo submitInfo{};
    submitInfo.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;

    VkSemaphore waitSemaphores[] = { imageAvailableSemaphores[currentFrame] };
    VkPipelineStageFlags waitStages[] = { VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT };
    submitInfo.waitSemaphoreCount = 1;
    submitInfo.pWaitSemaphores = waitSemaphores;
    submitInfo.pWaitDstStageMask = waitStages;

    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers = &commandBuffers[imageIndex];

    VkSemaphore signalSemaphores[] = { renderFinishedSemaphores[currentFrame] };
    submitInfo.signalSemaphoreCount = 1;
    submitInfo.pSignalSemaphores = signalSemaphores;

    if (vkQueueSubmit(graphicsQueue, 1, &submitInfo, inFlightFences[currentFrame]) != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Échec de la soumission du Command Buffer !");
    }

    // 4. Présentation
    VkPresentInfoKHR presentInfo{};
    presentInfo.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR;
    presentInfo.waitSemaphoreCount = 1;
    presentInfo.pWaitSemaphores = signalSemaphores;

    VkSwapchainKHR swapChains[] = { swapChain };
    presentInfo.swapchainCount = 1;
    presentInfo.pSwapchains = swapChains;
    presentInfo.pImageIndices = &imageIndex;

    result = vkQueuePresentKHR(presentQueue, &presentInfo);

    if (result == VK_ERROR_OUT_OF_DATE_KHR || result == VK_SUBOPTIMAL_KHR || framebufferResized) {
        framebufferResized = false;
        recreateSwapChain();
    } else if (result != VK_SUCCESS) {
        throw std::runtime_error("Erreur : Échec de la présentation !");
    }

    // 5. Incrémentation de l'index de frame
    currentFrame = (currentFrame + 1) % MAX_FRAMES_IN_FLIGHT;
}
```

Félicitations ! En exécutant ce code, vous devriez voir un magnifique triangle blanc se dessiner sur un fond rouge qui pulse doucement au cours du temps. Vous venez de franchir l'étape la plus difficile de l'apprentissage de Vulkan : **votre premier pipeline graphique complet et fonctionnel est opérationnel !**