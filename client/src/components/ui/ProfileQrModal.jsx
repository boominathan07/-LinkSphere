import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function ProfileQrModal({ open, onClose, profileUrl, username }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="qr-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-surface p-6 shadow-2xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-3 rounded-lg p-2 text-text-muted hover:bg-white/10 hover:text-white"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="pr-10 font-display text-xl font-semibold text-white">Profile QR Code</h3>
            <p className="mt-1 text-sm text-text-muted">Scan to open @{username}</p>
            <div className="mt-5 flex justify-center rounded-2xl bg-white p-4">
              <QRCodeSVG value={profileUrl} size={216} />
            </div>
            <p className="mt-4 break-all text-center text-[11px] text-text-muted">{profileUrl}</p>
            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-text-primary transition hover:bg-white/10"
              onClick={onClose}
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
