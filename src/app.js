import {eras, people, battles, sources, groups} from './data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const personById = new Map(people.map(person=>[person.id,person]));
const battleById = new Map(battles.map(battle=>[battle.id,battle]));
const eraById = new Map(eras.map(era=>[era.id,era]));
const dialog = $('#detail-dialog');
let currentEra = eras[0];
let currentView = 'story';
let renderedEra = '';
let returnFocus = null;
let activeBattle = null;
let activeStep = 0;
let nextScroll = null;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function sourceLinks(ids) {
  return `<div class="chapter-sources"><span>参考史料・解説</span>${[...new Set(ids)].map(id=>{const s=sources[id];return `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a>`;}).join('')}</div>`;
}

function personCard(id) {
  const p = personById.get(id);
  return `<button type="button" class="person-card" style="--faction:${groups[p.group].color}" data-person="${p.id}" aria-label="${escape(p.name)}（${escape(p.ruby)}）の人物紹介"><span class="person-seal" aria-hidden="true">${escape(p.name[0])}</span><span class="person-main"><span class="person-ruby">${escape(p.ruby)}</span><span class="person-name">${escape(p.name)}</span><span class="person-role">${escape(p.role)}</span></span></button>`;
}

function battleCard(id, catalogue = false) {
  const b = battleById.get(id);
  return `<button type="button" class="chapter-battle" data-battle="${b.id}" aria-label="${escape(b.name)}の展開を見る"><span class="section-index">${catalogue ? escape(b.type) : 'この時代の合戦'}</span>${catalogue ? `<span class="battle-date">${escape(b.year)}<span style="font:400 13px var(--sans);margin-left:6px">年</span></span>` : ''}<h3>${escape(b.name)}</h3><div class="battle-versus"><span>${escape(b.sides[0])}</span><span class="versus-mark" aria-label="対">vs.</span><span>${escape(b.sides[1])}</span></div>${catalogue ? `<p class="battle-desc">${escape(b.why)}</p>` : ''}<div class="battle-result"><span>${escape(b.result)}</span><b>展開を見る ↗</b></div></button>`;
}

function renderTimeline() {
  $('#timeline').innerHTML = eras.map((era,index)=>`<button type="button" class="era-button" data-era="${era.id}" aria-label="第${index+1}章 ${era.range}年 ${escape(era.short)}"><span class="era-year">${era.year}</span><span class="era-dot" aria-hidden="true"></span><span class="era-short">${escape(era.short)}</span></button>`).join('');
}

function markTimeline() {
  document.querySelectorAll('.era-button').forEach(button=> {
    if(button.dataset.era===currentEra.id) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  const timeline = $('#timeline');
  const selected = $(`[data-era="${currentEra.id}"]`, timeline);
  if(selected && currentView==='story') {
    const left = selected.offsetLeft;
    if(left < timeline.scrollLeft || left+selected.offsetWidth > timeline.scrollLeft+timeline.clientWidth) {
      timeline.scrollTo({left:left-timeline.clientWidth/2+selected.offsetWidth/2,behavior:'auto'});
    }
  }
}

function renderChapter(era) {
  const i = eras.findIndex(item=>item.id===era.id);
  const prev = eras[i-1];
  const next = eras[i+1];
  $('#chapter-content').innerHTML = `<div class="chapter-grid view-enter"><article aria-labelledby="chapter-title"><p class="chapter-number">第 ${String(i+1).padStart(2,'0')} 章 <span>${escape(era.range)}年</span></p><h2 id="chapter-title" class="chapter-title" tabindex="-1">${escape(era.title).replace(/\n/g,'<br>')}</h2><p class="chapter-summary">${escape(era.summary)}</p><div class="chapter-insight"><span class="insight-label">ここが転換点</span><p>${escape(era.insight)}</p></div><ol class="event-list">${era.events.map(([year,title,description])=>`<li><span class="event-date">${escape(year)}</span><p class="event-copy"><strong>${escape(title)}</strong>${escape(description)}</p></li>`).join('')}</ol></article><aside aria-label="この時代の勢力と合戦"><section class="atlas"><div class="atlas-heading"><h3>天下のかたち</h3><span>${escape(era.snapshot)}</span></div><div class="power-board">${era.powers.map(([group,area,name,leader,status])=>`<div class="power-node" style="--faction:${groups[group].color}"><span class="power-direction">${escape(area)}</span><strong>${escape(name)}</strong><span class="power-person">${escape(leader)}</span><span class="power-status">${escape(status)}</span></div>`).join('')}</div><p class="power-relation">${escape(era.relation)}</p><p class="atlas-caption">主要勢力の関係を簡略化。領土の広さや国力の比率を表す図ではありません。</p></section>${era.battles.slice(0,2).map(id=>battleCard(id)).join('')}${era.battles.length>2?`<div class="related-links" style="margin-top:14px">${era.battles.slice(2).map(id=>`<button type="button" class="related-link" data-battle="${id}">${escape(battleById.get(id).name)} ↗</button>`).join('')}</div>`:''}${era.id==='420'?'<div class="end-card"><span class="section-index">読み終えたら</span><h3>もう一度、人物から。</h3><p>曹操から司馬懿へ、司馬炎から劉裕へ。人物同士のつながりで読み返すと、王朝交代の仕組みが見えてきます。</p><a class="text-link" href="#people" style="display:inline-block;margin-top:15px">人物録を開く ↗</a></div>':''}</aside></div><section class="chapter-people" aria-labelledby="chapter-people-heading"><div class="subsection-heading"><h3 id="chapter-people-heading">この時代に登場する人々</h3><a href="#people" class="text-link">人物録へ ↗</a></div><div class="person-row">${era.people.map(personCard).join('')}</div></section><details class="romance-note"><summary><span>${['184','200','208','219','234','280'].includes(era.id)?'史実と演義':'もう一歩、深く'}</span>${escape(era.romance[0])}</summary><p>${escape(era.romance[1])}</p></details>${sourceLinks(era.sources)}<nav class="chapter-pagination" aria-label="章の移動"><button type="button" class="page-button prev" ${prev?`data-era="${prev.id}" data-jump="chapter"`:'disabled'}><span class="page-arrow" aria-hidden="true">←</span><div><span>前の時代</span><strong>${prev?escape(prev.short):'ここから始まる'}</strong></div></button><span class="page-position">${String(i+1).padStart(2,'0')} / 12</span><button type="button" class="page-button next" ${next?`data-era="${next.id}" data-jump="chapter"`:'disabled'}><div><span>次の時代</span><strong>${next?escape(next.short):'晋の歴史を読み終える'}</strong></div><span class="page-arrow" aria-hidden="true">→</span></button></nav>`;
  renderedEra = era.id;
  markTimeline();
}

function renderCatalogues() {
  $('#people-catalogue').innerHTML = `<p class="quiet">全${people.length}人。所属は代表的な陣営で整理し、建国前の人物も後の国と同じ色で示しています。</p>${Object.entries(groups).map(([id,group])=>{
    const members=people.filter(p=>p.group===id);
    return `<section class="people-group"><h2 style="color:${group.color}">${group.name}<span class="group-counter">${members.length}人</span></h2><div class="person-row">${members.map(p=>personCard(p.id)).join('')}</div></section>`;
  }).join('')}`;
  $('#battle-catalogue').innerHTML = battles.map(b=>battleCard(b.id,true)).join('');
  $('#sources-content').innerHTML = `<div class="source-essay"><div class="notice-box"><p><strong>史実を軸に、演義は分けて。</strong><br>本文は歴史の流れを初心者向けに要約しています。『三国志演義』に由来する物語は、各章の「史実と演義」欄で区別します。出来事の意味づけには、理解のための本サイトの整理を含みます。</p></div><h2>どこから、どこまで？</h2><p>184年の黄巾の乱から、420年の東晋滅亡までを扱います。狭い意味の三国時代は220〜280年ですが、前史と、統一後の晋まで含めて十二章にしました。西晋の滅亡は316年、司馬氏の晋全体の終わりは420年です。</p><h2>年・国名・図の読み方</h2><ul><li><strong>晋の建国は265年と表示。</strong>日本語の概説で一般的な表記を採用しています。中国暦の年末の出来事を西暦の暦日に換算すると266年にあたり、資料によって266年表記があります。年の表記を比べるときは暦の扱いに注意してください。</li><li><strong>東晋は317年から。</strong>司馬睿は317年に晋王、318年に皇帝となりました。ここでは政権の再建を起点にしています。</li><li><strong>呉の成立には二つの区切り。</strong>222年の独立を起点とする場合と、229年の孫権の皇帝即位を起点とする場合があります。蜀漢の当時の国号は「漢」です。</li><li><strong>人物の生没年。</strong>暦換算や史料の違いで年がずれる場合があります。生年不詳・異説のある人物については、確実でない数字を固定していません。</li><li><strong>勢力図は関係の整理。</strong>地理的な方向は概略です。枠の面積は領土・人口・国力を表しません。年表の各章も等間隔で、年数に比例しません。</li><li><strong>合戦は主な展開を三段階に要約。</strong>当時の戦況を完全に再現するものではありません。兵数には誇張や史料間の差があるため、未確定の軍勢数を勝敗の根拠として示していません。</li></ul><h2>史料は「書かれた事実」でもある</h2><p>『三国志』は陳寿が編んだ歴史書で、のちに裴松之が多くの異説・逸話を注として加えました。注に引かれている話が、すべて同じ確かさの史実とは限りません。『晋書』『宋書』『資治通鑑』も編纂時期や立場が異なります。史料に書かれた細部と、研究上確定できる事柄は同じではありません。</p><p>以下の史料・解説へのリンクは、本文をさらに確かめたい方の入口です。原文の多くは漢文です。本文は原文の逐語訳ではなく、主要な出来事を独自にまとめた説明です。</p><h2>参考史料・解説</h2><ul class="source-list">${Object.values(sources).map(s=>`<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)} ↗</a><span class="source-tag">${s.type}</span><small>${escape(s.author)}<br>${escape(s.note)}</small></li>`).join('')}</ul><h2>画像について</h2><p>冒頭の長江の情景は、本サイトのために制作したAI生成の創作イラストです。特定の戦場、人物の容貌、船の形状を史実どおりに再現した資料画像ではありません。人物の印は名前を使った表示で、実在の肖像ではありません。</p></div>`;
}

function openDetail(type, id, trigger) {
  if(!dialog.open) returnFocus = trigger || document.activeElement;
  const item = type==='person'?personById.get(id):battleById.get(id);
  if(!item) return;
  if(type==='person') {
    activeBattle = null;
    const p=item;
    const group=groups[p.group];
    const era=eraById.get(p.era);
    $('#dialog-kind').textContent='人物録 / '+group.name;
    $('#dialog-content').innerHTML=`<article class="dialog-body view-enter" style="--faction:${group.color}"><div class="person-heading"><span class="person-seal large-seal" aria-hidden="true">${escape(p.name[0])}</span><div><span class="person-ruby">${escape(p.ruby)}</span><h2 id="dialog-title">${escape(p.name)}</h2><p class="person-meta">${escape(p.life)}${p.life.includes('不詳')||p.life.includes('異説')||p.life.includes('年')?'':'年'}${p.zi==='—'?'':`　/　字：${escape(p.zi)}`}</p><span class="faction-ribbon">${escape(p.role)}</span></div></div><p class="detail-lead">${escape(p.lead)}</p><p class="detail-text">${escape(p.bio)}</p><h3 class="detail-label">人物のつながり</h3><div class="related-links">${p.relations.map(([relatedId,relation])=>`<button class="related-link" type="button" data-person="${relatedId}"><span>${escape(personById.get(relatedId).name)} ↗</span><small>${escape(relation)}</small></button>`).join('')}</div><button type="button" class="era-jump" data-era="${p.era}" data-jump="chapter"><span>この人が登場する時代へ　${escape(era.short)}</span><span aria-hidden="true">→</span></button>${sourceLinks(p.sources)}</article>`;
  } else {
    activeBattle=item;
    activeStep=0;
    const b=item;
    $('#dialog-kind').textContent='合戦録 / '+b.type;
    $('#dialog-content').innerHTML=`<article class="dialog-body view-enter"><span class="battle-date">${escape(b.year)}<span style="font:400 14px var(--sans);margin-left:6px">年</span></span><p class="person-ruby">${escape(b.ruby)}</p><h2 class="dialog-battle-title" id="dialog-title">${escape(b.name)}</h2><p class="person-meta" style="margin-bottom:20px">舞台：${escape(b.place)}</p><h3 class="detail-label">なぜ戦ったのか</h3><p class="detail-text">${escape(b.why)}</p><div class="battle-arena"><div class="battle-sides"><div class="army-name">${escape(b.sides[0])}<span class="army-leader">${escape(b.leaders[0])}</span></div><span class="battle-divider" aria-label="対">vs.</span><div class="army-name">${escape(b.sides[1])}<span class="army-leader">${escape(b.leaders[1])}</span></div><div id="arena-turn" class="arena-turn" aria-live="polite" aria-atomic="true"></div><div class="turn-markers" aria-label="合戦の展開">${b.steps.map((step,index)=>`<button type="button" class="turn-button" data-step="${index}" aria-pressed="${index===0}">${index+1}. ${escape(step[0])}</button>`).join('')}</div><div class="turn-next"><button type="button" data-step-prev>← 前の展開</button><span class="turn-number" id="turn-number"></span><button type="button" data-step-next>次の展開 →</button></div></div><p class="battle-impact"><strong>この戦いで、何が変わった？</strong>${escape(b.impact)}</p><h3 class="detail-label">登場人物</h3><div class="related-links">${b.people.map(id=>`<button type="button" class="related-link" data-person="${id}">${escape(personById.get(id).name)} ↗</button>`).join('')}</div><button type="button" class="era-jump" data-era="${b.era}" data-jump="chapter"><span>歴史の流れのなかで読む</span><span aria-hidden="true">→</span></button>${sourceLinks(b.sources)}</article>`;
    renderStep(0);
  }
  if(!dialog.open) dialog.showModal();
  document.body.style.overflow='hidden';
  dialog.scrollTop=0;
  $('.dialog-close').focus({preventScroll:true});
}

function renderStep(index) {
  if(!activeBattle) return;
  activeStep=Math.max(0,Math.min(activeBattle.steps.length-1,index));
  const [title,description]=activeBattle.steps[activeStep];
  $('#arena-turn').innerHTML=`<span class="arena-turn-label">${String(activeStep+1).padStart(2,'0')} / ${escape(title)}</span>${escape(description)}`;
  document.querySelectorAll('[data-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.step)===activeStep)));
  $('[data-step-prev]').disabled=activeStep===0;
  $('[data-step-next]').disabled=activeStep===activeBattle.steps.length-1;
  $('#turn-number').textContent=`${activeStep+1} / ${activeBattle.steps.length}`;
}

function closeDetail(restore=true) {
  if(!dialog.open) return;
  dialog.close();
  document.body.style.overflow='';
  activeBattle=null;
  if(restore && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
}

function scrollToChapter(focus=false) {
  const heading=$('#chapter-title');
  if(focus) heading.focus({preventScroll:true});
  const top=$('.chronicle').getBoundingClientRect().top+window.scrollY-18;
  window.scrollTo({top,behavior:reducedMotion()?'auto':'smooth'});
}

function route() {
  const [routeName,eraId]=location.hash.slice(1).split('/');
  const view=['story','people','battles','sources'].includes(routeName)?routeName:'story';
  const previousView=currentView;
  currentView=view;
  if(view==='story' && eraId && eraById.has(eraId)) currentEra=eraById.get(eraId);
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==`${view}-view`);
  document.querySelectorAll('[data-view-link]').forEach(link=>{if(link.dataset.viewLink===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  if(renderedEra!==currentEra.id) renderChapter(currentEra);
  else markTimeline();
  document.title=view==='story'?`${currentEra.short} | 三国志年代記`:`${{people:'人物録',battles:'合戦録',sources:'史料と読み方'}[view]} | 三国志年代記`;
  if(dialog.open) closeDetail(false);
  if(nextScroll==='chapter') {
    requestAnimationFrame(()=>scrollToChapter(true));
  } else if(previousView!==view || nextScroll==='top') {
    window.scrollTo({top:0,behavior:'auto'});
    $('#main').focus({preventScroll:true});
  }
  nextScroll=null;
}

document.addEventListener('click', event=>{
  const personButton=event.target.closest('[data-person]');
  if(personButton) {openDetail('person',personButton.dataset.person,personButton);return;}
  const battleButton=event.target.closest('[data-battle]');
  if(battleButton) {openDetail('battle',battleButton.dataset.battle,battleButton);return;}
  const eraButton=event.target.closest('[data-era]');
  if(eraButton) {
    const id=eraButton.dataset.era;
    if(!eraById.has(id)) return;
    if(dialog.open) closeDetail(false);
    nextScroll=eraButton.dataset.jump==='chapter'?'chapter':null;
    const hash=`#story/${id}`;
    if(location.hash===hash) {route();return;}
    location.hash=hash;
    return;
  }
  const stepButton=event.target.closest('[data-step]');
  if(stepButton) {renderStep(Number(stepButton.dataset.step));return;}
  if(event.target.closest('[data-step-next]')) {renderStep(activeStep+1);return;}
  if(event.target.closest('[data-step-prev]')) {renderStep(activeStep-1);return;}
  if(event.target.closest('.dialog-close')) {closeDetail();return;}
  const navLink=event.target.closest('a[href^="#"]');
  if(navLink && navLink.getAttribute('href')!=='#main') {
    nextScroll='top';
    if(location.hash===navLink.getAttribute('href')) {event.preventDefault();route();}
  }
});

dialog.addEventListener('click',event=>{
  if(event.target!==dialog) return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) closeDetail();
});
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
dialog.addEventListener('close',()=>{document.body.style.overflow='';});
window.addEventListener('hashchange',route);
renderTimeline();
renderCatalogues();
route();
