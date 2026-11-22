import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import QrScanner from 'qr-scanner';
import { CameraOff } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { Button, Input } from './ui';

export function QRCode({ value, size = 220, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCodeLib.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }).then(setSrc).catch(() => setSrc(''));
  }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt="QR code" className={className} style={{ imageRendering: 'pixelated' }} /> : <div style={{ width: size, height: size }} className="bg-gray-100 animate-pulse rounded" />;
}

/** Camera scanner with a manual-entry fallback (desktop demos, denied camera). */
export function Scanner({ onResult, placeholder }: { onResult: (text: string) => void; placeholder?: string }) {
  const { tr } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (!video.current) return;
    done.current = false;
    const sc = new QrScanner(
      video.current,
      (r) => {
        if (done.current) return;
        done.current = true;
        if (navigator.vibrate) navigator.vibrate(60);
        onResult(r.data);
        setTimeout(() => (done.current = false), 2500);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment', returnDetailedScanResult: true },
    );
    sc.start().catch(() => setError(tr('Camera not available — enter the code instead.', 'الكاميرا غير متاحة — أدخل الرمز يدوياً.')));
    return () => {
      sc.stop();
      sc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-app-lg bg-gray-900">
        <video ref={video} className="h-full w-full object-cover" muted playsInline />
        {error && (
          <div className="absolute inset-0 grid place-items-center text-center text-white/80 p-6">
            <div>
              <CameraOff className="mx-auto mb-2" />
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onResult(manual.trim());
          setManual('');
        }}
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={placeholder ?? tr('Or type / paste a code', 'أو اكتب / الصق الرمز')} />
        <Button type="submit" variant="dark">{tr('Go', 'تم')}</Button>
      </form>
    </div>
  );
}
