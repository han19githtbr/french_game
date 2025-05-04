// components/Notification.tsx
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, DoorOpen } from "lucide-react"; // Ícones modernos

interface NotificationProps {
  show: boolean;
  name: string;
  type: "join" | "leave";
}

export default function Notification({ show, name, type }: NotificationProps) {
  const isJoin = type === "join";
  const message = isJoin
    ? `${name} entrou no jogo!`
    : `${name} saiu do jogo!`;

  const icon = isJoin ? <UserPlus className="w-6 h-6" /> : <DoorOpen className="w-6 h-6" />;
  const bgColor = isJoin ? "bg-green-500" : "bg-red-500";
  const borderColor = isJoin ? "border-green-700" : "border-red-700";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ duration: 0.4 }}
          className={`fixed top-6 right-6 z-50 text-white px-5 py-3 rounded-2xl shadow-lg border-4 ${bgColor} ${borderColor} flex items-center gap-3 animate-pulse`}
        >
          <motion.div
            initial={{ rotate: -15 }}
            animate={{ rotate: [ -15, 15, -10, 10, 0 ] }}
            transition={{ duration: 0.6 }}
          >
            {icon}
          </motion.div>
          <span className="text-base font-bold drop-shadow">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
