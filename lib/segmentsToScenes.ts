export type TranscriptSegment = {
  id?: number;
  start: number;
  end: number;
  text: string;
};

export type Scene = {
  start_sec: number;
  end_sec: number;
  text: string;
  segments: TranscriptSegment[];
};

export function segmentsToScenes(
  segments: TranscriptSegment[],
  targetMinSec = 3,
  targetMaxSec = 6
): Scene[] {
  const scenes: Scene[] = [];
  let current: Scene | null = null;

  for (const segment of segments) {
    if (!current) {
      current = {
        start_sec: segment.start,
        end_sec: segment.end,
        text: segment.text.trim(),
        segments: [segment]
      };
      continue;
    }

    const nextEnd = segment.end;
    const nextLength = nextEnd - current.start_sec;

    if (nextLength > targetMaxSec && current.end_sec - current.start_sec >= targetMinSec) {
      scenes.push(current);
      current = {
        start_sec: segment.start,
        end_sec: segment.end,
        text: segment.text.trim(),
        segments: [segment]
      };
      continue;
    }

    current.end_sec = segment.end;
    current.text = `${current.text} ${segment.text.trim()}`.trim();
    current.segments.push(segment);
  }

  if (current) {
    scenes.push(current);
  }

  return scenes;
}
