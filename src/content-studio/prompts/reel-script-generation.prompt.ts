import { ScriptGenerationInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  renderBrandContext,
  renderKnowledgeContext,
  wrapUntrusted,
} from './prompt-helpers';

const VARIANT_SHAPE = `{
  "versionName": "A" | "B" | "C",
  "strategy": {
    "workingTitle": string, "goal": string, "targetAudience": string,
    "contentPillar": string, "recommendedLength": string, "recommendedStyle": string,
    "recommendedEmotion": string, "template": string, "contentAngle": string, "angleReason": string
  },
  "hook": string,
  "setup": string,
  "mainMessage": string,
  "keyInsight": string,
  "cta": string,
  "spokenScript": string, // kompletny hovoreny skript v prirodzenej slovencine
  "productionPlan": {
    "estimatedDurationSeconds": number,
    "scenes": [{ "description": string, "onScreenText": string, "brollSuggestion": string, "deliveryNote": string }],
    "pacingNotes": string, "pauses": string[], "emphasizedWords": string[]
  },
  "instagramAssets": {
    "caption": string, "shortCaption": string, "thumbnailText": string, "firstComment": string,
    "ctaText": string, "hashtags": string[], "alternativeHooks": string[], "alternativeTitles": string[]
  },
  "safety": {
    "factualUncertainty": string[], "complianceRisks": string[], "recommendedDisclaimer": string,
    "sensitiveInfoWarnings": string[], "claimsToVerify": string[], "sourceReferences": string[]
  }
}`;

const SHAPE = `{
  "variants": [ // presne 3 varianty: A = cisty profesionalny, B = storytelling, C = najsilnejsi hook
    ${VARIANT_SHAPE}
  ]
}`;

const VERSION_BRIEF: Record<'A' | 'B' | 'C', string> = {
  A: 'A (čistý profesionálny)',
  B: 'B (storytelling)',
  C: 'C (najsilnejší, najodvážnejší hook — curiosity gap alebo kontroverzný uhol)',
};

export function buildScriptGenerationPrompt(input: ScriptGenerationInput): {
  system: string;
  user: string;
} {
  const templateBlock = input.template
    ? `ŠABLÓNA "${input.template.name}":
Štruktúra: ${JSON.stringify(input.template.structure)}
${input.template.hookPattern ? `Hook vzor: ${input.template.hookPattern}` : ''}
${input.template.bodyPattern ? `Telo vzor: ${input.template.bodyPattern}` : ''}
${input.template.ctaPattern ? `CTA vzor: ${input.template.ctaPattern}` : ''}
${input.template.complianceRules ? `Compliance: ${input.template.complianceRules}` : ''}`
    : '';

  const singleVariant = input.versionName;

  return {
    system: `Si špičkový scenárista krátkych vertikálnych videí pre Instagram a Facebook Reels na slovenskom trhu.
${
  singleVariant
    ? `Úloha: vygeneruj JEDEN kompletný variant skriptu — variant ${VERSION_BRIEF[singleVariant]}.`
    : `Úloha: vygeneruj TRI kompletné varianty skriptu — A (čistý profesionálny), B (storytelling), C (najsilnejší hook).`
}
Výstup musí znieť ako používateľ, nie ako generická AI kópia.

PLAYBOOK KRÁTKYCH VIDEÍ (IG/FB Reels) — riaď sa ním:

HOOK (prvá veta, najdôležitejšia — zastaví scrollovanie):
- Žiadne pozdravy ani rozbeh ("Ahoj, dnes vám poviem…"). Prvá veta ide rovno k veci.
- Prvé 2–3 sekundy musia vzbudiť zvedavosť, napätie alebo dať konkrétny sľub.
- Použi jeden z osvedčených vzorcov hooku (pre každý variant iný):
  1. Chyba/varovanie: "Prestaň robiť [X], ak chceš [výsledok]." / "Najväčšia chyba pri [téma]…"
  2. Konkrétne číslo/výsledok: "3 veci, ktoré…" / "Za 30 dní som…" / "Toto ušetrí [X]."
  3. Otvorená slučka / zvedavosť: "Toto mi zmenilo [X] — a skoro nikto o tom nehovorí."
  4. Nepopulárny názor: "Nepopulárny názor: …"
  5. Priame oslovenie publika: "Ak si [cieľovka], toto potrebuješ počuť."
  6. Predtým → potom: "Z [stav A] na [stav B] za [čas]."
  7. Otázka, ktorá páli: "Vieš, prečo [prekvapivý fakt]?"
- Variant C = najsilnejší, najodvážnejší hook (curiosity gap alebo kontroverzný uhol).

ŠTRUKTÚRA A RETENCIA:
- Hook → krátky setup/kontext → JEDNA hlavná myšlienka → payoff (aha moment) → CTA.
- Jedno video = jedna myšlienka. Žiadna vata, každá veta musí niesť hodnotu alebo posúvať dej.
- Otvor slučku na začiatku a uzavri ju na konci (divák dopozerá kvôli odpovedi).
- Drž tempo: striedaj kratšie a dlhšie vety, po hooku daj pauzu.

HOVORENÝ JAZYK (spokenScript sa nahovára do kamery):
- Krátke vety (ideálne do ~12 slov), prirodzená hovorová slovenčina — akoby si to hovoril kamarátovi.
- Aktívny rod, druhá osoba (oslovenie tykanie/vykanie podľa Brand DNA). Žiadne korporátne ani knižné frázy.
- Žiadne dlhé súvetia, žiadne "v dnešnej uponáhľanej dobe" a podobné klišé.

CTA:
- Jedna jasná akcia (sleduj / ulož si / napíš slovo do správ / komentuj). Nie tri naraz.
- Nadviaž prirodzene na obsah, netlač. Ak má Brand DNA povinné CTA frázy, použi ich.

TEXT NA OBRAZOVKE (onScreenText) a caption:
- Prvý onScreenText = skrátený hook, veľký a úderný.
- Caption krátky, s jedným háčikom a CTA; hashtagy relevantné (mix široké + nišové, bez #fyp/#foryou — to je z inej platformy).

${renderBrandContext(input.brand)}
${renderKnowledgeContext(input.knowledge)}
${templateBlock}
${
  input.stylePreferences?.length
    ? `NAUČENÉ ŠTÝLOVÉ PREFERENCIE POUŽÍVATEĽA:\n${input.stylePreferences.join('\n')}`
    : ''
}
${
  input.inspirationPatterns?.length
    ? `INŠPIRAČNÉ VZORY (len štruktúra/štýl — NIKDY nekopíruj formulácie):\n${input.inspirationPatterns.join('\n')}`
    : ''
}
DÔRAZ NA JAZYK: Celý text musí byť v 100 % gramaticky a pravopisne správnej spisovnej slovenčine (diakritika, interpunkcia, skloňovanie, časovanie, zhoda podmetu s prísudkom). Pred vrátením si text po sebe prekontroluj a oprav.
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(singleVariant ? VARIANT_SHAPE : SHAPE)}`,
    user: [
      `Téma: ${input.topic}`,
      input.rawIdea ? wrapUntrusted('raw-idea', input.rawIdea) : '',
      input.goal ? `Cieľ: ${input.goal}` : '',
      input.targetAudience ? `Publikum: ${input.targetAudience}` : '',
      input.length ? `Dĺžka: ${input.length}` : '',
      input.style ? `Štýl: ${input.style}` : '',
      input.emotion ? `Emócia: ${input.emotion}` : '',
      input.cta ? `Požadované CTA: ${input.cta}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
