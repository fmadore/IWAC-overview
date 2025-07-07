/**
 * Modern color palette utilities for data visualizations
 */

// Modern color palettes for different visualization types
export const colorPalettes = {
  // Primary palette - vibrant and professional
  primary: [
    '#5B6EE8', // Primary blue
    '#FF6B9D', // Pink
    '#4ECDC4', // Teal
    '#FFD93D', // Yellow
    '#95E1D3', // Mint
    '#C7CEEA', // Lavender
    '#FFA502', // Orange
    '#786FA6', // Purple
    '#F8B500', // Gold
    '#EE5A6F', // Coral
  ],
  
  // Professional palette - balanced and sophisticated
  professional: [
    '#2563eb', // Professional blue
    '#dc2626', // Professional red
    '#059669', // Professional green
    '#d97706', // Professional orange
    '#7c3aed', // Professional purple
    '#0891b2', // Professional cyan
    '#be185d', // Professional pink
    '#4b5563', // Professional gray
    '#65a30d', // Professional lime
    '#c2410c', // Professional amber
  ],
  
  // Pastel palette - soft and modern
  pastel: [
    '#B5C7FF', // Soft blue
    '#FFB5CC', // Soft pink
    '#A8E6CF', // Soft green
    '#FFE5B5', // Soft peach
    '#D4A5FF', // Soft purple
    '#FFD3B6', // Soft orange
    '#AADAFF', // Sky blue
    '#E8BBE8', // Soft magenta
    '#B5FFD9', // Soft mint
    '#FFC8DD', // Soft rose
  ],
  
  // Monochromatic blue palette
  monochrome: [
    '#1e3a8a', // Deep blue
    '#2563eb', // Strong blue
    '#3b82f6', // Medium blue
    '#60a5fa', // Light blue
    '#93bbfc', // Lighter blue
    '#bfdbfe', // Very light blue
    '#dbeafe', // Pale blue
    '#eff6ff', // Almost white blue
  ],
  
  // Earth tones - professional and subtle
  earth: [
    '#8B7355', // Brown
    '#CD853F', // Peru
    '#DEB887', // Burlywood
    '#F4A460', // Sandy brown
    '#D2691E', // Chocolate
    '#BC8F8F', // Rosy brown
    '#A0522D', // Sienna
    '#8B4513', // Saddle brown
    '#D2B48C', // Tan
    '#FFE4B5', // Moccasin
  ],
  
  // High contrast - for accessibility
  contrast: [
    '#1A202C', // Dark
    '#E53E3E', // Red
    '#38A169', // Green
    '#3182CE', // Blue
    '#D69E2E', // Yellow
    '#805AD5', // Purple
    '#DD6B20', // Orange
    '#38B2AC', // Teal
    '#E53E3E', // Pink
    '#718096', // Gray
  ],
};

// Function to get a color palette
export function getColorPalette(
  paletteName: keyof typeof colorPalettes = 'primary',
  count?: number
): string[] {
  const palette = colorPalettes[paletteName];
  
  if (!count || count >= palette.length) {
    return [...palette];
  }
  
  // If fewer colors needed, select evenly distributed colors
  const step = palette.length / count;
  const selectedColors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const index = Math.floor(i * step);
    selectedColors.push(palette[index]);
  }
  
  return selectedColors;
}

// Function to generate gradient definitions for SVG
export function generateSVGGradients(): string {
  return `
    <defs>
      <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gradient-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gradient-accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gradient-warm" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#fa709a;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#fee140;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="gradient-cool" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#30cfd0;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#330867;stop-opacity:1" />
      </linearGradient>
      <radialGradient id="gradient-radial" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:0.3" />
      </radialGradient>
    </defs>
  `;
}

// Function to get a color with opacity
export function getColorWithOpacity(color: string, opacity: number): string {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Function to interpolate between two colors
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Export the default modern color scale
export const modernColorScale = getColorPalette('primary'); 