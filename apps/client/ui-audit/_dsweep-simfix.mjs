import { content } from "@hearthforge/content";
import { canEnterDungeon, startDungeon, advance } from "@hearthforge/engine";
import { deserialize } from "@hearthforge/persistence";
import fs from "node:fs";
const D=["goblin_warband","crypt_depths","wildwood_hunt","highland_aerie","wyvern_lair","idol_sanctum","behind_the_throne"];
for(const id of D){
  const r=deserialize(fs.readFileSync(`ui-audit/fixtures/dsw_${id}.json`,"utf8"),content);
  const s=r.state??r;
  const gold0=s.character.gold, gath0=s.stats.itemsGathered;
  if(!canEnterDungeon(s,content,id)){console.log(id,"NO-ENTRY");continue;}
  startDungeon(s,content,id);
  let e=0; const cap=50*60*1000;
  while(s.combat.dungeonId&&e<cap){advance(s,content,200);e+=200;}
  console.log(`${id.padEnd(20)} food=${s.character.food} pot=${s.character.autoPotion?.healPotionId} => ${(s.dungeonsCleared[id]??0)>0?"CLEAR":"FAIL "+s.combat.stopReason} ${Math.round(e/1000)}s deaths=${s.stats.deaths} gold+${s.character.gold-gold0} loot+${s.stats.itemsGathered-gath0}`);
}
