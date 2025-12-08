import React, {
    createContext,
    useContext,
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo
} from 'react';
import { gsap } from 'gsap';
import './CardSwap.css';

interface CardSwapProps {
    children: React.ReactNode;
    cardDistance?: number;
    verticalDistance?: number;
    delay?: number;
    pauseOnHover?: boolean;
}

interface CardProps {
    children: React.ReactNode;
}

interface CardContextType {
    registerCard: (id: string, ref: React.RefObject<HTMLDivElement>) => void;
    unregisterCard: (id: string) => void;
}

const CardSwapContext = createContext<CardContextType | null>(null);

export const Card = ({ children }: CardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const context = useContext(CardSwapContext);
    // Generate a stable ID for this card instance
    const id = useMemo(() => Math.random().toString(36).substr(2, 9), []);

    useEffect(() => {
        if (context && ref.current) {
            context.registerCard(id, ref);
            return () => context.unregisterCard(id);
        }
    }, [context, id]);

    return (
        <div className="card-swap-card" ref={ref}>
            {children}
        </div>
    );
};

const makeSlot = (
    i: number,
    cardDistance: number,
    verticalDistance: number,
    total: number
) => {
    return {
        x: i * cardDistance,
        y: -i * verticalDistance,
        z: (total - i) * 100, // Inverse z-index for stacking
        zIndex: total - i,
        scale: 1 - i * 0.05 // Optional: scale down cards in back
    };
};

const CardSwap = ({
    children,
    cardDistance = 60,
    verticalDistance = 70,
    delay = 5000,
    pauseOnHover = false
}: CardSwapProps) => {
    // Store refs in a Map to handle unique IDs and prevent duplicates
    const [cardsMap, setCardsMap] = useState<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
    const order = useRef<string[]>([]);
    const timer = useRef<NodeJS.Timeout | null>(null);
    const isHovered = useRef(false);
    const tlRef = useRef<gsap.core.Timeline | null>(null);

    const registerCard = useCallback((id: string, ref: React.RefObject<HTMLDivElement>) => {
        setCardsMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(id, ref);

            // Only update order if it's a new card
            if (!prev.has(id)) {
                order.current = [...order.current, id];
            }
            return newMap;
        });
    }, []);

    const unregisterCard = useCallback((id: string) => {
        setCardsMap((prev) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            order.current = order.current.filter(cardId => cardId !== id);
            return newMap;
        });
    }, []);

    const contextValue = useMemo(() => ({ registerCard, unregisterCard }), [registerCard, unregisterCard]);

    // Initialize positions
    useEffect(() => {
        const cards = order.current.map(id => cardsMap.get(id)).filter(Boolean);
        cards.forEach((ref, i) => {
            if (ref && ref.current) {
                const slot = makeSlot(i, cardDistance, verticalDistance, cards.length);
                gsap.set(ref.current, {
                    x: slot.x,
                    y: slot.y,
                    zIndex: slot.zIndex,
                    scale: slot.scale
                });
            }
        });
    }, [cardsMap, cardDistance, verticalDistance]);

    const swap = useCallback(() => {
        if (order.current.length < 2) return;

        const [frontId, ...restIds] = order.current;
        const elFront = cardsMap.get(frontId)?.current;
        if (!elFront) return;

        const config = {
            durDrop: 0.4,
            durMove: 0.5,
            durReturn: 0.5,
            promoteOverlap: 0.2,
            returnDelay: 0.1,
            ease: 'power2.inOut'
        };

        const tl = gsap.timeline();
        tlRef.current = tl;

        // 1. Drop front card
        tl.to(elFront, {
            y: '+=200',
            opacity: 0,
            duration: config.durDrop,
            ease: config.ease
        });

        // 2. Move others forward
        tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);

        restIds.forEach((id, i) => {
            const el = cardsMap.get(id)?.current;
            if (!el) return;
            const slot = makeSlot(i, cardDistance, verticalDistance, order.current.length);

            tl.to(
                el,
                {
                    x: slot.x,
                    y: slot.y,
                    zIndex: slot.zIndex,
                    scale: slot.scale,
                    duration: config.durMove,
                    ease: config.ease
                },
                `promote+=${i * 0.05}`
            );
        });

        // 3. Return front card to back
        const backSlot = makeSlot(order.current.length - 1, cardDistance, verticalDistance, order.current.length);
        tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);

        tl.set(elFront, {
            zIndex: backSlot.zIndex,
            x: backSlot.x,
            y: backSlot.y + 200, // Start from below
            scale: backSlot.scale
        }, 'return');

        tl.to(
            elFront,
            {
                y: backSlot.y,
                opacity: 1,
                duration: config.durReturn,
                ease: config.ease
            },
            'return'
        );

        tl.call(() => {
            order.current = [...restIds, frontId];
        });
    }, [cardsMap, cardDistance, verticalDistance]);

    useEffect(() => {
        const startTimer = () => {
            if (timer.current) clearInterval(timer.current);
            timer.current = setInterval(() => {
                if (!isHovered.current || !pauseOnHover) {
                    swap();
                }
            }, delay);
        };

        if (cardsMap.size > 1) {
            startTimer();
        }

        return () => {
            if (timer.current) clearInterval(timer.current);
            if (tlRef.current) tlRef.current.kill();
        };
    }, [cardsMap.size, delay, pauseOnHover, swap]);

    return (
        <CardSwapContext.Provider value={contextValue}>
            <div
                className="card-swap-container"
                onMouseEnter={() => { isHovered.current = true; }}
                onMouseLeave={() => { isHovered.current = false; }}
            >
                {children}
            </div>
        </CardSwapContext.Provider>
    );
};

export default CardSwap;
