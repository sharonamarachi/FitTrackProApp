import { ExerciseTemplate } from './transcriptNLPService';
import { exercisesData } from '../data/exercises';

interface CSVRow {
  'Exercise Name': string;
  'Desc': string;
  'Type': string;
  'BodyPart': string;
}

function mapBodyPartToCategory(bodyPart: string): ExerciseTemplate['category'] {
  const bp = (bodyPart ?? '').toLowerCase();
  if (
    bp.includes('chest') || bp.includes('shoulder') || bp.includes('trap') ||
    bp.includes('tricep') || bp.includes('bicep') || bp.includes('forearm') ||
    bp.includes('lats') || bp.includes('lower back') || bp.includes('middle back') ||
    bp.includes('back') || bp.includes('upper')
  ) return 'upper-body';
  if (
    bp.includes('quadricep') || bp.includes('hamstring') ||
    bp.includes('calves') || bp.includes('leg')
  ) return 'lower-body';
  if (bp.includes('glute')) return 'glutes';
  if (bp.includes('abdominal') || bp.includes('core') || bp.includes('oblique')) return 'core';
  if (bp.includes('cardio')) return 'cardio';
  return 'full-body';
}

function mapTypeToExerciseType(type: string): 'reps' | 'timed' {
  const t = (type ?? '').toLowerCase();
  if (t.includes('cardio') || t.includes('timed') || t.includes('hiit')) return 'timed';
  return 'reps';
}

export function buildExerciseDBFromCSV(): ExerciseTemplate[] {
  return (exercisesData as CSVRow[])
    .filter(row => row['Exercise Name']?.trim())
    .map(row => {
      const name = row['Exercise Name'].trim();
      const isTimed = mapTypeToExerciseType(row['Type']) === 'timed';

      return {
        canonical: name,
        aliases: [
          name.toLowerCase(),
          name.toLowerCase() + 's',
        ],
        category: mapBodyPartToCategory(row['BodyPart']),
        type: isTimed ? 'timed' : 'reps',
        defaultSets: 3,
        defaultReps: isTimed ? undefined : 15,
        defaultDuration: isTimed ? 30 : undefined,
        defaultRest: isTimed ? 10 : undefined,
      } as ExerciseTemplate;
    });
}