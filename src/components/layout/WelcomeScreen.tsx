import { useAtlasStore } from '../../store/useAtlasStore';
import { usePreferences } from '../../store/usePreferences';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export function WelcomeScreen() {
  const setShowWelcome = useAtlasStore((s) => s.setShowWelcome);
  const setUnits = usePreferences((s) => s.setUnits);

  const handleChoice = (units: 'imperial' | 'metric') => {
    setUnits(units);
    setShowWelcome(false);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <motion.h1
          className="text-5xl font-bold tracking-tight mb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          ATLAS
        </motion.h1>
        <motion.p
          className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-12"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
        >
          Personal Performance Intelligence
        </motion.p>

        <motion.p
          className="text-base text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          Choose your preferred units. You can always change this later in Settings.
        </motion.p>

        <motion.div
          className="flex gap-4 justify-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.45 }}
        >
          <Card
            className="flex-1 max-w-[180px] cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => handleChoice('imperial')}
          >
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-mono font-bold">mi</p>
              <p className="text-sm text-muted-foreground mt-2">Imperial</p>
              <p className="text-xs text-muted-foreground mt-1">miles, feet, °F</p>
            </CardContent>
          </Card>

          <Card
            className="flex-1 max-w-[180px] cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => handleChoice('metric')}
          >
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-mono font-bold">km</p>
              <p className="text-sm text-muted-foreground mt-2">Metric</p>
              <p className="text-xs text-muted-foreground mt-1">km, meters, °C</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
