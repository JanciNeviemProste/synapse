/**
 * 14 built-in Slovak script templates (spec §12).
 * System templates are immutable but duplicable — enforced in TemplatesService.
 */

export interface SystemTemplateSeed {
  name: string;
  description: string;
  structure: {
    sections: { name: string; required: boolean; note?: string }[];
  };
  recommendedGoal: string;
  recommendedLength: string;
  recommendedStyle: string;
  recommendedEmotion: string;
  hookPattern: string;
  bodyPattern: string;
  ctaPattern: string;
  complianceRules?: string;
}

const s = (name: string, required = true, note?: string) => ({ name, required, note });

export const SYSTEM_TEMPLATES: SystemTemplateSeed[] = [
  {
    name: '3 najčastejšie chyby',
    description: 'Rýchly zoznam troch chýb, ktoré cieľovka robí — s korekciou.',
    structure: { sections: [s('hook'), s('chyba 1'), s('chyba 2'), s('chyba 3'), s('cta')] },
    recommendedGoal: 'Education',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Direct',
    recommendedEmotion: 'Confident',
    hookPattern: 'Toto sú 3 chyby, ktoré vidím u klientov stále dokola.',
    bodyPattern: 'Číslovaný zoznam: chyba → prečo je to problém → čo robiť namiesto toho.',
    ctaPattern: 'Ulož si to / pošli niekomu, koho sa to týka.',
  },
  {
    name: 'Mýtus vs. realita',
    description: 'Vyvrátenie rozšíreného omylu v odbore.',
    structure: { sections: [s('hook — mýtus'), s('prečo tomu ľudia veria'), s('realita'), s('dôkaz/príklad'), s('cta')] },
    recommendedGoal: 'Myth busting',
    recommendedLength: 'Short: 20–35 sekúnd',
    recommendedStyle: 'Expert',
    recommendedEmotion: 'Curious',
    hookPattern: '„[Mýtus]." Počul si to už? Nie je to pravda.',
    bodyPattern: 'Mýtus → prečo znie uveriteľne → fakty → čo z toho vyplýva.',
    ctaPattern: 'Sleduj, nech ti neujdú ďalšie mýty.',
  },
  {
    name: 'Príbeh klienta',
    description: 'Anonymizovaný príbeh z praxe s ponaučením.',
    structure: { sections: [s('hook — situácia'), s('problém'), s('riešenie'), s('výsledok'), s('ponaučenie'), s('cta')] },
    recommendedGoal: 'Trust building',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Storytelling',
    recommendedEmotion: 'Empathetic',
    hookPattern: 'Minulý týždeň mi klient povedal vetu, ktorá ma zastavila.',
    bodyPattern: 'Konkrétna scéna → napätie → obrat → výsledok s číslom, ak sa dá.',
    ctaPattern: 'Ak si v podobnej situácii, napíš mi.',
    complianceRules: 'Povinná anonymizácia — žiadne mená, sumy len ilustračné alebo so súhlasom.',
  },
  {
    name: 'Otázka od klienta',
    description: 'Odpoveď na reálnu (častú) otázku.',
    structure: { sections: [s('hook — otázka'), s('krátka odpoveď'), s('vysvetlenie'), s('výnimky'), s('cta')] },
    recommendedGoal: 'FAQ',
    recommendedLength: 'Short: 20–35 sekúnd',
    recommendedStyle: 'Conversational',
    recommendedEmotion: 'Calm',
    hookPattern: '„[Otázka]?" — dostávam ju každý týždeň.',
    bodyPattern: 'Odpoveď hneď na začiatku, potom kontext a hranice platnosti.',
    ctaPattern: 'Máš vlastnú otázku? Polož ju do komentára.',
  },
  {
    name: 'Vedeli ste, že?',
    description: 'Prekvapivý fakt s praktickým dopadom.',
    structure: { sections: [s('hook — fakt'), s('kontext'), s('čo to znamená pre diváka'), s('cta')] },
    recommendedGoal: 'Education',
    recommendedLength: 'Short: 20–35 sekúnd',
    recommendedStyle: 'Dynamic',
    recommendedEmotion: 'Curious',
    hookPattern: 'Vedel si, že [prekvapivý fakt]?',
    bodyPattern: 'Fakt → zdroj/dôvod → praktický dôsledok.',
    ctaPattern: 'Sleduj pre viac faktov, ktoré ti šetria peniaze.',
    complianceRules: 'Fakty musia byť overiteľné — neisté čísla označiť.',
  },
  {
    name: 'Jedna rada za 30 sekúnd',
    description: 'Jedna konkrétna okamžite použiteľná rada.',
    structure: { sections: [s('hook'), s('rada'), s('ako presne na to'), s('cta')] },
    recommendedGoal: 'Education',
    recommendedLength: 'Short: 20–35 sekúnd',
    recommendedStyle: 'Direct',
    recommendedEmotion: 'Energetic',
    hookPattern: 'Jedna vec, ktorú sprav ešte dnes: [rada].',
    bodyPattern: 'Rada → 2–3 kroky → čo tým získa.',
    ctaPattern: 'Ulož si to na neskôr.',
  },
  {
    name: 'Predtým, než podpíšete',
    description: 'Kontrolný zoznam pred dôležitým rozhodnutím/podpisom.',
    structure: { sections: [s('hook — varovanie'), s('bod 1'), s('bod 2'), s('bod 3'), s('cta')] },
    recommendedGoal: 'Education',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Professional',
    recommendedEmotion: 'Serious',
    hookPattern: 'Predtým, než sa rozhodneš pre [X], skontroluj si týchto X vecí.',
    bodyPattern: 'Checklist s konkrétnymi vecami, ktoré si treba overiť pred rozhodnutím.',
    ctaPattern: 'Pošli tomu, kto sa práve rozhoduje.',
    complianceRules: 'Ak ide o odbornú radu (právo, financie, zdravie), pridaj disclaimer.',
  },
  {
    name: 'Kontroverzný názor',
    description: 'Vyhranený odborný názor proti prúdu — podložený.',
    structure: { sections: [s('hook — tvrdenie'), s('prečo si to myslím'), s('protiargument a odpoveď'), s('cta')] },
    recommendedGoal: 'Engagement',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Direct',
    recommendedEmotion: 'Confident',
    hookPattern: 'Nepopulárny názor: [tvrdenie].',
    bodyPattern: 'Tvrdenie → argumenty → uznanie druhej strany → záver.',
    ctaPattern: 'Súhlasíš? Napíš do komentára áno/nie.',
    complianceRules: 'Názor jasne oddeliť od faktov.',
  },
  {
    name: 'Krok za krokom',
    description: 'Návod na konkrétny proces v číslovaných krokoch.',
    structure: { sections: [s('hook — výsledok'), s('krok 1'), s('krok 2'), s('krok 3'), s('cta')] },
    recommendedGoal: 'Education',
    recommendedLength: 'Long: 90–180 sekúnd',
    recommendedStyle: 'Educational',
    recommendedEmotion: 'Calm',
    hookPattern: 'Ako [dosiahnuť výsledok] za [čas] — krok za krokom.',
    bodyPattern: 'Číslované kroky, každý s jednou konkrétnou akciou.',
    ctaPattern: 'Ulož si to, budeš to potrebovať.',
  },
  {
    name: 'Čo by som dnes urobil inak',
    description: 'Osobná retrospektíva — budovanie dôvery cez zraniteľnosť.',
    structure: { sections: [s('hook — priznanie'), s('čo som urobil vtedy'), s('čo viem dnes'), s('rada divákovi'), s('cta')] },
    recommendedGoal: 'Personal brand',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Storytelling',
    recommendedEmotion: 'Empathetic',
    hookPattern: 'Keby som dnes začínal, toto by som urobil inak.',
    bodyPattern: 'Vtedy vs. dnes → čo sa zmenilo → prenositeľné ponaučenie.',
    ctaPattern: 'Sleduj, ak nechceš opakovať moje chyby.',
  },
  {
    name: 'Najväčší problém, ktorý vidím',
    description: 'Pomenovanie systémového problému v odbore z pohľadu praxe.',
    structure: { sections: [s('hook — problém'), s('ako sa prejavuje'), s('koho sa týka'), s('čo s tým'), s('cta')] },
    recommendedGoal: 'Trust building',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Expert',
    recommendedEmotion: 'Serious',
    hookPattern: 'Najväčší problém [odboru]? Nie je to to, čo si myslíš.',
    bodyPattern: 'Problém → dôkazy z praxe → dopad na diváka → riešenie.',
    ctaPattern: 'Ak sa ťa to týka, napíš mi.',
  },
  {
    name: 'Reakcia na častý komentár',
    description: 'Odpoveď na opakujúci sa komentár/námietku z komunity.',
    structure: { sections: [s('hook — citát komentára'), s('pochopenie námietky'), s('odpoveď'), s('cta')] },
    recommendedGoal: 'Engagement',
    recommendedLength: 'Short: 20–35 sekúnd',
    recommendedStyle: 'Conversational',
    recommendedEmotion: 'Calm',
    hookPattern: '„[Komentár]" — dostal som to pod posledné video. Poďme si to rozobrať.',
    bodyPattern: 'Citát → v čom má pravdu → v čom nie → záver.',
    ctaPattern: 'Nesúhlasíš? Komentáre sú tvoje.',
  },
  {
    name: 'Mini prípadová štúdia',
    description: 'Konkrétny výsledok s číslami: pred → proces → po.',
    structure: { sections: [s('hook — výsledok'), s('východisková situácia'), s('čo sme urobili'), s('výsledok s číslami'), s('cta')] },
    recommendedGoal: 'Sales',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Professional',
    recommendedEmotion: 'Confident',
    hookPattern: 'Z [stav pred] na [stav po] za [čas]. Takto.',
    bodyPattern: 'Pred (čísla) → 2–3 kľúčové kroky → po (čísla) → pre koho to funguje.',
    ctaPattern: 'Chceš podobný výsledok? Napíš mi [slovo].',
    complianceRules: 'Čísla len skutočné a so súhlasom klienta; výsledky nie sú garancia.',
  },
  {
    name: 'Päťdielna obsahová séria',
    description: 'Séria 5 nadväzujúcich videí na jednu veľkú tému.',
    structure: { sections: [s('hook s číslom dielu'), s('rekapitulácia (od 2. dielu)', false), s('obsah dielu'), s('cliffhanger na ďalší diel'), s('cta')] },
    recommendedGoal: 'Content series',
    recommendedLength: 'Medium: 45–70 sekúnd',
    recommendedStyle: 'Educational',
    recommendedEmotion: 'Curious',
    hookPattern: 'Diel [X/5]: [téma dielu].',
    bodyPattern: 'Každý diel = jedna podtéma s vlastnou pointou; séria má oblúk.',
    ctaPattern: 'Sleduj, nech ti neujde diel [X+1].',
  },
];
