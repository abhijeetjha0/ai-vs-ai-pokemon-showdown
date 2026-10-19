import { Sprites } from '@pkmn/img';
import { Dex } from '@pkmn/sim';

/**
 * Standardizes and extracts canonical species name, base species, and clean identifiers.
 * Safely strips level, gender, item, and nickname formatting (e.g. "Sparky (Rotom-Wash), L50, M").
 *
 * @param {string} rawName - Raw species or Pokemon name string
 * @returns {{ canonical: string, baseSpecies: string, cleanBase: string }}
 */
export function getCanonicalSpecies(rawName) {
  if (!rawName) return { canonical: '', baseSpecies: '', cleanBase: '' };

  // Strip trailing details after comma (e.g., "Rotom-Wash, L50, M")
  let cleaned = String(rawName).split(',')[0].trim();

  // If formatted as "Nickname (Species)", extract the species within parentheses
  const parenMatch = cleaned.match(/\(([^)]+)\)/);
  if (parenMatch) {
    cleaned = parenMatch[1].trim();
  }

  // Lookup species in Showdown Dex to resolve canonical casing and form names
  const spec = Dex.species.get(cleaned);
  const canonical = spec.exists ? spec.name : cleaned;
  const baseSpecies = spec.baseSpecies || canonical.split('-')[0] || canonical;
  const cleanBase = baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, '');

  return { canonical, baseSpecies, cleanBase };
}

/**
 * Retrieves the battle field sprite URL for active combat with multi-tier fallback.
 * Uses official @pkmn/img mapping which correctly resolves all alternate forms
 * (e.g. Rotom-Wash, Tauros-Paldea-Combat, Urshifu-Rapid-Strike, Ogerpon-Wellspring,
 * regional variants, Mega Evolutions, Paradox Pokémon, etc.).
 *
 * Fallback stages:
 *  0: Best primary sprite matching perspective (animated 3D if available, or Gen 5)
 *  1: If back sprite requested and missing, try front-facing sprite of same Pokémon
 *  2: Static Gen 5 sprite of the specific alternate form
 *  3: Base species animated sprite (e.g. base Rotom for Rotom-Wash)
 *  4: Base species Gen 5 static sprite
 *  5: Sugimori Dex artwork PNG
 *
 * @param {string} rawName - Pokemon name or species
 * @param {'front'|'back'} side - Battle perspective
 * @param {number} fallbackStage - Fallback ladder level (0-5)
 * @returns {string} Fully qualified Showdown sprite URL
 */
export function getBattleSpriteUrl(rawName, side = 'front', fallbackStage = 0) {
  const { canonical, baseSpecies, cleanBase } = getCanonicalSpecies(rawName);
  if (!canonical) return '';

  try {
    if (fallbackStage === 0) {
      const s = Sprites.getPokemon(canonical, side === 'back' ? { side: 'p1' } : { side: 'p2' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 1 && side === 'back') {
      const s = Sprites.getPokemon(canonical, { side: 'p2' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage <= 2) {
      const s = Sprites.getPokemon(canonical, { gen: 'gen5' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 3) {
      const s = Sprites.getPokemon(baseSpecies, side === 'back' ? { side: 'p1' } : { side: 'p2' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 4) {
      const s = Sprites.getPokemon(baseSpecies, { gen: 'gen5' });
      if (s && s.url) return s.url;
    }
  } catch (err) {
    console.warn(`[getBattleSpriteUrl] Failed for "${rawName}" at stage ${fallbackStage}:`, err);
  }

  // Final fallback to Dex artwork
  return `https://play.pokemonshowdown.com/sprites/dex/${cleanBase || 'pikachu'}.png`;
}

/**
 * Retrieves the crisp roster / teambuilder slot sprite URL (Gen 5 pixel art preferred).
 * Fully supports all alternate forms and regional variants.
 *
 * Fallback stages:
 *  0: Gen 5 static pixel sprite of the alternate form
 *  1: Animated / primary sprite of the alternate form
 *  2: Gen 5 static pixel sprite of base species
 *  3: Sugimori Dex artwork PNG
 *
 * @param {string} rawName - Pokemon name or species
 * @param {number} fallbackStage - Fallback level (0-3)
 * @returns {string} Fully qualified Showdown sprite URL
 */
export function getRosterSpriteUrl(rawName, fallbackStage = 0) {
  const { canonical, baseSpecies, cleanBase } = getCanonicalSpecies(rawName);
  if (!canonical) return '';

  try {
    if (fallbackStage === 0) {
      const s = Sprites.getPokemon(canonical, { gen: 'gen5' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 1) {
      const s = Sprites.getPokemon(canonical);
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 2) {
      const s = Sprites.getPokemon(baseSpecies, { gen: 'gen5' });
      if (s && s.url) return s.url;
    }
  } catch (err) {
    console.warn(`[getRosterSpriteUrl] Failed for "${rawName}" at stage ${fallbackStage}:`, err);
  }

  return `https://play.pokemonshowdown.com/sprites/dex/${cleanBase || 'pikachu'}.png`;
}

/**
 * Retrieves the detail modal sprite URL (animated front preferred, with static fallbacks).
 * Fully supports all alternate forms and regional variants.
 *
 * Fallback stages:
 *  0: Animated front sprite of alternate form
 *  1: Gen 5 static sprite of alternate form
 *  2: Animated front sprite of base species
 *  3: Gen 5 static sprite of base species
 *  4: Sugimori Dex artwork PNG
 *
 * @param {string} rawName - Pokemon name or species
 * @param {number} fallbackStage - Fallback level (0-4)
 * @returns {string} Fully qualified Showdown sprite URL
 */
export function getDetailSpriteUrl(rawName, fallbackStage = 0) {
  const { canonical, baseSpecies, cleanBase } = getCanonicalSpecies(rawName);
  if (!canonical) return '';

  try {
    if (fallbackStage === 0) {
      const s = Sprites.getPokemon(canonical, { side: 'p2' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 1) {
      const s = Sprites.getPokemon(canonical, { gen: 'gen5' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 2) {
      const s = Sprites.getPokemon(baseSpecies, { side: 'p2' });
      if (s && s.url) return s.url;
    }

    if (fallbackStage === 3) {
      const s = Sprites.getPokemon(baseSpecies, { gen: 'gen5' });
      if (s && s.url) return s.url;
    }
  } catch (err) {
    console.warn(`[getDetailSpriteUrl] Failed for "${rawName}" at stage ${fallbackStage}:`, err);
  }

  return `https://play.pokemonshowdown.com/sprites/dex/${cleanBase || 'pikachu'}.png`;
}
