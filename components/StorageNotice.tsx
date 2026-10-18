import React, { useSyncExternalStore } from 'react';
import { localStorageController } from '../utils/storage';

export default function StorageNotice({ getBackup }: { getBackup: () => unknown }) {
  const status = useSyncExternalStore(localStorageController.subscribe, localStorageController.getSnapshot);
  if (!status.failed) return null;
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...getBackup() as object }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'focus-space-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <aside role="alert" className="fixed inset-x-3 bottom-3 z-[2000] mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-slate-900 shadow-xl">
    <strong className="block text-sm font-black">{status.reason === 'quota' ? '瀏覽器儲存空間不足' : '瀏覽器目前無法儲存資料'}</strong>
    <p className="mt-1 text-xs leading-relaxed">部分變更尚未儲存到此瀏覽器，關閉或重新整理可能遺失。請先下載備份，再釋出空間或允許瀏覽器儲存，然後重試。這個提示不代表雲端同步已完成。</p>
    <div className="mt-3 flex gap-2"><button type="button" onClick={download} className="min-h-11 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white">下載目前資料</button><button type="button" onClick={() => localStorageController.retry()} className="min-h-11 rounded-xl border border-amber-300 px-4 text-xs font-bold">重試儲存</button></div>
  </aside>;
}
