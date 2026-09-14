export const THEME=Object.freeze({
  skyTop:0x3b2452,skyBottom:0xb8560f,glass:0x5a3a24,orange:0xff8a2b,orangeDeep:0xf2650c,gold:0xffd24c,goldDeep:0xe8a317,teal:0x2fd4c6,purple:0x9b5de0,green:0x5fc24b,sky:0x4fa8e8,rose:0xe8547a,ink:0x2b1810,cream:0xfff8ec,white:0xffffff,muted:0xf0d7bd,shadow:0x000000,red:0xe8547a,paper:0xfff8ec
});
export const FONT='Fredoka, Changa, Arial, sans-serif';
export const RARITY={common:0xd2bda1,uncommon:THEME.green,rare:THEME.sky,epic:THEME.purple,legendary:THEME.gold};
export const scaleFor=(w,h)=>Math.max(.58,Math.min(1.08,Math.min(w/1200,h/820)));
