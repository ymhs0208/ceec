import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ModalLayer.css';

// Batch simultaneous openings so an auxiliary dialog opens above its parent.
const pendingDialogs = new Map<HTMLDialogElement, number>();
let openingScheduled = false;

function scheduleOpening(dialog: HTMLDialogElement, priority: number) {
  pendingDialogs.set(dialog, priority);
  if (openingScheduled) return;
  openingScheduled = true;
  queueMicrotask(() => {
    openingScheduled = false;
    const pending = [...pendingDialogs].sort((a, b) => a[1] - b[1]);
    pendingDialogs.clear();
    for (const [element] of pending) {
      if (element.isConnected && !element.open) element.showModal();
    }
  });
}

type ModalLayerProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  priority?: number;
};

/** The native top layer escapes transformed ancestors and every page z-index. */
export default function ModalLayer({ active = true, priority, children, ...props }: ModalLayerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const layerPriority = priority ?? Number(props.className?.match(/z-(?:\[(\d+)\]|(\d+))/)?.slice(1).find(Boolean) ?? 0);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!active || !dialog) return;
    scheduleOpening(dialog, layerPriority);
    return () => {
      pendingDialogs.delete(dialog);
      if (dialog.open) dialog.close();
    };
  }, [active, layerPriority]);

  if (!active) return <div {...props}>{children}</div>;
  return createPortal(
    <dialog ref={dialogRef} className="app-modal-layer" onCancel={event => event.preventDefault()}>
      <div {...props}>{children}</div>
    </dialog>,
    document.body,
  );
}
