import { content } from "@hearthforge/content";
import { canEnterDungeon, startDungeon, advance, expandBaseCapacity, addItem, equipItem, computeStats, totalLevel, meetsRequirements } from "@hearthforge/engine";
import { buildBisCharacter } from "../../../packages/engine/src/balance-envelope-helpers";
import { legacyOnboarding } from "@hearthforge/shared";
const CHR = Array.from({length:21},(_,i)=>`chronicle_${String(i+1).padStart(2,"0")}`).filter(q=>q!=="chronicle_05");
// Tank-Ruestung + bestes Damage-Mainhand (realistischer Endgame-Spieler statt reinem Envelope-Tank)
function hybrid(level,style){
  const s=buildBisCharacter(content,style,level,"tank",{allBuffs:true}).state;
  const dmg=buildBisCharacter(content,style,level,"damage",{allBuffs:true}).state;
  const w=dmg.character.equipment.mainhand;
  if(w && !content.items[w].twoHanded){ addItem(s.inventory,content,w,1); equipItem(s,content,w); }
  s.onboarding=legacyOnboarding();
  s.quests.completed=[...CHR]; s.quests.claimed=[...CHR];
  s.character.totalLevel=totalLevel(s,content);
  expandBaseCapacity(s.inventory,content,60);
  const f=Object.values(content.items).filter(it=>it.type==="consumable"&&(it.healAmount??0)>0&&meetsRequirements(s,it)).sort((a,b)=>(b.healAmount??0)-(a.healAmount??0))[0];
  if(f){addItem(s.inventory,content,f.id,5000);s.character.food=f.id;s.character.autoEatTier=4;}
  const st=computeStats(s,content); s.character.hp=st.maxHp; s.character.mana=st.maxMana;
  return {s, mainhand:s.character.equipment.mainhand};
}
function sim(s,id,cap=45*60*1000){
  if(!canEnterDungeon(s,content,id))return"NO-ENTRY";
  if(!startDungeon(s,content,id))return"START-FAIL";
  let e=0; while(s.combat.dungeonId&&e<cap){advance(s,content,200);e+=200;}
  const cleared=(s.dungeonsCleared[id]??0)>0;
  return cleared?`CLEAR ${Math.round(e/1000)}s`:(e>=cap?`TIMEOUT`:`TOD ${Math.round(e/1000)}s/${s.combat.stopReason}`);
}
const D=["highland_aerie","wyvern_lair","idol_sanctum","behind_the_throne"];
for(const lvl of [95,99]){
  console.log("== Hybrid Tank+Dmg-Waffe L"+lvl+" ==");
  for(const id of D){
    const row=["melee","ranged","magic"].map(st=>{const h=hybrid(lvl,st);return `${st}(${h.mainhand}):${sim(h.s,id)}`;});
    console.log("  "+id.padEnd(20)+row.join(" | "));
  }
}
