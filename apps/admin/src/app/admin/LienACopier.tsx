'use client';

import { useState } from 'react';

/** Lien de rattachement affiché une seule fois (il n'est pas conservé en clair), avec bouton de copie. */
export default function LienACopier({ lien }: { lien: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <input readOnly value={lien} onFocus={(e) => e.target.select()} className="w-80 max-w-full rounded border border-neutral-300 bg-neutral-50 px-2 py-1 font-mono text-[11px] text-neutral-800" />
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(lien).then(() => setCopie(true), () => setCopie(false))}
        className="rounded border border-teal-800 px-2 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-50"
      >
        {copie ? 'Copié' : 'Copier'}
      </button>
      <span className="text-[11px] text-neutral-500">Ce lien ne sera plus affiché : copiez-le maintenant.</span>
    </div>
  );
}
