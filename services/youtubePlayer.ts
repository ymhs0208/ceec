let apiPromise: Promise<any> | null = null;

// Share a single script download across mounts; load only after playback intent.
export const loadYouTubePlayerApi = (): Promise<any> => {
  const host = window as any;
  if (host.YT?.Player) return Promise.resolve(host.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousCallback = host.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener('error', fail);
      if (host.onYouTubeIframeAPIReady === ready) {
        host.onYouTubeIframeAPIReady = previousCallback;
      }
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error('Unable to load the YouTube player'));
    };
    const ready = () => {
      cleanup();
      resolve(host.YT);
      if (typeof previousCallback === 'function') previousCallback();
    };
    const timeoutId = window.setTimeout(fail, 15000);
    host.onYouTubeIframeAPIReady = ready;
    script.addEventListener('error', fail);
    document.head.appendChild(script);
  }).catch(error => {
    apiPromise = null;
    throw error;
  });
  return apiPromise;
};
