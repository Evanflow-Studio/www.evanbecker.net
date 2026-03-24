export const COSINE_PALETTES = `
// === IQ COSINE PALETTES ===

vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 getColor(float t) {
  if (u_palette == 0) { // Aether — slate + blues
    return cosPalette(t, vec3(0.15,0.30,0.50), vec3(0.20,0.30,0.45), vec3(0.8,0.8,1.0), vec3(0.55,0.50,0.40));
  } else if (u_palette == 1) { // Cosmic — full rainbow
    return cosPalette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,1.0,1.0), vec3(0.00,0.33,0.67));
  } else if (u_palette == 2) { // Inferno — fire
    return cosPalette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,1.0,0.5), vec3(0.80,0.90,0.30));
  } else if (u_palette == 3) { // Ocean — cool blues/teals
    return cosPalette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,0.7,0.4), vec3(0.00,0.15,0.20));
  } else if (u_palette == 4) { // Electric — yellow/magenta
    return cosPalette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(2.0,1.0,0.0), vec3(0.50,0.20,0.25));
  } else if (u_palette == 5) { // Prismatic — warm pastels
    return cosPalette(t, vec3(0.8,0.5,0.4), vec3(0.2,0.4,0.2), vec3(2.0,1.0,1.0), vec3(0.00,0.25,0.25));
  } else if (u_palette == 6) { // Neon — hot pink/green
    return cosPalette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,1.0,0.5), vec3(0.00,0.10,0.30));
  } else if (u_palette == 7) { // Sunset — orange/purple
    return cosPalette(t, vec3(0.5,0.3,0.2), vec3(0.5,0.4,0.5), vec3(1.0,0.8,0.6), vec3(0.00,0.70,0.50));
  } else if (u_palette == 8) { // Ice — cold blue/white
    return cosPalette(t, vec3(0.6,0.7,0.85), vec3(0.2,0.2,0.3), vec3(0.5,0.5,0.8), vec3(0.10,0.20,0.30));
  } else if (u_palette == 9) { // Vapor — pink/cyan
    return cosPalette(t, vec3(0.5,0.3,0.5), vec3(0.4,0.4,0.5), vec3(1.0,0.7,1.0), vec3(0.00,0.50,0.30));
  } else if (u_palette == 10) { // Forest — green/earth
    return cosPalette(t, vec3(0.2,0.4,0.15), vec3(0.3,0.3,0.2), vec3(1.0,1.2,0.5), vec3(0.20,0.30,0.50));
  } else if (u_palette == 11) { // Mono — grayscale
    return cosPalette(t, vec3(0.5,0.5,0.5), vec3(0.3,0.3,0.3), vec3(1.0,1.0,1.0), vec3(0.00,0.00,0.00));
  } else { // Custom — user-defined palette vectors
    return cosPalette(t, u_paletteA, u_paletteB, u_paletteC, u_paletteD);
  }
}
`
