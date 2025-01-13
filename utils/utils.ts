export function getRandomLightColor() {
    const h = Math.floor(Math.random() * 360); // Random hue
    const s = Math.floor(Math.random() * 41) + 60; // Saturation: 60-100%
    const l = Math.floor(Math.random() * 21) + 60; // Lightness: 60-80%
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  