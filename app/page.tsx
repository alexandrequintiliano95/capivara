'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import PwaControls from './pwa-controls';
import { Apple, ArrowRight, ArrowUpRight, Check, ChefHat, CircleHelp, Heart, Leaf, LockKeyhole, Map, Plus, ShoppingBasket, Sparkles, Sprout, Sun, Trees, TrendingUp, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { act, advance, clickValue, hireCost, ISLANDS, multiplier, newGame, PRODUCTIONS, productionRate, rate, restoreGame, SAVE_KEY, type Action, type Game } from '@/lib/game';

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const fmt = (n: number) => n >= 10000 ? compact.format(n) : whole.format(Math.floor(n));
const productionIcons = [Trees, Sprout, ChefHat];

export default function Home() {
  const [game, setGame] = useState<Game>(() => newGame(0));
  const current = useRef(game);
  const canSave = useRef(false);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Preparando sua ilha…');
  const [offline, setOffline] = useState(0);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState('');
  const [floaties, setFloaties] = useState<{ id: number; value: number; left: number }[]>([]);
  const floatId = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let disposed = false;
    // Read device-local storage after hydration, preserving identical server/client markup.
    queueMicrotask(() => {
      if (disposed) return;
      try {
        const restored = restoreGame(localStorage, Date.now());
        canSave.current = restored.canSave;
        current.current = restored.game;
        setGame(restored.game);
        setOffline(restored.offline);
        setSaveStatus(!restored.canSave ? 'Não foi possível ler o progresso. Recarregue para tentar novamente; esta sessão não será salva.' : restored.saved ? 'Salvo neste navegador' : 'Não foi possível salvar. Verifique o armazenamento do navegador.');
        if (restored.recovered) setNotice('O progresso anterior não pôde ser lido. Guardamos uma cópia neste navegador e começamos uma nova ilha.');
      } catch {
        current.current = newGame(Date.now());
        setGame(current.current);
        setSaveStatus('Não foi possível acessar o armazenamento. Esta sessão não será salva.');
      }
      setReady(true);
    });

    const update = () => {
      if (document.hidden) return;
      const next = advance(current.current, Date.now());
      current.current = next;
      setGame(next);
    };
    const save = () => {
      if (!canSave.current) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(current.current));
        setSaveStatus('Salvo neste navegador');
      } catch { setSaveStatus('Não foi possível salvar. Verifique o armazenamento do navegador.'); }
    };
    const visibility = () => {
      if (document.hidden) { update(); save(); }
      else {
        const previous = current.current;
        const next = advance(previous, Date.now());
        if (Date.now() - previous.lastTick > 30000) setOffline(next.fruits - previous.fruits);
        current.current = next;
        setGame(next);
        save();
      }
    };
    const timer = setInterval(update, 250);
    const saver = setInterval(save, 5000);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      clearInterval(timer); clearInterval(saver);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      floatTimers.current.forEach(clearTimeout);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  function announce(text: string) {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4500);
  }

  function play(action: Action) {
    if (!ready) return;
    const before = advance(current.current, Date.now());
    const next = act(before, action);
    current.current = next;
    setGame(next);
    if (next === before) return;
    if (canSave.current) try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setSaveStatus('Salvo neste navegador');
    } catch { setSaveStatus('Não foi possível salvar. Verifique o armazenamento do navegador.'); }
    if (action.type === 'collect') {
      const id = ++floatId.current;
      setFloaties(items => [...items.slice(-8), { id, value: clickValue(before), left: 35 + Math.random() * 30 }]);
      const timer = setTimeout(() => {
        setFloaties(items => items.filter(item => item.id !== id));
        floatTimers.current = floatTimers.current.filter(item => item !== timer);
      }, 1100);
      floatTimers.current.push(timer);
    } else if (action.type === 'hire') announce('Mais uma capivara chegou para ajudar!');
    else if (action.type === 'expand') announce(`${ISLANDS[next.island - 1].name} desbloqueado! Sua ilha ganhou vida.`);
    else announce('Melhoria pronta. Hora de colher os frutos!');
  }

  const residents = game.units.reduce((sum, count) => sum + count, 0);
  const nextIsland = ISLANDS[game.island];
  const unlocked = game.units.filter(count => count > 0).length;

  return (
    <div className="game-shell">
      <header className="topbar">
        <a href="#ilha" className="brand" aria-label="Ilha das Capivaras, ir para o jogo">
          <Image className="brand-icon" src="/icons/icon-192.png" alt="" width={42} height={42} unoptimized />
          <span>ilha das <strong>capivaras</strong><span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right"><span className="slow-note"><Sun size={17} /> um dia de cada vez</span><PwaControls /><Button variant="ghost" className="help-button" onClick={() => setHelp(true)} aria-label="Como jogar"><CircleHelp size={21} /></Button></div>
      </header>

      <main id="ilha">
        <div className="mobile-hud" aria-label="Frutas e produção"><div className="mobile-balance"><Apple size={24} /><strong>{fmt(game.fruits)}</strong><span>+{number.format(rate(game))}/s</span></div><div className="mobile-residents"><Users size={17} /><strong>{residents}</strong><span>+{Math.round((multiplier(game) - 1) * 100)}%</span></div></div>
        <div className="welcome-row"><div><h1>Seu pedacinho de sossego<span>.</span></h1><p>Pequenas colheitas. Grandes amizades.</p></div><span className="island-badge"><Map size={16} /> Ilha {game.island} de 3</span></div>

        <div className="play-layout">
          <section className="island-column" aria-label="Sua ilha">
            <div className="island-scene">
              <Image className="island-art" src="/island.webp" alt="Uma pequena ilha tropical com pomar, casinha e capivaras cuidando da horta e descansando no lago." priority unoptimized width={1536} height={1024} />
              <div className="scene-heading"><span className="live-dot" /><span>{ISLANDS[game.island - 1].name}</span><span className="scene-weather"><Sun size={16} /> 26°</span></div>
              <div className="scene-label orchard"><Trees size={15} /> Pomar <span>{game.units[0]}</span></div>
              {game.island >= 2 && <div className="scene-label garden"><Sprout size={15} /> Horta <span>{game.units[1]}</span></div>}
              {game.island >= 3 && <div className="scene-label kitchen"><ChefHat size={15} /> Cozinha <span>{game.units[2]}</span></div>}
              <div className="collect-zone">
                <div aria-hidden="true" className="fruit-particles">{floaties.map(item => <span key={item.id} style={{ left: `${item.left}%` }}>+{number.format(item.value)} <Apple size={16} /></span>)}</div>
                <Button className="collect-button" disabled={!ready} onClick={() => play({ type: 'collect' })}><ShoppingBasket size={24} /><span>Colher frutas<small>+{number.format(clickValue(game))} por toque</small></span><Plus size={21} /></Button>
              </div>
            </div>

            <div className="island-caption"><span><Heart size={15} /> Por aqui, ninguém tem pressa.</span><span><span className="live-dot" /> Suas capivaras estão trabalhando</span></div>

            <section className="expansion" aria-labelledby="expand-title">
              <div className="expansion-icon"><Map size={27} /></div>
              <div className="expansion-body"><h2 id="expand-title">{nextIsland ? 'Há mais ilha para descobrir' : 'A ilha está completa!'}</h2><p>{nextIsland ? `${nextIsland.name} · ${nextIsland.unlock}` : 'Agora é só cuidar da vila e acolher mais capivaras.'}</p>
                {nextIsland && <Progress className="expansion-progress" value={Math.min(100, game.fruits / nextIsland.cost * 100)} aria-label={`Frutas para ${nextIsland.name}`} />}
              </div>
              {nextIsland ? <Button className="expand-button" disabled={!ready || game.fruits < nextIsland.cost} onClick={() => play({ type: 'expand' })}><span>Expandir ilha<small><Apple size={13} /> {fmt(nextIsland.cost)}</small></span><ArrowUpRight size={19} /></Button> : <Check className="completed-icon" size={26} />}
            </section>

            <section className="village" aria-labelledby="village-title"><div className="village-top"><h2 id="village-title">Uma vila de bons amigos</h2><span>{residents} {residents === 1 ? 'morador' : 'moradores'}</span></div>
              <div className="villagers">{[{ name: 'Tangerina', job: 'Primeira amiga', found: true, crop: 'friend-one' }, { name: 'Paçoca', job: 'Chega com 5 moradores', found: residents >= 5, crop: 'friend-two' }, { name: 'Jurema', job: 'Chega com a horta', found: game.units[1] > 0, crop: 'friend-three' }, { name: 'Dona Cuca', job: 'Chega com a cozinha', found: game.units[2] > 0, crop: 'friend-four' }].map(friend => <div className={`villager ${friend.found ? '' : 'undiscovered'}`} key={friend.name}><div className={`portrait ${friend.crop}`} aria-hidden="true">{!friend.found && <LockKeyhole size={18} />}</div><div><strong>{friend.found ? friend.name : 'Amizade a caminho'}</strong><span>{friend.found ? 'Em casa, feliz da vida' : friend.job}</span></div></div>)}</div>
            </section>
          </section>

          <aside className="management" aria-label="Produção e melhorias">
            <section className="wallet" aria-label="Suas frutas"><div className="wallet-top"><span><Apple size={18} /> Suas frutas</span><span className="wallet-leaf"><Leaf size={24} /></span></div><strong className="fruit-count" title={number.format(game.fruits)}>{fmt(game.fruits)}</strong><div className="wallet-bottom"><span><TrendingUp size={16} /> +{number.format(rate(game))}<small> / segundo</small></span><span>colheita automática</span></div></section>
            <div className="mini-stats"><span><Users size={18} /><strong>{residents}</strong> capivaras</span><span><Sparkles size={17} /><strong>+{Math.round((multiplier(game) - 1) * 100)}%</strong> bônus da ilha</span></div>

            <Tabs defaultValue="production" className="management-tabs"><TabsList className="management-tabs-list" aria-label="Gerenciar a ilha"><TabsTrigger value="production"><Sprout size={17} /> Produção</TabsTrigger><TabsTrigger value="upgrades"><Sparkles size={17} /> Melhorias</TabsTrigger></TabsList>
              <TabsContent value="production"><div className="section-intro"><h2>Deixe com as capivaras</h2><p>Mais patinhas, mais frutas na cesta.</p></div><div className="production-list">{PRODUCTIONS.map((item, index) => {
                const Icon = productionIcons[index]; const locked = game.island < item.island; const cost = hireCost(game, index); const maxed = game.units[index] >= 250;
                return <section className={`production-row ${locked ? 'locked' : ''}`} key={item.name}><div className={`production-icon production-${index}`}><Icon size={25} /></div><div className="production-detail"><div className="production-title"><h3>{item.name}</h3><span>{locked ? <LockKeyhole size={14} /> : `×${game.units[index]}`}</span></div><p>{item.description}</p><div className="production-footer"><span>{locked ? `Libera na ilha ${item.island}` : `+${number.format(productionRate(game, index))} frutas/s`}</span><Button className="hire-button" variant="secondary" disabled={!ready || locked || maxed || game.fruits < cost} onClick={() => play({ type: 'hire', index })} aria-label={`Contratar ${item.role.toLowerCase()} por ${fmt(cost)} frutas`}>{locked ? <><LockKeyhole size={13} /> Bloqueado</> : maxed ? 'Completo' : <><Plus size={15} /><Apple size={14} />{fmt(cost)}</>}</Button></div></div></section>;
              })}</div><div className="idle-tip"><Leaf size={19} /><p>Elas cuidam de tudo enquanto você descansa. A produção continua por até <strong>8 horas fora do jogo.</strong></p></div></TabsContent>
              <TabsContent value="upgrades"><div className="section-intro"><h2>Um carinho a mais</h2><p>Pequenas melhorias fazem a diferença.</p></div><div className="upgrade-list"><section className="upgrade-row"><div className="upgrade-description"><ShoppingBasket size={23} /><div><h3>Cesta reforçada</h3><p>Colha 5 frutas por toque, antes do bônus.</p></div></div><Button className="upgrade-button" variant="secondary" disabled={!ready || game.basket || game.fruits < 75} onClick={() => play({ type: 'basket' })}>{game.basket ? <><Check size={15} /> Feito</> : <><Apple size={14} />75</>}</Button></section>{PRODUCTIONS.map((item, index) => <section className="upgrade-row" key={item.upgradeName}><div className="upgrade-description"><Sparkles size={22} /><div><h3>{item.upgradeName}</h3><p>Dobra a produção: {item.name.toLowerCase()}.</p></div></div><Button className="upgrade-button" variant="secondary" disabled={!ready || game.upgraded[index] || game.units[index] === 0 || game.fruits < item.upgrade} onClick={() => play({ type: 'upgrade', index })}>{game.upgraded[index] ? <><Check size={15} /> Feito</> : game.units[index] === 0 ? <LockKeyhole size={16} aria-label="Contrate a primeira capivara desta produção" /> : <><Apple size={14} />{fmt(item.upgrade)}</>}</Button></section>)}</div></TabsContent>
            </Tabs>
            <div className="island-journal"><div><Sun size={22} /><h2>Devagar também se vai longe.</h2></div><p>{unlocked === 1 ? 'Sua primeira amiga já está colhendo. Toque em “Colher frutas” para ajudar e convide mais capivaras.' : unlocked === 2 ? 'A horta está cheia de vida. A próxima aventura tem cheirinho de comida caseira.' : 'Pomar, horta e cozinha: sua vila tem tudo para ser feliz.'}</p></div>
          </aside>
        </div>
        <footer><span><Leaf size={14} /> Feito para ir no seu ritmo.</span><span className={saveStatus.startsWith('Não') ? 'save-error' : ''}><Check size={14} /> {saveStatus}</span></footer>
      </main>

      <output className={`game-notice ${notice ? 'visible' : ''}`} aria-live="polite">{notice && <><Leaf size={19} /><span>{notice}</span><Button variant="ghost" size="icon" onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={16} /></Button></>}</output>

      <Dialog open={offline >= 1} onOpenChange={open => { if (!open) setOffline(0); }}><DialogContent className="cozy-dialog" showCloseButton={false}><div className="dialog-emblem"><Sun size={34} /></div><DialogTitle>Você voltou!</DialogTitle><DialogDescription>Suas capivaras cuidaram da ilha. Estas frutas já estão na sua cesta.</DialogDescription><div className="offline-fruits"><Apple size={28} /> +{fmt(offline)}</div><p className="dialog-small">Acumulamos até 8 horas de produção por ausência.</p><DialogClose render={<Button className="dialog-button" />}>Voltar à ilha <ArrowRight size={18} /></DialogClose></DialogContent></Dialog>
      <Dialog open={help} onOpenChange={setHelp}><DialogContent className="cozy-dialog help-dialog" showCloseButton={false}><DialogTitle>Um cantinho para chamar de seu</DialogTitle><DialogDescription>Comece com uma capivara e deixe sua ilha florescer.</DialogDescription><ol className="help-steps"><li><ShoppingBasket /><div><strong>Colha algumas frutas</strong><p>Toque na cesta para ajudar. A primeira capivara já produz sozinha.</p></div></li><li><Users /><div><strong>Convide mais amigas</strong><p>Use frutas para contratar capivaras. O número no botão é o preço.</p></div></li><li><Map /><div><strong>Descubra novos cantinhos</strong><p>Expanda a ilha para abrir a horta e a cozinha. Cada expansão dá +25% de produção.</p></div></li><li><Sparkles /><div><strong>Capriche nas melhorias</strong><p>Melhore a cesta e dobre a produção de cada atividade.</p></div></li></ol><p className="help-storage">O progresso fica neste navegador e dispositivo. Limpar os dados do site apaga a ilha. Use uma aba por vez. A produção fora do jogo acumula por até 8 horas.</p><DialogClose render={<Button className="dialog-button" />}>Vamos colher <ArrowRight size={18} /></DialogClose></DialogContent></Dialog>
    </div>
  );
}
