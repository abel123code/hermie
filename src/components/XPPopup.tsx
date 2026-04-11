import React, { useEffect, useState } from 'react';

interface XPPopupProps {
  amount: number;
  onDone?: () => void;
}

export function XPPopup({ amount, onDone }: XPPopupProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className="animate-xp-float"
      style={{
        position: 'absolute',
        top: '-10px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 100,
        fontFamily: 'var(--font-display)',
        fontSize: '24px',
        color: '#E8430A',
        whiteSpace: 'nowrap',
      }}
    >
      +{amount} xp
    </div>
  );
}
