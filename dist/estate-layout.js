// Judge Dean LLC
const area = (name,x,z,w,d,kind) => ({name,x,z,w,d,kind});
const path = (...pairs) => pairs.map(([x,z])=>({x,z}));

export const ESTATE_MAP = {
  bounds:{minX:-100,maxX:100,minZ:-12,maxZ:108},
  areas:[
    area('Bridal suite',-72,76,20,18,'building'),
    area('Tailor lodge',-75,40,18,16,'building'),
    area('Glasshouse',-48,32,22,16,'glasshouse'),
    area('Vineyard overlook',-62,9,23,18,'vineyard'),
    area('Olive garden',-18,4,10,25,'grove'),
    area('Ceremony garden',0,.5,26,25,'garden'),
    area('Arrival court',0,18,18,12,'court'),
    area('Reception hall',23.8,1.5,18,20,'building'),
    area('Cocktail terrace',52,28,23,18,'terrace'),
    area('Lake pier',81,53,16,12,'pier'),
    area('Supper pavilion',56,78,26,20,'pavilion'),
    area('Sparkler lawn',5,82,28,22,'lawn'),
    area('Timber chapel',-29,18.4,6.4,7,'building')
  ],
  paths:[
    path([-72,87],[-72,76],[-72,60],[-75,52],[-75,40],[-75,28],[-62,9]),
    path([-75,40],[-62,40],[-62,32],[-48,32],[-34,32],[-23,22],[-16,17],[0,17],[1,24]),
    path([-62,9],[-48,9],[-31,12],[-21,11],[-16,9]),
    path([-48,32],[-48,9]),
    path([-72,76],[-52,76],[-33,63],[-16,49],[1,46],[1,24]),
    path([1,24],[19,28],[36,28],[52,28],[67,28],[71,41],[71,53],[81,53]),
    path([1,46],[4,66],[5,82],[5,96]),
    path([5,82],[25,82],[40,78],[56,78],[70,78],[71,67],[71,53]),
    path([52,28],[52,45],[56,63],[56,78]),
    path([-33,63],[-22,82],[5,82]),
    path([8,16],[8,12],[11.5,9],[11.5,1.6],[14.8,1.6],[23.8,1.6]),
    path([-16,9],[-16,12],[0,12],[0,-4]),
    path([-23,22],[-26.9,24.2],[-29,22.2])
  ],
  water:[{x:86.5,z:53,w:25,d:31},{x:-18.9,z:4.3,w:3.24,d:8.45}]
};
