import { motion } from "framer-motion";

function GlassCard({ className = "", children }) {
  const canHoverAnimate = typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false;

  return (
    <motion.section
      className={`glass-card ${className}`}
      whileHover={canHoverAnimate ? { scale: 1.01 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.section>
  );
}

export default GlassCard;
