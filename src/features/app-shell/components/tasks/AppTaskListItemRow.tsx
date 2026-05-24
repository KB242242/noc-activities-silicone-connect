import type { ReactNode } from 'react';

import { motion } from 'framer-motion';

type AppTaskListItemRowProps = {
  id: string;
  index: number;
  className: string;
  children: ReactNode;
};

export function AppTaskListItemRow({ id, index, className, children }: AppTaskListItemRowProps) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
