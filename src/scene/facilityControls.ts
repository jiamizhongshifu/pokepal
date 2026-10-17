/** One visible invitation per area; secondary fixtures stay part of island life. */
export const FACILITY_GROUPS = [
  {id:'play',anchor:'ball',label:'玩一玩',icon:'ball',choices:['ball','music','sand']},
  {id:'leisure',anchor:'picnic',label:'歇一歇',icon:'bowl',choices:['picnic','bench','parasol']},
  {id:'camp',anchor:'fire',label:'小营地',icon:'tent',choices:['fire','tent','hammock']},
  {id:'beach',anchor:'pier',label:'看大海',icon:'waves',choices:['pier','shells','shore','sea']},
  {id:'garden',anchor:'tree',label:'小发现',icon:'tree',choices:['farm','tree','windmill']},
] as const;
