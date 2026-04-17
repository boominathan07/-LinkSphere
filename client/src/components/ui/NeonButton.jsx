import { motion } from "framer-motion";

function NeonButton({ children, className = "", ...props }) {
  return (
    <motion.button
      className={`neon-button ${className}`}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default NeonButton;
