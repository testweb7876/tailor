import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === 'true');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !window.MSStream);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-card md:left-auto">
      <Download size={20} className="shrink-0 text-indigo" />
      <div className="flex-1 text-sm">
        {isIOS ? (
          <span>Add this app to your Home Screen: tap <b>Share</b> → <b>Add to Home Screen</b>.</span>
        ) : (
          <span>Install this app for quick access from your home screen.</span>
        )}
      </div>
      {!isIOS && <button className="btn-primary px-3 py-1.5 text-xs" onClick={install}>Install</button>}
      <button onClick={dismiss} className="text-gray-400 hover:text-ink"><X size={16} /></button>
    </div>
  );
}