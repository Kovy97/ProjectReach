import { content } from "@hearthforge/content";
import { canEnterDungeon, startDungeon, advance, expandBaseCapacity, addItem, computeStats, totalLevel, meetsRequirements } from "@hearthforge/engine";
import { buildBisCharacter } from "../../../packages/engine/src/balance-envelope-helpers";
import { legacyOnboarding } from "@hearthforge/shared";
const CHR = Array.from({length:21},(_,i)=>`chronicle_${String(i+1).padStart(2,"0")}`).filter(q=>q!=="chronicle_05");
function hero(level,style,role){
  const s=buildBisCharacter(content,style,level,role,{allBuffs:true}).state;
  s.onboarding=legacyOnboarding();
  s.quests.completed=[...CHR]; s.quests.claimed=[...CHR];
  s.character.totalLevel=totalLevel(s,content);
  expandBaseCapacity(s.inventory,content,60);
  const f=Object.values(content.items).filter(it=>it.type==="consumable"&&(it.healAmount??0)>0&&meetsRequirements(s,it)).sort((a,b)=>(b.healAmount??0)-(a.healAmount??0))[0];
  if(f){addItem(s.inventory,content,f.id,5000);s.character.food=f.id;s.character.autoEatTier=4;}
  const st=computeStats(s,content); s.character.hp=st.maxHp; s.character.mana=st.maxMana;
  return s;
}
function sim(s,id,cap=45*60*1000){
  if(!canEnterDungeon(s,content,id))return"NO-ENTRY";
  if(!startDungeon(s,content,id))return"START-FAIL";
  let e=0; while(s.combat.dungeonId&&e<cap){advance(s,content,200);e+=200;}
  const cleared=(s.dungeonsCleared[id]??0)>0;
  return cleared?`CLEAR ${Math.round(e/1000)}s`:(e>=cap?`TIMEOUT>${Math.round(cap/1000)}s`:`TOD ${Math.round(e/1000)}s/${s.combat.stopReason}`);
}
const D=["goblin_warband","crypt_depths","wildwood_hunt","highland_aerie","wyvern_lair","idol_sanctum","behind_the_throne"];
for(const role of ["damage","haste","tank"]){
  console.log("== role",role,"L99 ==");
  for(const id of D){
    const row=["melee","ranged","magic"].map(st=>`${st}:${sim(hero(99,st,role),id)}`);
    console.log("  "+id.padEnd(20)+row.join(" | "));
  }
}
