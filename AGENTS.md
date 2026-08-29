# AGENTS.md

Appuies-toi au maximum sur tes skills superpowers pour le développement.

## Objectif du projet

- Créer un calculateur d'emplacement pour les trous d'une flûte selon les formules de [cet article](https://www.vents-sauvages.fr/bruicolage/placement-des-trous.html)
- Hébergé sur GitHub Pages (SvelteKit adapter-static)

## Commandes

- `pnpm dev` — serveur de développement
- `pnpm build` — build de production
- `pnpm check` — type-check (svelte-check)
- `pnpm lint` — eslint
- `pnpm test` — tests unitaires (vitest, une seule exécution)

## Structure

- `src/lib/calculation/` — logique de calcul (pure, testée)
- `src/lib/components/` — composants Svelte
- `src/routes/` — pages
- `static/` — assets servis tels quels

## Normes

- ✅ Toujours lancer `pnpm test`, `pnpm check` et `pnpm lint` avant de déclarer un travail terminé
- ✅ Noms de fonctions/variables représentant des intentions claires, pour une charge mentale minimale
- ✅ Docstrings en one-liners
- ✅ Conventional commits, unitaires (un seul changement logique) avec description des changements
- 🚫 Jamais de commit/merge sur main/master — une feature = une branche
- 🚫 Jamais de fichiers de travail (designs, plans) committés. Les mettre dans .work/
- 🚫 Les PR sont créées par le tech lead

## Stack

- html
- tailwind css
- svelte 5 (typescript)
- pnpm
- eslint
