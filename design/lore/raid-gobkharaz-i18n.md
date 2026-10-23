# Raid-Lore Gobkha'raz — Übersetzungen ES / FR / PT-BR / RU / ZH

<!-- claude:2026-10-24T22:15:00+02:00 -->

Lore-Dev, 2026-10-24. Begleitdatei zu `design/lore/raid-gobkharaz.md` (DE/EN, Kanon nach Gate L vom 24.10.2026). Gleiche Paragraphen-Nummern wie dort; hier stehen nur die fünf weiteren Sprachen. Bild-Briefings und Aussehen-Specs sind nicht übersetzt (Chef-Asset-Liste bleibt deutsch). Spielersichtbare Texte: Namen, Einführung, Gebühr-Zeile, Einladung, Räume, Bosse (Herkunft, Intro, Phasen), Wellen-Gegner, Sets, Unikate, Wochen-Modifikatoren, Reliktstaub, Rast-Zeilen.

**Regeln:** natürliche Prosa, höchstens ein Gedankenstrich je Text (hier: keiner; FR nutzt „ : “ und „ ; “), keine Emojis. Platzhalter gibt es in diesen Texten nicht. Die Goblins sagen in jeder Sprache „der Gläubiger“, nie „Drazhan“ und nie „der Fremde“; nur der Wächter (Einladung § 3) nennt Drazhan.

## Glossar der Bestandsbegriffe (geprüft gegen `packages/content/src/locales/*.ts` und `apps/client/src/renderer/i18n/locales/*.ts`, 24.10.2026)

| DE / EN | ES | FR | PT-BR | RU | ZH | Quelle |
|---|---|---|---|---|---|---|
| die Mark / the march | la marca | la marche | a marca | марка | 边境 | `quests:chronicle_04` |
| das Reach / the Reach | el Confín | le Domaine | o Confim | Предел | 边域 | `quests:q_skiller_5` |
| Glutfeste / Emberhold | Baluarte de las Brasas | Bastion des Braises | Bastião das Brasas | Тлеющий Оплот | 余烬堡 | `quests:q_first_steps` |
| Wächter / Warden | el Guardián | le Gardien | o Guardião | Страж | 守望者 | `onboarding.guide.intro.title` |
| die Chronik / the Chronicle | la Crónica | la Chronique | a Crônica | Хроника | 编年史 | `quests:chronicle_04` |
| geliehenes Feuer / borrowed fire | fuego prestado | feu emprunté | fogo emprestado | заёмный огонь | 借来的火 (in Namen kurz: 借火) | `quests:chronicle_04` |
| Gläubiger / Creditor | el Acreedor | le Créancier | o Credor | Заимодавец | 债主 | `quests:chronicle_04` |
| der Fremde / the Stranger | el Forastero | l'Étranger | o Forasteiro | Чужак | 异乡人 | Chronik-Texte |
| Felmagier / fel | mago vil | magicien gangrené | mago vil | скверномаг | 邪术师 | `monsters:goblin_felmagician` |
| Kriegshäuptling / Warchief | Cacique de guerra | Chef de guerre | Chefe de Guerra | военный вождь | 战酋 | `monsters:goblin_warchief` |
| Kriegsbande / warband | la horda | la horde | a horda | орда | 战团 | `dungeons:goblin_warband` |
| Götzeneisen / god-iron | hierro divino | fer divin | ferro divino | божественное железо | 神铁 | `items:godiron_bar` |
| Sanktum des Letzten Götzen (Kollisionsprüfung) | Santuario del Último Ídolo | Le Sanctuaire de la Dernière Idole | Santuário do Último Ídolo | Святилище Последнего Идола | 最后神像圣所 | `dungeons:idol_sanctum` |
| Vhel die Torhüterin | Vhel la Guardiana de la Puerta | Vhel la Gardienne | Vhel, a Guardiã do Portão | Вэль Привратница | 守门者维尔 | `quests:chronicle_10` (RU/ZH), Rest neu |
| Mux · Voss · Drazhan | Mux · Voss · Drazhan | Mux · Voss · Drazhan | Mux · Voss · Drazhan | Мукс · Восс · Дражан | 穆克斯 · 沃斯 · 德拉赞 | `campBuildings`, `monsters:drazhan` |
| Brand · Gift · Blutung (Status) | Quemadura · Veneno · Sangrado | Brûlure · Poison · Saignement | Queimadura · Veneno · Sangramento | Горение · Яд · Кровотечение | 灼烧 · 中毒 · 流血 | `status.*` |

**Neue Begriffe, in diesem Dokument festgelegt (bitte so in den Content übernehmen):** Kriegskönig / War-King = ES Rey de Guerra · FR Roi de guerre · PT Rei de Guerra · RU Военный король · ZH 战王. Der Erbe / the Heir = el Heredero · l'Héritier · o Herdeiro · Наследник · 继承者. Schuldbuch = el Libro de Deudas · le Livre des dettes · o Livro de Dívidas · Долговая книга · 债务账簿. Kerbholz = la tarja · la taille · a talha · бирка · 刻木契. Kronwache = Guardia de la Corona · Garde de la Couronne · Guarda da Coroa · Коронная стража · 王冠卫队. Grubenmeute = la Jauría de las Fosas · la Meute des Fosses · a Matilha das Covas · Ямная свора · 兽坑猎群. Belagerungsbestie = bestia de asedio · bête de siège · fera de cerco · осадный зверь · 攻城巨兽. **Raum 4** heißt in den fünf Sprachen Altar / Chapelle / Capela / Часовня / 圣坛, weil „Santuario/Sanctuaire/Santuário/Святилище/圣所“ schon das Sanktum des Letzten Götzen sind.

---

## § 0 ID → Name

### Raid und Räume

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gobkharaz` | Las Salas de Gobkha'raz | Les Salles de Gobkha'raz | Os Salões de Gobkha'raz | Залы Гобкха'раза | 戈布卡拉兹大厅 |
| `gk_room_1` | La Puerta del Peaje | La Porte du Péage | O Portão do Pedágio | Пошлинные ворота | 税关之门 |
| `gk_room_2` | Los Arsenales | Les Arsenaux | Os Arsenais | Арсеналы | 武库 |
| `gk_room_3` | Las Fosas de las Bestias | Les Fosses aux Bêtes | As Covas das Feras | Звериные ямы | 兽坑 |
| `gk_room_4` | El Altar del Fuego Prestado | La Chapelle du Feu emprunté | A Capela do Fogo Emprestado | Часовня заёмного огня | 借火圣坛 |
| `gk_room_5` | El Trono del Heredero | Le Trône de l'Héritier | O Trono do Herdeiro | Трон Наследника | 继承者王座 |

### Bosse

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_tallymistress` | Maestra de Cuentas Vrikka | Maîtresse des comptes Vrikka | Mestra das Contas Vrikka | Хранительница счетов Врикка | 账务官弗丽卡 |
| `gk_quartermaster` | Intendente Krogg | Intendant Krogg | Intendente Krogg | Интендант Крогг | 军需官克罗格 |
| `gk_pitmother` | Madre de las Fosas Ushka | Mère des Fosses Ushka | Mãe das Covas Ushka | Мать Ям Ушка | 兽坑之母乌什卡 |
| `gk_felmagus` | Gran Maga Vil Zil'gath | Grande Magicienne gangrenée Zil'gath | Grã-Maga Vil Zil'gath | Верховный скверномаг Зил'гат | 高阶邪术师吉尔加斯 |
| `gk_warking` | Rey de Guerra Rakkzul el Heredero | Roi de guerre Rakkzul l'Héritier | Rei de Guerra Rakkzul, o Herdeiro | Военный король Раккзул Наследник | 战王拉克祖尔·继承者 |

### Wellen-Gegner

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_toll_thug` | Cobrador del peaje | Percepteur du péage | Cobrador do Pedágio | Сборщик пошлины | 税关打手 |
| `gk_gate_pikeman` | Piquero de la puerta | Piquier de la porte | Piqueiro do Portão | Пикинёр ворот | 门卫长枪兵 |
| `gk_armory_breaker` | Rompemuros del arsenal | Briseur de l'arsenal | Arrombador do Arsenal | Громила арсенала | 武库破墙者 |
| `gk_ballista_gunner` | Artillero de balista | Servant de baliste | Artilheiro de Balista | Стрелок баллисты | 弩炮射手 |
| `gk_pit_hound` | Sabueso de las fosas | Molosse des fosses | Cão das Covas | Ямный пёс | 兽坑猎犬 |
| `gk_beastkeeper` | Guardiana de bestias | Gardienne des bêtes | Guardiã de Feras | Смотрительница зверей | 驯兽女 |
| `gk_fel_acolyte` | Acólito vil | Acolyte gangrené | Acólito Vil | Послушник Скверны | 邪术侍僧 |
| `gk_ember_warden` | Guardián de las brasas | Gardien des braises | Guardião das Brasas | Страж углей | 余烬守卫 |
| `gk_crownguard` | Guardia de la Corona | Garde de la Couronne | Guarda da Coroa | Коронный стражник | 王冠卫士 |
| `gk_bannerman` | Abanderado | Porte-bannière | Porta-estandarte | Знаменосец | 旗手 |

### Sets (Grundnamen; `_heroic`/`_mythic` tragen denselben Namen)

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| Set `gk_fire` | Ornamentos del Fuego Prestado | Ornements du Feu emprunté | Ornamentos do Fogo Emprestado | Облачение заёмного огня | 借火法衣 |
| `gk_fire_head` | Capucha del Fuego Prestado | Capuche du Feu emprunté | Capuz do Fogo Emprestado | Капюшон заёмного огня | 借火兜帽 |
| `gk_fire_chest` | Túnica del Fuego Prestado | Robe du Feu emprunté | Túnica do Fogo Emprestado | Роба заёмного огня | 借火长袍 |
| `gk_fire_legs` | Calzas del Fuego Prestado | Jambières du Feu emprunté | Calças do Fogo Emprestado | Штаны заёмного огня | 借火长裤 |
| `gk_fire_feet` | Zapatos del Fuego Prestado | Souliers du Feu emprunté | Sapatos do Fogo Emprestado | Туфли заёмного огня | 借火便鞋 |
| `gk_fire_hands` | Vendas del Fuego Prestado | Bandages du Feu emprunté | Ataduras do Fogo Emprestado | Обмотки заёмного огня | 借火手缠 |
| Set `gk_poison` | Atuendo de Acechador de la Jauría | Tenue du rôdeur de la Meute | Traje do Espreitador da Matilha | Облачение ловчего Ямной своры | 兽坑猎群潜行装 |
| `gk_poison_head` | Capucha de la Jauría | Capuche de la Meute | Capuz da Matilha | Капюшон Ямной своры | 猎群兜帽 |
| `gk_poison_chest` | Jubón de la Jauría | Justaucorps de la Meute | Gibão da Matilha | Куртка Ямной своры | 猎群皮甲 |
| `gk_poison_legs` | Calzas de la Jauría | Jambières de la Meute | Calças da Matilha | Штаны Ямной своры | 猎群护腿 |
| `gk_poison_feet` | Botas de la Jauría | Bottes de la Meute | Botas da Matilha | Сапоги Ямной своры | 猎群长靴 |
| `gk_poison_hands` | Guantes de la Jauría | Gants de la Meute | Luvas da Matilha | Перчатки Ямной своры | 猎群手套 |
| Set `gk_bleed` | Juramento de Sangre de la Guardia de la Corona | Serment de sang de la Garde de la Couronne | Juramento de Sangue da Guarda da Coroa | Кровавая клятва Коронной стражи | 王冠卫队血誓 |
| `gk_bleed_head` | Yelmo de la Guardia de la Corona | Heaume de la Garde de la Couronne | Elmo da Guarda da Coroa | Шлем Коронной стражи | 王冠卫队头盔 |
| `gk_bleed_chest` | Coraza de la Guardia de la Corona | Cuirasse de la Garde de la Couronne | Couraça da Guarda da Coroa | Кираса Коронной стражи | 王冠卫队胸甲 |
| `gk_bleed_legs` | Grebas de la Guardia de la Corona | Grèves de la Garde de la Couronne | Grevas da Guarda da Coroa | Поножи Коронной стражи | 王冠卫队护胫 |
| `gk_bleed_feet` | Escarpes de la Guardia de la Corona | Solerets de la Garde de la Couronne | Sabatões da Guarda da Coroa | Сабатоны Коронной стражи | 王冠卫队铁靴 |
| `gk_bleed_hands` | Guanteletes de la Guardia de la Corona | Gantelets de la Garde de la Couronne | Manoplas da Guarda da Coroa | Латные перчатки Коронной стражи | 王冠卫队铁手套 |

### Set-Stufen (Namen)

| Set · Stufe | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_fire` 2 · Geliehene Glut | Brasa prestada | Braise empruntée | Brasa Emprestada | Заёмный уголёк | 借来的余烬 |
| `gk_fire` 4 · Zinsfeuer | Fuego compuesto | Feu composé | Fogo Composto | Огненная лихва | 复利之火 |
| `gk_fire` 5 · Eintreibung | Cobro | Recouvrement | Cobrança | Взыскание | 催收 |
| `gk_poison` 2 · Grubengift | Veneno de las fosas | Venin des fosses | Veneno das Covas | Ямный яд | 兽坑毒液 |
| `gk_poison` 4 · Schleichende Seuche | Plaga reptante | Fléau rampant | Praga Rastejante | Ползучая порча | 蔓延疫病 |
| `gk_poison` 5 · Ausbruch | Ruptura | Rupture | Ruptura | Разрыв | 溃裂 |
| `gk_bleed` 2 · Geschworene Klinge | Hoja juramentada | Lame assermentée | Lâmina Juramentada | Присяжный клинок | 誓约之刃 |
| `gk_bleed` 4 · Offene Wunden | Heridas abiertas | Plaies ouvertes | Feridas Abertas | Открытые раны | 撕裂伤口 |
| `gk_bleed` 5 · Blutzoll | Peaje de sangre | Péage de sang | Pedágio de Sangue | Кровавая пошлина | 血税 |

### Unikate (Grundnamen)

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_tally_dagger` | Cuchillo de la Prenda | Couteau du gage | Faca do Penhor | Нож залога | 质押之刃 |
| `gk_tally_focus` | El Libro de Deudas | Le Livre des dettes | O Livro de Dívidas | Долговая книга | 债务账簿 |
| `gk_tally_ring` | Sello del Peaje | Sceau du péage | Sinete do Pedágio | Печатка пошлины | 税关印戒 |
| `gk_quarter_maul` | Mazo de asedio | Maillet de siège | Malho de Cerco | Осадный молот | 攻城巨锤 |
| `gk_quarter_shield` | Escudo torre de la Marca Perdida | Pavois de la Marche perdue | Escudo-Torre da Marca Perdida | Ростовой щит утраченной марки | 失落边境塔盾 |
| `gk_quarter_quiver` | Carcaj del Intendente | Carquois de l'intendant | Aljava do Intendente | Колчан интенданта | 军需官箭袋 |
| `gk_pit_longbow` | Llamada de la Jauría | Appel de la meute | Chamado da Matilha | Зов своры | 唤群 |
| `gk_pit_scimitar` | Colmillo de las Fosas | Croc des fosses | Presa das Covas | Ямный клык | 兽坑獠牙 |
| `gk_pit_amulet` | Collar de la Madre de las Fosas | Collier de la Mère des Fosses | Coleira da Mãe das Covas | Ошейник Матери Ям | 兽坑之母项圈 |
| `gk_fel_staff` | Bastón del Fuego Prestado | Bâton du Feu emprunté | Cajado do Fogo Emprestado | Посох заёмного огня | 借火法杖 |
| `gk_fel_wand` | Lengua de brasa | Langue de braise | Língua de Brasa | Язык углей | 烬舌 |
| `gk_fel_ring` | Anillo del Acreedor | Anneau du Créancier | Anel do Credor | Кольцо Заимодавца | 债主之戒 |
| `gk_king_greatsword` | Hoja del Heredero | Lame de l'Héritier | Lâmina do Herdeiro | Клинок Наследника | 继承者之刃 |
| `gk_king_shortbow` | Arco corona del Heredero | Arc-couronne de l'Héritier | Arco da Coroa do Herdeiro | Коронный лук Наследника | 继承者王冠之弓 |
| `gk_king_scepter` | Cetro del Trono | Sceptre du trône | Cetro do Trono | Тронный скипетр | 王座权杖 |
| `gk_king_cape` | Manto del Heredero | Manteau de l'Héritier | Manto do Herdeiro | Мантия Наследника | 继承者斗篷 |

### Wochen-Modifikatoren und Material (Namen)

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `payday` | Día de paga | Jour de paie | Dia de Pagamento | День выплат | 发饷日 |
| `borrowed_fire` | Fuego prestado | Feu emprunté | Fogo Emprestado | Заёмный огонь | 借来的火 |
| `war_drums` | Tambores de guerra | Tambours de guerre | Tambores de Guerra | Боевые барабаны | 战鼓 |
| `beast_hunger` | Hambre de las bestias | Faim des bêtes | Fome das Feras | Звериный голод | 兽饥 |
| `open_armory` | Armería abierta | Arsenal ouvert | Arsenal Aberto | Открытый арсенал | 开放武库 |
| `poison_kitchen` | Cocina de veneno | Cuisine à poison | Cozinha de Veneno | Ядовитая кухня | 毒厨 |
| `blood_feast` | Festín de sangre | Festin de sang | Festim de Sangue | Кровавый пир | 血宴 |
| `silent_halls` | Salas silenciosas | Salles silencieuses | Salões Silenciosos | Тихие залы | 寂静大厅 |
| `relic_dust` | Polvo de reliquia | Poussière de relique | Pó de Relíquia | Реликтовая пыль | 遗物之尘 |

---

## § 2 Raid-Name und Einführung

**Einführung (description des Raids)**

- ES: Bajo la vieja muralla de la marca se extiende la capital de los goblins: la fortaleza que el Confín no demolió al retirarse y que sus herederos llaman Gobkha'raz. Aquí se administra el fuego prestado, clan por clan e interés por interés, y aquí el Rey de Guerra levanta el ejército con el que el Cacique de guerra solo soñó. Cinco salas, cinco puertas, y tras la última un trono.
- FR: Sous le vieux rempart de la marche s'étend la capitale des gobelins : la forteresse que le Domaine n'a pas rasée en se retirant et que ses héritiers nomment Gobkha'raz. Ici, le feu emprunté est administré, clan par clan et intérêt par intérêt, et ici le Roi de guerre bâtit l'armée dont le Chef de guerre n'a fait que rêver. Cinq salles, cinq portes, et derrière la dernière, un trône.
- PT-BR: Sob a velha muralha da marca fica a capital dos goblins: a fortaleza que o Confim não arrasou ao se retirar e que seus herdeiros chamam de Gobkha'raz. Aqui se administra o fogo emprestado, clã por clã e juro por juro, e aqui o Rei de Guerra ergue o exército com que o Chefe de Guerra apenas sonhou. Cinco salões, cinco portas, e atrás da última um trono.
- RU: Под старым валом марки лежит столица гоблинов: крепость, которую Предел не разрушил при отходе и которую её наследники зовут Гобкха'раз. Здесь ведут учёт заёмного огня, клан за кланом и процент за процентом, и здесь Военный король строит войско, о котором военный вождь лишь мечтал. Пять залов, пять дверей, а за последней трон.
- ZH: 旧边境的壁垒之下，坐落着哥布林的都城：边域撤离时未曾拆毁的要塞，它的继承者称之为戈布卡拉兹。在这里，借来的火被逐一氏族、逐一利息地管理着；在这里，战王正在打造那支战酋只敢梦想的军队。五座大厅，五道门，最后一道门后是王座。

**Gebühr-Zeile (optional, Raid-Karte)**

- ES: Una campaña cuesta lo que cuesta una campaña: provisiones, virotes y el peaje de Mux por el camino de entrada. Voss lo cuenta dos veces.
- FR: Une campagne coûte ce que coûte une campagne : des vivres, des carreaux et le péage de Mux pour le chemin d'entrée. Voss le compte deux fois.
- PT-BR: Uma campanha custa o que uma campanha custa: provisões, virotes e o pedágio de Mux pelo caminho de entrada. Voss conta duas vezes.
- RU: Поход стоит столько, сколько стоит поход: припасы, болты и пошлина Мукса за дорогу внутрь. Восс пересчитывает дважды.
- ZH: 一场远征要花多少就得花多少：补给、弩矢，还有穆克斯收的带路费。沃斯会清点两遍。

---

## § 3 Einladungstext (Stimme des Wächters, Raid-Karte nach dem ersten Sieg über Drazhan)

- ES: Drazhan se retiró, y el fuego de la marca no se apagó; se hizo más brillante. Entre lo que dejó atrás había la mitad del acreedor de una tarja, y en ella un nombre que Mux solo me confirmó a la tercera vez que pregunté: Gobkha'raz, la capital de los goblins, donde se lleva la cuenta de la deuda por el fuego prestado. Su Rey de Guerra da al Acreedor por ido y a sí mismo por su heredero, y con el legado de la marca levanta el ejército con el que el Cacique de guerra solo soñó. Escribí una vez que la marca no sería abandonada por segunda vez. Es hora de demostrarlo.
- FR: Drazhan s'est retiré, et le feu de la marche ne s'est pas éteint ; il a gagné en éclat. Parmi ce qu'il a laissé se trouvait la moitié du créancier d'une taille, et dessus un nom que Mux ne m'a confirmé qu'à la troisième demande : Gobkha'raz, la capitale des gobelins, où l'on tient la dette du feu emprunté. Son Roi de guerre tient le Créancier pour parti et se tient lui-même pour son héritier, et de l'héritage de la marche il bâtit l'armée dont le Chef de guerre n'a fait que rêver. J'ai écrit un jour que la marche ne serait pas abandonnée une seconde fois. Il est temps de le prouver.
- PT-BR: Drazhan se retirou, e o fogo na marca não se apagou; ficou mais claro. Entre o que ele deixou para trás estava a metade do credor de uma talha, e nela um nome que Mux só me confirmou na terceira vez que perguntei: Gobkha'raz, a capital dos goblins, onde se guarda a dívida pelo fogo emprestado. Seu Rei de Guerra dá o Credor por ido e a si mesmo por seu herdeiro, e do espólio da marca ergue o exército com que o Chefe de Guerra apenas sonhou. Escrevi uma vez que a marca não seria abandonada uma segunda vez. É hora de provar.
- RU: Дражан отступил, а огонь в марке не погас; он стал ярче. Среди того, что он оставил, лежала половина бирки, что остаётся заимодавцу, а на ней имя, которое Мукс подтвердил лишь с третьего вопроса: Гобкха'раз, столица гоблинов, где ведут счёт долгу за заёмный огонь. Её Военный король считает Заимодавца ушедшим, а себя его наследником, и из наследия марки строит войско, о котором военный вождь лишь мечтал. Я когда-то записал, что марку не оставят во второй раз. Пора это доказать.
- ZH: 德拉赞退走了，边境的火却没有熄灭；它反而更亮了。在他遗留之物中，有一根刻木契属于债主的那一半，上面刻着一个名字，穆克斯直到我第三次追问才肯承认：戈布卡拉兹，哥布林的都城，借来的火所欠的债就记在那里。它的战王认定债主已去，自己便是债主的继承者，并用边境的遗产打造那支战酋只敢梦想的军队。我曾写下：边境不会被第二次放弃。是时候证明这句话了。

---

## § 4 Die fünf Räume (Beschreibung; Bild-Briefings nur im Hauptdokument)

### § 4.1 `gk_room_1`

- ES: La casa de la puerta de la vieja marca, tallada en la muralla, con el rastrillo de negro hierro de la marca aún en sus cadenas. Luz de antorchas sobre piedra húmeda, tablas de cuentas con marcas de clan a lo largo de los muros, y sobre el paso la mesa de la Maestra de Cuentas, donde se cuenta a todos antes de entrar.
- FR: Le corps de garde de la vieille marche, taillé dans le rempart, la herse de fer noir de la marche encore à ses chaînes. Lumière de torches sur la pierre humide, tableaux de taille marqués des signes des clans le long des murs, et au-dessus du passage la table de la Maîtresse des comptes, où chacun est compté avant d'entrer.
- PT-BR: A casa do portão da velha marca, talhada na muralha, a grade de ferro negro da marca ainda em suas correntes. Luz de tochas sobre pedra úmida, tábuas de contas com marcas de clã ao longo das paredes, e sobre a passagem a mesa da Mestra das Contas, onde todos são contados antes de entrar.
- RU: Надвратная башня старой марки, вырубленная в валу; решётка из чёрного железа марки всё ещё на цепях. Свет факелов на мокром камне, вдоль стен бирочные доски с клановыми знаками, а над проходом стол Хранительницы счетов, где каждого считают, прежде чем впустить.
- ZH: 旧边境的门楼，凿入壁垒之中，黑色边境铁铸的闸门仍挂在锁链上。火把的光映在湿石上，墙边排着刻有氏族标记的计数板，通道上方是账务官的桌案，每个人进门前都要在此被清点。

### § 4.2 `gk_room_2`

- ES: Los arsenales abovedados de la marca, pilar tras pilar, llenos de lo que el Confín dejó atrás: bastidores de picas, balistas sobre sus cureñas, estandartes de la marca repintados con marcas goblin. Resplandor de forja y grasa sobre el hierro, luz de braseros de carbón, todo engrasado y todo contado, nada de ello propio de los goblins y todo en sus manos.
- FR: Les arsenaux voûtés de la marche, pilier après pilier, pleins de ce que le Domaine a laissé : râteliers de piques, balistes sur leurs affûts, bannières de la marche repeintes de signes gobelins. Lueur de forge et graisse sur le fer, lumière des braseros à charbon, tout huilé et tout compté, rien qui appartienne aux gobelins et tout entre leurs mains.
- PT-BR: Os arsenais abobadados da marca, pilar após pilar, cheios do que o Confim deixou para trás: estantes de piques, balistas em seus reparos, estandartes da marca repintados com marcas goblin. Brilho de forja e graxa sobre o ferro, luz de braseiros de carvão, tudo lubrificado e tudo contado, nada disso pertence aos goblins e tudo está em suas mãos.
- RU: Сводчатые арсеналы марки, колонна за колонной, полные того, что оставил Предел: стойки с пиками, баллисты на лафетах, знамёна марки, замалёванные гоблинскими знаками. Отсвет горна и смазка на железе, свет угольных жаровен, всё смазано и всё сочтено, ничто из этого не принадлежит гоблинам, и всё в их руках.
- ZH: 边境的拱顶武库，一柱接一柱，堆满了边域遗留之物：成架的长枪、架在炮车上的弩炮、被哥布林标记涂改过的边境军旗。炉火的光与铁器上的油脂，炭盆照明，一切都上了油，一切都清点过，没有一件属于哥布林，却全在他们手中。

### § 4.3 `gk_room_3`

- ES: Las viejas perreras de la marca, muy por debajo de la muralla, ensanchadas en fosas y techadas con rejas de hierro. Antorchas enjauladas, paja, cadenas y hueso, y bajo las rejas respira algo criado demasiado grande para una perrera.
- FR: Les vieux chenils de la marche, loin sous le rempart, élargis en fosses et couverts de grilles de fer. Torches en cage, paille, chaînes et os, et sous les grilles respire quelque chose qu'on a élevé trop grand pour un chenil.
- PT-BR: Os velhos canis da marca, bem abaixo da muralha, alargados em covas e cobertos com grades de ferro. Tochas engaioladas, palha, correntes e osso, e sob as grades respira algo criado grande demais para um canil.
- RU: Старые псарни марки глубоко под валом, расширенные в ямы и накрытые железными решётками. Факелы в клетках, солома, цепи и кости, а под решётками дышит нечто, выведенное слишком крупным для псарни.
- ZH: 边境的旧犬舍，深藏在壁垒之下，被拓成深坑，覆以铁栅。笼中的火把、干草、锁链与骸骨，而铁栅之下，有什么东西在呼吸，它被养得太大，早已不是犬舍容得下的了。

### § 4.4 `gk_room_4`

- ES: La capilla de la puerta de la marca, consagrada en otro tiempo a Vhel la Guardiana de la Puerta; donde se alzaba su imagen arde ahora el fuego prestado en una pila de hierro divino. Es pálido, no da humo, y las sombras de la sala no se mueven con él; en los muros negros están grabados a fuego los nombres de los clanes, línea a línea, como asientos.
- FR: La chapelle de la porte de la marche, jadis consacrée à Vhel la Gardienne ; là où se dressait son image brûle à présent le feu emprunté dans une vasque de fer divin. Il est pâle, ne fait pas de fumée, et les ombres de la salle ne bougent pas avec lui ; sur les murs noirs, les noms des clans sont gravés au feu, ligne après ligne, comme des écritures.
- PT-BR: A capela do portão da marca, outrora consagrada a Vhel, a Guardiã do Portão; onde ficava sua imagem, arde agora o fogo emprestado numa bacia de ferro divino. É pálido, não faz fumaça, e as sombras da sala não se movem com ele; nas paredes negras estão gravados a fogo os nomes dos clãs, linha por linha, como lançamentos.
- RU: Надвратная часовня марки, некогда посвящённая Вэль Привратнице; там, где стоял её образ, теперь горит заёмный огонь в чаше из божественного железа. Он бледен, не даёт дыма, и тени в зале не движутся вместе с ним; на чёрных стенах выжжены имена кланов, строка за строкой, как записи в книге.
- ZH: 边境的门前礼拜堂，曾供奉守门者维尔；她的神像所在之处，如今神铁盆中燃着借来的火。火是苍白的，不冒烟，室内的影子也不随它晃动；黑墙上烙着各氏族的名字，一行又一行，像账目一样。

### § 4.5 `gk_room_5`

- ES: La sala de mando de la marca, alta y fría, con las ventanas cerradas con escudos. El trono está hecho con la cureña de una balista y el herraje de la puerta de la marca, ante él la Guardia de la Corona en placas de la marca, sobre todo ello los estandartes, y dos fuegos en la sala: el carbón del Intendente y el fuego pálido del altar, que no mueve sombra alguna.
- FR: La salle de commandement de la marche, haute et froide, ses fenêtres barrées de boucliers. Le trône est fait de l'affût d'une baliste et de la ferrure de la porte de la marche, la Garde de la Couronne en plates de la marche devant lui, les bannières au-dessus de tout, et deux feux dans la salle : le charbon de l'Intendant et le feu pâle de la chapelle, qui ne fait bouger aucune ombre.
- PT-BR: O salão de comando da marca, alto e frio, as janelas fechadas com escudos. O trono é feito do reparo de uma balista e da ferragem do portão da marca, diante dele a Guarda da Coroa em placas da marca, acima de tudo os estandartes, e dois fogos no salão: o carvão do Intendente e o fogo pálido da capela, que não move sombra alguma.
- RU: Командный зал марки, высокий и холодный, окна заложены щитами. Трон сколочен из лафета баллисты и воротной оковки марки, перед ним Коронная стража в латах марки, над всем знамёна, и два огня в зале: уголь Интенданта и бледный огонь из часовни, который не шевелит ни одной тени.
- ZH: 边境的指挥大厅，高而冷，窗户用盾牌封死。王座由弩炮炮车和边境城门的铁件拼成，座前是身披边境板甲的王冠卫队，军旗高悬于一切之上，厅中有两处火：军需官的炭火，和来自圣坛的苍白之火，后者不曾挪动任何影子。

---

## § 5 Die Bosse (Herkunft, Intro, Phasen-Namen und -Ansagen)

### § 5.1 `gk_tallymistress` · Vrikka

**Herkunft**
- ES: Vrikka lleva el libro de deudas de Gobkha'raz: cada clan que porta el fuego prestado paga intereses, y los intereses se pagan en portadores, porque el fuego consume a quien lo da. A quien se atrasa se le cobra: su marca es borrada a fuego del libro y su clan enviado a las fosas o al frente; Vrikka nunca ha luchado y nunca ha perdido, porque en Gobkha'raz nadie lucha contra los números.
- FR: Vrikka tient le livre des dettes de Gobkha'raz : chaque clan qui porte le feu emprunté paie des intérêts, et les intérêts se paient en porteurs, car le feu consume celui qui le donne. Qui prend du retard est recouvré, sa marque brûlée hors du livre et son clan envoyé aux fosses ou au front ; Vrikka n'a jamais combattu et jamais perdu, car à Gobkha'raz, personne ne se bat contre les chiffres.
- PT-BR: Vrikka mantém o livro de dívidas de Gobkha'raz: cada clã que carrega o fogo emprestado paga juros, e os juros são pagos em portadores, porque o fogo consome quem o dá. Quem atrasa é cobrado, sua marca queimada para fora do livro e seu clã mandado às covas ou ao front; Vrikka nunca lutou e nunca perdeu, porque em Gobkha'raz ninguém luta contra os números.
- RU: Врикка ведёт долговую книгу Гобкха'раза: каждый клан, несущий заёмный огонь, платит проценты, а проценты платят носителями, потому что огонь пожирает того, кто его отдаёт. С отставших взыскивают: их знак выжигают из книги, а клан отправляют в ямы или на передовую; Врикка никогда не сражалась и никогда не проигрывала, потому что в Гобкха'разе никто не спорит с цифрами.
- ZH: 弗丽卡掌管戈布卡拉兹的债务账簿：每一个持有借来之火的氏族都要付利息，而利息以持火者来偿付，因为火会吞噬献火之人。拖欠者会被催收，标记从账簿上烙去，氏族被送进兽坑或推上前线；弗丽卡从未打过仗，也从未输过，因为在戈布卡拉兹，没人会跟数字作对。

**Intro**
- ES: «Clan y marca. O te apunto en pérdidas.»
- FR: « Clan et marque. Ou je t'inscris aux pertes. »
- PT-BR: "Clã e marca. Ou eu lanço você em perdas."
- RU: «Клан и знак. Или впишу тебя в убытки.»
- ZH: “氏族，标记。否则我就把你记进损耗。”

**Phase 75 % · Das Schuldbuch** (ES El Libro de Deudas · FR Le Livre · PT O Livro · RU Книга · ZH 账簿)
- ES: La Maestra de Cuentas abre el libro de deudas. Los números se alzan ante ella.
- FR: La Maîtresse des comptes ouvre le livre. Les chiffres se dressent devant elle.
- PT-BR: A Mestra das Contas abre o livro. Os números se erguem diante dela.
- RU: Хранительница счетов раскрывает книгу. Цифры встают перед ней.
- ZH: 账务官翻开账簿。数字立在她身前。

**Phase 50 % · Zinseszins** (ES Interés compuesto · FR Intérêts composés · PT Juros Compostos · RU Сложные проценты · ZH 复利)
- ES: Interés compuesto. Cada línea llega más rápido que la anterior.
- FR: Intérêts composés. Chaque ligne arrive plus vite que la précédente.
- PT-BR: Juros compostos. Cada linha vem mais rápido que a anterior.
- RU: Сложные проценты. Каждая строка приходит быстрее предыдущей.
- ZH: 复利。每一行都比上一行来得更快。

**Phase 25 % · Eintreibung** (ES Cobro · FR Recouvrement · PT Cobrança · RU Взыскание · ZH 催收)
- ES: Cobro. La Maestra de Cuentas borra a fuego tu marca del libro.
- FR: Recouvrement. La Maîtresse des comptes brûle ta marque hors du livre.
- PT-BR: Cobrança. A Mestra das Contas queima sua marca para fora do livro.
- RU: Взыскание. Хранительница счетов выжигает твой знак из книги.
- ZH: 催收。账务官把你的标记从账簿上烙去。

### § 5.2 `gk_quartermaster` · Krogg

**Herkunft**
- ES: Krogg custodia lo que el Confín dejó en la marca, y conoce cada pieza: qué balista toma qué virote, qué coraza se forjó para qué hombre de la marca. En Gobkha'raz nadie posee nada, todo es prestado, también el hierro, y Krogg solo lo entrega a los clanes que están limpios en el libro.
- FR: Krogg garde ce que le Domaine a laissé dans la marche, et il en connaît chaque pièce : quelle baliste prend quel carreau, quelle cuirasse fut forgée pour quel homme de la marche. À Gobkha'raz, personne ne possède rien, tout est prêté, le fer aussi, et Krogg ne le délivre qu'aux clans dont le compte est propre dans le livre.
- PT-BR: Krogg guarda o que o Confim deixou na marca, e conhece cada peça: qual balista usa qual virote, qual couraça foi forjada para qual homem da marca. Em Gobkha'raz ninguém possui nada, tudo é emprestado, o ferro também, e Krogg só o entrega a clãs que estão limpos no livro.
- RU: Крогг хранит то, что Предел оставил в марке, и знает каждую вещь: какая баллиста берёт какой болт, для какого человека марки ковалась какая кираса. В Гобкха'разе никто ничем не владеет, всё одолжено, железо тоже, и Крогг выдаёт его лишь кланам, которые чисты в книге.
- ZH: 克罗格看管着边域留在边境的一切，每一件他都了如指掌：哪台弩炮配哪种弩矢，哪副胸甲是为边境哪个人打造的。在戈布卡拉兹，无人拥有任何东西，一切都是借来的，铁也一样，克罗格只把它发给账簿上记录清白的氏族。

**Intro**
- ES: «Eso es equipo de la marca. No se toca. Se entrega.»
- FR: « C'est du matériel de la marche. On n'y touche pas. On le délivre. »
- PT-BR: "Isso é equipamento da marca. Não se toca. Se entrega."
- RU: «Это снаряжение марки. Его не трогают. Его выдают.»
- ZH: “那是边境的装备。不许碰。只能领。”

**Phase 75 % · Mark-Panzer** (ES Placas de la marca · FR Plates de la marche · PT Placas da Marca · RU Латы марки · ZH 边境板甲)
- ES: El Intendente cierra las placas de la marca. El hierro se forjó para alguien más alto. Aguanta de todos modos.
- FR: L'Intendant ferme les plates de la marche. Le fer fut forgé pour quelqu'un de plus grand. Il tient quand même.
- PT-BR: O Intendente fecha as placas da marca. O ferro foi forjado para alguém mais alto. Aguenta mesmo assim.
- RU: Интендант застёгивает латы марки. Железо ковали для кого-то повыше. Держит всё равно.
- ZH: 军需官扣紧边境板甲。这铁是为更高的人打的。照样挡得住。

**Phase 50 % · Ballistensalve** (ES Descarga de balistas · FR Salve de balistes · PT Salva de Balistas · RU Залп баллист · ZH 弩炮齐射)
- ES: Descarga de balistas. El Intendente cuenta hasta cuatro.
- FR: Salve de balistes. L'Intendant compte jusqu'à quatre.
- PT-BR: Salva de balistas. O Intendente conta até quatro.
- RU: Залп баллист. Интендант считает до четырёх.
- ZH: 弩炮齐射。军需官数到四。

**Phase 25 % · Letzte Ausgabe** (ES Última entrega · FR Dernière délivrance · PT Última Entrega · RU Последняя выдача · ZH 最后发放)
- ES: Última entrega. El Intendente se quita las placas y viene más rápido de lo que el hierro permitía.
- FR: Dernière délivrance. L'Intendant jette les plates et vient plus vite que le fer ne le permettait.
- PT-BR: Última entrega. O Intendente joga fora as placas e vem mais rápido do que o ferro permitia.
- RU: Последняя выдача. Интендант сбрасывает латы и идёт быстрее, чем позволяло железо.
- ZH: 最后一次发放。军需官甩掉板甲，来得比铁允许的更快。

### § 5.3 `gk_pitmother` · Ushka

**Herkunft**
- ES: En las viejas perreras de la marca, Ushka cría a las bestias de asedio, a partir de los perros de guerra que el Confín dejó atrás y de todo lo que las fosas han devorado desde entonces; el pienso son los cobrados. Ella no lucha sin su bestia, y la bestia nunca ha luchado sin ella.
- FR: Dans les vieux chenils de la marche, Ushka élève les bêtes de siège, à partir des chiens de guerre que le Domaine a laissés et de tout ce que les fosses ont dévoré depuis ; la pâtée, ce sont les recouvrés. Elle ne se bat pas sans sa bête, et la bête ne s'est jamais battue sans elle.
- PT-BR: Nos velhos canis da marca, Ushka cria as feras de cerco, a partir dos cães de guerra que o Confim deixou para trás e de tudo o que as covas devoraram desde então; a ração são os cobrados. Ela não luta sem sua fera, e a fera nunca lutou sem ela.
- RU: В старых псарнях марки Ушка выводит осадных зверей из боевых псов, оставленных Пределом, и всего, что ямы сожрали с тех пор; кормом служат взысканные. Она не сражается без своего зверя, а зверь никогда не сражался без неё.
- ZH: 在边境的旧犬舍里，乌什卡培育攻城巨兽，用的是边域遗留的战犬，以及兽坑此后吞下的一切；饲料是那些被催收的人。她从不离开她的巨兽作战，而巨兽也从未离开她作战。

**Intro**
- ES: «Silencio. Hoy todavía no ha comido.»
- FR: « Silence. Elle n'a pas encore mangé aujourd'hui. »
- PT-BR: "Quieto. Ela ainda não comeu hoje."
- RU: «Тихо. Она сегодня ещё не ела.»
- ZH: “安静。它今天还没吃东西。”

**Phase 75 % · Rudelruf** (ES Llamada de la jauría · FR Appel de la meute · PT Chamado da Matilha · RU Зов своры · ZH 唤群)
- ES: Llamada de la jauría. Las fosas responden, y las dentelladas llevan veneno.
- FR: Appel de la meute. Les fosses répondent, et les morsures portent le venin.
- PT-BR: Chamado da matilha. As covas respondem, e as mordidas carregam veneno.
- RU: Зов своры. Ямы отвечают, и укусы несут яд.
- ZH: 唤群。兽坑回应了，撕咬带着毒。

**Phase 50 % · Die Kette fällt** (ES Cae la cadena · FR La chaîne tombe · PT A Corrente Cai · RU Цепь падает · ZH 锁链落下)
- ES: La cadena cae. La bestia muerde dos veces, y cada mordisco desgarra.
- FR: La chaîne tombe. La bête mord deux fois, et chaque morsure déchire.
- PT-BR: A corrente cai. A fera morde duas vezes, e cada mordida rasga.
- RU: Цепь падает. Зверь кусает дважды, и каждый укус рвёт.
- ZH: 锁链落下。巨兽连咬两口，每一口都撕开血肉。

**Phase 25 % · Mutterwut** (ES Furia de madre · FR Fureur de mère · PT Fúria de Mãe · RU Материнская ярость · ZH 母亲之怒)
- ES: Furia de madre. Ushka golpea por su bestia, y cada golpe la alimenta.
- FR: Fureur de mère. Ushka frappe pour sa bête, et chaque coup la nourrit.
- PT-BR: Fúria de mãe. Ushka golpeia por sua fera, e cada golpe a alimenta.
- RU: Материнская ярость. Ушка бьёт за своего зверя, и каждый удар её питает.
- ZH: 母亲之怒。乌什卡为巨兽而战，每一击都滋养着她。

### § 5.4 `gk_felmagus` · Zil'gath

**Herkunft**
- ES: En el altar, Zil'gath custodia la llama prestada de la que cada mago vil de la horda enciende la suya; la recibió del Forastero en persona y hasta hoy lo llama el Acreedor, nunca el amo. Desde que él se retiró sigue pagando intereses a un fuego del que ya nadie cobra, y tiene al Rey de Guerra por un deudor que se cree el heredero.
- FR: Dans la chapelle, Zil'gath garde la flamme prêtée à laquelle chaque magicien gangrené de la horde allume la sienne ; elle l'a reçue de l'Étranger lui-même et l'appelle encore aujourd'hui le Créancier, jamais le maître. Depuis qu'il s'est retiré, elle continue de payer des intérêts à un feu dont plus personne ne vient recouvrer, et elle tient le Roi de guerre pour un débiteur qui se prend pour l'héritier.
- PT-BR: Na capela, Zil'gath guarda a chama emprestada da qual cada mago vil da horda acende a sua; recebeu-a do próprio Forasteiro e até hoje o chama de Credor, nunca de senhor. Desde que ele se retirou, segue pagando juros a um fogo do qual ninguém mais cobra, e tem o Rei de Guerra por um devedor que se toma pelo herdeiro.
- RU: В часовне Зил'гат хранит ссудное пламя, от которого каждый скверномаг орды зажигает своё; она приняла его от самого Чужака и по сей день зовёт его Заимодавцем, никогда господином. С тех пор как он отступил, она продолжает платить проценты в огонь, с которого никто больше не взыскивает, и считает Военного короля должником, который возомнил себя наследником.
- ZH: 吉尔加斯在圣坛守护着那簇出借之火，战团的每一个邪术师都从这里点燃自己的火；她从异乡人本人手中接过它，至今仍称他为债主，从不称他为主人。自他退走以后，她仍在向一簇再无人来收取的火付着利息，并把战王看作一个自以为是继承者的债务人。

**Intro**
- ES: «Traes sombras que se mueven. Aquí dentro, no lo hacen.»
- FR: « Tu apportes des ombres qui bougent. Ici, elles ne bougent pas. »
- PT-BR: "Você traz sombras que se movem. Aqui dentro, elas não se movem."
- RU: «Ты приносишь тени, которые движутся. Здесь они не движутся.»
- ZH: “你带来的影子会动。在这里，影子是不动的。”

**Phase 75 % · Felschild** (ES Escudo vil · FR Bouclier gangrené · PT Escudo Vil · RU Щит Скверны · ZH 邪能护盾)
- ES: La Gran Maga Vil alza el fuego prestado entre ella y tú.
- FR: La Grande Magicienne gangrenée dresse le feu emprunté entre elle et toi.
- PT-BR: A Grã-Maga Vil ergue o fogo emprestado entre ela e você.
- RU: Верховный скверномаг поднимает заёмный огонь между собой и тобой.
- ZH: 高阶邪术师将借来的火举在她与你之间。

**Phase 50 % · Brandopfer** (ES Ofrenda quemada · FR Offrande brûlée · PT Oferenda Queimada · RU Всесожжение · ZH 燔祭)
- ES: Ofrenda quemada. Zil'gath paga los intereses con tu piel, y su propio fuego ya no la toca.
- FR: Offrande brûlée. Zil'gath paie les intérêts avec ta peau, et son propre feu ne la touche plus.
- PT-BR: Oferenda queimada. Zil'gath paga os juros com a sua pele, e o próprio fogo dela não a toca mais.
- RU: Всесожжение. Зил'гат платит проценты твоей кожей, и собственный огонь её больше не трогает.
- ZH: 燔祭。吉尔加斯用你的皮肉付利息，而她自己的火再也伤不到她。

**Phase 25 % · Der Gläubiger blickt her** (ES El Acreedor mira hacia aquí · FR Le Créancier regarde par ici · PT O Credor Olha para Cá · RU Заимодавец смотрит сюда · ZH 债主回望)
- ES: El fuego se aviva sin que nadie lo alimente. El Acreedor mira hacia aquí.
- FR: Le feu gagne en éclat sans que personne ne l'alimente. Le Créancier regarde par ici.
- PT-BR: O fogo fica mais claro sem que ninguém o alimente. O Credor está olhando para cá.
- RU: Огонь становится ярче, хотя никто его не кормит. Заимодавец смотрит сюда.
- ZH: 没有人添柴，火却更亮了。债主正朝这边看。

### § 5.5 `gk_warking` · Rakkzul

**Herkunft**
- ES: Rakkzul estaba por encima del Cacique de guerra como un rey está por encima de su campamento; cuando el Cacique cayó, asumió su deuda, y cuando el Acreedor se retiró, declaró la deuda extinguida y el fuego su herencia. Lleva una corona forjada con el herraje de la puerta de la marca, y con «heredero» quiere decir las dos cosas: la tierra que le dejaron a su pueblo y el fuego que ya nadie puede quitarle.
- FR: Rakkzul se tenait au-dessus du Chef de guerre comme un roi se tient au-dessus de son camp ; quand le Chef de guerre tomba, il reprit sa dette, et quand le Créancier se retira, il déclara la dette éteinte et le feu son héritage. Il porte une couronne forgée dans la ferrure de la porte de la marche, et par « héritier » il entend les deux choses : la terre qu'on a laissée à son peuple, et le feu que personne ne peut plus lui reprendre.
- PT-BR: Rakkzul estava acima do Chefe de Guerra como um rei está acima de seu acampamento; quando o Chefe caiu, assumiu sua dívida, e quando o Credor se retirou, declarou a dívida extinta e o fogo sua herança. Usa uma coroa forjada da ferragem do portão da marca, e por "herdeiro" entende as duas coisas: a terra que deixaram ao seu povo, e o fogo que ninguém mais pode tomar dele.
- RU: Раккзул стоял над военным вождём, как король стоит над своим лагерем; когда вождь пал, он принял его долг, а когда Заимодавец отступил, объявил долг погашенным, а огонь своим наследством. Он носит корону, выкованную из воротной оковки марки, и под «наследником» разумеет обе вещи: землю, что оставили его народу, и огонь, который никто уже не отнимет.
- ZH: 拉克祖尔凌驾于战酋之上，如同国王凌驾于自己的营地；战酋倒下时，他接过了他的债；债主退走时，他宣布债务已消，火焰归他继承。他头戴用边境城门铁件锤成的王冠，而他口中的“继承”有两层意思：留给他族人的这片土地，和再没人能从他手中收回的火。

**Intro**
- ES: «El Acreedor se ha ido. Lo que prestó pertenece ahora a quien lo tiene.»
- FR: « Le Créancier est parti. Ce qu'il a prêté appartient désormais à celui qui le tient. »
- PT-BR: "O Credor se foi. O que ele emprestou agora pertence a quem o segura."
- RU: «Заимодавец ушёл. То, что он одолжил, теперь принадлежит тому, кто это держит.»
- ZH: “债主走了。他借出的东西，如今归握着它的人所有。”

**Phase 75 % · Das Schuldbuch des Königs** (ES El libro del Rey · FR Le Livre du Roi · PT O Livro do Rei · RU Книга короля · ZH 王之账簿)
- ES: El Rey de Guerra alza el libro de deudas. Los números de Vrikka se alzan ahora ante él.
- FR: Le Roi de guerre lève le livre des dettes. Les chiffres de Vrikka se dressent désormais devant lui.
- PT-BR: O Rei de Guerra ergue o livro de dívidas. Os números de Vrikka agora se erguem diante dele.
- RU: Военный король поднимает долговую книгу. Теперь цифры Врикки стоят перед ним.
- ZH: 战王举起账簿。弗丽卡的数字如今立在他身前。

**Phase 50 % · Das Zeughaus des Königs** (ES El arsenal del Rey · FR L'Arsenal du Roi · PT O Arsenal do Rei · RU Арсенал короля · ZH 王之武库)
- ES: El Rey de Guerra llama a los arsenales. El hierro de Krogg responde.
- FR: Le Roi de guerre appelle les arsenaux. Le fer de Krogg répond.
- PT-BR: O Rei de Guerra chama os arsenais. O ferro de Krogg responde.
- RU: Военный король взывает к арсеналам. Железо Крогга отвечает.
- ZH: 战王召唤武库。克罗格的铁回应了。

**Phase 25 % · Die Gruben des Königs** (ES Las fosas del Rey · FR Les Fosses du Roi · PT As Covas do Rei · RU Ямы короля · ZH 王之兽坑)
- ES: El Rey de Guerra abre las fosas. Lo que Ushka crió ya solo le obedece a él.
- FR: Le Roi de guerre ouvre les fosses. Ce qu'Ushka a élevé n'obéit plus qu'à lui.
- PT-BR: O Rei de Guerra abre as covas. O que Ushka criou agora só obedece a ele.
- RU: Военный король открывает ямы. То, что вывела Ушка, теперь слушается только его.
- ZH: 战王打开兽坑。乌什卡养出的东西，如今只听他的。

**Phase 10 % · Erbe des Krieges** (ES Heredero de la guerra · FR Héritier de la guerre · PT Herdeiro da Guerra · RU Наследник войны · ZH 战争继承者)
- ES: Heredero de la guerra. Rakkzul toma el fuego prestado con ambas manos, y nadie viene a cobrar.
- FR: Héritier de la guerre. Rakkzul prend le feu emprunté à deux mains, et personne ne vient recouvrer.
- PT-BR: Herdeiro da guerra. Rakkzul toma o fogo emprestado com as duas mãos, e ninguém vem cobrar.
- RU: Наследник войны. Раккзул берёт заёмный огонь обеими руками, и никто не приходит взыскать.
- ZH: 战争的继承者。拉克祖尔双手捧起借来的火，再无人前来催收。

---

## § 6 Wellen-Gegner (Bestiarium-Satz)

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_toll_thug` | Cobra en la Puerta del Peaje lo que exige el libro, con garrote y tarja. | Perçoit à la Porte du Péage ce que le livre exige, au gourdin et à la taille. | Cobra no Portão do Pedágio o que o livro exige, com cacete e talha. | Взыскивает у Пошлинных ворот то, чего требует книга, дубиной и биркой. | 在税关之门，用棍棒和刻木契收取账簿要求的一切。 |
| `gk_gate_pikeman` | Defiende el paso con una pica de la marca, más larga que tres goblins. | Tient le passage avec une pique de la marche, plus longue que trois gobelins. | Segura a passagem com um pique da marca, mais comprido que três goblins. | Держит проход пикой марки, что длиннее трёх гоблинов. | 手持比三个哥布林还长的边境长枪，把守通道。 |
| `gk_armory_breaker` | Carga el mazo del arsenal y no necesita puerta, solo un muro. | Porte la masse de l'arsenal et n'a pas besoin de porte, seulement d'un mur. | Carrega a marreta do arsenal e não precisa de porta, só de uma parede. | Носит кувалду из арсенала, и дверь ему не нужна, только стена. | 扛着武库的大锤，不需要门，只需要一堵墙。 |
| `gk_ballista_gunner` | Un goblin en una balista de la marca hecha para seis hombres; basta con que llegue a la palanca. | Un gobelin sur une baliste de la marche prévue pour six servants ; il suffit qu'il atteigne le levier. | Um goblin numa balista da marca feita para seis homens; basta que ele alcance a alavanca. | Один гоблин у баллисты марки, рассчитанной на шестерых; довольно того, что он дотягивается до рычага. | 一个哥布林守着一台本该六人操作的边境弩炮；他够得着扳机，这就够了。 |
| `gk_pit_hound` | Lo que las fosas no convierten en bestia de asedio se vuelve sabueso de las fosas; es la mitad menos paciente de la cría. | Ce que les fosses n'élèvent pas en bête de siège devient molosse des fosses ; c'est la moitié la moins patiente de l'élevage. | O que as covas não criam como fera de cerco vira cão das covas; é a metade menos paciente da criação. | Что ямы не вырастили в осадного зверя, становится ямным псом; это менее терпеливая половина породы. | 兽坑里没长成攻城巨兽的，就成了兽坑猎犬；那是这窝里更没耐性的一半。 |
| `gk_beastkeeper` | Lleva a los sabuesos con cadenas de la marca y suelta antes de que estés lo bastante cerca. | Mène les molosses aux chaînes de la marche et lâche avant que tu sois assez près. | Conduz os cães em correntes da marca e solta antes que você chegue perto o bastante. | Водит псов на цепях марки и спускает их раньше, чем ты подойдёшь достаточно близко. | 用边境的锁链牵着猎犬，在你靠得够近之前就松手。 |
| `gk_fel_acolyte` | Porta el fuego prestado por primera vez; las manos ya están grises hasta la muñeca. | Porte le feu emprunté pour la première fois ; les mains sont déjà grises jusqu'au poignet. | Carrega o fogo emprestado pela primeira vez; as mãos já estão cinzentas até o pulso. | Несёт заёмный огонь впервые; руки уже серые до запястий. | 第一次持握借来的火；双手已经灰到了手腕。 |
| `gk_ember_warden` | Vigila la pila del altar para que nada caiga dentro y nada salga. | Garde la vasque de la chapelle pour que rien n'y tombe et que rien n'en sorte. | Guarda a bacia da capela para que nada caia dentro e nada saia. | Стережёт чашу в часовне, чтобы ничто в неё не упало и ничто из неё не вышло. | 守着圣坛的火盆，不让任何东西掉进去，也不让任何东西出来。 |
| `gk_crownguard` | La guardia del Rey de Guerra, en placas de la marca reforjadas a medida goblin; el juramento de sangre se le jura a él, no a la horda. | La garde du Roi de guerre, en plates de la marche reforgées à la taille gobeline ; le serment de sang lui est prêté à lui, non à la horde. | A guarda do Rei de Guerra, em placas da marca reforjadas à medida goblin; o juramento de sangue é prestado a ele, não à horda. | Стража Военного короля в латах марки, перекованных под гоблинский рост; кровавая клятва принесена ему, а не орде. | 战王的卫队，身披按哥布林身量重锻的边境板甲；血誓是对他立下的，而不是对战团。 |
| `gk_bannerman` | Lleva un estandarte de la marca repintado con la marca del Heredero y lo sostiene hasta caer; después lo sostiene otro. | Porte une bannière de la marche repeinte de la marque de l'Héritier et la tient jusqu'à tomber ; ensuite, un autre la tient. | Carrega um estandarte da marca repintado com a marca do Herdeiro e o segura até cair; depois, outro o segura. | Несёт знамя марки, замалёванное знаком Наследника, и держит его, пока не падёт; потом его держит другой. | 举着被涂上继承者标记的边境军旗，直到倒下为止；之后换另一个人举。 |

---

## § 7 Die drei Raid-Sets (Set-Satz, Teile-Flavor; Namen in § 0)

### § 7.1 `gk_fire` · Ornat des geliehenen Feuers

**Set-Satz**
- ES: Tejido para quienes portan el fuego y saben lo que cuesta; los intereses los paga el objetivo.
- FR: Tissé pour ceux qui portent le feu et savent ce qu'il coûte ; les intérêts, c'est la cible qui les paie.
- PT-BR: Tecido para quem carrega o fogo e sabe o que ele custa; os juros são pagos pelo alvo.
- RU: Соткано для тех, кто несёт огонь и знает его цену; проценты платит цель.
- ZH: 为持火且深知其代价的人织就；利息由目标来付。

| Teil | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_fire_head` | El dobladillo está chamuscado. La cabeza bajo él nunca lo estuvo. | L'ourlet est roussi. La tête dessous ne l'a jamais été. | A bainha está chamuscada. A cabeça embaixo dela nunca esteve. | Край опалён. Голова под ним никогда не была. | 帽边烧焦了。帽子下面的头从来没有。 |
| `gk_fire_chest` | Tela negra del altar, bordada con marcas de clan, todas ellas saldadas. | Étoffe noire de la chapelle, brodée de marques de clans, toutes réglées. | Tecido negro da capela, bordado com marcas de clã, todas quitadas. | Чёрная ткань из часовни, расшитая клановыми знаками, и все они погашены. | 来自圣坛的黑布，绣满氏族标记，每一个都已结清。 |
| `gk_fire_legs` | Quien porta el fuego no camina deprisa. Tampoco lo necesita. | Qui porte le feu ne marche pas vite. Il n'en a pas besoin. | Quem carrega o fogo não anda depressa. Nem precisa. | Кто несёт огонь, не ходит быстро. Да и незачем. | 持火的人走不快。也不需要快。 |
| `gk_fire_feet` | La ceniza del altar está tibia. Las suelas lo saben. | La cendre de la chapelle est tiède. Les semelles le savent. | A cinza da capela é morna. As solas sabem disso. | Пепел в часовне тёплый. Подошвы это знают. | 圣坛里的灰是温的。鞋底知道。 |
| `gk_fire_hands` | Vendadas hasta el codo, para que nadie vea hasta dónde ha subido el gris. | Bandées jusqu'au coude, pour que personne ne voie jusqu'où le gris est monté. | Enfaixadas até o cotovelo, para que ninguém veja até onde o cinza subiu. | Обмотаны до локтя, чтобы никто не видел, докуда дошла серость. | 一直缠到手肘，这样没人看得见灰色已经爬到了哪里。 |

### § 7.2 `gk_poison` · Pirschgewand der Grubenmeute

**Set-Satz**
- ES: Cuero de las fosas, cortado al patrón de la jauría: huele a sabueso, y el veneno que lleva no es casualidad.
- FR: Cuir des fosses, taillé au patron de la meute : il sent le molosse, et le venin qu'il contient n'est pas un hasard.
- PT-BR: Couro das covas, cortado no padrão da matilha: cheira a cão, e o veneno nele não é acidente.
- RU: Кожа из ям, скроенная по мерке своры: пахнет псиной, и яд в ней не случайность.
- ZH: 来自兽坑的皮革，按猎群的样式裁剪：有股猎犬的气味，里面的毒也绝非偶然。

| Teil | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_poison_head` | La capucha cae baja. La jauría caza con el olfato. | La capuche tombe bas. La meute chasse au flair. | O capuz fica baixo. A matilha caça pelo faro. | Капюшон сидит низко. Свора охотится по нюху. | 兜帽压得很低。猎群靠鼻子打猎。 |
| `gk_poison_chest` | Cosido con cuero de las fosas, las costuras de tendón, las bolsas a medida de glándulas de veneno. | Cousu dans du cuir des fosses, les coutures en tendon, les poches à la taille des glandes à venin. | Costurado em couro das covas, as costuras em tendão, os bolsos no tamanho de glândulas de veneno. | Сшита из ямной кожи, швы из жил, кармашки по размеру ядовитых желёз. | 用兽坑皮革缝制，以筋腱为线，口袋大小正好装毒腺。 |
| `gk_poison_legs` | Cortadas para acechar entre rejas. Las rodillas van dobles. | Taillées pour rôder entre les grilles. Les genoux sont doublés. | Cortadas para espreitar entre grades. Os joelhos são duplos. | Скроены, чтобы красться между решётками. Колени двойные. | 为在铁栅间潜行而裁。膝部加了双层。 |
| `gk_poison_feet` | Las suelas son blandas; en las fosas se oye cada paso que no es de una zarpa. | Les semelles sont souples ; dans les fosses, on entend chaque pas qui n'est pas une patte. | As solas são macias; nas covas, ouve-se cada passo que não é de uma pata. | Подошвы мягкие; в ямах слышен каждый шаг, который не лапа. | 鞋底很软；在兽坑里，凡不是爪子踩出的脚步，都会被听见。 |
| `gk_poison_hands` | Las yemas van descubiertas, para sentir la cuerda y no el veneno. | Le bout des doigts est ouvert, pour sentir la corde et non le venin. | As pontas dos dedos ficam abertas, para sentir a corda e não o veneno. | Кончики пальцев открыты, чтобы чувствовать тетиву, а не яд. | 指尖是露出来的，为了摸得到弓弦，摸不到毒。 |

### § 7.3 `gk_bleed` · Blutschwur der Kronwache

**Set-Satz**
- ES: Placas de la marca de los arsenales, con el juramento de sangre de la Guardia de la Corona grabado por dentro; quien las lleva nunca lo juró, y aguantan de todos modos.
- FR: Plates de la marche tirées des arsenaux, le serment de sang de la Garde de la Couronne frappé à l'intérieur ; qui les porte ne l'a jamais prêté, et elles tiennent quand même.
- PT-BR: Placas da marca dos arsenais, o juramento de sangue da Guarda da Coroa cravado por dentro; quem as veste nunca o jurou, e aguentam mesmo assim.
- RU: Латы марки из арсеналов, с кровавой клятвой Коронной стражи, выбитой изнутри; кто их носит, никогда её не давал, а они держат всё равно.
- ZH: 来自武库的边境板甲，内侧錾着王冠卫队的血誓；穿它的人从未立过这誓，它照样挡得住。

| Teil | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_bleed_head` | La visera es estrecha. La Guardia de la Corona solo ve lo que tiene delante. | La visière est étroite. La Garde de la Couronne ne voit que ce qui se tient devant elle. | A viseira é estreita. A Guarda da Coroa só vê o que está à sua frente. | Забрало узкое. Коронная стража видит только то, что перед ней. | 面甲很窄。王冠卫队只看得见正前方的东西。 |
| `gk_bleed_chest` | El juramento por dentro, la marca del Heredero por fuera sobre el blasón de la marca. | Le serment à l'intérieur, la marque de l'Héritier à l'extérieur, par-dessus le blason de la marche. | O juramento por dentro, a marca do Herdeiro por fora sobre o brasão da marca. | Клятва внутри, знак Наследника снаружи, поверх герба марки. | 誓言在内，继承者的标记在外，压在边境的纹章之上。 |
| `gk_bleed_legs` | Las grebas se acortaron tres veces. Las abolladuras son de antes. | Les grèves ont été raccourcies trois fois. Les bosses datent d'avant. | As grevas foram encurtadas três vezes. Os amassados são de antes. | Поножи укорачивали трижды. Вмятины остались с прежних времён. | 护胫被截短过三次。凹痕是更早以前留下的。 |
| `gk_bleed_feet` | Lo bastante pesados como para que el suelo del Trono del Heredero guarde las marcas. | Assez lourds pour que le sol du Trône de l'Héritier en porte les traces. | Pesados o bastante para que o chão do Trono do Herdeiro guarde as marcas. | Достаточно тяжёлые, чтобы пол Трона Наследника хранил следы. | 重得足以在继承者王座的地面上留下印痕。 |
| `gk_bleed_hands` | El juramento se presta con la mano abierta y se cumple con la cerrada. | Le serment se prête la main ouverte et se tient la main fermée. | O juramento se faz com a mão aberta e se cumpre com a fechada. | Клятву дают открытой рукой, а держат сжатой. | 誓言以张开的手立下，以握紧的手守住。 |

---

## § 8 Unikate (Tooltip-Flavor)

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `gk_tally_dagger` | Con este cuchillo la Maestra de Cuentas toma la prenda; corta lo que no se da por voluntad. | Avec ce couteau, la Maîtresse des comptes prend le gage ; il coupe ce qu'on ne donne pas de bon gré. | Com esta faca a Mestra das Contas toma o penhor; ela corta o que não se dá de boa vontade. | Этим ножом Хранительница счетов берёт залог; он режет то, что не отдают добровольно. | 账务官用这把刀收取质押；它割下那些不肯主动交出的东西。 |
| `gk_tally_focus` | Cada página un asiento, cada asiento un clan; los bordes quemados son los saldados. | Chaque page une écriture, chaque écriture un clan ; les bords brûlés sont ceux qui sont réglés. | Cada página um lançamento, cada lançamento um clã; as bordas queimadas são os quitados. | Каждая страница запись, каждая запись клан; обгоревшие края те, что погашены. | 每一页是一笔账，每一笔账是一个氏族；烧焦的页边，是已经结清的。 |
| `gk_tally_ring` | Quien lleva este sello no paga en la Puerta del Peaje. Le pagan. | Qui porte ce sceau ne paie pas à la Porte du Péage. On le paie. | Quem usa este selo não paga no Portão do Pedágio. É pago. | Кто носит эту печать, не платит у Пошлинных ворот. Ему платят. | 戴着这枚印戒的人在税关之门不用付钱。是别人付给他。 |
| `gk_quarter_maul` | El mazo con el que la marca atrancó sus puertas y los goblins las abrieron. | Le maillet avec lequel la marche a coincé ses portes et les gobelins les ont ouvertes. | O malho com que a marca travou seus portões e os goblins os abriram. | Молот, которым марка заклинила свои ворота, а гоблины их открыли. | 边境曾用这柄巨锤楔死城门，哥布林又用它把门砸开。 |
| `gk_quarter_shield` | El blasón de la marca sigue debajo. Krogg lo hizo repintar, no lijar. | Le blason de la marche est toujours dessous. Krogg l'a fait repeindre, pas meuler. | O brasão da marca ainda está embaixo. Krogg mandou repintar, não lixar. | Герб марки всё ещё под краской. Крогг велел замалевать его, а не стесать. | 边境的纹章还在底下。克罗格让人把它涂掉，而不是磨掉。 |
| `gk_quarter_quiver` | Cada flecha que contiene está contada, y Krogg las quiere de vuelta. | Chaque flèche qu'il contient est comptée, et Krogg les veut en retour. | Cada flecha nela está contada, e Krogg as quer de volta. | Каждая стрела в нём сочтена, и Крогг хочет получить их назад. | 里面每一支箭都登记在册，克罗格还指望收回。 |
| `gk_pit_longbow` | La cuerda zumba como un silbido; lo que responde desde las fosas lleva veneno. | La corde vibre comme un sifflet ; ce qui répond depuis les fosses porte le venin. | A corda zune como um assobio; o que responde das covas carrega veneno. | Тетива гудит, как свист; то, что откликается из ям, несёт яд. | 弓弦嗡鸣如哨；从兽坑里应声而来的东西，带着毒。 |
| `gk_pit_scimitar` | La hoja está forjada a imagen del colmillo de la primera bestia que crió Ushka; desgarra más que corta. | La lame est forgée sur le modèle du croc de la première bête qu'Ushka a élevée ; elle déchire plus qu'elle ne coupe. | A lâmina foi forjada à imagem da presa da primeira fera que Ushka criou; ela rasga em vez de cortar. | Клинок выкован по клыку первого зверя, которого вырастила Ушка; он рвёт, а не режет. | 刀刃仿照乌什卡养大的第一头巨兽的獠牙锻成；它撕扯，而非切割。 |
| `gk_pit_amulet` | El propio collar de Ushka, de las fosas; quien lo lleva pertenece a la jauría, quiera o no. | Le propre collier d'Ushka, venu des fosses ; qui le porte appartient à la meute, qu'il le veuille ou non. | A própria coleira de Ushka, das covas; quem a usa pertence à matilha, queira ou não. | Собственный ошейник Ушки из ям; кто его носит, принадлежит своре, хочет он того или нет. | 乌什卡自己在兽坑戴的项圈；戴上它的人就属于猎群，不管愿不愿意。 |
| `gk_fel_staff` | La llama de su punta no da humo ni sombra. Nunca fue devuelta. | La flamme à son sommet ne fait ni fumée ni ombre. Elle n'a jamais été rendue. | A chama na ponta não dá fumaça nem sombra. Nunca foi devolvida. | Пламя на его навершии не даёт ни дыма, ни тени. Его так и не вернули. | 杖头的火焰没有烟，也没有影子。它从未被归还。 |
| `gk_fel_wand` | Una astilla de hierro divino que la llama prestada lame; solo habla en fuego. | Un éclat de fer divin que lèche la flamme prêtée ; il ne parle qu'en feu. | Uma lasca de ferro divino que a chama emprestada lambe; só fala em fogo. | Щепка божественного железа, которую лижет ссудное пламя; она говорит только огнём. | 一片被出借之火舔舐的神铁；它只用火说话。 |
| `gk_fel_ring` | Zil'gath lo llevó como prenda por el fuego. El Acreedor nunca vino a cobrarlo. | Zil'gath le portait en gage pour le feu. Le Créancier n'est jamais venu le réclamer. | Zil'gath o usava como penhor pelo fogo. O Credor nunca veio buscá-lo. | Зил'гат носила его как залог за огонь. Заимодавец так и не пришёл его забрать. | 吉尔加斯曾以它作火的质押。债主从未来取。 |
| `gk_king_greatsword` | La espada del último capitán de la marca, empuñada a dos manos por un goblin. Nunca se ha quejado. | L'épée du dernier capitaine de la marche, portée à deux mains par un gobelin. Elle ne s'est jamais plainte. | A espada do último capitão da marca, empunhada a duas mãos por um goblin. Nunca reclamou. | Меч последнего капитана марки, который гоблин держит двумя руками. Меч ни разу не пожаловался. | 边境最后一任队长的剑，被一个哥布林双手挥舞。它从没抱怨过。 |
| `gk_king_shortbow` | Lo bastante corto para un goblin, lo bastante duro para la marca; Rakkzul disparaba con él antes de sentarse en un trono. | Assez court pour un gobelin, assez dur pour la marche ; Rakkzul tirait avec avant de s'asseoir sur un trône. | Curto o bastante para um goblin, duro o bastante para a marca; Rakkzul atirava com ele antes de sentar num trono. | Достаточно короткий для гоблина, достаточно тугой для марки; Раккзул стрелял из него, прежде чем сел на трон. | 短得适合哥布林，硬得配得上边境；拉克祖尔坐上王座之前，就用它射箭。 |
| `gk_king_scepter` | Forjado con el herraje de la puerta de la marca, como la corona; ha dado más órdenes que ella. | Forgé dans la ferrure de la porte de la marche, comme la couronne ; il a donné plus d'ordres qu'elle. | Forjado da ferragem do portão da marca, como a coroa; já deu mais ordens do que ela. | Выкован из воротной оковки марки, как и корона; приказов он отдал больше, чем она. | 和王冠一样，用边境城门的铁件锻成；它下过的命令比王冠还多。 |
| `gk_king_cape` | La capa de campaña de la marca, acortada para su nuevo portador; el dobladillo nunca se lavó. | Le manteau de campagne de la marche, raccourci pour son nouveau porteur ; l'ourlet n'a jamais été lavé. | O manto de campanha da marca, encurtado para seu novo dono; a bainha nunca foi lavada. | Походный плащ марки, укороченный под нового владельца; подол так и не стирали. | 边境的战地斗篷，为新主人截短过；下摆从没洗过。 |

---

## § 9 Wochen-Modifikatoren (Name + ein Satz)

| ID | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| `payday` | **Día de paga.** El día de paga la puerta sale más barata y las salas están más llenas: todos los clanes hacen cola para pagar. | **Jour de paie.** Le jour de paie, la porte coûte moins cher et les salles sont plus pleines : chaque clan fait la queue pour payer. | **Dia de Pagamento.** No dia de pagamento o portão é mais barato e os salões mais cheios: todo clã faz fila para pagar. | **День выплат.** В день выплат ворота дешевле, а залы полнее: каждый клан стоит в очереди, чтобы заплатить. | **发饷日。**发饷日的城门更便宜，大厅更拥挤：每个氏族都排队来缴纳。 |
| `borrowed_fire` | **Fuego prestado.** El altar ha prestado a manos llenas esta semana; toda hoja arde, la tuya incluida. | **Feu emprunté.** La chapelle a prêté largement cette semaine ; chaque lame brûle, la tienne comprise. | **Fogo Emprestado.** A capela emprestou a muitos esta semana; toda lâmina queima, a sua inclusive. | **Заёмный огонь.** На этой неделе часовня одалживала щедро; каждый клинок горит, и твой тоже. | **借来的火。**本周圣坛大举出借；每一把刀刃都在燃烧，你的也不例外。 |
| `war_drums` | **Tambores de guerra.** El Rey de Guerra manda tocar los tambores, y Gobkha'raz golpea al compás. | **Tambours de guerre.** Le Roi de guerre fait battre les tambours, et Gobkha'raz frappe en cadence. | **Tambores de Guerra.** O Rei de Guerra manda bater os tambores, e Gobkha'raz golpeia no ritmo. | **Боевые барабаны.** Военный король велит бить в барабаны, и Гобкха'раз бьёт в такт. | **战鼓。**战王下令擂鼓，戈布卡拉兹随着鼓点出击。 |
| `beast_hunger` | **Hambre de las bestias.** Las fosas no han sido alimentadas; lo que te golpea se alimenta de ello. | **Faim des bêtes.** Les fosses n'ont pas été nourries ; ce qui te frappe s'en nourrit. | **Fome das Feras.** As covas não foram alimentadas; o que acerta você se alimenta disso. | **Звериный голод.** Ямы не кормили; всё, что бьёт тебя, этим и кормится. | **兽饥。**兽坑没有喂食；凡是打中你的，都以此为食。 |
| `open_armory` | **Armería abierta.** Krogg entrega placas de la marca a todos; hierro sobre cada uno, y cada hueco en él cuenta doble. | **Arsenal ouvert.** Krogg délivre des plates de la marche à tout le monde ; du fer sur chacun, et chaque défaut compte double. | **Arsenal Aberto.** Krogg entrega placas da marca a todos; ferro em cada um, e cada brecha nele conta em dobro. | **Открытый арсенал.** Крогг выдаёт латы марки всем; железо на каждом, и каждая щель в нём считается вдвойне. | **开放武库。**克罗格向所有人发放边境板甲；人人披铁，而铁甲上的每一道缝隙都算双倍。 |
| `poison_kitchen` | **Cocina de veneno.** Las guardianas de bestias han empapado las hojas en las fosas, y lo envenenado sigue envenenado más tiempo. | **Cuisine à poison.** Les gardiennes des bêtes ont trempé les lames dans les fosses, et ce qui est empoisonné le reste plus longtemps. | **Cozinha de Veneno.** As guardiãs de feras embeberam as lâminas nas covas, e o que está envenenado fica envenenado por mais tempo. | **Ядовитая кухня.** Смотрительницы зверей вымочили клинки в ямах, и что отравлено, остаётся отравленным дольше. | **毒厨。**驯兽女把刀刃浸进了兽坑，中毒的会毒得更久。 |
| `blood_feast` | **Festín de sangre.** La Guardia de la Corona renueva el juramento; las heridas de esta semana cierran despacio, en ambos bandos. | **Festin de sang.** La Garde de la Couronne renouvelle le serment ; les plaies de cette semaine se referment lentement, des deux côtés. | **Festim de Sangue.** A Guarda da Coroa renova o juramento; as feridas desta semana fecham devagar, dos dois lados. | **Кровавый пир.** Коронная стража обновляет клятву; раны этой недели затягиваются медленно, у обеих сторон. | **血宴。**王冠卫队重立血誓；本周的伤口愈合得很慢，双方都是。 |
| `silent_halls` | **Salas silenciosas.** Ni tambor, ni día de paga, ni festín. Gobkha'raz espera, tal como es. | **Salles silencieuses.** Pas de tambour, pas de jour de paie, pas de festin. Gobkha'raz attend, tel qu'il est. | **Salões Silenciosos.** Sem tambor, sem dia de pagamento, sem festim. Gobkha'raz espera, como é. | **Тихие залы.** Ни барабана, ни дня выплат, ни пира. Гобкха'раз ждёт, такой, какой есть. | **寂静大厅。**没有鼓声，没有发饷日，没有血宴。戈布卡拉兹就这样等着。 |

---

## § 10 Reliktstaub (`relic_dust`, description)

- ES: Lo que queda de una pieza hallada cuando se le quita el hierro: polvo que recuerda para qué fue forjado.
- FR: Ce qui reste d'une pièce trouvée quand on lui a pris le fer : une poussière qui se souvient de ce pour quoi elle fut forgée.
- PT-BR: O que resta de uma peça achada quando se tira o ferro dela: pó que se lembra para que foi forjado.
- RU: То, что остаётся от найденной вещи, когда у неё забирают железо: пыль, которая помнит, для чего её ковали.
- ZH: 从战利品上取走铁之后所剩下的东西：一捧还记得自己为何被锻造的尘。

---

## § 11 Rast-Bildschirm

Kopfzeile (falls noch kein Schlüssel existiert; in `translations.ts` wurde am 24.10.2026 keine „Du rastest“-Zeile gefunden): ES „Descansas.“ · FR „Tu te reposes.“ · PT-BR „Você está descansando.“ · RU „Ты отдыхаешь.“ · ZH „你正在休息。“

| Nach | ES | FR | PT-BR | RU | ZH |
|---|---|---|---|---|---|
| Raum 1 (Vrikka) | El libro de deudas queda abierto. Ya nadie cuenta quién entra. | Le livre des dettes reste ouvert. Plus personne ne compte qui entre. | O livro de dívidas fica aberto. Ninguém mais conta quem entra. | Долговая книга лежит раскрытой. Никто больше не считает входящих. | 账簿敞开着。再没有人清点进来的人了。 |
| Raum 2 (Krogg) | Los arsenales están en silencio. El hierro de la marca tiene nuevo custodio: por ahora, tú. | Les arsenaux sont silencieux. Le fer de la marche a un nouveau gardien : pour l'instant, toi. | Os arsenais estão quietos. O ferro da marca tem um novo guardião: por enquanto, você. | В арсеналах тихо. У железа марки новый хранитель: пока что ты. | 武库安静了。边境的铁有了新的看守人，眼下是你。 |
| Raum 3 (Ushka) | Las fosas están vacías. Lo que respiraba en ellas ya no respira. | Les fosses sont vides. Ce qui y respirait ne respire plus. | As covas estão vazias. O que respirava nelas não respira mais. | Ямы пусты. То, что в них дышало, больше не дышит. | 兽坑空了。曾在里面呼吸的东西，不再呼吸。 |
| Raum 4 (Zil'gath) | El fuego pálido sigue ardiendo, sin su guardiana. Tu sombra se mueve. Así debe ser. | Le feu pâle brûle encore, sans sa gardienne. Ton ombre bouge. C'est ainsi que cela doit être. | O fogo pálido ainda arde, sem sua guardiã. Sua sombra se move. É assim que deve ser. | Бледный огонь всё ещё горит, без своей хранительницы. Твоя тень движется. Так и должно быть. | 苍白的火仍在燃烧，没有了守护者。你的影子在动。本该如此。 |
| Raum 5 (Rakkzul) | El trono está vacío, la corona a su lado. Gobkha'raz calla, hasta que llegue el siguiente clan. | Le trône est vide, la couronne à côté. Gobkha'raz se tait, jusqu'à ce que le prochain clan arrive. | O trono está vazio, a coroa ao lado. Gobkha'raz está quieto, até que o próximo clã venha. | Трон пуст, корона лежит рядом. В Гобкха'разе тихо, пока не придёт следующий клан. | 王座空了，王冠就在一旁。戈布卡拉兹归于寂静，直到下一个氏族到来。 |

---

## Hinweise für die Content-Übernahme

1. **Schlüssel-Muster** wie im Bestand: `dungeons:<id>:name`/`:description`, `monsters:<id>:name`/`:description`, `items:<id>:name`/`:description`, `sets:<id>:name`; für Phasen-Ansagen, Rast-Zeilen, Einladung und Modifikatoren vergibt logic-dev/ui-dev die Schlüssel (Vorschlag `raid.gk.*`). Die Namen stehen in § 0, die Texte in § 2–§ 11.
2. **Heroisch/Mythisch:** Die Set- und Unikat-Namen gelten unverändert für `_heroic` und `_mythic`; die Stufe trägt die Rarität, nicht der Name (Hauptdokument § 0).
3. **FR-Typografie:** geschütztes Leerzeichen vor „:“ und „;“ ist im Bestand üblich (siehe `quests:chronicle_04`); hier als normales Leerzeichen geschrieben, der Übernahme-Schritt darf es vereinheitlichen.
4. **ZH-Zahlen und Platzhalter:** keine in diesem Dokument; Interpunktion vollbreit wie im Bestand.
5. **RU-Genus:** Zil'gath ist weiblich; der Titel „Верховный скверномаг“ bleibt generisch maskulin (wie im Bestand „Гоблин-скверномаг“), die Verben stehen weiblich („сражалась“, „носила“).

## Offene Fragen an den Chef

Keine, die den Kanon berühren. Zwei Geschmacksfragen, falls er hinsehen will:

1. **ES „Baluarte de las Brasas“ vs. „Guardián de la Reach“:** Der ES-Bestand nennt das Reach in den Quests „el Confín“, im Onboarding aber „la Reach“. Dieses Dokument folgt den Quests („el Confín“). ui-dev könnte das Onboarding angleichen (außerhalb meines Reviers).
2. **Raum 4 in den fünf Sprachen** heißt Altar / Chapelle / Capela / Часовня / 圣坛 statt wörtlich „Heiligtum“, um nicht mit dem Sanktum des Letzten Götzen zu kollidieren (Gate-L-Entscheid 1 sinngemäß übertragen). Wer das wörtliche „Santuario“ usw. lieber mag, nimmt die Kollision in Kauf.
