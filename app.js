/* ═══════════════════════════════════════════════════════════════════
   🎩 СЕМЬЯ · Telegram Mini App · app.js
   Читает window.MAFIA_STATE (state.js). Шлёт ходы через act() → sendData.
   Работает и без Telegram (file:// превью, ME='carleone').
   ═══════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ───────────────────────  Telegram SDK  ─────────────────────── */
// telegram-web-app.js всегда создаёт window.Telegram.WebApp (даже в обычном браузере),
// поэтому «настоящий» хост определяем по platform !== 'unknown'.
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
const NATIVE = !!(tg && tg.platform && tg.platform !== 'unknown');
if (tg){
  try{
    tg.ready(); tg.expand && tg.expand();
    if (NATIVE){
      tg.setHeaderColor && tg.setHeaderColor('#0D0B08');
      tg.setBackgroundColor && tg.setBackgroundColor('#0D0B08');
      tg.disableVerticalSwipes && tg.disableVerticalSwipes();
    }
  }catch(e){ /* стаб вне Telegram — тихо */ }
}

/* ───────────────────────  Идентификация игрока  ─────────────────────── */
const MAP = {};                       // <tg_id>: 'carleone' | 'sklyarov'  (заполнит бэк)
const uid = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id;
const qsMe = new URLSearchParams(location.search).get('me');   // dev-превью: ?me=sklyarov
const ME  = (uid && MAP[uid]) || (['carleone','sklyarov'].includes(qsMe) ? qsMe : 'carleone'); // дефолт = Лео
const OPP = ME === 'carleone' ? 'sklyarov' : 'carleone';

const S = window.MAFIA_STATE || null;
const me  = S && S.players ? S.players[ME]  : null;
const opp = S && S.players ? S.players[OPP] : null;
const SIDE = me ? me.side : 'g';                    // 'g' | 's'
document.documentElement.classList.add(SIDE === 'g' ? 'me-g' : 'me-s');
document.body.classList.add(SIDE === 'g' ? 'me-g' : 'me-s');

/* ───────────────────────  Канон-константы (из движка/WORLD, не выдумка)  ─────────────────────── */
const MUSCLE = ['topgoal','block1','block2','sport'];
const TITLE_STEPS = [                               // имя, порог респекта, лимит районов
  ['Пешка',0,3],['Шестёрка',15,4],['Бригадир',35,5],
  ['Смотрящий',60,6],['Положенец',90,7],['Вор',130,9],['Крёстный отец',null,null]
];
const DIST = {  // id → короткое имя (для гекса) · базовый доход · флейвор (WORLD)
  port:['Порт',700,'Причалы, контейнеры, ржавые краны. Отсюда весь левый груз растекается по городу.'],
  tsum:['ЦУМ',600,'Центральный универмаг: витрины, барыги, «фирма» из-под полы. Сердце торговли.'],
  rynok:['Толчок',500,'Центральный рынок. Хурма, кроссы, ножи под прилавком. Живые деньги каждый день.'],
  bank:['Госбанк',900,'Мраморный вход, львы у дверей. В подвале — сейф Старого Дона.'],
  cosmos:['Космос',800,'Неон, рулетка, катраны. Самая жирная точка города — и самая громкая.'],
  avto:['Гаражи',300,'Кооперативные гаражи: сервис днём, разбор угнанных ночью. Дёшево и сердито.'],
  club:['Малина',650,'Ночной клуб, малиновые диваны, коньяк рекой. Где гуляют — там и решают.'],
  azs:['АЗС',400,'Сеть заправок на выездах. Бензин, солярка, «недолив по-братски». Стабильный поток.'],
  lombard:['Ломбард',250,'Золото, «котлы», серебро под 10% в день. Маленький, но всегда при деньгах.'],
  sklad:['Промзона',350,'Заброшенные цеха и склады. Где хранят то, что нельзя показывать.'],
  vokzal:['Вокзал',550,'Узел всех дорог. Общак ходит вагонами, катраны в зале ожидания.'],
  telegraf:['Телеграф',300,'Почтамт и переговорный пункт. Кто держит связь — держит уши города.'],
  hotel:['Интурист',450,'Гостиница для «нужных людей». Номера, где заключают то, о чём молчат.'],
  verf:['Верфь',500,'Судоремонт, сухие доки, выход к воде мимо всех глаз. Ключ ко всему городу.']
};
const BOSS = {  // id → портрет · «держит» · лор · трофей
  buhgalter:['boss-buhgalter','Госбанк','Тридцать лет вёл чёрную кассу Дона. Тихий старик в нарукавниках: «Мальчики, деньги счёт любят». Мягкий — разминка первой недели.','«Чистые книги»: +10% к доходу навсегда + Госбанк.'],
  prokuror:['boss-prokuror','закон','Не бандит. Хуже — власть с корочкой. Шеф Комиссии, что кошмарит Гавань облавами. Лапу не берёт из принципа.','Неделя без облав + респект от города.'],
  sedoy:['boss-sedoy','Вокзал','Коронованный вор старой формации. Три ходки, чтит понятия, презирает беспредел новых. Свалить — это про право, а не про деньги.','Вокзал + лейтенант бесплатно.'],
  port_boss:['boss-port','Верфь','Последний и главный. Через его причал шёл весь левый груз южного берега. Кто держит порт — держит город. Финальный босс месяца.','Верфь + «ключ от города»: +15% к финалу.']
};
const LTS = {
  consigliere:['Коммерс',1000,'Районы под крышу −25%. Билд «Хозяйственник».'],
  kostolom:['Костолом',1200,'+10% в стрелке, вскрывает 2 форта. Билд «Таран».'],
  advokat:['Адвокат',1000,'Первая облава недели проходит мимо. Билд «Тихая вода».'],
  medvezhatnik:['Медвежатник',1200,'+15% к шансу на деле. Билд «Форточник».'],
  razvedchik:['Разведчик',1500,'Ходы соперника видишь в сводке. Билд «Шахматист».']
};
const HEISTS = {
  quiet:['Тихое','шанс 90% · −1⚡','+$300','🥷'],
  bold:['Дерзкое','шанс 65% · −2⚡','+$800 · +2🎖','🔫'],
  crazy:['Безумное','шанс 35% · −3⚡ · взнос $300','+$2000 · +5🎖','🚂']
};
const VOWS = ['Сахар','Скролл/тикток','Алкоголь','Кофе после 16','Сериалы ночью','Фастфуд'];
const QUOTES = [
  'Держи режим близко, а телефон — ещё дальше.',
  'Общак сам не растёт. Растёт тот, кто встал раньше города.',
  'Слово Дона — кремень. Кто им бросается, тот барыга.',
  'В этом городе две валюты: деньги и дисциплина. Вторая дороже.',
  'Кто держит себя — тот держит город.',
  'Стрелку выигрывает не тот, кто громче, а тот, кто не сорвался двое суток.',
  'Босса не берут наскоком. Он ломается перед тем, кто ходит как часы.',
  'Пропустил день — город запомнил. Город помнит всё.',
  'Настоящий Дон не тот, у кого больше денег, а тот, кто ни разу не соврал Семье.',
  'Шампанское наливают тем, кто закрыл день на сотку. Остальным — вода из-под крана.',
  'Каждый вечер ты либо строишь империю, либо раздаёшь её по кускам. Третьего нет.',
  'Обмануть можно соперника, бота и весь Новый Порт. Себя в зеркале — не выйдет.',
  'Сходку решают не понты последнего дня, а тридцать честных дней до неё.'
];

/* ───────────────────────  SVG-иконостиль (24×24, currentColor)  ─────────────────────── */
const svg = (b, w='1.6') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
const I = {
  coin: svg('<rect x="2.5" y="6" width="19" height="12" rx="1.6"/><circle cx="12" cy="12" r="2.6"/><path d="M5.6 9.3v5.4M18.4 9.3v5.4"/>','1.75'),
  star: svg('<path d="M12 2.6 14.9 8.6 21.4 9.4 16.7 14 17.9 20.6 12 17.4 6.1 20.6 7.3 14 2.6 9.4 9.1 8.6Z"/>'),
  fist: svg('<path d="M4 8.4C4 7 5.1 6 6.5 6h11C18.9 6 20 7 20 8.4c0 1.1-.8 2-1.9 2.3v3.1c0 2.2-1.8 4-4 4H7.9C5.7 17.8 4 16 4 13.9Z"/><circle cx="7.5" cy="8.7" r="1.2" fill="currentColor" stroke="none"/><circle cx="11" cy="8.7" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="8.7" r="1.2" fill="currentColor" stroke="none"/>'),
  bolt: svg('<path d="M13 2 4.5 13.2h6.2L10 22l8.8-11.4H12.4Z" fill="currentColor" stroke="none"/>'),
  fedora: svg('<path d="M6 13c0-3.2 1.2-7 6-7s6 3.8 6 7"/><path d="M3 13.4c0 1 4 2 9 2s9-1 9-2c0-.8-1.2-1.3-3-1.6"/><path d="M8 12.1c1.5.5 6.5.5 8 0" opacity=".55"/>'),
  champ: svg('<path d="M9 3h6l-.6 7a2.4 2.4 0 0 1-4.8 0Z"/><path d="M12 14.7v5.3M9.6 20.4h4.8M9.3 6.6h5.4"/>'),
  rose: svg('<path d="M12 11c-2.2 0-3.2-1.6-3.2-3.1C8.8 6.3 10.1 5 12 5s3.2 1.3 3.2 2.9C15.2 9.4 14.2 11 12 11Z"/><path d="M9.2 8.4C7.6 8.2 6.5 9 6.3 10.4c-.2 1.6 1 2.9 2.9 3M14.8 8.4c1.6-.2 2.7.6 2.9 2 .2 1.6-1 2.9-2.9 3"/><path d="M12 11v8M12 19c-1.6 0-2.6-1-2.8-2.4M12 16.2c1.4 0 2.3-.8 2.6-2"/>'),
  building: svg('<path d="M4 21V6.5L12 3l8 3.5V21"/><path d="M4 21h16M9 21v-4h6v4"/><path d="M8 9h1.5M14.5 9H16M8 13h1.5M14.5 13H16"/>'),
  knife: svg('<path d="M3 20 14 9l1.8 1.8L5 22Z" fill="currentColor" fill-opacity=".14"/><path d="M3 20 14 9l1.8 1.8L5 22Z"/><path d="M14 9l3.4-3.4c1-1 2.6-1 3.6 0s1 2.6 0 3.6L17.6 12.6Z"/>'),
  target: svg('<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.4"/><path d="M12 1.4v3.6M12 19v3.6M1.4 12h3.6M19 12h3.6"/>'),
  lips: svg('<path d="M4 11c2-2.4 4.6-3.6 8-3.6S18 8.6 20 11c-2 2.2-4.6 3.4-8 3.4S6 13.2 4 11Z" fill="currentColor" fill-opacity=".14"/><path d="M4 11c2-2.4 4.6-3.6 8-3.6S18 8.6 20 11c-2 2.2-4.6 3.4-8 3.4S6 13.2 4 11Z"/><path d="M4 11h16M12 7.4V4.4M9 15v2.6M15 15v2.6"/>'),
  bust: svg('<circle cx="12" cy="7" r="3.4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/><path d="M9.5 20l1-2.2h3l1 2.2"/>'),
  mask: svg('<path d="M3.5 8c3-1 5.6-1 8.5-1s5.5 0 8.5 1c0 5-2.5 8-4.5 8-1.5 0-2-1.4-4-1.4S8 15.4 6.5 15.4C4.5 15.4 3.5 12 3.5 8Z"/><circle cx="8.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/>'),
  card: svg('<rect x="4.5" y="3" width="15" height="18" rx="2.2"/><path d="M12 7.5 14 11l-2 3.5L10 11Z" fill="currentColor" stroke="none"/><path d="M8 6.5v.01M16 17.4v.01"/>'),
  flame: svg('<path d="M12 3c.6 3-1.8 4-1.8 6.4 0 1.2.9 2 .9 2s-2.4-.4-2.4-2.8C6.4 10.4 5.5 12.6 5.5 15c0 3.6 2.9 6 6.5 6s6.5-2.6 6.5-6.2c0-4.6-3.6-6.6-3.6-9.4 0-1.2.4-2 .4-2-2 .4-3.6 2-3.8 3.4Z"/>'),
  shield: svg('<path d="M12 3 5 5.6v5.2C5 15.6 8 19 12 20.6 16 19 19 15.6 19 10.8V5.6Z"/><path d="M9.2 11.8 11.2 14 15 10" stroke-width="1.8"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none"/>'),
  anchor: svg('<circle cx="12" cy="4.5" r="2"/><path d="M12 6.5V21M6 12H4c0 4.4 3.6 8 8 8s8-3.6 8-8h-2"/><path d="M8.4 9.6H15.6"/>'),
  crown: svg('<path d="M4 8l3.2 3.4L12 5l4.8 6.4L20 8l-1.4 10H5.4Z"/><path d="M5.4 18h13.2" opacity=".6"/>'),
  clock: svg('<circle cx="12" cy="13" r="7.6"/><path d="M12 9v4l2.6 1.8M9 2.5h6"/>'),
  check: svg('<path d="M4.5 12.5 9.5 17.5 20 6.5" stroke-width="2.4"/>'),
  info: svg('<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5M12 7.6v.01" stroke-width="1.9"/>'),
  map: svg('<path d="M9 4 3.5 6.2v14L9 18l6 2.2 5.5-2.2v-14L15 6 9 4Z"/><path d="M9 4v14M15 6v14.2"/>'),
  idcard: svg('<rect x="3" y="5" width="18" height="14" rx="2.4"/><circle cx="8.5" cy="11" r="2.3"/><path d="M5.6 16.2c.5-1.6 1.6-2.4 2.9-2.4s2.4.8 2.9 2.4M14 9.5h4M14 12.5h4M14 15.5h2.5"/>'),
  dice: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3.4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/>'),
  scroll: svg('<path d="M6 3h10a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7"/><path d="M18 18a3 3 0 0 0 3-3h-5M6 3a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3M8.5 8h6M8.5 12h6"/>'),
  crest: svg('<path d="M12 2.5 20 5v6.5c0 5.2-3.4 8.8-8 10.5-4.6-1.7-8-5.3-8-10.5V5Z"/><path d="M12 6.5 13.4 9.6 16.8 10 14.3 12.4 15 15.8 12 14.1 9 15.8 9.7 12.4 7.2 10 10.6 9.6Z" fill="currentColor" fill-opacity=".18"/>','1.7'),
  plus: svg('<path d="M12 5v14M5 12h14" stroke-width="2"/>')
};

/* ───────────────────────  Хелперы  ─────────────────────── */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const fmt = n => (n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU').replace(/,/g,' ');
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

const HAP = { checkin:'success', buy:'medium', upgrade:'medium', fort:'medium', hire:'medium',
  strelka:'heavy', heist:'heavy', boss:'heavy', pass:'soft', omerta:'medium' };
function hap(t){ if(!tg||!tg.HapticFeedback) return;
  const H=tg.HapticFeedback;
  try{
    if(['success','warning','error'].includes(t)) H.notificationOccurred(t);
    else if(t==='selection') H.selectionChanged();
    else H.impactOccurred(t);
  }catch(e){}
}
const DEVMSG = { buy:'Район взят', upgrade:'Апгрейд', fort:'Район укреплён', strelka:'Стрелка забита',
  hire:'Лейтенант в деле', heist:'Дело пошло', boss:'Удар по боссу', pass:'Пас — копишь',
  checkin:'Вечер подбит', omerta:'Слово принято' };

/* Главный мост к движку */
function act(a, d, extra){
  const payload = Object.assign({ a, d: (d===undefined?null:d), me: ME }, extra||{});
  const str = JSON.stringify(payload);
  hap(HAP[a] || 'medium');
  if (NATIVE && tg.sendData){
    try { tg.sendData(str); } catch(e){ console.warn(e); toast('Семья не услышала — повтори','err'); }
  } else {
    console.log('ACT →', str);
    toast((DEVMSG[a]||'Ход') + ' · dev', 'ok');
  }
}
function confirmAct(msg, onOk){
  if (NATIVE && tg.showConfirm){ tg.showConfirm(msg, ok=>{ if(ok) onOk(); }); }
  else onOk();
}

/* Транзиент-тост */
let toastT;
function toast(msg, type){
  const box = $('#toaster'); if(!box) return;
  const el = document.createElement('div');
  el.className = 't-toast' + (type?(' '+type):'');
  el.textContent = msg; box.appendChild(el);
  clearTimeout(toastT);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(8px)'; setTimeout(()=>el.remove(),260); }, 2400);
}

/* Кольцо-прогресс */
function ring(pct, size){
  const r = size/2 - 4, c = 2*Math.PI*r, off = c*(1-clamp(pct,0,100)/100);
  return `<div class="ring" style="--rs:${size}px">
    <svg viewBox="0 0 ${size} ${size}">
      <circle class="ring__bg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="4.5"/>
      <circle class="ring__fg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="4.5"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </svg><div class="ring__txt">${pct}<small>%</small></div></div>`;
}

/* Ripple + tap-scale */
document.addEventListener('pointerdown', e=>{
  const t = e.target.closest('.btn, .tile, .vow-opt, .seg button, .filters button');
  if(!t) return;
  const rect = t.getBoundingClientRect(), d = Math.max(rect.width,rect.height);
  const rp = document.createElement('span'); rp.className='ripple';
  rp.style.width = rp.style.height = d+'px';
  rp.style.left = (e.clientX-rect.left-d/2)+'px';
  rp.style.top  = (e.clientY-rect.top -d/2)+'px';
  t.appendChild(rp); setTimeout(()=>rp.remove(),520);
}, {passive:true});

/* ───────────────────────  Локальное UI-состояние  ─────────────────────── */
let SCREEN = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || 'hod';
const SCREENS = ['karta','dossier','hod','boss','chron'];
if (!SCREENS.includes(SCREEN)) {
  SCREEN = ({karta:'karta',boss:'boss',hronika:'chron',resursy:'dossier',omerta:'dossier'}[SCREEN]) || 'hod';
}
const committed = !!(me && me.today_done && me.today_done.length);
let checkSet = new Set(me && me.today_done ? me.today_done : []);
let omertaHeld = true;
let vowDraft = '';
let chronFilter = 'all';

/* ───────────────────────  ШАПКА  ─────────────────────── */
function fillHeader(){
  if(!S){ return; }
  $('#top-crest').innerHTML = I.crest;
  const clanName = SIDE==='g' ? 'Карлеоне' : 'Скляровские';
  $('#top-name').textContent = clanName;
  $('#top-side').textContent = SIDE==='g' ? 'Волк с Уолл-стрит' : 'Бригада · шрам';
  $('#top-day').innerHTML = `ДЕНЬ <i>${S.meta.day}</i>/${S.meta.days}`;
  $('#top-week').textContent = `неделя ${S.meta.week} · ${S.meta.dateStr}`;

  $('#top-chips').innerHTML =
    chip('money', I.coin, fmt(me.obshak)) +
    chip('resp',  I.star, me.respect) +
    chip('musc',  I.fist, me.muscles);
  $$('#top-chips .chip').forEach(c=>c.addEventListener('click',()=>{ hap('selection'); go('dossier'); }));

  // босс-полоса + омерта-точка
  let strip = '';
  const b = S.boss;
  if (b && !b.dead){
    const pct = Math.round(b.hp/b.max*100);
    strip += `<div class="bossmini" data-tap="go" data-arg="boss">
      <span class="bossmini__ico">${I.fedora}</span>
      <span class="bossmini__bar"><i style="width:${pct}%"></i></span>
      <span class="bossmini__n">${b.hp}/${b.max}</span></div>`;
  } else {
    strip += `<div class="bossmini" data-tap="go" data-arg="boss">
      <span class="bossmini__ico">${I.fedora}</span>
      <span class="bossmini__n" style="flex:1">на неделе тихо</span></div>`;
  }
  const om = me.omerta;
  const omState = om.broken ? 'is-broken' : '';
  strip += `<div class="omdot ${omState}" data-tap="go" data-arg="dossier" title="Омерта">${I.lips}</div>`;
  const stripEl = $('#top-strip'); stripEl.innerHTML = strip;
}
function chip(k, icon, val){ return `<div class="chip chip--${k}">${icon}<span>${val}</span></div>`; }

/* ───────────────────────  НАВИГАЦИЯ  ─────────────────────── */
function fillNav(){
  const items = [
    ['karta', I.map,  'Карта'],
    ['dossier', I.idcard, 'Досье'],
    ['hod', I.dice, 'Ход'],
    ['boss', I.fedora, 'Босс'],
    ['chron', I.scroll, 'Хроника']
  ];
  const canBoss = S.boss && !S.boss.dead && me.today>=85 && me.muscles>=1;
  $('#nav').innerHTML = items.map(([id,ic,lbl])=>{
    const on = SCREEN===id ? 'is-active':'';
    if(id==='hod'){
      const badge = !committed ? '<span class="nav__badge"></span>':'';
      return `<button class="nav__item nav__cta ${on}" data-tap="nav" data-arg="hod">
        ${badge}<span class="disc">${ic}</span><span class="lbl">${lbl}</span></button>`;
    }
    const badge = (id==='boss'&&canBoss) ? '<span class="nav__badge"></span>':'';
    return `<button class="nav__item ${on}" data-tap="nav" data-arg="${id}">${badge}${ic}<span>${lbl}</span></button>`;
  }).join('');
}

/* ═══════════════════════  РОУТЕР ЭКРАНОВ  ═══════════════════════ */
function go(id){ if(SCREEN===id && id!=='hod') return; SCREEN=id; render(); window.scrollTo(0,0); }
function render(){
  fillHeader(); fillNav();
  const m = $('#screen');
  const map = { karta:renderKarta, dossier:renderDossier, hod:renderHod, boss:renderBoss, chron:renderChron };
  m.innerHTML = `<div class="screen">${(map[SCREEN]||renderHod)()}</div>`;
  syncMainButton();
}

/* ───────────────────────  1 · КАРТА (ночной город)  ─────────────────────── */
// Мини-вывеска-здание для каждого района (emoji, без зависимости от картинок)
const BUILD = {
  port:'⚓', tsum:'🏬', rynok:'🛒', bank:'🏦', cosmos:'🎰', avto:'🔧',
  club:'🍸', azs:'⛽', lombard:'💍', sklad:'🏭', vokzal:'🚉', telegraf:'📡', hotel:'🏨', verf:'🛳️'
};
function plotOwnerClass(d){
  if(d.lock && !d.owner) return 'plot--locked';
  if(!d.owner) return 'plot--free';
  return S.players[d.owner].side==='g' ? 'plot--gold' : 'plot--rose';
}
function renderKarta(){
  const ds = S.districts;
  const mine = ds.filter(d=>d.owner===ME).length;
  const opps = ds.filter(d=>d.owner===OPP).length;
  const free = ds.filter(d=>!d.owner).length;

  const plots = ds.map(plotTile).join('');

  return `
  <div class="mini-count">
    <b class="c-me"><span>${mine}</span><em>Твои</em></b>
    <b class="c-opp"><span>${opps}</span><em>${SIDE==='g'?'Скляровские':'Карлеоне'}</em></b>
    <b class="c-free"><span>${free}</span><em>Ничейных</em></b>
  </div>
  <div class="section-h">Ночной город<div class="fill"></div></div>
  <div class="city">
    <div class="city__grid">${plots}</div>
  </div>
  <div class="legend">
    <b><i class="lg-gold"></i>Карлеоне</b>
    <b><i class="lg-rose"></i>Скляровские</b>
    <b><i class="lg-free"></i>Ничьё</b>
    <b><i class="lg-lock"></i>Под смотрящим 🔒</b>
  </div>`;
}
function plotTile(d){
  const locked = d.lock && !d.owner;
  const cls = plotOwnerClass(d);
  const meta = DIST[d.id] || [d.n, d.income, ''];
  const ico = BUILD[d.id] || '🏙️';
  const inc = locked
    ? `<span class="plot__lockinc">${I.lock}</span>`
    : `${I.coin}<b>${fmt(d.income)}</b>`;
  let pips = '';
  for(let i=1;i<d.level;i++) pips += '<i></i>';
  for(let i=0;i<d.fort;i++)  pips += '<i class="fort"></i>';
  const mine = d.owner===ME ? 'is-mine' : '';
  const lockBadge = locked ? '<span class="plot__lockbadge">🔒</span>' : '';
  return `<button class="plot ${cls} ${mine}" data-tap="dist" data-arg="${d.id}">
    ${lockBadge}
    <span class="plot__roof"></span>
    <span class="plot__ico">${ico}</span>
    <span class="plot__name">${meta[0]}</span>
    <span class="plot__inc">${inc}</span>
    <span class="plot__pips">${pips}</span>
  </button>`;
}

/* ───────────────────────  2 · ДОСЬЕ (персонаж)  ─────────────────────── */
function renderDossier(){
  const portrait = SIDE==='g' ? 'don-carleone' : 'don-sklyarov';
  const frame = SIDE==='g' ? 'dossier' : 'dossier--rose';
  const role = SIDE==='g' ? 'Волк с Уолл-стрит' : 'Лицо со шрамом';
  const idx = me.title_idx;

  // лестница
  const ladder = TITLE_STEPS.map((t,i)=>{
    const st = i<idx?'done':(i===idx?'cur':'');
    const req = t[1]===null ? `<span class="ladder__crown">${I.crown}</span>`
      : `<span class="ladder__req">${t[1]}🎖 · лим ${t[2]}</span>`;
    return `<div class="ladder__row ${st}"><div class="ladder__line"></div>
      <div class="ladder__node"></div><div class="ladder__name">${t[0]}</div>${req}</div>`;
  }).join('');

  // подсказка до следующего
  let hint='';
  if(idx<5){ const nx=TITLE_STEPS[idx+1]; const dd=Math.max(0,nx[1]-me.respect);
    hint=`<div class="next-hint">До «${nx[0]}»: <b>+${dd}🎖</b> → лимит районов <b>${nx[2]}</b></div>`;
  } else if(idx===5){ hint=`<div class="next-hint">Вершина воровской лестницы взята. <b>Крёстный отец</b> — только победой на Большой сходке.</div>`; }

  // лейтенант
  const ltCard = me.lieutenant
    ? `<div class="lt-card"><div class="lt-card__ico">${I.bust}</div>
        <div><b>${me.lieutenant}</b><span>${ltDesc(me.lieutenant)}</span></div></div>`
    : `<div class="empty-slot">Человека рядом нет. Один в поле не воин — найми лейтенанта в фазе хода.</div>`;

  // артефакты
  const arts = (me.artifacts&&me.artifacts.length)
    ? `<div class="chips-wrap">${me.artifacts.map(a=>`<span class="art-chip">${I.anchor}${a}</span>`).join('')}</div>`
    : `<div class="empty-slot">Сундук пуст. Хочешь козырь — лови контрабанду в среду.</div>`;

  // омерта строка
  const om = me.omerta;
  const omDots = dotsRow(om, SIDE);
  const omStatus = om.broken ? 'слово нарушено — город помнит'
    : om.vow ? `${om.held}/7 держит` : 'обет недели не дан';

  // vs
  const vs = `<div class="vs">
    <div class="vs__side me"><em>Ты</em><b>${fmt(S.influence[ME])}</b><span>${me.title}</span></div>
    <div class="vs__mid">VS</div>
    <div class="vs__side op"><em>${SIDE==='g'?'Скляровские':'Карлеоне'}</em><b>${fmt(S.influence[OPP])}</b><span>${opp.title}</span></div>
  </div>`;

  return `
  <div class="${frame}" style="margin-top:4px">
    <div class="dossier__stamp">ДОН</div>
    <div class="hero">
      <div class="hero__portrait"><img src="assets/${portrait}.png" alt="">
        <div class="hero__ring">${ring(me.today,54)}</div></div>
      <div class="hero__info">
        <div class="hero__title-lbl">${me.title}</div>
        <div class="hero__name">${SIDE==='g'?'Лео Карлеоне':'Скляровский'}</div>
        <div class="hero__role">«${role}»</div>
        <div class="hero__infl"><em>Влияние</em><b>${fmt(S.influence[ME])}</b></div>
        <div class="combo">${I.flame} серия ${me.streak}</div>
      </div>
    </div>
  </div>

  <div class="section-h">Титул<div class="fill"></div></div>
  <div class="card"><div class="ladder">${ladder}</div>${hint}</div>

  <div class="section-h">Правая рука<div class="fill"></div></div>
  <div class="card">${ltCard}</div>

  <div class="section-h">Козыри<div class="fill"></div></div>
  <div class="card">${arts}</div>

  <div class="section-h">Слово Дона<div class="fill"></div></div>
  <div class="card" data-tap="omerta-open" style="cursor:pointer">
    <div class="between" style="margin-bottom:12px">
      <div><div class="omcard__vow">${om.vow?('Неделя без «'+om.vow+'»'):'Обет не дан'}</div>
        <div class="omcard__status" style="margin-top:4px">${omStatus}</div></div>
      <div style="color:var(--me)">${I.lips.replace('<svg','<svg width="24" height="24"')}</div>
    </div>
    ${omDots}
    <div class="next-hint" style="margin-top:12px">Сдержанных слов: <b>${om.kept_weeks}</b> · на Сходке каждое = +100 влияния</div>
  </div>

  <div class="section-h">Расклад<div class="fill"></div></div>
  ${vs}`;
}
function ltDesc(name){ for(const k in LTS){ if(LTS[k][0]===name) return LTS[k][2]; } return 'в деле'; }
function dotsRow(om, side){
  let d='';
  for(let i=0;i<7;i++){
    const held = i<om.held;
    const broke = om.broken && i===om.held;
    d += `<i class="${held?'held':''} ${broke?'broke':''}"></i>`;
  }
  return `<div class="omcard ${side==='g'?'g':'s'}" style="border:0;padding:0;background:none"><div class="dots">${d}</div></div>`;
}

/* ───────────────────────  3 · ХОД  ─────────────────────── */
function computeTally(){
  const cnt = checkSet.size, total=14;
  const pct = Math.round(cnt/total*100);
  const mult = S.meta.day > (S.meta.days-7) ? 1.5 : 1;
  let money = Math.floor(cnt*100*mult) + (pct===100?Math.floor(300*mult):0);
  let resp = pct===100?3 : pct>=85?2 : 0;
  const streak = pct>=85 ? (me.streak+1) : 0;
  const MILES={3:5,7:10,14:20,30:50};
  if(MILES[streak]) resp += MILES[streak];
  let musc=0; checkSet.forEach(id=>{ if(MUSCLE.includes(id)) musc++; }); musc=Math.min(3,musc);
  return {pct,money,resp,musc,streak,mult};
}
function renderHod(){
  const t = computeTally();
  const mult = S.meta.day > (S.meta.days-7);

  // ── Акт A ──
  let actA;
  if(committed){
    actA = `<div class="card done-summary">
      ${ring(me.today,88)}
      <h3>День ${S.meta.day} закрыт · ${me.today}%</h3>
      <p>${me.today>=100?'Чисто отработал. Общак полон, район уважает.':me.today>=50?'Крепко. Не сотка, но город при своих.':'Крыша сегодня спит — доход спит. Завтра поднимайся.'}</p>
    </div>`;
  } else {
    const items = S.meta.protocol.map(([id,txt])=>{
      const on = checkSet.has(id)?'on':'';
      const mus = MUSCLE.includes(id) ? `<span class="proto__mus">${I.bolt}</span>` : '';
      return `<button class="proto__item ${on}" data-tap="proto" data-id="${id}">
        <span class="proto__box">${I.check}</span>
        <span class="proto__txt">${txt}</span>${mus}</button>`;
    }).join('');

    // слово дона
    let vow='';
    const om=me.omerta;
    if(om.vow && !om.broken){
      vow = `<div class="vow-block">
        <div class="vow-block__q">Слово недели: <b>без «${om.vow}»</b>. Сегодня держал?</div>
        <div class="seg" id="vowseg">
          <button class="yes ${omertaHeld?'on':''}" data-tap="vow-hold" data-arg="yes">💪 Держу</button>
          <button class="no ${!omertaHeld?'on':''}" data-tap="vow-hold" data-arg="no">🙈 Сорвался</button>
        </div></div>`;
    }

    actA = `
      <div class="hod-head">
        <div id="hod-ring">${ring(t.pct,66)}</div>
        <div class="hod-head__t"><b>Понятия дня · ${checkSet.size}/14</b>
          <span>Отметь по-честному. Каждый пункт = $100 в общак. Сотка — бонус и крит по боссу.</span></div>
      </div>
      ${mult?`<div class="lastweek">${I.flame} Камбэк-неделя ×1.5</div>`:''}
      <div class="proto">${items}</div>
      ${vow}
      ${tally(t)}`;
  }

  // ── Акт B ──
  const actB = renderPhase();

  return `
  <div class="section-h">Понятия дня<div class="fill"></div></div>
  ${actA}
  <div class="section-h">Фаза хода<div class="fill"></div></div>
  ${actB}`;
}
function tally(t){
  return `<div class="tally" id="tally">
    <div class="tally__nums">
      <div class="n money"><b>+$${fmt(t.money)}</b><em>общак</em></div><div class="tally__sep"></div>
      <div class="n resp"><b>+${t.resp}</b><em>респект</em></div><div class="tally__sep"></div>
      <div class="n musc"><b>+${t.musc}</b><em>мускулы</em></div><div class="tally__sep"></div>
      <div class="n streak"><b>🔥${t.streak}</b><em>серия</em></div>
    </div>
    ${NATIVE?'':`<button class="btn btn--primary" data-tap="checkin">${I.check} Отметить день · ${t.pct}%</button>`}
  </div>`;
}
function renderPhase(){
  // VS-скорборд
  const vs = `<div class="vs" style="margin-bottom:12px">
    <div class="vs__side me"><em>Ты · дней ${S.score[ME]}</em><b>${fmt(S.influence[ME])}</b><span>влияние</span></div>
    <div class="vs__mid">VS</div>
    <div class="vs__side op"><em>дней ${S.score[OPP]}</em><b>${fmt(S.influence[OPP])}</b><span>${SIDE==='g'?'Скляровские':'Карлеоне'}</span></div>
  </div>`;

  const ds=S.districts;
  const limit=me.limit, owned=me.districts;
  const freeD = ds.filter(d=>!d.owner&&!d.lock);
  const cheapFree = freeD.length?Math.min(...freeD.map(d=>d.price)):0;
  const upgradable = ds.filter(d=>d.owner===ME&&d.level<3);
  const fortable = ds.filter(d=>d.owner===ME&&d.fort<2);
  const oppD = ds.filter(d=>d.owner===OPP);
  const bossAlive = S.boss && !S.boss.dead;
  const slotFree = !me.lieutenant || me.title==='Вор';

  const tiles = [
    tile('buy', I.building,'Взять район', freeD.length?('от $'+fmt(cheapFree)):'—',
      owned>=limit?('Лимит '+limit+' районов'):!freeD.length?'Город поделён':me.obshak<cheapFree?('Нужно ещё $'+fmt(cheapFree-me.obshak)):''),
    tile('upgrade', I.shield,'Апгрейд','$400 / $800',
      !upgradable.length?'Нечего качать':me.obshak<400?'Нужно $400':'', 'up'),
    tile('fort', I.shield,'Укрепить','$300',
      !fortable.length?'Всё укреплено':me.obshak<300?'Нужно $300':'', 'up'),
    tile('strelka', I.knife,'Стрелка','−2⚡',
      S.strelka?'Стрелка уже идёт':!oppD.length?'У соперника пусто':me.muscles<2?'Нужно 2⚡':'', 'att'),
    tile('hire', I.bust,'Нанять','$1000–1500',
      !slotFree?'Слот занят (2-й — с Вора)':me.obshak<1000?'Нужно $1000':''),
    tile('heist', I.mask,'Дело','риск за куш',
      me.muscles<1?'Нужен 1⚡':''),
    tile('boss', I.fedora,'Ударить босса','−1⚡',
      !bossAlive?'Босс выбит':me.today<85?'Только день ≥85%':me.muscles<1?'Нужен 1⚡':'', 'boss'),
    tile('pass', I.champ,'Пас','копишь','')
  ].join('');

  return `${vs}<div class="actions">${tiles}</div>`;
}
function tile(id, ico, title, cost, lock, kind){
  const dis = lock ? 'aria-disabled="true"' : '';
  return `<button class="tile ${kind||''}" data-tap="act-${id}" ${dis}>
    <span class="tile__ico">${ico}</span>
    <span class="tile__t">${title}</span>
    ${lock?`<span class="tile__lock">${lock}</span>`:`<span class="tile__c">${cost}</span>`}
  </button>`;
}

/* ───────────────────────  4 · БОСС  ─────────────────────── */
function renderBoss(){
  const b=S.boss;
  if(!b){ return empty(I.fedora,'На этой неделе смотрящий отдыхает. Качай районы и общак.'); }
  const meta = BOSS[b.id] || ['boss-buhgalter','город','',''];
  const dead = b.dead;
  const wd = (S.meta.day-1)%7, left = 6-wd;

  // сегменты HP
  let segs='';
  for(let i=0;i<b.max;i++) segs+=`<div class="hpbar__seg ${i<b.hp?'is-full':''}"></div>`;

  const canHit = !dead && me.today>=85 && me.muscles>=1;
  const dmgMe=b.dmg[ME], dmgOp=b.dmg[OPP];

  let cta;
  if(dead){
    const top = dmgMe>=dmgOp?ME:OPP;
    cta = `<div class="card" style="text-align:center;border-color:var(--gold-lo)">
      <div style="color:var(--gold-hi);width:40px;height:40px;margin:0 auto 8px">${I.crown}</div>
      <h3 style="font:700 19px/1.2 'Rubik';color:var(--gold-hi);margin:0 0 6px">${b.n.replace(/^[^ ]+ /,'')} сломан</h3>
      <p class="muted" style="margin:0">Старый авторитет отдал город. Трофей забирает <b style="color:var(--paper)">${top===ME?'Ты':(SIDE==='g'?'Скляровские':'Карлеоне')}</b>, перк — обоим кланам.</p></div>`;
  } else {
    const reason = me.today<85?'Закрой день на ≥85% — тогда ударишь':me.muscles<1?'Нужен 1⚡ — качай жёсткие пункты':'';
    cta = `<button class="btn btn--attack" data-tap="boss-hit" ${canHit?'':'aria-disabled="true"'}>${I.fist} Ударить · −1⚡</button>
      ${reason?`<p class="dim" style="text-align:center;font:500 12px/1.4 'Manrope';margin:9px 0 0">${reason}</p>`:''}`;
  }

  return `
  <div class="dossier--steel" style="border-radius:14px;padding:12px;margin-top:4px">
    <div class="boss-hero">
      <div class="boss-hero__portrait"><img src="assets/${meta[0]}.png" alt=""></div>
      <div class="boss-hero__info">
        <div class="boss-hero__wk">Смотрящий · неделя ${b.week}</div>
        <div class="boss-hero__name">${b.n.replace(/^[^ ]+ /,'')}</div>
        <div class="boss-hero__hold">Держит <b>${meta[1]}</b></div>
        ${dead?'':`<div class="deadline">${I.clock} ${left>0?('до развязки '+left+' дн.'):'сегодня развязка'}</div>`}
      </div>
    </div>
    <div class="hpwrap">
      <div class="hpbar__meta"><span class="hpbar__label">Терпение</span>
        <span class="hpbar__num">${b.hp}/${b.max}</span></div>
      <div class="hpbar">${segs}</div>
    </div>
    <div class="dmg">
      <div class="dmg__side me"><em>Ты</em><b>${dmgMe}</b><span>урона</span></div>
      <div class="dmg__side op"><em>${SIDE==='g'?'Скляровские':'Карлеоне'}</em><b>${dmgOp}</b><span>урона</span></div>
    </div>
  </div>

  <div class="trophy" style="margin-top:12px">${I.crown}
    <div><b>Трофей</b><span>${meta[3]}</span></div></div>

  <div class="rules"><b>Как бить:</b> в день ≥85% — удар (−1 HP), 100% — крит (−2), серия ≥3 — +1. Кооп: добьёте вдвоём — район топ-урону, перк обоим; не добьёте — наезд на оба клана.</div>

  <p class="muted" style="font:500 italic 13px/1.5 'Rubik';margin:14px 4px 16px">${meta[2]}</p>

  ${cta}`;
}

/* ───────────────────────  5 · ХРОНИКА  ─────────────────────── */
function renderChron(){
  const q = QUOTES[(S.meta.day-1)%QUOTES.length];
  const logs = (S.log||[]).filter(e=>{
    if(chronFilter==='all') return true;
    if(chronFilter==='me') return e.c===SIDE;
    if(chronFilter==='opp') return e.c===(SIDE==='g'?'s':'g');
    if(chronFilter==='city') return e.c==='n';
    return true;
  });

  let feed='', lastDay=null;
  if(!logs.length){
    feed = `<div class="empty">${I.scroll}<p>${S.log&&S.log.length?'По этому фильтру пока тихо.':'Хроника пуста — город ждёт первого хода.'}</p></div>`;
  } else {
    logs.forEach(e=>{
      if(e.d!==lastDay){ feed+=`<div class="day-tag">День ${e.d}</div>`; lastDay=e.d; }
      feed += `<div class="toast toast--${e.c}">
        <div class="toast__bar"></div>
        <div class="toast__body"><div class="toast__x">${e.x}</div>${e.p?`<span class="toast__tail">${e.p}</span>`:''}</div>
        <div class="toast__time">Д${e.d}</div></div>`;
    });
  }

  // омерта обоих
  const omMe=omCard(ME,me), omOp=omCard(OPP,opp);

  // аукцион
  let auc;
  const a=S.auction;
  if(a && a.lot){
    const meBid = a.bids && a.bids[ME];
    const opBid = a.bids && a.bids[OPP];
    auc = `<div class="card auction">
      <div class="auction__lbl">${I.anchor} Контрабанда · неделя ${a.week}</div>
      <div class="auction__lot">${a.lot[0]}</div>
      <div class="auction__desc">${a.lot[1]}</div>
      <div class="auction__bids">
        <div class="bidpill ${meBid?'yes':'no'}">Ты<b>${meBid?'ставка ✓':'молчишь'}</b></div>
        <div class="bidpill ${opBid?'yes':'no'}">${SIDE==='g'?'Скляровские':'Карлеоне'}<b>${opBid?'ставка ✓':'молчит'}</b></div>
      </div>
      <p class="dim" style="font:500 11px/1.4 'Manrope';margin:10px 0 0">Ставка втёмную из общака. Проигравшему вернут половину.</p>
    </div>`;
  } else {
    auc = `<div class="card"><div class="auction__lbl">${I.anchor} Порт</div>
      <p class="muted" style="margin:6px 0 0;font:500 13px/1.5 'Manrope'">Порт пуст. Контрабанда приходит по средам.</p></div>`;
  }

  return `
  <div class="don-quote">${q}</div>
  <div class="filters">
    ${['all:Всё','me:Мой клан','opp:Соперник','city:Город'].map(f=>{
      const [k,l]=f.split(':'); return `<button class="${chronFilter===k?'on':''}" data-tap="filter" data-arg="${k}">${l}</button>`;
    }).join('')}
  </div>
  <div class="feed">${feed}</div>
  <div class="section-h">Слово Семье<div class="fill"></div></div>
  <div class="omcards">${omMe}${omOp}</div>
  <div class="section-h">Аукцион недели<div class="fill"></div></div>
  ${auc}`;
}
function omCard(pid, p){
  const side=p.side, om=p.omerta;
  const name = side==='g'?'Карлеоне':'Скляровские';
  let dots='';
  for(let i=0;i<7;i++){ const held=i<om.held, broke=om.broken&&i===om.held;
    dots+=`<i class="${held?'held':''} ${broke?'broke':''}"></i>`; }
  const status = om.broken?'нарушено':(om.vow?`${om.held}/7`:'не дано');
  return `<div class="omcard ${side}">
    <div class="omcard__top">
      <div><div class="omcard__clan">${name}</div>
        <div class="omcard__vow">${om.vow?('без «'+om.vow+'»'):'обет не дан'}</div></div>
      <div class="omcard__status">${status}</div>
    </div><div class="dots">${dots}</div></div>`;
}

/* ═══════════════════════  НИЖНИЕ ЛИСТЫ / МОДАЛКИ  ═══════════════════════ */
function openSheet(html){
  closeSheet();
  const root=$('#sheet-root');
  root.innerHTML = `<div class="scrim" data-tap="close"></div>
    <div class="sheet"><div class="sheet__grip"></div>${html}</div>`;
  syncBackButton(true);
}
function closeSheet(){ $('#sheet-root').innerHTML=''; syncBackButton(false); }

/* Карточка района */
function districtSheet(id){
  const d=S.districts.find(x=>x.id===id); if(!d) return;
  const meta=DIST[id]||[d.n,d.income,''];
  const lvlName=['ларёк','магазин','бизнес-центр'][d.level-1]||'ларёк';
  const ownerTxt = d.lock&&!d.owner?`Под смотрящим`:d.owner===ME?'Твой район':d.owner?(SIDE==='g'?'Скляровские':'Карлеоне'):'Ничейный';

  let btns='';
  if(d.lock && !d.owner){
    const bmeta=BOSS[d.lock];
    btns = `<button class="btn btn--ghost" data-tap="go-sheet" data-arg="boss">${I.fedora} Под смотрящим — выбить в Рейде →</button>`;
  } else if(!d.owner){
    const price = me.lieutenant==='Коммерс'?Math.floor(d.price*0.75):d.price;
    const over = me.districts>=me.limit;
    const poor = me.obshak<price;
    const dis = over||poor;
    btns = `<button class="btn btn--primary" data-tap="do-buy" data-arg="${id}" data-price="${price}" ${dis?'aria-disabled="true"':''}>${I.building} Взять за $${fmt(price)}</button>
      ${over?`<p class="dim" style="text-align:center;font:500 12px 'Manrope'">Лимит районов ${me.limit} — расти в титуле</p>`:poor?`<p class="dim" style="text-align:center;font:500 12px 'Manrope'">Не хватает $${fmt(price-me.obshak)}</p>`:''}`;
  } else if(d.owner===ME){
    const up = d.level<3 ? upgradeInfo(d) : null;
    if(up) btns += `<button class="btn btn--upgrade" data-tap="do-upgrade" data-arg="${id}" data-price="${up.price}" ${me.obshak<up.price?'aria-disabled="true"':''}>${I.shield} Апгрейд · $${up.price} → $${fmt(up.inc)}/день</button>`;
    else btns += `<button class="btn btn--upgrade" aria-disabled="true">${I.shield} Бизнес-центр — выше некуда</button>`;
    if(d.fort<2) btns += `<button class="btn btn--ghost" data-tap="do-fort" data-arg="${id}" ${me.obshak<300?'aria-disabled="true"':''}>${I.shield} Укрепить · $300 (${d.fort}/2)</button>`;
    else btns += `<button class="btn btn--ghost" aria-disabled="true">${I.shield} Укреплён по максимуму</button>`;
  } else {
    const two = d.fort>=2 && me.lieutenant!=='Костолом';
    const dis = S.strelka||me.muscles<2||two;
    btns = `<button class="btn btn--attack" data-tap="do-strelka" data-arg="${id}" ${dis?'aria-disabled="true"':''}>${I.knife} Забить стрелку · −2⚡</button>
      ${S.strelka?'<p class="dim" style="text-align:center;font:500 12px \'Manrope\'">Стрелка уже идёт — одна за раз</p>':me.muscles<2?'<p class="dim" style="text-align:center;font:500 12px \'Manrope\'">Нужно 2⚡</p>':two?'<p class="dim" style="text-align:center;font:500 12px \'Manrope\'">Два ряда решёток — без Костолома не сунешься</p>':''}`;
  }

  const inc = d.lock&&!d.owner?d.income:d.income;
  openSheet(`
    <div class="sheet__head">
      <div><div class="sheet__title">${d.n}</div>
        <div class="sheet__sub">${ownerTxt} · ${lvlName}</div></div>
    </div>
    <div class="sheet__flavor">${meta[2]}</div>
    <div class="sheet__stats">
      <div class="stat"><em>Доход</em><b class="g">$${fmt(inc)}/день</b></div>
      <div class="stat"><em>Уровень</em><b>${d.level}/3 · ${lvlName}</b></div>
      <div class="stat"><em>Форт</em><b class="ok">${d.fort}/2</b></div>
      <div class="stat"><em>${d.lock&&!d.owner?'Цена':'Владелец'}</em><b>${d.lock&&!d.owner?'только выбить':ownerTxt}</b></div>
    </div>
    <div class="sheet__btns">${btns}</div>`);
}
/* Найм лейтенанта */
function hireSheet(){
  const slotFree = !me.lieutenant || me.title==='Вор';
  const rows = Object.keys(LTS).map(k=>{
    const [name,price,desc]=LTS[k];
    const dis = !slotFree || me.obshak<price;
    return `<button class="pick" data-tap="do-hire" data-arg="${k}" ${dis?'aria-disabled="true"':''}>
      <div class="pick__ico">${I.bust}</div>
      <div class="pick__main"><b>${name}</b><span>${desc}</span></div>
      <div class="pick__val"><b>$${fmt(price)}</b><span>${me.obshak<price?'мало':'нанять'}</span></div>
    </button>`;
  }).join('');
  openSheet(`<div class="sheet__head"><div><div class="sheet__title">Правая рука</div>
    <div class="sheet__sub">${slotFree?'Один слот свободен':'Слот занят · второй с титула Вор'}</div></div></div>
    <div class="sheet__flavor">Один человек рядом решает билд Семьи. Выбирай под свою игру.</div>
    ${rows}`);
}

/* Дело (heist) */
function heistSheet(){
  const rows = Object.keys(HEISTS).map(k=>{
    const [name,line,cut,emo]=HEISTS[k];
    const cost = k==='quiet'?1:k==='bold'?2:3;
    const feeOk = k!=='crazy'||me.obshak>=300;
    const dis = me.muscles<cost || !feeOk;
    return `<button class="pick" data-tap="do-heist" data-arg="${k}" ${dis?'aria-disabled="true"':''}>
      <div class="pick__ico">${I.mask}</div>
      <div class="pick__main"><b>${emo} ${name}</b><span>${line}</span></div>
      <div class="pick__val"><b>${cut}</b><span>${dis?'мало ⚡':'куш'}</span></div>
    </button>`;
  }).join('');
  openSheet(`<div class="sheet__head"><div><div class="sheet__title">Дело</div>
    <div class="sheet__sub">Риск за деньги</div></div></div>
    <div class="sheet__flavor">Провал = потеряешь ставку, но никто не сядет. Трезвая рука (85% за 3 дня) добавляет удачи.</div>
    ${rows}`);
}

/* Пикер целей (buy/upgrade/fort/strelka) */
function pickerSheet(kind){
  let list=[], title='', flavor='';
  if(kind==='buy'){
    title='Взять район'; flavor='Свободные улицы Гавани. Бери, пока ничейные.';
    list = S.districts.filter(d=>!d.owner&&!d.lock).map(d=>{
      const price = me.lieutenant==='Коммерс'?Math.floor(d.price*0.75):d.price;
      const dis = me.obshak<price || me.districts>=me.limit;
      return pickRow(I.building,d.n,`$${fmt(d.income)}/день`,`$${fmt(price)}`,dis?'мало':'взять','do-buy',d.id,dis,{price});
    });
  } else if(kind==='upgrade'){
    title='Апгрейд'; flavor='Ларёк → магазин → бизнес-центр. Доход ×1.5, потом ×2.';
    list = S.districts.filter(d=>d.owner===ME&&d.level<3).map(d=>{
      const up=upgradeInfo(d); const dis=me.obshak<up.price;
      return pickRow(I.shield,d.n,`ур.${d.level}→${d.level+1} · $${fmt(up.inc)}/день`,`$${up.price}`,dis?'мало':'апнуть','do-upgrade',d.id,dis,{price:up.price});
    });
  } else if(kind==='fort'){
    title='Укрепить'; flavor='+15% обороны в стрелке за слой. И от пожара прикроет. Максимум 2.';
    list = S.districts.filter(d=>d.owner===ME&&d.fort<2).map(d=>{
      const dis=me.obshak<300;
      return pickRow(I.shield,d.n,`форт ${d.fort}/2`,`$300`,dis?'мало':'укрепить','do-fort',d.id,dis);
    });
  } else if(kind==='strelka'){
    title='Стрелка'; flavor='Война за чужой район. −2⚡, решает средний % за 48 часов дисциплины.';
    list = S.districts.filter(d=>d.owner===OPP).map(d=>{
      const two=d.fort>=2&&me.lieutenant!=='Костолом';
      const dis=me.muscles<2||two||!!S.strelka;
      return pickRow(I.knife,d.n,two?'2 форта — нужен Костолом':`$${fmt(d.income)}/день · форт ${d.fort}/2`,`−2⚡`,dis?'—':'бить','do-strelka',d.id,dis);
    });
  }
  if(!list.length) list=[`<div class="empty" style="padding:24px">${I.info}<p>Целей нет.</p></div>`];
  openSheet(`<div class="sheet__head"><div><div class="sheet__title">${title}</div>
    <div class="sheet__sub">выбери цель</div></div></div>
    <div class="sheet__flavor">${flavor}</div>${list.join('')}`);
}
function pickRow(ico,name,sub,val,valSub,tap,arg,dis,data){
  const attrs = data&&data.price?`data-price="${data.price}"`:'';
  return `<button class="pick" data-tap="${tap}" data-arg="${arg}" ${attrs} ${dis?'aria-disabled="true"':''}>
    <div class="pick__ico">${ico}</div>
    <div class="pick__main"><b>${name}</b><span>${sub}</span></div>
    <div class="pick__val"><b>${val}</b><span>${valSub}</span></div></button>`;
}
function upgradeInfo(d){
  const base = DIST[d.id]?DIST[d.id][1]:d.income;
  const nl=d.level+1; const price=nl===2?400:800; const mult=nl===2?1.5:2.0;
  return {price, inc:Math.round(base*mult)};
}

/* Омерта-лист */
function omertaSheet(){
  const om=me.omerta;
  if(om.vow && !om.broken){
    // активный обет — только просмотр
    let dots='';
    for(let i=0;i<7;i++){ dots+=`<i class="${i<om.held?'held':''}"></i>`; }
    openSheet(`<div class="sheet__head"><div><div class="sheet__title">Слово Дона</div>
      <div class="sheet__sub">Неделя без «${om.vow}»</div></div></div>
      <div class="omcard ${SIDE}" style="border:0;background:none;padding:0;margin:6px 0 14px"><div class="dots">${dots}</div></div>
      <div class="sheet__flavor">Ежевечерний вопрос «Слово держишь?» — в экране Ход. Держишь 7/7 — в воскресенье награда.</div>
      <div class="stakes">
        <div class="win"><em>7/7</em><b>+5🎖 +$500</b></div>
        <div class="lose"><em>сорвался</em><b>−3🎖 + наводка</b></div>
      </div>
      <p class="dim" style="text-align:center;font:500 12px 'Manrope';margin:14px 0 0">Сдержанных недель: ${om.kept_weeks}. Слово уже дано — менять нельзя.</p>`);
    return;
  }
  // выбор нового обета
  const opts = VOWS.map(v=>`<button class="vow-opt ${vowDraft===v?'on':''}" data-tap="vow-pick" data-arg="${v}">${v}</button>`).join('');
  openSheet(`<div class="sheet__head"><div><div class="sheet__title">Слово Семье</div>
    <div class="sheet__sub">Понедельник · неделя ${S.meta.week}</div></div></div>
    <div class="sheet__flavor">От какой привычки отказываешься на семь дней? Держишь 7/7 — +5🎖 +$500. Сорвался — слово сгорает.</div>
    <div class="vow-picker">${opts}</div>
    <div class="sheet__btns" style="margin-top:14px">
      <button class="btn btn--primary" data-tap="do-omerta" ${vowDraft?'':'aria-disabled="true"'}>${I.lips} Дать слово Семье</button>
    </div>`);
}

/* ═══════════════════════  ДЕЛЕГИРОВАНИЕ СОБЫТИЙ  ═══════════════════════ */
document.addEventListener('click', e=>{
  const t = e.target.closest('[data-tap]'); if(!t) return;
  const tap=t.dataset.tap, arg=t.dataset.arg;
  if(t.getAttribute('aria-disabled')==='true'){ hap('warning'); toast('Так нельзя — не по понятиям','err'); return; }

  switch(tap){
    case 'nav': hap('selection'); go(arg); break;
    case 'go': hap('selection'); closeSheet(); go(arg); break;
    case 'go-sheet': hap('selection'); closeSheet(); go(arg); break;
    case 'close': hap('soft'); closeSheet(); break;
    case 'dist': hap('light'); districtSheet(arg); break;

    /* Ход · понятия */
    case 'proto': toggleProto(t, t.dataset.id); break;
    case 'vow-hold': omertaHeld = (arg==='yes'); hap('selection');
      $$('#vowseg button').forEach(b=>b.classList.remove('on'));
      t.classList.add('on'); break;
    case 'checkin': doCheckin(); break;

    /* Ход · фаза — открыть пикеры/листы */
    case 'act-buy': pickerSheet('buy'); break;
    case 'act-upgrade': pickerSheet('upgrade'); break;
    case 'act-fort': pickerSheet('fort'); break;
    case 'act-strelka': pickerSheet('strelka'); break;
    case 'act-hire': hireSheet(); break;
    case 'act-heist': heistSheet(); break;
    case 'act-boss': doBoss(); break;
    case 'act-pass': confirmAct('Пас — копишь силы и деньги?', ()=>act('pass')); break;
    case 'boss-hit': doBoss(); break;

    /* Пикер-выборы (из листов и карточки района) */
    case 'do-buy': { const d=S.districts.find(x=>x.id===arg); const price=t.dataset.price||d.price;
      confirmAct(`Взять «${d.n}» за $${fmt(+price)}?`, ()=>act('buy',arg)); break; }
    case 'do-upgrade': { const d=S.districts.find(x=>x.id===arg); const price=t.dataset.price;
      confirmAct(`Апгрейд «${d.n}» за $${price}?`, ()=>act('upgrade',arg)); break; }
    case 'do-fort': { const d=S.districts.find(x=>x.id===arg);
      confirmAct(`Укрепить «${d.n}» за $300?`, ()=>act('fort',arg)); break; }
    case 'do-strelka': { const d=S.districts.find(x=>x.id===arg);
      confirmAct(`Забить стрелку за «${d.n}»? −2⚡. Он узнает утром, решат 48 часов.`, ()=>act('strelka',arg)); break; }
    case 'do-hire': { const l=LTS[arg];
      confirmAct(`Нанять ${l[0]} за $${fmt(l[1])}? ${l[2]}`, ()=>act('hire',arg)); break; }
    case 'do-heist': { const h=HEISTS[arg];
      confirmAct(`Идём на ${h[0].toLowerCase()}? ${h[1]}. Провал = потеряешь ставку, но никто не сядет.`, ()=>act('heist',arg)); break; }

    /* Омерта */
    case 'omerta-open': hap('light'); omertaSheet(); break;
    case 'vow-pick': vowDraft=arg; hap('selection');
      $$('.vow-opt').forEach(b=>b.classList.toggle('on', b.dataset.arg===arg));
      const gb=$('.sheet [data-tap="do-omerta"]'); if(gb) gb.removeAttribute('aria-disabled'); break;
    case 'do-omerta': if(!vowDraft){ return; }
      confirmAct(`Даю слово: неделя без «${vowDraft}». Город будет смотреть.`, ()=>act('omerta',vowDraft)); break;

    /* Хроника */
    case 'filter': chronFilter=arg; hap('selection'); render(); break;
  }
});

function toggleProto(el, id){
  if(committed) return;
  if(checkSet.has(id)){ checkSet.delete(id); hap('soft'); el.classList.remove('on'); }
  else { checkSet.add(id); hap('light'); el.classList.add('on'); }
  // обновить кольцо, счётчик, плашку — без полного ре-рендера
  const t=computeTally();
  const hr=$('#hod-ring'); if(hr) hr.innerHTML=ring(t.pct,66);
  const head=$('.hod-head__t b'); if(head) head.textContent=`Понятия дня · ${checkSet.size}/14`;
  const tl=$('#tally'); if(tl) tl.outerHTML=tally(t);
  syncMainButton();
}

function doCheckin(){
  const t=computeTally();
  const warn = t.pct<50 ? ' День <50% — крыша спит, дохода не будет, серия сгорит.' : '';
  const omNote = (me.omerta.vow && !me.omerta.broken && !omertaHeld) ? ' Слово сгорит (−3🎖).' : '';
  confirmAct(`День ${t.pct}%: +$${fmt(t.money)} · +${t.resp}🎖 · +${t.musc}⚡.${warn}${omNote} После отметки день не переиграть.`,
    ()=>act('checkin', null, { done:[...checkSet], omerta:omertaHeld }));
}
function doBoss(){
  const b=S.boss;
  if(!b||b.dead){ toast('Босс недели выбит','ok'); return; }
  if(me.today<85){ hap('warning'); toast('Удар — только в день ≥85%','err'); return; }
  if(me.muscles<1){ hap('warning'); toast('Нужен 1⚡','err'); return; }
  const crit = me.today>=100;
  confirmAct(`Ударить ${b.n.replace(/^[^ ]+ /,'')}? −1⚡. Урон −${crit?2:1} HP${me.streak>=3?', +1 за серию':''}.`, ()=>act('boss'));
}

/* ═══════════════════════  MainButton / BackButton  ═══════════════════════ */
function syncMainButton(){
  if(!NATIVE || !tg.MainButton) return;
  const MB=tg.MainButton;
  if(SCREEN==='hod' && !committed){
    const t=computeTally();
    MB.setText(`ОТМЕТИТЬ ДЕНЬ · ${t.pct}%`);
    MB.setParams && MB.setParams({ color: SIDE==='g'?'#E6B450':'#E0455E', text_color: SIDE==='g'?'#1A1204':'#FFFFFF' });
    MB.show(); MB.onClick(mbClick);
  } else { MB.offClick(mbClick); MB.hide(); }
}
function mbClick(){ doCheckin(); }
function syncBackButton(show){
  if(!NATIVE || !tg.BackButton) return;
  if(show){ tg.BackButton.show(); tg.BackButton.onClick(backClick); }
  else { tg.BackButton.offClick(backClick); tg.BackButton.hide(); }
}
function backClick(){ closeSheet(); }

/* ═══════════════════════  BOOT  ═══════════════════════ */
function boot(){
  const sp=$('#splash-quote'); if(sp) sp.textContent = QUOTES[Math.floor(Math.random()*QUOTES.length)];
  if(!S || !me){
    $('#screen').innerHTML = `<div class="empty" style="margin-top:60px">${I.crest}<p>Связь с Семьёй потеряна. Состояние города не пришло.</p></div>`;
    document.getElementById('splash').classList.add('hide');
    return;
  }
  render();
  setTimeout(()=>{ const s=$('#splash'); if(s) s.classList.add('hide'); }, 620);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
