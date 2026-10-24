# claude:2026-10-25T00:50:00+02:00 — Textpass 1.4 P4b (Lore-Dev): Kürzungspass für DE-Texte über ~150 Zeichen.
# Aufruf: python -I design/lore/textpass-1.4/p4b/kuerzen.py   (aus dem Repo-Root). Schreibt die JSON-Dateien neu,
# ein Objekt je Zeile, damit der Diff lesbar bleibt. Einträge, die hier fehlen, bleiben unverändert.
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
NEU = {
    # material-1
    "copper_bar": {"de": "Der erste Barren, den ein Schmied gießt, weich genug für kalte Arbeit. Auch Metallschrott schmilzt dazu, vier Stück je Barren."},
    "gravesteel_bar": {"de": "Das Metall des Ordens, mit einer einzigen Kohle geschmolzen. Klingen und Platten daraus schmiedet man, wie die Grabwächter, über morschem Knochen."},
    "blacksteel_bar": {"de": "Stahl, über doppelter Kohle noch einmal gefaltet, bis die Oberfläche schwarz und die Schneide böse wird. Das Arbeitsmetall des Reachs für lange Zeit."},
    "mithril_bar": {"de": "Ein blasser, leichter Barren, der eine schärfere Schneide nimmt als Eisen und halb so viel wiegt. Die Goblin-Kriegsbande hortet ein paar davon."},
    "murkvein_bar": {"de": "Aus einer Ader geschmolzen, die man besser zugelassen hätte. Er schluckt Fackellicht, und das Einzige, was je daraus wird, ist ein Langschwert."},
    "godiron_bar": {"de": "Das Kranzmetall der Götzen, in einem sterblichen Ofen neu gegossen. Dunkel, warm und schwerer, als er aussieht. Die Halle gibt ihn Stück für Stück her."},
    "censerwood_log": {"de": "Harzreiches Holz, das nach alten Tempeln riecht, wenn die Axt beißt. Daraus entstehen die feinsten Bögen und die feinste Angel des Handwerks."},
    "gravesteel_ore": {"de": "Dunkles Erz aus den Adern, die der Orden der Grabwächter einst abbaute. Es braucht Kohle, und der Barren behält die Farbe des Grabes."},
    "godiron_ore": {"de": "Das Erz, aus dem die Kränze der Götzen gegossen wurden, dunkel und leise warm. Die Hülsen der Götzenhalle geben es her, wenn sie zerbrechen."},
    "magic_binder": {"de": "Eine graue Paste, nach Tiegeln verkauft. Vor dem Ofen auf den Barren gestrichen, lässt sie das Metall einen Zauber halten statt abschütteln."},
    "bowstring": {"de": "Gedreht aus Sehne, Rohleder oder Nesselfaser. Jeder Bogen, jede Angel und jeder Holzschild im Reach ist damit bespannt oder gebunden."},
    "vial_of_water": {"de": "Ein verkorktes Fläschchen sauberes Wasser, im Reach seltener, als es klingt. Die meisten Tränke und ein paar Eintöpfe beginnen damit."},
    # material-2
    "ember_essence": {"de": "Was von einem Feuer bleibt, wenn stirbt, was es trug. Hexenmeister und Aschegetier lassen sie fallen. Runenkundige binden sie zu Feuersplittern."},
    "essence_divine": {"de": "Gesammelt, wo die Götterpilze wachsen: ein Rückstand, warm, ohne je gebrannt zu haben. Die stärksten Runen und die letzten Elixiere brauchen sie."},
    "void_essence": {"de": "Der letzte Zustand des Schleiers, gewonnen aus dem, was aus Krypta, Hochland und Götzenhalle kriecht. Runenkundige binden sie zu Leerensplittern."},
    "force_rune": {"de": "Trübessenz, zu einem harten kleinen Splitter gebunden, drei aus zwei Maß. Das Erste, was ein Runenkundiger macht, der Kern jedes frühen Stabs."},
    "frost_rune": {"de": "Frostessenz, gebunden, bis sie nicht mehr schmilzt. Die Eisenrevenants der Schlackengrube tragen ein paar in den Gelenken. Frost-Roben bauen darauf."},
    "shade_rune": {"de": "Zwei Reste Klag-Licht, mit Grabessenz zu einer Rune gebunden, die nie ganz scharf wird. Dämmergewebe und der Leeren-Umhang werden darum gewebt."},
    "shock_rune": {"de": "Sturmessenz, zwei zu eins zu einem Splitter gebunden, der in die Finger beißt. Selten bei Skelett-Eismagiern, gewöhnlich auf der Runenbank ab Level 40."},
    "aether_rune": {"de": "Aetheressenz, gebunden, bevor sie verfliegt, zwei Splitter je Maß. Die Priester der Götzenhalle tragen sie, und das Aether-Handwerk baut darauf."},
    "void_rune": {"de": "Zwei Maß Leerenessenz für einen einzigen Splitter, und er ist es wert. Geisterleder, Leerengewebe und der Leeren-Fokus verlangen sie handvollweise."},
    "enchanted_steel_focus": {"de": "Stahl, mit Binder zu einem Rohling geschmiedet, der Kälte gut hält. Frostessenz vollendet ihn, mit genug Frostsplittern wird ein Frost-Fokus daraus."},
    "enchanted_mithril_focus": {"de": "Mithril und Binder, leicht genug für einen langen Kampf. Aetheressenz vollendet ihn, oder eine Aether-Kugel, wenn die Splitter reichen."},
    "enchanted_adamantium_focus": {"de": "Adamantium und Binder, einen halben Tag am Ofen, bis es saß. Zwei Maß Aetheressenz machen daraus einen Fokus, der nicht springt."},
    "enchanted_runite_focus": {"de": "Runit mit Binder, der blaue Schimmer bleibt im Rohling. Aetheressenz macht ihn zum Runit-Fokus, Leerensplitter und ein Saphir zum Leeren-Fokus."},
    "enchanted_titanium_focus": {"de": "Titan und Binder, fast schwerelos und kalt in der Hand. Leerenessenz vollendet ihn, oder Leerensplitter und ein Diamant zum Götzenfunken-Fokus."},
    "enchanted_godiron_focus": {"de": "Götzeneisen mit Binder, am obersten Ende des Handwerks. Vier Maß Leerenessenz und ein Onyx vollenden ihn zum letzten Fokus, den es gibt."},
    "rough_garnet": {"de": "Ein matter roter Stein aus den flachen Adern, hin und wieder aus einem gestohlenen Beutel. Geschliffen der erste Stein, den ein Juwelier fasst."},
    "rough_bloodstone": {"de": "Dunkler Stein mit roten Adern, gebrochen nahe dem Grabstahl. Der Orden fasste ihn in seinen Schmuck, und die Juweliere tun es noch."},
    "ruby": {"de": "Geschliffen und in Stahl oder Schuppenleder gefasst. Ringe, Amulette, der Glutglas-Ring und die Stäbe, die Sturm und Leere rufen, brauchen ihn."},
    "rough_diamond": {"de": "Ein trüber weißer Stein aus der Diamantader, der seltenste Fund in der Hälfte aller Bergwerke des Reachs. Geschliffen wandert er in Mithril."},
    "diamond": {"de": "Geschliffen, bis die Trübung weg ist und das Licht sich nirgends verstecken kann. In Mithril gefasst der stolzeste Stein des Juweliers."},
    "rough_onyx": {"de": "Schwarzer Stein aus der Onyxader, hin und wieder aus einer Götzenmünze, die mehr wert war, als sie aussah. Geschliffen wird er in Runit gefasst."},
    "onyx": {"de": "Schwarz geschliffen und in Runit gefasst. Die Ringe und Amulette daraus gehören Schützen und Dieben, und der Götzeneisen-Fokus nimmt auch einen."},
    "rough_voidstone": {"de": "Ein Stein, so dunkel, dass das Auge immer wieder abrutscht. Hoch in der Leiter aus seiner eigenen Ader gebrochen, in Bluteisen und Titan gefasst."},
    "soulopal": {"de": "Ein milchiger Stein aus den stärksten Kreaturen des Reachs, als hätten sie ihn verschluckt. Amulette und der Leerenstabilisator brauchen ihn."},
    "idol_shard": {"de": "Ein Splitter aus einem zerbrochenen Götzen, kalt und leise summend. Die Halle ist voll davon, und Leerengewebe und die Rune des Gerichts brauchen sie."},
    "idol_heart": {"de": "Was im Letzten Götzen schlug. Es schlägt noch, langsam, wenn man es lange genug hält. In Götzeneisen gefasst wird ein Amulett daraus."},
    "idol_coin": {"de": "Geprägt mit einem Gesicht, zu dem keiner mehr betet, aus dem Götzenschatz gestohlen. Manchmal steckt ein Onyx darin oder eine Spur Aether."},
    "warband_seal": {"de": "Das Siegel des Kriegshäuptlings, am Ende der Kriegsbande von ihm genommen. In Bronze gefasst wird ein Siegelring daraus, dem kein Goblin widerspricht."},
    "grave_warden_sigil": {"de": "Das Siegel des Ordens, aus der Tiefe geborgen, die es verschließen sollte. In Stahl gefasst wird ein Reif daraus, dem die Toten noch gehorchen."},
    "warband_key": {"de": "Ein alter Goblinschlüssel für ein Tor, das kein Schloss mehr hat. Das Lager der Kriegsbande steht jedem offen, der sich den Weg verdient hat."},
    "crypt_key": {"de": "Ein schwerer Schlüssel mit dem Zeichen des Ordens, aus der Zeit, als die Krypta versiegelt war. Das Siegel ist gebrochen, er öffnet nichts mehr."},
    "wildwood_key": {"de": "Ein Schlüssel aus Geweih und Eisen, der einst die Jagdgründe öffnete. Der Wildwald nimmt keinen Schlüssel mehr, nur einen Jäger, der ihn verdient."},
    "highland_key": {"de": "Ein Schlüssel, kalt vom Hochlandwind, aus der Zeit, als der Horst verschlossen war. Der Weg hinauf ist offen, der Schlüssel ein Andenken."},
    "idolhall_key": {"de": "Ein Schlüssel aus dunklem Eisen, einst der einzige Weg in die versiegelte Halle. Heute öffnet die Chronik die Halle, und er beschwert nur die Bank."},
    "masters_mark": {"de": "Ein gegossenes Zeichen, wie die Götzen es auf der Brust tragen. Es öffnete einst das Sanktum. Heute braucht der Weg keinen Schlüssel, nur die Chronik."},
    # material-3
    "ashen_dust": {"de": "Feiner grauer Staub, der in den Aschfeldern auf allem liegt, auch auf dem, was von dort kommt. Kräuterkundige brauchen eine Prise für die ersten Sude."},
    "wildhive_honey": {"de": "Dunkler Honig, aus wilden Waben geraubt, die eine oder andere Biene noch darin. In Grimmkorn gebacken gibt er einen Kuchen, der die Stiche lohnt."},
    "deathmoss": {"de": "Graues Moos, das auf Dingen wächst, die sich nicht mehr rühren. Mit Aschestaub zerrieben das Mittel des Tiefwalds gegen seine eigenen Bisse."},
    "fungus_pale": {"de": "Ein weißer Pilz, der wächst, wo die Blutdistel wächst, bleich, als hätte er ihr seine Farbe abgegeben. Brauer und Runenkundige brauchen ihn."},
    "emberleaf": {"de": "Ein Blatt aus dem Glutwald, das nach dem Pflücken warm bleibt. Gebraut ein Tonikum, in eine Pfeilspitze gestopft ein brennender Pfeil."},
    "gravensap": {"de": "Harz aus den Bäumen über alten Gräbern, dunkel und langsam im Festwerden. In Öl gearbeitet wird eine Salbe daraus, die die Haut dicker macht."},
    "fungus_god": {"de": "Ein Pilz, der Funken wirft, wenn man ihn zerreißt, gewachsen beim Götteratem. Das Götterernte-Tonikum und die großen Elixiere brauchen ihn."},
    "voidbloom": {"de": "Eine Blume von der Leerenheide, dunkel, an einem Stängel, der nie warm wird. Zwei davon und eine Wichtkappe geben das Wiedergänger-Elixier."},
    "starcap_truffle": {"de": "Eine Trüffel, unter den Sternkappen ausgegraben, dicht und für jeden Koch ab Level 90 Gold wert. Gehobelt über Risotto oder das Abgrund-Festmahl."},
    "grave_lily": {"de": "Eine bleiche Lilie aus dem Gräberwald, offen nur über Begrabenen. Mit Göttlicher Essenz gibt sie das Elixier, das die Hand schnell macht."},
    "graywort_seed": {"de": "Ein graues Samenkorn, für ein paar Münzen verkauft oder aus den Aschfeldern gelesen. Gepflanzt kommt bald das erste Kraut hoch, das sich lohnt."},
    "ashroot": {"de": "Eine graue, knorrige Wurzel, die nach Rauch schmeckt, egal wie man sie kocht. Zwei davon in Wasser geben die Brühe, die Siedler am Leben hält."},
    "gravetato": {"de": "Grau außen, weiß innen, benannt nach dem Boden, den sie mag. Sie wandert in den Sumpfwurzel-Eintopf und sonst kaum irgendwohin."},
    "reed_pale": {"de": "Bleiches Schilf aus den ersten Beeten, getrocknet und gespalten. Schärfe, Präzision, Schnelle, Ägide und Ausweichen werden als Runen darauf geritzt."},
    "herb_bloodthistle": {"de": "Eine Distel mit roten Adern, die blutet, wenn man sie schneidet. Heiltränke, zwei Tonika und zwei Eintöpfe verlangen danach."},
    "nightshade_seed": {"de": "Ein schwarzer Same aus Seuchensumpf und Glutwald. Was daraus wächst, ist Gift in den meisten Händen und Tonikum in denen eines Kräuterkundigen."},
    "herb_gravemoss": {"de": "Schwarzes Moos, das auf geweihtem Boden wächst und nirgends sonst. Großer Heiltrank, Antigift und die Tonika von Bollwerk und Ernte beginnen damit."},
    "ironreed_seed": {"de": "Ein harter grauer Same, zwischen den Grabpilzen gefunden. Daraus wächst ein Schilf, steif genug für die Runen der zweiten Stufe."},
    "godsbreath_seed": {"de": "Ein Same, leicht wie ein Atemzug, gefunden, wo der Götteratem wächst. Im Beet braucht er einen guten Nachmittag und gibt eine volle Ernte."},
    "herb_godsbreath": {"de": "Ein silbernes Kraut, das sich ohne Wind bewegt. Festmähler, die Runen der vierten Stufe und die letzten Elixiere verlangen es, und die Beete tragen es."},
    "radiantbloom_seed": {"de": "Ein Same, der schwach durch den Beutel scheint, beim Götteratem gefunden. Die Blüte daraus wird zu Strahlendem Pigment zerstoßen."},
    "reed_void": {"de": "Schwarzes Schilf, kalt in der Hand. Die dritte und vierte Runenstufe werden darauf geritzt, und nichts Geringeres trägt sie."},
    "godbloom_seed": {"de": "Ein Same vom verbrannten Boden des Gräberwalds. Die Blume daraus ist die letzte Ernte, die die Beete annehmen, und die Rune der Chronik braucht sie."},
    "godbloom": {"de": "Wächst auf verbranntem Boden, wo der Götzenkult stand. Gebraut heilt sie mehr als jeder Trank, gebunden wird sie zur Rune der Chronik und der Nachlese.",
                 "en": "It grows on burned ground where the idols' cult once stood. Brewed, it heals more than any draught. Bound, it makes the runes of the Chronicle and the Gleaning."},
    "corpse_lily_seed": {"de": "Ein Same zwischen den Leerenpilzen, grau und schwach süßlich riechend. Die Lilie, die daraus wächst, zehrt von dem, was unter ihr liegt."},
    "witherleek_seed": {"de": "Ein grauer Same zwischen den Nachtblüten. Der Lauch daraus sieht vom ersten Tag an halb tot aus und schmeckt umso besser."},
    "emberroot_seed": {"de": "Ein Same, der im Beutel warm ist, gefunden ausgerechnet im Frostmoor und in der Düstermarsch. Die Wurzel daraus behält die Hitze."},
    # material-4
    "raw_cod": {"de": "Kabeljau aus kaltem Wasser, dutzendweise gekeschert. Die Ertrunkenen des Riffs tragen ihn auch bei sich, aus Gründen, die keiner wissen will."},
    "raw_wraithscale": {"de": "Ein Fisch mit Schuppen wie Reif auf Glas, harpuniert in Wasser, das zu kalt ist. Geräuchert, oder die Grundlage aller drei Welklauch-Gerichte."},
    "raw_voidray": {"de": "Ein flacher, dunkler Rochen aus den tiefen Becken, wo der Schleier dünn ist. Allein angebraten, oder über Bernsteingetreide fürs Bankett."},
    "raw_soulfish": {"de": "Er kommt auf den Köder, nicht aufs Futter, und sieht dich auf dem Weg nach oben an. Geläutert, oder die Mitte der zwei großen Festmähler."},
    "raw_beef": {"de": "Von Weidenkuh oder rasendem Bullen, oder einem Goblin-Schlächter abgenommen, der dieselbe Idee hatte. Gebraten, oder mit Blutgetreide geschmort."},
    "raw_wyvern_haunch": {"de": "Die Keule eines Wyverns, dunkel und dicht, den Bestien des Hochlands abgeschnitten. Allein flambiert, und zwei davon gehen in jedes Festmahl."},
    # material-5
    "copper_arrowheads": {"de": "Fünfundvierzig weiche Kupferspitzen aus einem Barren. Sie verbiegen sich an Knochen, aber es sind die ersten Spitzen, die ein Bogner bekommt."},
    "adamantium_arrowheads": {"de": "Grünschwarze Spitzen, so hart, dass die Feile kaum greift, fünfundvierzig je Barren. Sie verbiegen sich nicht. Sie brechen, was sie treffen."},
    "bloodiron_arrowheads": {"de": "Rotstichige Spitzen aus Bluteisen, fünfundvierzig je Barren. Die ersten, die einen Widerhaken, ein Gift oder ein Feuer annehmen."},
    "bloodiron_arrow": {"de": "Ein schlichter Bluteisen-Pfeil. Mit einem Reißzahn, in Düstersporen getaucht oder mit Glutblatt gestopft ist er nicht mehr schlicht."},
    "blacksteel_arrow": {"de": "Schwarze Spitzen, die vor dem Nachthimmel verschwinden, bevor sie treffen. Beliebt bei Schützen, die beim Schuss ungesehen bleiben wollen."},
    # material-6
    "rune_keen_i": {"de": "Umbra auf bleichem Schilf, mit Ascheessenz gebunden. In eine Nahkampfwaffe gesetzt, legt sie etwas mehr Kraft hinter den Hieb."},
    "rune_keen_iii": {"de": "Strahlendes Pigment auf Leerenschilf, mit Hohler Essenz gebunden. Die stärkste Schärfe-Rune, und die Nahkampfwaffe damit schlägt mit Riesenkraft."},
    "rune_flame_i": {"de": "In Umbra über einer einzigen Glutessenz gezogen. In eine Waffe gesetzt, gibt sie dem Treffer eine Chance, das Ziel in Brand zu setzen."},
    "rune_frost_i": {"de": "Eine Frostessenz unter Umbra, kalt in der Hand. In eine Waffe gesetzt, kann der Hieb das Ziel unterkühlen und seinen Arm bremsen."},
    "rune_frost_iii": {"de": "Drei Frostessenzen, in Leerenschilf gebunden. Eine Waffe damit lässt Eis in der Wunde, und die dritte Unterkühlung in Folge friert den Gegner ein.",
                       "en": "Three frost essences bound into void reed under radiant light. A weapon that carries it leaves ice in the wound, and the third chill in a row freezes the enemy outright."},
    "rune_precise_i": {"de": "Ascheessenz und Umbra auf bleichem Schilf. In eine Waffe gesetzt, bringt sie dem Treffer Glück, und Glück macht aus einem Treffer einen kritischen."},
    "rune_precise_ii": {"de": "Die Präzise-Rune auf Eisenschilf, Violett über Grabessenz. Das Glück der Waffe wächst, und mit ihm die Chance, dass ein Hieb sitzt, wo er wehtut."},
    "rune_precise_iii": {"de": "Violett auf Leerenschilf, mit Hohler Essenz gebunden. So viel Glück, wie eine Rune einer Waffe geben kann, und die kritischen Treffer kommen öfter."},
    "rune_swift_i": {"de": "Drei bleiche Schilfhalme unter Umbra und Sumpfessenz. In eine Waffe gesetzt, lockert sie das Handgelenk ein wenig, und das merkt man schon."},
    "rune_arcane_iii": {"de": "Zwei Göttliche und drei Aetheressenzen in strahlendem Licht. Die stärkste Arkan-Rune, und der Stab damit trägt den Verstand eines Gelehrten."},
    "rune_hunter_iii": {"de": "Göttliche Essenz und Strahlendes Pigment auf Leerenschilf. Ein Bogen damit wird gespannt, als hätte der Schütze sein Leben lang gejagt."},
    "rune_storm_i": {"de": "Eine Sturmessenz unter Umbra, noch knisternd. In eine Waffe gesetzt, kann der Hieb das Ziel schocken und straucheln lassen."},
    "rune_storm_iii": {"de": "Drei Sturmessenzen, in Leerenschilf gebunden. Eine Waffe damit trifft wie ein Blitzschlag und lässt den Gegner taumeln."},
    "rune_aegis_iii": {"de": "Hohle Essenz unter Strahlendem Pigment. Die stärkste Ägide-Rune, und Platte damit schüttelt ab, was sie hätte eindellen müssen."},
    "rune_evasion_i": {"de": "Sumpfessenz und Umbra auf bleichem Schilf. In Leder gesetzt, macht sie den Träger schwerer zu treffen, und mehr hat Leder nie versprochen."},
    "rune_warding_iii": {"de": "Göttliche Essenz und drei Aetheressenzen in strahlendem Licht. Die stärkste Abwehr-Rune, und Stoff damit hält einen Ward, der Platte beschämt."},
    "rune_warpath_iv": {"de": "Hohle Essenz, Götteratem und Reliktstaub. Eine Nahkampfwaffe damit trifft mit jedem Treffer härter, bis der Gegner fällt oder ein neuer antritt."},
    "rune_second_arrow_iv": {"de": "Hohle Essenz, Götteratem und Reliktstaub, für den Bogen gebunden. Hin und wieder folgt dem Pfeil ein zweiter, den niemand aufgelegt hat."},
    "rune_thin_veil_iv": {"de": "Drei Aetheressenzen, Götteratem und Reliktstaub. Ein Stab damit zaubert härter, solange der Ward des Zauberers fast ganz ist."},
    "rune_judgement_iv": {"de": "Ein Götzensplitter, mit Göttlicher Essenz gebunden. Eine Waffe damit fällt am härtesten auf einen Gegner, der schon fast erledigt ist."},
    "rune_iron_answer_iv": {"de": "Ein Götzeneisenbarren, in Leerenschilf gebunden. Platte damit antwortet auf jeden Hieb, den sie nimmt, mit etwas eigenem Eisen."},
    "rune_ambush_iv": {"de": "Göttliche Essenz und Götteratem, für Leder geritzt. Der erste Hieb, den der Träger führt, sitzt weit härter als alle, die folgen."},
    "rune_veil_drinker_iv": {"de": "Göttliche Essenz und Aether, für Stoff gebunden. Eine Robe damit trinkt von jeder Wunde, die der Zauberer schlägt, und füllt damit den Ward."},
    "rune_unbroken_wall_iv": {"de": "Zwei Götzeneisenbarren, in Leerenschilf gebunden. Ein Schild damit heilt seinen Träger ein wenig, sooft er einen Hieb fängt."},
    "rune_bounty": {"de": "Götteratem und Göttliche Essenz, für Ring oder Amulett geritzt. Wer sie trägt, trifft das Monster seines Slayer-Auftrags am härtesten."},
    "rune_restless": {"de": "Drei Reliktstaub und zwei Götteratem. Schmuck damit lässt seinen Träger nicht ruhen: Die Pause nach jedem besiegten Gegner ist kürzer."},
    "rune_chronicle": {"de": "Götzenblüte und Göttliche Essenz, für Ring oder Amulett geritzt. Wer sie trägt, wird sorgfältiger verzeichnet: Jeder Kampf lehrt ein wenig mehr."},
    "rune_gleaning": {"de": "Zwei Götzenblüten und zwei Göttliche Essenzen, die teuerste Rune des Handwerks. Schmuck damit findet mehr in jedem gefallenen Gegner."},
    # verbrauch-2
    "ambergrain_feast": {"de": "Seelenfisch und Wyvern auf Bernsteingetreide, mit Götteratem vollendet. Gekocht für Zauberer: Verstand, Weisheit und ein Ward, der hält."},
    "risotto_starcap": {"de": "Bernsteingetreide, langsam gerührt, mit gehobelter Sternkappen-Trüffel. So gehaltvoll, dass der Leib noch lange heilt, wenn der Teller leer ist."},
    "soulfire_banquet": {"de": "Seelenfisch, Wyvern, Bernsteingetreide und Götteratem, gekocht von einem, der das Handwerk beherrscht. Für eine Weile wacht alles im Leib auf."},
    "witherleek_arcane_broth": {"de": "Geisterschupper und Hirsch, dünn gekocht mit Welklauch und Nachtblüte, für alle, die mit dem Kopf kämpfen. Schärft den Geist, weitet den Ward."},
    "marshroot_chowder": {"de": "Barsch, Huhn und Grabkartoffel in Sumpfwurzelbrühe, vier Schalen aus einem Topf. Legt sich in den Magen und hält den Leib länger aufrecht."},
    # verbrauch-3
    "tonic_rot_ward": {"de": "Zwei verfaulte Drüsen, in Wasser gekocht. Riecht genau so, wie du fürchtest, treibt die Fäulnis aus dem Blut und lässt den Leib zäher zurück."},
    "tonic_stoneskin": {"de": "Derselbe Sumpfwurzel-Ansatz wie beim Ochsenblut, nur länger gezogen. Die Haut wird fest wie Putz und hält Hiebe aus, die sie nichts angehen."},
    "tonic_witchlight": {"de": "Irrlicht-Staub in Wasser, schwach leuchtend. Zeigt dir die Lücke in jeder Deckung, und der Leib heilt ein wenig, während du zuschlägst."},
    "duskcap_tonic": {"de": "Zwei Dämmerkappen in Wasser geköchelt, dunkel wie die Stunde, nach der sie heißen. Heilt ein gutes Stück von dem, was der Tag zerschlug."},
    "panacea_elixir": {"de": "Götteratem und Götterfunken-Pilz in Wasser gezogen. Das Gift geht, der Leib füllt sich mit geliehener Kraft, und eine Weile wirft ihn nichts um."},
    "godbloom_infusion": {"de": "Götzenblüte mit Göttlicher Essenz in Wasser. Heilt mehr als jeder Trank, den die Kräuterkunde zuvor lehrte, und schmeckt leise nach verbranntem Boden."},
    "godsbreath_elixir": {"de": "Dreimal Götteratem, Göttliche Essenz, ein Götterfunken-Pilz: der letzte Sud der Kräuterkunde. Eine Minute, in der jeder Schlag wie ein Urteil fällt."},
    # werkzeug
    "grimwood_rod": {"de": "Düsterholz verzieht sich nicht in der Flussfeuchte, und mehr muss eine Angel nicht können. Für alle, denen die Esche zu langsam wurde."},
}

applied = set()
for f in sorted(os.listdir(HERE)):
    if not re.match(r"^(werkzeug|verbrauch|material).*\.json$", f):
        continue
    path = os.path.join(HERE, f)
    with open(path, encoding="utf8") as fh:
        rows = json.load(fh)
    for r in rows:
        if r["id"] in NEU:
            r.update(NEU[r["id"]])
            applied.add(r["id"])
    with open(path, "w", encoding="utf8", newline="\n") as fh:
        fh.write("[\n" + ",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows) + "\n]\n")
missing = set(NEU) - applied
print(f"ersetzt: {len(applied)}; nicht gefunden: {sorted(missing) if missing else 'keine'}")
