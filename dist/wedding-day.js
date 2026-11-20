// Judge Dean LLC
import { buildDayProps as buildOriginalProps } from './day-props.js';
import { DAY_EVENTS, DAY_DURATION, legacyDayTime } from './day-timeline.js';
import { buildScheduleStages } from './schedule-stages.js';
export { DAY_EVENTS, DAY_DURATION, legacyDayTime };

export function buildDayProps(scene,chapel) {
  const original=buildOriginalProps(scene);
  const stations=buildScheduleStages(scene,DAY_EVENTS);
  return {
    diveTarget:original.diveTarget,
    update(t,active){
      chapel?.update(t,active);
      original.update(legacyDayTime(t),active,t);
      stations.update(t,active);
    },
    targets(id){
      if(chapel&&id==='solo')return [chapel.target];
      const originalTargets=original.targets(id);
      return originalTargets.length?originalTargets:stations.targets(id);
    }
  };
}
