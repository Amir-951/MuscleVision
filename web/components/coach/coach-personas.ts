import type {CoachId} from '@/lib/types';

export interface CoachPersona {
  id: CoachId;
  name: string;
  tone: string;
  role: string;
  environment: string;
  environmentNote: string;
  signal: string;
  intro: string;
  scene: 'lab_orbit' | 'warmup_deck' | 'drill_hall' | 'iron_cathedral';
  palette: {
    base: string;
    accent: string;
    glow: string;
    haze: string;
    edge: string;
    line: string;
  };
}

export const coachPersonaList: CoachPersona[] = [
  {
    id: 'dr_reed',
    name: 'Dr. Reed',
    tone: 'Scientifique',
    role: 'Biomechanics analyst',
    environment: 'Orbital diagnostics chamber',
    environmentNote: 'Volumes clairs, anneaux de mesure et signaux biomécaniques.',
    signal: 'Précision, méthode, causalité.',
    intro: 'Je lis la séance comme une expérience: amplitude, stabilité, symétrie, puis plan correctif.',
    scene: 'lab_orbit',
    palette: {
      base: '#0b1320',
      accent: '#89d1ff',
      glow: '#8ae5ff',
      haze: '#16314f',
      edge: '#d5f3ff',
      line: '#5acbff',
    },
  },
  {
    id: 'max',
    name: 'Max',
    tone: 'Supportif',
    role: 'Performance coach',
    environment: 'Sunrise conditioning deck',
    environmentNote: 'Air chaud, piste ouverte, progression lisible et calme.',
    signal: 'Confiance, cadence, progression.',
    intro: 'On garde l’élan, on structure la progression et on transforme chaque séance en mouvement maîtrisé.',
    scene: 'warmup_deck',
    palette: {
      base: '#1a1210',
      accent: '#ffb56b',
      glow: '#ffdb9f',
      haze: '#5a2417',
      edge: '#fff1d4',
      line: '#ff8b54',
    },
  },
  {
    id: 'sergeant',
    name: 'Sergent',
    tone: 'Militaire',
    role: 'Discipline engine',
    environment: 'Tactical drill hall',
    environmentNote: 'Lignes tendues, signalétique sèche, lecture frontale.',
    signal: 'Discipline, régularité, répétition propre.',
    intro: 'Je coupe le bruit, je garde l’essentiel et je corrige ce qui empêche une exécution nette.',
    scene: 'drill_hall',
    palette: {
      base: '#12120f',
      accent: '#c4ff73',
      glow: '#d7ff9e',
      haze: '#2d3118',
      edge: '#efffd0',
      line: '#8faa45',
    },
  },
  {
    id: 'bro',
    name: 'Bro',
    tone: 'Salle',
    role: 'Iron-room motivator',
    environment: 'Iron cathedral',
    environmentNote: 'Voûtes lourdes, chrome chaud, énergie de salle tardive.',
    signal: 'Impact, volume, intensité.',
    intro: 'On veut du muscle lisible, du rythme et des consignes qui sentent la salle, pas un tableau Excel.',
    scene: 'iron_cathedral',
    palette: {
      base: '#170d13',
      accent: '#ff6ea8',
      glow: '#ff8dc0',
      haze: '#3f1430',
      edge: '#ffd7ea',
      line: '#ff4e89',
    },
  },
];

export const coachPersonaMap = Object.fromEntries(
  coachPersonaList.map((persona) => [persona.id, persona]),
) as Record<CoachId, CoachPersona>;
