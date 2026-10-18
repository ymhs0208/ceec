import React, { Suspense, useEffect, useState } from 'react';

// Delay the first mount, then retain it so closing animations and local state work.
const DeferredContent: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => {
  const [hasOpened, setHasOpened] = useState(active);
  useEffect(() => {
    if (active) setHasOpened(true);
  }, [active]);

  if (!active && !hasOpened) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
};

export default DeferredContent;
