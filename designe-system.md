# 🎨 SelfLearned : Design System & UI Guidelines

Ce document est la source de vérité pour l'interface de SelfLearned (Web et Mobile). L'objectif est de reproduire une esthétique "Technical UI" / "Dark Minimalist", inspirée de Zed IDE, AI Studio, Linear et Shadcn UI.

## 1. Philosophie Générale
- **Densité & Professionnalisme :** Les interfaces doivent paraître techniques. Utiliser des polices petites (13px/14px).
- **Sobriété :** Pas de couleurs flashy. L'interface s'efface au profit du contenu.
- **Précision :** Des bordures très fines (`1px`), des coins légèrement arrondis mais pas de formes "pilule".
- **Texture (Optionnelle) :** Un très léger grain sur le fond principal pour donner un aspect "mat" (comme Zed).

## 2. Palette de Couleurs (Base : Tailwind Zinc)
Toutes les couleurs sont basées sur le mode sombre.
- **Background Application :** `#09090b` (zinc-950) - *Très noir, presque pur.*
- **Background Composants (Cartes, Modals, Sidebars) :** `#121214` ou `#18181b` (zinc-900)
- **Background Éléments Survolés (Hover) :** `#27272a` (zinc-800)
- **Bordures (Subtiles) :** `#27272a` (zinc-800) ou `#3f3f46` (zinc-700)
- **Texte Principal :** `#e4e4e7` (zinc-200) - *Pas de blanc pur pour éviter la fatigue visuelle.*
- **Texte Secondaire (Labels, dates) :** `#a1a1aa` (zinc-400)
- **Couleur d'Accentuation (Focus, Boutons Primaires) :** `#f4f4f5` (zinc-100) pour un bouton, ou un bleu très désaturé et technique comme `#3b82f6` (blue-500) utilisé avec parcimonie.

## 3. Typographie
- **Interface (UI) :** `Geist`, `Inter` ou la police système standard. Tailles : `text-sm` (14px) en majorité, `text-xs` (12px) pour les tags/labels. Poids : `font-medium` pour la lisibilité.
- **Code & Données :** `JetBrains Mono` ou `Fira Code`. Taille : `text-sm`.
- **Titres de contenu :** Sobres, pas gigantesques. Le `h1` du cours doit faire `text-2xl` maximum avec un `font-semibold`.

## 4. Composants Clés
- **Boutons :** Hauteur réduite (`h-8` ou `h-9`). `rounded-md` (6px). Bordure fine 1px.
- **Inputs :** Fond `zinc-900`, bordure `zinc-800`. Focus state : Bordure `zinc-500` (sans ring énorme).
- **Bloc "Thinking" / Professeur Virtuel :** 
  - Doit ressembler à un accordéon (`<details>`).
  - Bordure gauche (accentuée) `border-l-2 border-zinc-500`.
  - Fond légèrement distinct : `bg-zinc-900/50`.
  - Texte en `text-zinc-400` et `text-sm`.
- **Cartes (Cours) :** Pas d'ombre portée (`shadow-none`). Démarcation uniquement via une bordure 1px `border-zinc-800`.