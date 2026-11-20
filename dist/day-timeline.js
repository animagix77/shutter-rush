// Judge Dean LLC
export const DAY_DURATION = 720;

// Time is in live seconds. Coordinates point to the actual photographic subject,
// including separate marks for assignments sharing a room.
const day = [];
function book(id, area, title, lead, mark, window, options={}) {
  const [x,z]=mark, [start,peak,end]=window;
  day.push({id,area,title,lead,x,z,start,peak,end,...options});
}
book('invitations','Bridal suite','The invitation suite','Frame the upright wedding invitation and its wax seal.',[-73.3,76.7],[2,12,22]);
book('makeup','Bridal suite','The finishing touch','Catch the bride beside the lit vanity mirror.',[-70.1,75.3],[23,32,41],{minPeople:1,propRequired:true});
book('gown','Bridal suite','Something blue','Photograph the hanging dress, blue sash and shoes.',[-73.1,73.6],[42,51,61]);
book('cufflinks','Tailor lodge','The groom’s details','Find the open watch and cufflink case.',[-76.6,41.4],[64,76,85]);
book('boutonniere','Tailor lodge','Pin the boutonnière','Catch the groom as the best man pins his lapel flower.',[-73.4,39.5],[86,95,105],{minPeople:1,propRequired:true});
book('firstlook','Glasshouse','The first look','Frame both faces as the groom turns around.',[-48.4,32.3],[107,117,128],{minPeople:2});
book('party','Glasshouse','The wedding party','Fit the newlyweds and at least one attendant into the frame.',[-48.1,30.2],[129,139,149],{minPeople:3,requireCouple:true});
book('letters','Vineyard overlook','Letters before the vows','Photograph the bride opening the groom’s letter over the vines.',[-62,9],[151,161,172],{minPeople:1,propRequired:true});
book('veil','Olive garden','The Runaway Veil','Catch the bride reaching for the windblown veil.',[-16,9],[174,184,195]);
book('guestbook','Arrival court','Welcome to Villa Luce','Catch a guest signing in at the welcome desk.',[-2.5,17.9],[196,205,214],{propRequired:true});
book('processional','Ceremony garden','Down the aisle','Follow the bride and her escort between the chairs.',[0,2.1],[215,225,233],{minPeople:2});
book('rings','Arrival court','Ring Thief','Get low for the dachshund with the ring cushion.',[1,16],[235,244,254]);
book('vows','Ceremony garden','The vows','Frame a newlywed reading from the vow book.',[-.1,-3.5],[255,263,272],{minPeople:1,propRequired:true});
book('exchange','Ceremony garden','With this ring','Find their hands and the open velvet ring box.',[.18,-3.65],[273,281,289],{propRequired:true});
book('kiss','Ceremony garden','The First Kiss','Find a clear angle past the uncle with the tablet.',[0,-4],[290,297,304]);
book('signing','Ceremony garden','Signed and sealed','Catch the pen touching the wedding register.',[-.9,-2.35],[305,314,323],{propRequired:true});
book('confetti','Ceremony garden','The recessional','Catch the newlyweds inside the shower of confetti.',[0,3.8],[324,333,343],{minPeople:2});
book('portrait','Olive garden','Everybody Look Here','Frame the family beside the reflecting pool.',[-16,2],[344,354,365]);
book('solo','Timber chapel','Slash at the chapel','Frame Slash and his guitar as he leans into the long bend.',[-26.9,24.2],[359,370,379],{propRequired:true,approach:{x:-24.7,z:29.1}});
book('cocktails','Cocktail terrace','Champagne cascade','Shoot the coupe tower as the bubbly spills over.',[50.2,28.8],[377,388,398],{propRequired:true});
book('canapes','Cocktail terrace','Passed canapés','Follow the waiter’s tray of tiny tomato toasts.',[53.6,27.0],[399,408,417],{propRequired:true});
book('lake','Lake pier','The lakeside portrait','Photograph both newlyweds with the moored boats behind them.',[85.2,53],[420,431,442],{minPeople:2});
book('entrance','Supper pavilion','The grand entrance','Catch both newlyweds lifting their hands under the entrance ribbons.',[55.8,78.5],[446,457,468],{minPeople:2});
book('dinner','Supper pavilion','Dinner is served','Frame the chef lifting the silver cloche off the first course.',[57.7,76.6],[469,481,492],{propRequired:true});
book('toast','Reception hall','One Last Toast','Catch the toast as the glass goes up.',[23,3],[503,515,525]);
book('firstdance','Reception hall','Their first dance','Frame the couple together as they turn on the dance floor.',[24,1.3],[526,536,544],{minPeople:2});
book('cake','Reception hall','The cake dive','Catch the guest in midair as he dives into the pillared wedding cake.',[30.45,1.50],[545,552,563],{approach:{x:25.3,z:3.5}});
book('bouquet','Ceremony garden','The Bouquet Toss','Follow the flowers from the bride to the catch.',[0,-3],[566,580,592]);
book('dance','Reception hall','The Disco Takeover','Slip back inside for the dancers’ big finish.',[23,2],[573,588,597],{optional:true});
book('dessert','Reception hall','One last dessert','Photograph the macaron tower under spun-sugar ribbons.',[22.4,5.3],[598,610,620]);
book('lastdance','Sparkler lawn','The last dance','Catch Auntie and her dance partner taking a final bow.',[4.2,83.4],[627,638,649],{minPeople:2});
book('sparklers','Sparkler lawn','The sparkler send-off','Catch the newlyweds beneath the guests’ arch of sparks.',[5.8,80.6],[650,665,681],{minPeople:2});
book('getaway','Arrival court','Just Married','Catch the couple waving beside their getaway car.',[0,17],[692,704,716]);
export const DAY_EVENTS=day;
const solo=day.find(e=>e.id==='solo'), cake=day.find(e=>e.id==='cake');
export const STORM_DURATION=65;
function shortCall(event,start){
  const offset=event.start-start;
  return {...event,dayStart:event.start,dayPeak:event.peak,start,peak:event.peak-offset,end:event.end-offset};
}
export const STORM_CALLS=[shortCall(solo,1),shortCall(cake,45)];
// Keep both performances at real speed. Compress the intervening wedding hours
// while the photographer makes the trip from the chapel to the reception.
export function stormDayTime(t){
  const [opening,finale]=STORM_CALLS;
  if(t<=opening.end)return solo.start+t-opening.start;
  if(t>=finale.start)return cake.start+t-finale.start;
  return solo.end+(cake.start-solo.end)*(t-opening.end)/(finale.start-opening.end);
}

// Preserve the authored timing of the original performances inside the longer day.
// The simultaneous bouquet and disco share a stretch running exactly at real time.
const original = {
  veil:[8,22,31], rings:[39,54,65], kiss:[75,89,100], portrait:[102,116,125],
  toast:[139,153,165], cake:[170,184,197], bouquet:[207,221,233],
  dance:[214,229,238], getaway:[264,281,293]
};
const anchors=[[0,0], [DAY_DURATION,300]];
for(const e of day){
  if(original[e.id]) [e.start,e.peak,e.end].forEach((t,i)=>anchors.push([t,original[e.id][i]]));
}
anchors.sort((a,b)=>a[0]-b[0]);
export function legacyDayTime(t) {
  if(t<=0)return 0;
  for(let i=1;i<anchors.length;i++){
    const [next,value]=anchors[i];
    if(t<=next){
      const [prior,base]=anchors[i-1];
      return base+(value-base)*(t-prior)/(next-prior);
    }
  }
  return 300;
}
