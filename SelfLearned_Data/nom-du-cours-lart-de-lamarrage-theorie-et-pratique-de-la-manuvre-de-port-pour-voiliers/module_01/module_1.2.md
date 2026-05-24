# Module 1.2 : Effets de l'Aérodynamisme et de l'Hydrodynamisme (Vent et Courant)

---

## 1. Introduction Conceptuelle

Lorsqu'un voilier évolue en haute mer, le vent et le courant sont ses moteurs principaux. Cependant, dès que le navire pénètre dans l'espace restreint d'un port pour y effectuer une manœuvre d'amarrage, ces deux forces fluides se transforment instantanément en contraintes majeures, voire en dangers. 

La difficulté de la manœuvre de port réside dans une transition physique critique : **la perte d'efficacité des appendices hydrodynamiques à basse vitesse**. Alors que la portance de la quille et du safran s'effondre lorsque la vitesse du bateau descend sous la barre des 1,5 nœud, les forces aérodynamiques s'exerçant sur les œuvres mortes (la partie émergée de la coque, le gréement et les superstructures) restent constantes pour une vitesse de vent donnée. Le voilier passe alors d'un régime de déplacement contrôlé par ses appendices à un régime de dérive dominé par les éléments extérieurs.

Comprendre l'interaction entre l'aérodynamisme (l'action du vent sur le fardage) et l'hydrodynamisme (l'action du courant sur la carène) est indispensable pour anticiper la trajectoire réelle du navire. Le skipper ne doit pas lutter contre ces forces, mais apprendre à les évaluer, à les combiner et, finalement, à les exploiter pour faciliter son accostage.

---

## 2. Fondations Théoriques

Pour maîtriser la trajectoire d'un voilier à basse vitesse, il est nécessaire de modéliser les forces en présence et de comprendre comment elles s'appliquent sur le navire.

```
                     Vent (Fa)
                        |
                        v
               +--------|--------+
               |  Bow   |        |
               |     [ CLA ]     |  <-- Centre de Latéralité Aérodynamique
               |        |        |
               |        |        |
               |     [ CLH ]     |  <-- Centre de Latéralité Hydrodynamique
               |        |        |
               |  Stern          |
               +-----------------+
                        ^
                        |
                   Courant (Fh)
```

### 2.1. L'Aérodynamisme et le Fardage

Le **fardage** désigne la surface émergée du voilier qui offre une prise au vent. La force aérodynamique ($F_a$) exercée par le vent sur le voilier est régie par l'équation de traînée des fluides :

$$F_a = \frac{1}{2} \cdot \rho_{air} \cdot C_x \cdot A \cdot V_a^2$$

Où :
*   $\rho_{air}$ est la masse volumique de l'air ($\approx 1,2 \, \text{kg/m}^3$ à $15^\circ\text{C}$).
*   $C_x$ est le coefficient de traînée aérodynamique du profil du bateau (variable selon l'angle d'incidence du vent).
*   $A$ est la surface de fardage exposée (en $\text{m}^2$).
*   $V_a$ est la vitesse du vent apparent (en $\text{m/s}$).

**Loi quadratique :** L'élément le plus critique de cette formule est le terme $V_a^2$. Si la vitesse du vent double, la force de fardage est multipliée par **quatre**. 

#### Le Centre de Latéralité Aérodynamique (CLA)
La force de fardage globale s'applique en un point géométrique virtuel appelé le **Centre de Latéralité Aérodynamique (CLA)**. 
*   Sur un voilier moderne (avec une étrave haute, un rouf volumineux et un gréement en tête), le CLA est généralement situé en avant du milieu du bateau.
*   La présence d'équipements optionnels (capote de descente, bimini, portique arrière) déplace significativement le CLA vers l'arrière.

### 2.2. L'Hydrodynamisme et la Dérive

L'eau étant environ 800 fois plus dense que l'air ($\rho_{eau} \approx 1000 \, \text{kg/m}^3$), les forces hydrodynamiques s'exerçant sur la carène (œuvres vives) sont colossales, même à très faible vitesse. La force hydrodynamique de dérive ($F_h$) due au courant est modélisée par :

$$F_h = \frac{1}{2} \cdot \rho_{eau} \cdot C_d \cdot A_{sub} \cdot V_c^2$$

Où :
*   $A_{sub}$ est la surface latérale mouillée (quille, safran, coque immergée).
*   $V_c$ est la vitesse du courant (en $\text{m/s}$).

En raison de la différence de densité des fluides, **un courant de seulement 1 nœud peut générer une force latérale équivalente à un vent de travers de 15 à 20 nœuds** (selon le ratio fardage/surface mouillée du voilier).

#### Le Centre de Latéralité Hydrodynamique (CLH)
Le **Centre de Latéralité Hydrodynamique (CLH)** est le point d'application de la résistance latérale de la carène à la dérive. Il est fortement influencé par la position de la quille. Sur la majorité des voiliers de plaisance, le CLH est situé légèrement en arrière du CLA.

### 2.3. Le Couple de Rotation : Interaction CLA / CLH

Lorsque le voilier est soumis à un vent de travers à l'arrêt, la non-alignement vertical du CLA et du CLH crée un **couple de rotation**.

```
               Vent de travers (Tribord) --->
               
                     [ CLA ]  ---> Force Aérodynamique (Fa)
                        |
                        |  d (Distance entre CLA et CLH)
                        |
                     [ CLH ]  <--- Force Hydrodynamique (Fh)
```

Si le CLA est en avant du CLH (cas le plus fréquent sur les voiliers modernes sans voiles dehors) :
1. Le vent pousse l'avant du bateau plus facilement que l'arrière.
2. Le voilier a une tendance naturelle à **abattre** (l'étrave fuit le vent).
3. À l'arrêt, le bateau va pivoter pour présenter son tableau arrière au vent.

> *Note de transition pédagogique :* Ce phénomène de pivot naturel interagit directement avec l'effet de pas d'hélice étudié dans le *Module 1.1*. Lors d'une marche arrière, le pas d'hélice peut soit contrer, soit accentuer cette tendance à l'abattée.

### 2.4. La Composition Vectorielle des Forces

La trajectoire réelle du voilier sur le fond (Vecteur Vitesse Fond, $\vec{V}_f$) est la somme vectorielle de sa vitesse surface ($\vec{V}_s$, générée par le moteur et contrôlée par le safran), du vecteur courant ($\vec{V}_c$) et de la dérive due au vent ($\vec{V}_d$) :

$$\vec{V}_f = \vec{V}_s + \vec{V}_c + \vec{V}_d$$

---

## 3. Implémentation Pratique Pas-à-Pas

Pour réussir une manœuvre de port, le skipper doit suivre un protocole rigoureux d'évaluation et d'adaptation aux forces environnementales.

### Étape 1 : L'Analyse Environnementale (Avant d'entrer dans la darse)

Avant d'engager le bateau dans un chenal étroit ou entre des pannes (pontons), effectuez une observation systématique :

1.  **Mesure du vent local :** Ne vous fiez pas uniquement à l'anémomètre de tête de mât (perturbé par les superstructures du port). Observez les pavillons des bateaux amarrés, les manches à air et les rides à la surface de l'eau.
2.  **Détection du courant :** Observez les bouées de balisage, les coffres d'amarrage ou les piliers des pontons. L'eau forme-t-elle un remous ("moustache") derrière ces obstacles fixes ? De quel côté penchent les algues fixées aux chaînes ?
3.  **Calcul mental du vecteur résultant :** Déterminez si le vent et le courant sont alignés, opposés ou orthogonaux.

### Étape 2 : Établir la Hiérarchie des Forces

Appliquez la règle empirique suivante pour déterminer quelle force dominera votre manœuvre :

| Vitesse du courant ($V_c$) | Vitesse du vent ($V_a$) | Force Dominante | Action requise |
| :--- | :--- | :--- | :--- |
| $< 0,5$ nœud | $> 10$ nœuds | **Vent (Aérodynamisme)** | Privilégier le contrôle du fardage (étrave face au vent). |
| $> 1,0$ nœud | $< 15$ nœuds | **Courant (Hydrodynamisme)** | Privilégier le contrôle de la dérive hydrodynamique. Ne jamais présenter le flanc au courant. |
| $> 1,0$ nœud | $> 15$ nœuds | **Forces Combinées** | Manœuvre complexe. Nécessite l'utilisation de gardes (étudiées au *Module 2.1*). |

### Étape 3 : Stratégies de Manœuvre selon les Configurations

#### Configuration A : Vent ou Courant de Face (La configuration idéale)

C'est la situation la plus sécurisante. Le fluide agit comme un frein naturel et progressif.

```
[ Quai ] 
   ^
   |   Approche lente (Angle de 20° à 30°)
  / 
 /   <--- [ Voilier ]
/
      ▲
      │  Vent / Courant de Face
```

1.  **Approche :** Présentez le voilier avec un angle de $20^\circ$ à $30^\circ$ par rapport au quai.
2.  **Vitesse :** Conservez une vitesse surface suffisante pour garder du gouvernement (portance sur le safran), car la vitesse fond sera naturellement réduite par le fluide de face.
3.  **Arrêt :** Battez en arrière pour casser l'erre restante. Le vent/courant aidera à stopper le bateau instantanément sans dérive latérale parasite.

#### Configuration B : Vent ou Courant de l'Arrière (La configuration critique)

Le fluide pousse le bateau, augmentant son inertie et réduisant l'efficacité du safran (qui travaille dans un flux d'eau perturbé).

1.  **Approche :** Alignez le bateau parallèlement au quai le plus tôt possible, à une distance de sécurité plus importante.
2.  **Vitesse :** Vitesse surface minimale absolue (limite de l'arrêt de barre).
3.  **Arrêt :** Anticipez l'inversion de poussée du moteur (marche arrière) très tôt. Dès que la marche arrière est engagée, le flux de l'hélice annule l'effet du safran ; le bateau est alors temporairement non manœuvrant et soumis au fardage arrière.

#### Configuration C : Vent ou Courant de Travers Poussant au Quai

Le fluide vous pousse vers l'obstacle. Le risque est de heurter le quai par le flanc.

```
==================== QUAI ====================
      ▲              ▲              ▲
      │              │              │   (Dérive latérale)
   [ Voilier ]    [ Voilier ]    [ Voilier ]

      ▲
      │  Vent / Courant de travers (poussant)
```

1.  **Approche :** Approchez parallèlement au quai, mais à une distance équivalente à une largeur de coque (environ 3 à 4 mètres).
2.  **Action :** Arrêtez le bateau complètement en amont de votre place cible.
3.  **Contrôle :** Laissez le fluide dériver le bateau latéralement vers le quai. Utilisez le moteur uniquement pour ajuster la position avant/arrière. *Attention : positionnez vos pare-battages plus haut que d'ordinaire (voir Module 2.3).*

#### Configuration D : Vent ou Courant de Travers Fuyant du Quai

Le fluide vous éloigne du quai. Si vous manquez votre première approche, vous serez poussé vers le milieu du bassin.

1.  **Approche :** Approchez avec un angle très fermé ($45^\circ$ à $60^\circ$) pour enfoncer l'étrave vers le quai malgré la dérive.
2.  **Point de contact :** Visez un point d'impact contrôlé avec l'étrave (protégée par une défense d'étrave).
3.  **Sécurisation :** Passez immédiatement une **garde avant** (voir *Module 2.1*). Une fois la garde frappée et étarquée, embrayez en marche avant lente avec la barre toute du côté opposé au quai pour plaquer l'arrière du bateau par effet de levier hydrodynamique.

---

## 4. Pièges Fréquents et Bonnes Pratiques

### 4.1. Les Pièges à Éviter

*   **Le piège de l'effet de masque (Wind Shadow) :** À l'approche d'un quai élevé ou d'un grand bâtiment de capitainerie, le vent peut s'annuler brusquement ou créer des turbulences (rouleaux). Un skipper non préparé risque de surcorriger une dérive qui disparaît soudainement, provoquant une collision.
*   **La perte de vitesse de manœuvre (Under-speeding) :** Par peur de la vitesse, les débutants coupent souvent les gaz trop tôt. Sans vitesse de l'eau sur le safran, le bateau ne tourne plus et devient le jouet exclusif du vent. **Règle d'or : "Pas de vitesse, pas de gouverne."**
*   **La confusion entre Vitesse Surface et Vitesse Fond :** Par fort courant de face, le loch (vitesse surface) peut indiquer 3 nœuds alors que le GPS (vitesse fond) indique 0 nœud. Le bateau est immobile par rapport au quai, mais parfaitement manœuvrant. À l'inverse, avec un courant arrière de 2 nœuds, une vitesse surface de 1 nœud donne une vitesse d'impact de 3 nœuds sur le quai.

### 4.2. Les Bonnes Pratiques

*   **La règle du "Sausage Test" (Le test de dérive) :** Avant d'entamer une manœuvre délicate dans un espace étroit, immobilisez le voilier face au vent dans une zone dégagée du port pendant 30 secondes. Observez la vitesse et la direction de sa dérive naturelle. Cela vous donnera une image instantanée des forces réelles qui s'appliqueront durant l'accostage.
*   **L'utilisation du pivot naturel :** Si vous devez faire un demi-tour dans un chenal étroit avec un vent de travers, pivotez toujours de manière à ce que le vent pousse l'étrave (abattée) pendant la phase de marche arrière, plutôt que d'essayer de faire remonter l'étrave face au vent.
*   **L'anticipation de la sortie de panne :** Pensez toujours à la manière dont vous repartirez le lendemain. Si le vent de travers vous plaque au quai aujourd'hui, il sera deux fois plus difficile de partir demain sans l'aide d'une garde.

---

## 5. Synthèse Pédagogique

| Paramètre | Action du Vent (Aérodynamisme) | Action du Courant (Hydrodynamisme) |
| :--- | :--- | :--- |
| **Point d'application** | Centre de Latéralité Aérodynamique (CLA) - Généralement sur l'avant du voilier. | Centre de Latéralité Hydrodynamique (CLH) - Centré sur la quille. |
| **Sensibilité à la vitesse** | Proportionnelle au carré de la vitesse du vent ($V_a^2$). | Proportionnelle au carré de la vitesse du courant ($V_c^2$). |
| **Effet principal à l'arrêt** | Fait abattre l'étrave et pivoter le bateau cul au vent. | Entraîne la totalité de la masse immergée de manière uniforme. |
| **Règle de sécurité** | Facile à contrer avec un coup de fouet moteur (flux d'hélice sur le safran). | Extrêmement difficile à contrer à la force du moteur si le courant prend le bateau par le travers. |
| **Indicateurs visuels** | Pavillons, rides sur l'eau, anémomètre. | Bouées, remous autour des obstacles fixes, algues. |

---

## 6. Exercice Pratique d'Application

### Énoncés (Vrai ou Faux)

Répondez par **Vrai** ou **Faux** aux affirmations suivantes en analysant les forces physiques en jeu.

1.  **Affirmation 1 :** À l'arrêt complet dans un bassin sans courant, un voilier moderne sans voiles établies aura naturellement tendance à aligner son étrave face au vent.
2.  **Affirmation 2 :** Un courant constant de 1,5 nœud de travers exerce sur la carène d'un voilier une force généralement supérieure à celle d'un vent de travers de 10 nœuds sur son fardage.
3.  **Affirmation 3 :** Lors d'un accostage avec un vent fort fuyant du quai (qui éloigne le bateau), la meilleure stratégie consiste à approcher parallèlement au quai à très faible vitesse pour pouvoir lancer les amarres facilement.
4.  **Affirmation 4 :** L'effet de fardage d'un voilier est multiplié par deux lorsque la vitesse du vent réel passe de 10 à 20 nœuds.
5.  **Affirmation 5 :** Si vous manœuvrez face à un courant de face de 2 nœuds, votre safran reste efficace même si votre vitesse par rapport au quai (vitesse fond) est nulle.

---

### Indices pour l'étudiant

*   *Indice pour l'affirmation 1 :* Pensez à la position relative du CLA (souvent sur l'avant à cause du fardage de l'étrave et du gréement) par rapport au CLH (centré sur la quille). Quel levier le vent crée-t-il ?
*   *Indice pour l'affirmation 2 :* Comparez la masse volumique de l'eau ($\approx 1000 \, \text{kg/m}^3$) à celle de l'air ($\approx 1,2 \, \text{kg/m}^3$).
*   *Indice pour l'affirmation 3 :* Si vous êtes parallèle et lent, la dérive vous éloignera avant que l'équipage n'ait le temps de réagir. Quel angle d'attaque permet de contrer une force latérale ?
*   *Indice pour l'affirmation 4 :* Relisez attentivement la formule de la force aérodynamique ($F_a$) et la relation mathématique liée à la vitesse du vent.
*   *Indice pour l'affirmation 5 :* Qu'est-ce qui génère la portance sur un safran : la vitesse du bateau par rapport au fond ou la vitesse de l'eau qui s'écoule autour du profil ?

---

### Correction Détaillée

1.  **Affirmation 1 : FAUX.** 
    *   *Explication :* Sur la majorité des voiliers de plaisance modernes, le Centre de Latéralité Aérodynamique (CLA) est situé en avant du Centre de Latéralité Hydrodynamique (CLH). Le vent exerce donc un bras de levier plus important sur l'avant du bateau. À l'arrêt, l'étrave va abattre (fuir le vent) et le voilier finira par se stabiliser avec le tableau arrière (le cul) face au vent.
2.  **Affirmation 2 : VRAI.** 
    *   *Explication :* L'eau est environ 800 fois plus dense que l'air. Même si la surface mouillée d'une carène est inférieure à la surface de fardage, la masse volumique du fluide hydrodynamique ($\rho_{eau}$) compense largement cette différence. Un courant de 1,5 nœud génère une force de dérive latérale très puissante, équivalente à un vent de travers de près de 20 nœuds.
3.  **Affirmation 3 : FAUX.** 
    *   *Explication :* Avec un vent fuyant, une approche parallèle et lente garantit l'échec : le bateau sera poussé au large avant d'atteindre le quai. Il faut approcher avec un angle prononcé ($45^\circ$ à $60^\circ$) pour "planter" l'étrave au quai, y frapper immédiatement une garde avant, puis utiliser le moteur pour plaquer l'arrière.
4.  **Affirmation 4 : FAUX.** 
    *   *Explication :* La force de fardage varie avec le **carré** de la vitesse du vent ($V_a^2$). Si la vitesse du vent double (de 10 à 20 nœuds), la force de fardage est multipliée par $2^2$, soit **quatre fois** plus importante, et non deux.
5.  **Affirmation 5 : VRAI.** 
    *   *Explication :* La portance hydrodynamique du safran dépend exclusivement de la vitesse de l'eau qui s'écoule autour de lui (vitesse surface). Si le bateau a une vitesse fond de 0 nœud face à un courant de 2 nœuds, l'eau s'écoule à 2 nœuds le long du safran. Le bateau est donc parfaitement manœuvrant et répondra aux sollicitations de la barre.