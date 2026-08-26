import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Info, Sparkles } from 'lucide-react';
import './FeatureTipsSwipeStack.css';

// Simple CSS particle component
function Particles() {
  return (
    <div className="card-particles">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`particle particle-${i}`} />
      ))}
    </div>
  );
}

export default function FeatureTipsSwipeStack({ tips = [] }) {
  const [cards, setCards] = useState(tips);
  const x = useMotionValue(0);
  
  // Tie rotation to drag X
  const rotate = useTransform(x, [-200, 200], [-8, 8]);

  if (!tips || tips.length === 0) return null;

  const handleDragEnd = (event, info) => {
    const threshold = 90;
    if (info.offset.x > threshold || info.offset.x < -threshold) {
      setCards(prev => {
        const newCards = [...prev];
        const swipedCard = newCards.shift();
        newCards.push(swipedCard);
        return newCards;
      });
    }
  };

  return (
    <div className="feature-tips-stack">
      <div className="feature-tips-stack__header">
        <Info size={16} />
        <span>How it works (Swipe to explore)</span>
      </div>
      
      <div className="feature-tips-stack__container">
        <AnimatePresence mode="popLayout">
          {cards.slice(0, 3).map((card, index) => {
            const isTop = index === 0;
            // Cards behind will scale down and move down slightly for a stacked look
            const scale = 1 - index * 0.06;
            const yOffset = index * 12; 
            const baseOpacity = 1 - index * 0.3;
            const zIndex = cards.length - index;

            // Generate a gradient based on the card's original index or title length
            const gradientClass = `gradient-bg-${(card.title.length % 3) + 1}`;

            return (
              <motion.div
                key={card.title}
                className={`feature-tips-stack__card ${gradientClass}`}
                style={{ 
                  zIndex,
                  ...(isTop ? { x, rotate } : {})
                }}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 40 }}
                animate={{ opacity: Math.max(baseOpacity, 0), scale, y: yOffset }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                drag={isTop ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.8}
                onDragEnd={isTop ? handleDragEnd : undefined}
                whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
                whileTap={{ cursor: 'grabbing' }}
              >
                {isTop && <Particles />}
                
                <div className="feature-tips-stack__card-inner">
                  {card.icon ? (
                    <div className="feature-tips-stack__icon">{card.icon}</div>
                  ) : (
                    <div className="feature-tips-stack__icon"><Sparkles size={20} /></div>
                  )}
                  <div className="feature-tips-stack__content">
                    <h4 className="feature-tips-stack__title">{card.title}</h4>
                    <p className="feature-tips-stack__desc">{card.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
