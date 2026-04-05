import type { AnatomicalRegion } from './validation';

export interface ClinicalCondition {
  readonly id: string;
  readonly aiLabel: string;
  readonly translationKey: string;
  readonly aliases: readonly string[];
}

const REGION_CONDITIONS: Record<AnatomicalRegion, readonly ClinicalCondition[]> = {
  face: [
    { id: 'downSyndrome', aiLabel: 'Down syndrome', translationKey: 'conditionDownSyndrome', aliases: ['Down syndrome', 'Sindrome de Down', 'Síndrome de Down'] },
    { id: 'cleftLip', aiLabel: 'Cleft lip', translationKey: 'conditionCleftLip', aliases: ['Cleft lip', 'Labio leporino'] },
    { id: 'cleftPalate', aiLabel: 'Cleft palate', translationKey: 'conditionCleftPalate', aliases: ['Cleft palate', 'Paladar hendido'] },
    { id: 'microcephaly', aiLabel: 'Microcephaly', translationKey: 'conditionMicrocephaly', aliases: ['Microcephaly', 'Microcefalia'] },
    { id: 'hydrocephalus', aiLabel: 'Hydrocephalus', translationKey: 'conditionHydrocephalus', aliases: ['Hydrocephalus', 'Hidrocefalia'] },
    { id: 'micrognathia', aiLabel: 'Micrognathia', translationKey: 'conditionMicrognathia', aliases: ['Micrognathia', 'Micrognatia'] },
  ],
  heart: [
    { id: 'fourChamberView', aiLabel: '4-chamber view', translationKey: 'conditionFourChamberView', aliases: ['4-chamber view', 'Vista de 4 cámaras', '4 camaras'] },
    { id: 'outflowTracts', aiLabel: 'Outflow tracts', translationKey: 'conditionOutflowTracts', aliases: ['Outflow tracts', 'Tractos de salida'] },
    { id: 'vsd', aiLabel: 'VSD (ventricular septal defect)', translationKey: 'conditionVSD', aliases: ['VSD', 'Comunicación interventricular', 'CIV'] },
    { id: 'asd', aiLabel: 'ASD (atrial septal defect)', translationKey: 'conditionASD', aliases: ['ASD', 'Comunicación interauricular', 'CIA'] },
    { id: 'tetralogy', aiLabel: 'Tetralogy of Fallot', translationKey: 'conditionTetralogy', aliases: ['Tetralogy of Fallot', 'Tetralogía de Fallot'] },
    { id: 'hypoplasticLeft', aiLabel: 'Hypoplastic left heart', translationKey: 'conditionHypoplasticLeft', aliases: ['Hypoplastic left heart', 'Corazón izquierdo hipoplásico'] },
  ],
  brain: [
    { id: 'holoprosencephaly', aiLabel: 'Holoprosencephaly', translationKey: 'conditionHoloprosencephaly', aliases: ['Holoprosencephaly', 'Holoprosencefalia'] },
    { id: 'dandyWalker', aiLabel: 'Dandy-Walker malformation', translationKey: 'conditionDandyWalker', aliases: ['Dandy-Walker', 'Dandy Walker'] },
    { id: 'ventriculomegaly', aiLabel: 'Ventriculomegaly', translationKey: 'conditionVentriculomegaly', aliases: ['Ventriculomegaly', 'Ventriculomegalia'] },
    { id: 'corpusCallosumAgenesis', aiLabel: 'Corpus callosum agenesis', translationKey: 'conditionCorpusCallosum', aliases: ['Corpus callosum agenesis', 'Agenesia del cuerpo calloso'] },
  ],
  spine: [
    { id: 'spinaBifida', aiLabel: 'Spina bifida', translationKey: 'conditionSpinaBifida', aliases: ['Spina bifida', 'Espina bífida'] },
    { id: 'scoliosis', aiLabel: 'Scoliosis', translationKey: 'conditionScoliosis', aliases: ['Scoliosis', 'Escoliosis'] },
    { id: 'hemivertebra', aiLabel: 'Hemivertebra', translationKey: 'conditionHemivertebra', aliases: ['Hemivertebra', 'Hemivértebra'] },
  ],
  abdomen: [
    { id: 'omphalocele', aiLabel: 'Omphalocele', translationKey: 'conditionOmphalocele', aliases: ['Omphalocele', 'Onfalocele'] },
    { id: 'gastroschisis', aiLabel: 'Gastroschisis', translationKey: 'conditionGastroschisis', aliases: ['Gastroschisis', 'Gastrosquisis'] },
    { id: 'cdh', aiLabel: 'CDH (congenital diaphragmatic hernia)', translationKey: 'conditionCDH', aliases: ['CDH', 'Hernia diafragmática congénita', 'HDC'] },
  ],
  fullBody: [
    { id: 'skeletalDysplasia', aiLabel: 'Skeletal dysplasia', translationKey: 'conditionSkeletalDysplasia', aliases: ['Skeletal dysplasia', 'Displasia esquelética'] },
    { id: 'hydropsFetalis', aiLabel: 'Hydrops fetalis', translationKey: 'conditionHydropsFetalis', aliases: ['Hydrops fetalis', 'Hidrops fetal'] },
  ],
};

const ALL_CONDITIONS = Object.values(REGION_CONDITIONS).flat();
const KNOWN_CONDITIONS_PREFIX = 'Known conditions';
const ADDITIONAL_NOTES_PREFIX = 'Additional clinical notes';

export function getConditionsForRegion(region: AnatomicalRegion): readonly ClinicalCondition[] {
  return REGION_CONDITIONS[region];
}

function getClinicalConditionLabel(id: string): string | null {
  return ALL_CONDITIONS.find((c) => c.id === id)?.aiLabel ?? null;
}

export function buildClinicalNotesPayload(
  selectedConditionIds: string[],
  freeText: string,
): string {
  const labels = selectedConditionIds
    .map((id) => getClinicalConditionLabel(id))
    .filter((label): label is string => label !== null);

  const deduped = Array.from(new Set(labels));
  const trimmed = freeText.trim();
  const parts: string[] = [];

  if (deduped.length > 0) {
    parts.push(`${KNOWN_CONDITIONS_PREFIX}: ${deduped.join(', ')}.`);
  }

  if (trimmed) {
    parts.push(`${ADDITIONAL_NOTES_PREFIX}: ${trimmed}`);
  }

  return parts.join(' ');
}
