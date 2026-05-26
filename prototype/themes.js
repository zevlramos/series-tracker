export const VARIANTS = [
  {
    id: 'baseline',
    name: 'Baseline (hand-authored)',
    strategy: 'The existing theme.json — human-picked palette and system-safe fonts. The graded fixture everything else is measured against.',
    tokens: {
      palette: {
        bg: '#0a0a0a',
        surface: '#1a1a1a',
        text: '#d4d4d4',
        accent: '#c41e3a'
      },
      fonts: {
        heading: "'Trebuchet MS', 'Lucida Sans', sans-serif",
        body: "Georgia, 'Times New Roman', serif"
      },
      heroImage: null,
      background: null
    }
  },
  {
    id: 'cinematic-horror',
    name: 'Cinematic Horror',
    strategy: 'Draw from RE2-remake / Village key-art palette. Saturated crimson + deep black + dramatic serif. The "obvious" pick an LLM would make given "Resident Evil = horror."',
    tokens: {
      palette: {
        bg: '#080406',
        surface: '#1a100f',
        text: '#e8ddd5',
        accent: '#b91c1c'
      },
      fonts: {
        heading: "'Cinzel', serif",
        body: "'Cormorant Garamond', Georgia, serif"
      },
      heroImage: null,
      background: 'radial-gradient(ellipse at 50% 0%, rgba(185, 28, 28, 0.08) 0%, transparent 60%)'
    }
  },
  {
    id: 'umbrella-clinical',
    name: 'Umbrella Clinical',
    strategy: 'Draw from the corporate antagonist — Umbrella Corp visual identity, not the horror. Off-white surface, red+black accents, geometric sans. Tests whether "franchise identity" means the villain aesthetic, not the genre.',
    tokens: {
      palette: {
        bg: '#f0eeeb',
        surface: '#ffffff',
        text: '#1a1a1a',
        accent: '#cc0000'
      },
      fonts: {
        heading: "'Space Grotesk', system-ui, sans-serif",
        body: "'Inter', system-ui, sans-serif"
      },
      heroImage: null,
      background: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,0.03) 39px, rgba(0,0,0,0.03) 40px)'
    }
  },
  {
    id: 'typewriter-dossier',
    name: 'Typewriter Dossier',
    strategy: 'Draw from in-game documents/files — classic RE typewriter motif, aged paper. Closest to the "Dossier" variant that won last session\'s UI prototype. Tests whether the LLM picks up on the iconic save-room typewriter as a theming anchor.',
    tokens: {
      palette: {
        bg: '#2b2217',
        surface: '#3d3226',
        text: '#d4c9a8',
        accent: '#8b2500'
      },
      fonts: {
        heading: "'Special Elite', 'Courier New', monospace",
        body: "'IBM Plex Mono', 'Courier New', monospace"
      },
      heroImage: null,
      background: 'linear-gradient(180deg, #2b2217 0%, #1f1912 100%)'
    }
  },
  {
    id: 'biohazard',
    name: 'Biohazard Warning',
    strategy: 'Draw from hazard iconography — caution-tape yellow/black, industrial mono. The deliberate "miss" to test: does the LLM picking the wrong reference (packaging/warning labels vs actual game feel) produce something recoverable or a dead end?',
    tokens: {
      palette: {
        bg: '#0c0c0c',
        surface: '#1a1a0f',
        text: '#c8c8b0',
        accent: '#d4a017'
      },
      fonts: {
        heading: "'Oswald', 'Arial Narrow', sans-serif",
        body: "'Share Tech Mono', 'Courier New', monospace"
      },
      heroImage: null,
      background: 'repeating-linear-gradient(135deg, transparent, transparent 20px, rgba(212, 160, 23, 0.03) 20px, rgba(212, 160, 23, 0.03) 40px)'
    }
  },
  {
    id: 'dossier-full',
    name: 'Dossier (tokens + CSS)',
    strategy: 'Same typewriter tokens PLUS a theme.css override that reshapes the Shell into a leather-bound classified dossier: aged paper texture, spine/cover frame, right-edge bookmark tabs, 3D page-flip, CONFIDENTIAL stamp, typewriter TOC with section labels. This is what "tokens + CSS override" looks like vs tokens alone.',
    cssOverride: 'dossier-override.css',
    tokens: {
      palette: {
        bg: '#2b2217',
        surface: '#3d3226',
        text: '#d4c9a8',
        accent: '#8b2500'
      },
      fonts: {
        heading: "'Special Elite', 'Courier New', monospace",
        body: "'IBM Plex Mono', 'Courier New', monospace"
      },
      heroImage: null,
      background: null
    }
  }
];
