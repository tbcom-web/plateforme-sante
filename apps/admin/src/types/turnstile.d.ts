// Cloudflare Turnstile (script chargé à la demande) : capture de l'essai et inscription.
interface Window {
  turnstile?: {
    render: (el: HTMLElement, o: { sitekey: string; language?: string; size?: string; callback: (t: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string;
    reset: (id?: string) => void;
  };
}
