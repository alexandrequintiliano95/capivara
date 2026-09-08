'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, RefreshCw, Share, Smartphone, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

type InstallPrompt = Event & { prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>; };

export default function PwaControls() {
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [installError, setInstallError] = useState('');
  const updating = useRef(false);

  useEffect(() => {
    let disposed = false;
    const standalone = matchMedia('(display-mode: standalone)');
    const syncInstalled = () => setInstalled(standalone.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    const syncOnline = () => setOffline(!navigator.onLine);
    queueMicrotask(() => { if (!disposed) { syncInstalled(); syncOnline(); } });
    const capturePrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const didInstall = () => { setInstalled(true); setOpen(false); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', didInstall);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    standalone.addEventListener('change', syncInstalled);

    const controllerChange = () => { if (updating.current) window.location.reload(); };
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.addEventListener('controllerchange', controllerChange);
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {
        if (disposed) return;
        if (registration.waiting) setWaiting(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (!disposed && worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
          });
        });
        void navigator.serviceWorker.ready.then(() => { if (!disposed) setOfflineReady(true); });
      }).catch(() => { if (!disposed) setInstallError('Não foi possível preparar o modo offline. Abra o jogo novamente com internet para tentar de novo.'); });
    }
    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', didInstall);
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
      standalone.removeEventListener('change', syncInstalled);
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('controllerchange', controllerChange);
    };
  }, []);

  async function install() {
    if (!prompt) { setOpen(true); return; }
    try {
      const result = await prompt.prompt();
      setPrompt(null);
      if (result.outcome === 'accepted') setOpen(false);
    } catch { setPrompt(null); setOpen(true); }
  }

  return <>
    {offline && <span className="offline-chip"><WifiOff size={15} /><span>Offline</span></span>}
    {!installed && <Button className="install-button" variant="outline" onClick={() => { void install(); }} aria-label="Adicionar jogo à tela inicial"><ArrowDownToLine size={17} /><span>Instalar</span></Button>}
    {waiting && <div className="update-banner"><span>Novidades chegaram à ilha.</span><Button onClick={() => { updating.current = true; waiting.postMessage({ type: 'SKIP_WAITING' }); }}><RefreshCw size={16} /> Atualizar</Button></div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="cozy-dialog install-dialog" showCloseButton={false}><div className="dialog-emblem"><Smartphone size={33} /></div><DialogTitle>Sua ilha na tela inicial</DialogTitle><DialogDescription>Abra o jogo como um app, direto pelo ícone da capivara.</DialogDescription><div className="install-instructions"><h3>No iPhone</h3><p>Abra no Safari, toque em <Share size={15} /> <strong>Compartilhar</strong> e escolha <strong>Adicionar à Tela de Início</strong>. Se aparecer, mantenha “Abrir como App da Web” ativado.</p><h3>No Android</h3><p>No menu do Chrome, escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p></div><p className="install-save-note">No iPhone, instale antes de começar: o progresso do Safari fica separado do app instalado.</p><p className="offline-readiness">{installError || (offlineReady ? 'Tudo pronto para jogar sem internet.' : 'Abra uma vez com internet para preparar o jogo offline.')}</p><DialogClose render={<Button className="dialog-button" />}>Entendi</DialogClose></DialogContent></Dialog>
  </>;
}
