# Module 1.1 : Inertie, Pivot et Pas d'Hélice : La Dynamique du Voilier

---

## 1. Introduction Conceptuelle

Manœuvrer un voilier au moteur dans l'espace restreint d'un port s'apparente plus à de la physique appliquée qu'à de la conduite automobile. Contrairement à un véhicule terrestre qui bénéficie d'une liaison rigide et d'une adhérence quasi instantanée avec le sol via ses pneumatiques, un voilier évolue dans un milieu fluide (l'eau) et subit l'influence d'un second fluide (l'air). 

Pour maîtriser l'art de l'amarrage, il est indispensable de comprendre le **"Pourquoi"** avant le **"Comment"**. Chaque action sur la barre ou sur l'inverseur de marche déclenche une chaîne de réactions physiques prévisibles. Vouloir contrer ces forces par la contrainte ou la vitesse mène inévitablement à l'échec ou à l'accident. À l'inverse, comprendre l'inertie du navire, identifier la position de son point de pivot et exploiter l'effet de couple de l'hélice (le pas d'hélice) permet de réaliser des manœuvres d'une précision chirurgicale, même dans les espaces les plus confinés.

Ce module pose les fondations dynamiques indispensables. Les effets du vent et du courant, bien que liés, seront traités spécifiquement dans le [Module 1.2].

---

## 2. Fondations Théoriques

La dynamique d'un voilier repose sur trois piliers physiques : l'inertie (résistance au changement de mouvement), la rotation autour d'un point de pivot mobile, et la poussée asymétrique générée par l'hélice.

```
                  Marche Avant : Pivot à ~1/3 avant
                         [P]
  Étrave <=========o=====|====================> Tableau arrière
                   ^     
              Point de Pivot (Av)

                  Marche Arrière : Pivot à ~1/4 à 1/3 arrière
                               [P]
  Étrave <======================|=====o=======> Tableau arrière
                                      ^
                                 Point de Pivot (Ar)
```

### A. L'Inertie et la Traînée Hydrodynamique

Un voilier de plaisance moyen pèse entre 3 et 12 tonnes. Cette masse importante engendre une forte **inertie** (loi de Newton : $F = m \cdot a$). 

* **L'inertie linéaire :** Une fois le voilier mis en mouvement, il tend à conserver sa vitesse. Pour l'arrêter, il faut dissiper cette énergie cinétique ($E_c = \frac{1}{2} m v^2$). L'eau oppose une force de traînée hydrodynamique qui freine le bateau, mais cette force est proportionnelle au carré de la vitesse ($F_d \propto v^2$). À basse vitesse (vitesse de manœuvre), la traînée est très faible : le voilier conserve son "erre" (sa vitesse résiduelle) sur une très longue distance sans propulsion.
* **L'inertie de rotation :** De la même manière, un voilier mis en rotation (lacet) continuera à tourner même si la barre est remise au centre. Il faut anticiper cette inertie en "contre-barrant" pour stopper le mouvement de giration.

### B. Le Point de Pivot

Contrairement à une voiture dont les roues directrices directes entraînent l'avant, un voilier tourne en dérapage. Le safran, situé à l'extrême arrière, dévie le flux d'eau, ce qui pousse l'arrière du bateau du côté opposé au virage. 

Le bateau tourne autour d'un axe vertical virtuel appelé **Point de Pivot**. La position de ce point n'est pas fixe ; elle dépend de l'état hydrodynamique de la carène :

| Sens de marche | Position du Point de Pivot | Comportement dynamique |
| :--- | :--- | :--- |
| **Marche Avant** | Environ **1/3 arrière de l'étrave** (au niveau du maître-bau / mât). | L'arrière chasse vers l'extérieur du virage. L'étrave reste relativement stable sur sa trajectoire initiale. |
| **Marche Arrière** | Environ **1/4 à 1/3 en avant du tableau arrière**. | L'étrave balaye un large arc de cercle vers l'extérieur. Le contrôle directionnel est plus instable. |

> **Règle d'or :** Lors d'un virage serré en marche avant le long d'un quai, c'est l'arrière du bateau qui va venir percuter l'obstacle si l'on tourne trop tôt.

### C. Le Pas d'Hélice (Effet de Couple)

Le pas d'hélice est l'effet de poussée latérale transversale généré par la rotation de l'hélice. 

#### L'origine physique
L'eau présente une densité et une pression hydrostatique légèrement plus élevées à la base de l'hélice (pales du bas) qu'au sommet (pales du haut). De plus, la coque perturbe le flux d'eau supérieur. Il en résulte une poussée asymétrique : les pales inférieures ont un meilleur rendement et "mordent" davantage dans l'eau que les pales supérieures. L'hélice se comporte ainsi comme une roue de voiture sur le sol, déplaçant latéralement la poupe du bateau.

```
       Hélice "Pas à Droite" (Marche Avant)
                
                 ( Rotation )
                     / \
                    | O |  ===> Force latérale vers la Droite (Poupe va à droite)
                     \ /
```

#### Typologie des hélices
On détermine le sens d'une hélice en se plaçant derrière le bateau, en regardant vers l'avant :
* **Pas à droite (Right-handed / Clockwise) :** Tourne dans le sens des aiguilles d'une montre en marche avant.
* **Pas à gauche (Left-handed / Counter-clockwise) :** Tourne dans le sens inverse en marche avant.

#### Effets dynamiques selon le sens de marche

| Type d'hélice | Marche Avant (Poussée continue) | Marche Arrière (Effet maximal) |
| :--- | :--- | :--- |
| **Pas à Droite** | Légère tendance de la poupe à aller à droite (étrave à gauche). Facilement compensée par le safran grâce au flux d'eau direct. | **La poupe est tirée puissamment vers la GAUCHE (Bâbord).** L'étrave part à droite (Tribord). |
| **Pas à Gauche** | Légère tendance de la poupe à aller à gauche (étrave à droite). | **La poupe est tirée puissamment vers la DROITE (Tribord).** L'étrave part à gauche (Bâbord). |

L'effet est particulièrement violent en **marche arrière** car le flux d'eau rejeté par l'hélice ne rencontre pas le safran (qui se trouve en amont du flux), privant le skipper de l'autorité de la barre tant que le bateau n'a pas acquis une vitesse hydrodynamique suffisante.

---

## 3. Implémentation Pratique Pas-à-Pas

### Étape 1 : Déterminer le pas d'hélice de son voilier (Le test d'inertie zéro)

Avant toute manœuvre dans un port inconnu, vous devez impérativement connaître le comportement de votre poupe en marche arrière.

1. Positionnez le voilier dans une zone dégagée, sans vent ni courant (ou face au vent).
2. Amenez le bateau à l'arrêt complet (vitesse surface = 0 nœud).
3. Laissez la barre parfaitement au centre.
4. Engagez la marche arrière et donnez un coup de gaz franc mais bref (environ 2000 tr/min pendant 3 secondes), puis remettez au point mort.
5. Observez l'alignement de l'étrave par rapport à un point fixe à l'horizon :
   * Si l'étrave part à **tribord** (la poupe chasse à **bâbord**), vous avez une hélice avec un **pas à droite**.
   * Si l'étrave part à **bâbord** (la poupe chasse à **tribord**), vous avez une hélice avec un **pas à gauche**.

---

### Étape 2 : Réaliser un demi-tour sur place (Exploitation du pas d'hélice)

Pour un voilier équipé d'une hélice **pas à droite** (poupe qui chasse à bâbord en marche arrière), le demi-tour le plus court se fera toujours en tournant dans le **sens des aiguilles d'une montre (vers tribord)**.

```
 Étape 2.1 : Marche avant, barre à Tribord. L'arrière chasse à Bâbord.
 Étape 2.2 : Point mort. Recul initié.
 Étape 2.3 : Marche arrière + coup de gaz. Le pas d'hélice tire la poupe à Bâbord (aide la rotation).
 Étape 2.4 : Marche avant, barre à Tribord pour finaliser le demi-tour.
```

1. **Phase 1 (Marche avant initiatrice) :** Avancez à vitesse minimale de contrôle (1 à 2 nœuds). Mettez la barre toute à tribord. Donnez un coup de gaz bref pour envoyer un flux d'eau puissant sur le safran. L'arrière commence à chasser à bâbord.
2. **Phase 2 (Transition) :** Avant que le bateau ne prenne trop de vitesse avant, passez au point mort, puis engagez la marche arrière.
3. **Phase 3 (Le coup de fouet en marche arrière) :** Laissez la barre à tribord (ou ramenez-la légèrement au centre pour éviter de bloquer le safran lors du recul). Donnez un coup de gaz franc en marche arrière. L'effet de couple (pas d'hélice) va tirer puissamment la poupe vers bâbord, accentuant ainsi la rotation initiée en marche avant.
4. **Phase 4 (Relance) :** Repassez au point mort, remettez la barre toute à tribord, engagez la marche avant avec un coup de gaz pour terminer la rotation sur place.

---

### Étape 3 : Casser l'erre (Arrêt d'urgence contrôlé)

Stopper un voilier en ligne droite nécessite de gérer l'absence d'écoulement d'eau sur le safran lors de la phase de freinage.

1. **Anticipation :** Réduisez les gaz au point mort à une distance équivalente à deux longueurs de coque de votre cible.
2. **Alignement :** Assurez-vous que le bateau est parfaitement aligné avec sa trajectoire finale.
3. **Inversion :** Engagez la marche arrière à bas régime.
4. **Compensation du pas d'hélice :** Dès que vous augmentez les gaz en marche arrière pour casser l'erre, la poupe va vouloir chasser (par exemple à bâbord). Anticipez en mettant un coup de barre opposé (barre à bâbord pour contrer le déplacement de la poupe) *juste avant* que le bateau ne commence à reculer, bien que l'efficacité du safran soit limitée à cet instant.
5. **Point mort final :** Dès que la vitesse est nulle, repassez immédiatement au point mort pour éviter que le bateau ne commence à culer (reculer) de manière incontrôlée.

---

## 4. Pièges Fréquents et Bonnes Pratiques

### Piège 1 : Le syndrome de la "barre bloquée" en marche arrière
* **Description :** En marche arrière, l'eau frappe le safran par l'arrière. La force hydrodynamique tend à arracher la barre des mains du skipper pour la mettre en butée.
* **Conséquence :** Perte de contrôle totale, risque de blessure aux poignets ou de rupture des drosses de transmission.
* **Bonne pratique :** Tenir fermement la barre à deux mains lors de la marche arrière. Ne jamais lâcher la barre. Si la barre échappe au contrôle, repasser immédiatement au point mort pour annuler le flux d'eau de l'hélice.

### Piège 2 : Sur-barrer (Donner trop d'angle de barre sans vitesse)
* **Description :** Tourner la barre au maximum alors que le voilier est presque arrêté.
* **Conséquence :** Le safran agit comme un frein aérodynamique (un véritable "mur" sous l'eau) et empêche le bateau de démarrer ou de prendre la vitesse nécessaire pour que les filets d'eau s'écoulent correctement.
* **Bonne pratique :** Ne pas dépasser 30° d'angle de barre au démarrage. Attendez que le bateau ait un minimum de vitesse ("de l'eau sur le safran") avant d'augmenter l'angle.

### Piège 3 : Ignorer le dérapage arrière lors d'un départ de quai
* **Description :** Vouloir s'éloigner d'un quai (amarré longside) en mettant la barre toute du côté opposé au quai et en embrayant en marche avant.
* **Conséquence :** Le point de pivot étant à l'avant, la poupe va chasser violemment vers le quai et écraser le tableau arrière ou le balcon arrière contre le béton.
* **Bonne pratique :** Utiliser une garde (ceci sera détaillé dans le [Module 3.1]) ou s'écarter parallèlement à l'aide d'une impulsion initiale.

---

## 5. Synthèse Pédagogique

| Concept | Définition Physique | Impact en Manœuvre | Action Corrective / Exploitation |
| :--- | :--- | :--- | :--- |
| **Inertie** | Résistance au changement d'état (vitesse et direction). | Le bateau continue sur son erre sans propulsion. | Anticiper les distances d'arrêt (couper les gaz tôt). |
| **Point de Pivot (Avant)** | Axe de rotation situé au 1/3 avant du bateau. | L'arrière balaye un large espace vers l'extérieur du virage. | Surveiller la poupe lors des virages près des obstacles. |
| **Point de Pivot (Arrière)** | Axe de rotation situé au 1/3 arrière du bateau. | L'étrave balaye un large espace en marche arrière. | Manœuvrer à très basse vitesse en marche arrière. |
| **Pas d'Hélice** | Poussée transversale asymétrique de l'hélice. | Déviation systématique de la poupe en marche arrière. | Utiliser cette déviation pour tourner court (demi-tour). |

---

## 6. Exercice Pratique d'Application

### Énoncé : Vrai ou Faux ?

Répondez par **Vrai** ou **Faux** aux affirmations suivantes, puis étudiez attentivement les corrections détaillées.

1. **Affirmation 1 :** Sur un voilier équipé d'une hélice à pas à droite, la poupe aura tendance à chasser vers bâbord lorsqu'on enclenche la marche arrière.
2. **Affirmation 2 :** En marche avant, le point de pivot se situe au niveau du tableau arrière, ce qui explique pourquoi le bateau tourne de l'arrière.
3. **Affirmation 3 :** Pour stopper un voilier qui a de l'erre en avant, il est préférable de maintenir la marche arrière en continu à haut régime plutôt que de donner des impulsions (coups de fouet).
4. **Affirmation 4 :** Si l'on tourne la barre à fond à tribord alors que le bateau est immobile, le premier mouvement du bateau lors d'un coup de gaz en marche avant sera un déplacement latéral de la poupe vers bâbord.
5. **Affirmation 5 :** En marche arrière, le safran est plus efficace qu'en marche avant car il reçoit directement le flux d'eau propulsé par l'hélice.

---

### Correction Détaillée

1. **Vrai.** 
   * *Explication :* Une hélice à pas à droite tourne dans le sens inverse des aiguilles d'une montre en marche arrière. La pale inférieure, qui travaille dans une eau plus dense et moins perturbée, pousse l'arrière du bateau vers la gauche (bâbord). C'est l'effet de couple standard qu'il faut absolument intégrer avant toute manœuvre.

2. **Faux.**
   * *Explication :* En marche avant, le point de pivot se situe environ au tiers avant du bateau (proche du mât). C'est parce que l'avant est "tenu" par la résistance hydrodynamique de la carène en mouvement, tandis que l'arrière est libre de déraper sous l'action du safran. Si le pivot était au tableau arrière, l'étrave tournerait comme les roues avant d'une voiture, ce qui n'est pas le cas.

3. **Faux.**
   * *Explication :* Une marche arrière continue à haut régime va immédiatement déclencher un effet de pas d'hélice violent, faisant chasser la poupe de manière incontrôlable avant même que le bateau ne soit arrêté. Il est préférable d'utiliser des impulsions brèves et franches ("coups de fouet") pour casser l'erre tout en permettant au skipper de corriger la trajectoire entre chaque impulsion.

4. **Vrai.**
   * *Explication :* Dès que l'hélice tourne en marche avant, elle projette un flux d'eau rapide directement sur le safran orienté à tribord. Même si le bateau n'a pas encore de vitesse par rapport au fond (vitesse surface nulle), la pression hydrodynamique sur le safran pousse immédiatement la poupe vers bâbord, initiant la rotation autour du point de pivot avant.

5. **Faux.**
   * *Explication :* C'est exactement l'inverse. En marche arrière, l'hélice aspire l'eau depuis l'arrière (flux laminaire non dirigé sur le safran) et la rejette vers l'avant du bateau. Le safran ne reçoit donc aucun flux d'hélice direct ; il ne devient efficace que lorsque le bateau a acquis une vitesse de recul suffisante pour que l'écoulement de l'eau sur sa surface génère une portance.