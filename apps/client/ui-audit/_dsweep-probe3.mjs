import { content } from "@hearthforge/content";
import { canEnterDungeon, startDungeon, advance, expandBaseCapacity, addItem, equipItem, computeStats, totalLevel, meetsRequirements } from "@hearthforge/engine";
import { buildBisCharacter } from "../../../packages/engine/src/balance-envelope-helpers";
import { legacyOnboarding } from "@hearthforge/shared";
const CHR = Array.from({length:21},(_,i)=>`chronicle_${String(i+1).padStart(2,"0")}`).filter(q=>q!=="chronicle_05");
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
  return s;
}
function sim(s,id,cap=50*60*1000){
  if(!canEnterDungeon(s,content,id))return{r:"NO-ENTRY",secs:1e9};
  if(!startDungeon(s,content,id))return{r:"START-FAIL",secs:1e9};
  let e=0; while(s.combat.dungeonId&&e<cap){advance(s,content,200);e+=200;}
  const cleared=(s.dungeonsCleared[id]??0)>0;
  return cleared?{r:`CLEAR ${Math.round(e/1000)}s`,secs:e/1000}:{r:(e>=cap?"TIMEOUT":`TOD ${Math.round(e/1000)}s/${s.combat.stopReason}`),secs:1e9};
}
for(const d of content.dungeons.filter(x=>x.id!=="paragon_tower")){
  const res=["melee","ranged","magic"].map(st=>({st,...sim(hybrid(d.requiredLevel,st),d.id)}));
  const best=res.slice().sort((a,b)=>a.secs-b.secs)[0];
  console.log(`${d.id.padEnd(20)} req=${d.requiredLevel} ` + res.map(r=>`${r.st}:${r.r}`).join(" | ") + `  => BEST ${best.st}`);
}
