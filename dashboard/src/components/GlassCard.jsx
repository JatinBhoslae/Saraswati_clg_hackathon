import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = "", hover = true, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`glass ${hover ? 'glass-hover' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
