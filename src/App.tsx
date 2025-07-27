import {useLayoutEffect, useRef, useState, useCallback} from "react";
import "./App.css";

//Wikipedia Resource:
//https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection

// Types
type Point = {
    readonly x: number;
    readonly y: number;
}

type Boundary = {
    readonly startingPoint: Point;
    readonly endingPoint: Point;
    readonly thickness: number;
}

type Ray = {
    readonly startingPoint: Point;
    readonly endingPoint: Point;
    readonly angle: number;
    readonly length: number;
    readonly thickness: number;
    readonly isReflectingRay: boolean;
    readonly closestIntersection: {
        readonly x: number;
        readonly y: number;
        readonly distance: number;
        readonly wall: Boundary;
    } | null;
}

type Quadrant = 1 | 2 | 3 | 4;

// Settings
const DEFAULT_DENSITY = 4;
const MAX_DENSITY = 0.15;
const MIN_REFLECTION_THICKNESS = 0.05;
const WALL_COLLISION_OFFSET = 6;
const REFLECTION_DECAY = 0.7;

// Pure functions for creating data structures
const createPoint = (x: number, y: number): Point => ({ x, y });

const createBoundary = (x1: number, y1: number, x2: number, y2: number, thickness: number = 12): Boundary => ({
    startingPoint: createPoint(x1, y1),
    endingPoint: createPoint(x2, y2),
    thickness
});

const createRay = (
    x: number, 
    y: number, 
    angle: number, 
    thickness: number = 1, 
    isReflectingRay: boolean = false
): Ray => {
    // To prevent ray from starting inside a wall
    const deltaX = WALL_COLLISION_OFFSET * Math.cos(angle * (Math.PI / 180));
    const deltaY = WALL_COLLISION_OFFSET * Math.sin(angle * (Math.PI / 180));
    const length = 2 * (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight);
    const startingPoint = createPoint(x + deltaX, y + deltaY);
    const endingPoint = createPoint(
        startingPoint.x + Math.cos(angle * Math.PI / 180) * length,
        startingPoint.y - Math.sin(angle * Math.PI / 180) * length
    );
    
    return {
        startingPoint,
        endingPoint,
        angle,
        length,
        thickness,
        isReflectingRay,
        closestIntersection: null
    };
};

// Pure drawing functions
const drawBoundary = (ctx: CanvasRenderingContext2D, boundary: Boundary): void => {
    ctx.beginPath();
    ctx.strokeStyle = "#FFF";
    ctx.moveTo(boundary.startingPoint.x, boundary.startingPoint.y);
    ctx.lineTo(boundary.endingPoint.x, boundary.endingPoint.y);
    ctx.lineWidth = boundary.thickness;
    ctx.stroke();
};

const drawRay = (ctx: CanvasRenderingContext2D, ray: Ray): void => {
    ctx.beginPath();
    ctx.moveTo(ray.startingPoint.x, ray.startingPoint.y);
    ctx.lineTo(ray.endingPoint.x, ray.endingPoint.y);
    ctx.lineWidth = ray.thickness;
    ctx.stroke();
};

const drawRayWithIntersection = (ctx: CanvasRenderingContext2D, ray: Ray, intersectX: number, intersectY: number): void => {
    ctx.beginPath();
    ctx.moveTo(ray.startingPoint.x, ray.startingPoint.y);
    ctx.lineTo(intersectX, intersectY);
    ctx.lineWidth = ray.thickness;
    ctx.stroke();
};

// Pure calculation functions
const getDistanceBetweenPoints = (p1: Point, p2: Point): number => 
    Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const getIntersectionPoint = (
    line1Start: Point,
    line1End: Point,
    line2Start: Point,
    line2End: Point
): Point | null => {
    const x1 = line1Start.x;
    const y1 = line1Start.y;
    const x2 = line1End.x;
    const y2 = line1End.y;
    const x3 = line2Start.x;
    const y3 = line2Start.y;
    const x4 = line2End.x;
    const y4 = line2End.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (Math.abs(denom) < 1e-6) return null; // Lines are parallel
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
    
    if (t > 0 && t < 1 && u > 0 && u < 1) {
        return createPoint(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
    }
    
    return null;
};

const getQuadrant = (p1: Point, p2: Point): Quadrant => {
    if (p1.x > p2.x && p1.y < p2.y) return 1;      // Right Top
    else if (p1.x < p2.x && p1.y < p2.y) return 2; // Left Top
    else if (p1.x < p2.x && p1.y > p2.y) return 3; // Left Bottom
    else return 4;                                   // Right Bottom
};

const getReflectAngle = (light: Ray, wall: Boundary): number => {
    const x1 = light.startingPoint.x;
    const y1 = light.startingPoint.y;
    const x2 = light.endingPoint.x;
    const y2 = light.endingPoint.y;
    const x3 = wall.startingPoint.x;
    const y3 = wall.startingPoint.y;
    const x4 = wall.endingPoint.x;
    const y4 = wall.endingPoint.y;

    const incidentAngle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    const wallAngle = Math.atan2(y4 - y3, x4 - x3) * (180 / Math.PI);
    const normalizedIncidentAngle = (incidentAngle + 360) % 360;
    const normalizedWallAngle = (wallAngle + 360) % 360;

    const quadrant = getQuadrant(light.startingPoint, light.endingPoint);
    const angleDiff = normalizedWallAngle - normalizedIncidentAngle;
    let reflectAngle = normalizedWallAngle + 180 - angleDiff;
    reflectAngle = (reflectAngle + 360) % 360;

    if (quadrant === 1) {
        console.log(1);
    } else if (quadrant === 2) {
        console.log(2);
        if (reflectAngle < 180) {
            reflectAngle = 360 - reflectAngle;
        }
    } else if (quadrant === 3) {
        console.log(3);
    } else if (quadrant === 4) {
        console.log(4);
        if (reflectAngle > 180) {
            reflectAngle = 360 - reflectAngle;
        }
    }

    return reflectAngle;
};

// Find closest intersection for a ray
const findClosestIntersection = (ray: Ray, boundaries: readonly Boundary[]): Ray => {
    const intersections = boundaries
        .map(wall => {
            const point = getIntersectionPoint(ray.startingPoint, ray.endingPoint, wall.startingPoint, wall.endingPoint);
            if (!point) return null;
            
            const distance = getDistanceBetweenPoints(ray.startingPoint, point);
            return { x: point.x, y: point.y, distance, wall };
        })
        .filter((intersection): intersection is NonNullable<typeof intersection> => intersection !== null);
    
    if (intersections.length === 0) return ray;
    
    const closest = intersections.reduce((prev, curr) => 
        curr.distance < prev.distance ? curr : prev
    );
    
    return { ...ray, closestIntersection: closest };
};

// Create rays for a given angle range
const createRays = (mouseX: number, mouseY: number, density: number): readonly Ray[] => {
    const rays: Ray[] = [];
    for (let angle = 0; angle < 360; angle += density) {
        rays.push(createRay(mouseX, mouseY, angle));
    }
    return rays;
};

// Process reflections
const processReflections = (rays: readonly Ray[], boundaries: readonly Boundary[]): readonly Ray[] => {
    const allRays: Ray[] = [];
    
    const processRayReflections = (ray: Ray, depth: number = 0): void => {
        const rayWithIntersection = findClosestIntersection(ray, boundaries);
        allRays.push(rayWithIntersection);
        
        if (rayWithIntersection.closestIntersection && depth < 10) { // Limit recursion depth
            const reflectedThickness = rayWithIntersection.thickness * REFLECTION_DECAY;
            
            if (reflectedThickness > MIN_REFLECTION_THICKNESS) {
                const { x, y, wall } = rayWithIntersection.closestIntersection;
                const reflectAngle = getReflectAngle(rayWithIntersection, wall);
                const reflectedRay = createRay(x, y, reflectAngle, reflectedThickness, true);
                processRayReflections(reflectedRay, depth + 1);
            }
        }
    };
    
    rays.forEach(ray => processRayReflections(ray));
    
    return allRays;
};

// Clear canvas
const clearCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
    ctx.beginPath();
    ctx.fillStyle = "#161616";
    ctx.fillRect(0, 0, width, height);
};

// Generate random boundaries
const generateRandomBoundaries = (): readonly Boundary[] => {
    const boundaryCount = Math.floor(Math.random() * 4) + 1;
    const boundaries: Boundary[] = [];
    
    for (let i = 0; i < boundaryCount; i++) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        boundaries.push(createBoundary(x, y, x + Math.random() * 200, y + Math.random() * 600));
    }
    
    return boundaries;
};

// Main App Component
const App = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [lightDensity, setLightDensity] = useState(DEFAULT_DENSITY);
    const [boundaries, setBoundaries] = useState<readonly Boundary[]>([]);
    const densityIntervalRef = useRef<number | null>(null);
    const isKeyDownHandledRef = useRef(false);

    // Initialize canvas
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctxRef.current = ctx;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        clearCanvas(ctx, canvas.width, canvas.height);
        
        // Initial boundaries
        setBoundaries([
            createBoundary(700, 200, 700, 800),
            createBoundary(1200, 200, 1200, 800)
        ]);
        
        const resizeHandler = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            clearCanvas(ctx, canvas.width, canvas.height);
        };
        
        const contextPrevent = (e: MouseEvent) => e.preventDefault();
        
        window.addEventListener("resize", resizeHandler);
        window.addEventListener("contextmenu", contextPrevent);
        
        return () => {
            window.removeEventListener("resize", resizeHandler);
            window.removeEventListener("contextmenu", contextPrevent);
        };
    }, []);
    
    // Render function
    const render = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx || !canvasRef.current) return;
        
        clearCanvas(ctx, canvasRef.current.width, canvasRef.current.height);
        
        // Draw boundaries
        boundaries.forEach(boundary => drawBoundary(ctx, boundary));
        
        // Create and process rays
        const initialRays = createRays(mousePosition.x, mousePosition.y, lightDensity);
        const allRays = processReflections(initialRays, boundaries);
        
        // Draw rays
        allRays.forEach(ray => {
            if (ray.closestIntersection) {
                drawRayWithIntersection(ctx, ray, ray.closestIntersection.x, ray.closestIntersection.y);
            } else {
                drawRay(ctx, ray);
            }
        });
    }, [mousePosition, lightDensity, boundaries]);
    
    // Update render when dependencies change
    useLayoutEffect(() => {
        render();
    }, [render]);
    
    // Mouse move handler
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
    }, []);
    
    // Mouse down handler
    const handleMouseDown = useCallback(() => {
        if (densityIntervalRef.current) {
            clearInterval(densityIntervalRef.current);
        }
        
        densityIntervalRef.current = window.setInterval(() => {
            setLightDensity(current => {
                if (current > MAX_DENSITY) {
                    return current - 0.1;
                } else {
                    if (densityIntervalRef.current) {
                        clearInterval(densityIntervalRef.current);
                    }
                    return current;
                }
            });
        }, 20);
    }, []);
    
    // Mouse up handler
    const handleMouseUp = useCallback(() => {
        if (densityIntervalRef.current) {
            clearInterval(densityIntervalRef.current);
        }
        
        densityIntervalRef.current = window.setInterval(() => {
            setLightDensity(current => {
                if (current < DEFAULT_DENSITY) {
                    return current + 0.1;
                } else {
                    if (densityIntervalRef.current) {
                        clearInterval(densityIntervalRef.current);
                    }
                    return current;
                }
            });
        }, 20);
    }, []);
    
    // Keyboard handlers
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === " " || e.code === "Space" || e.keyCode === 32) {
            if (isKeyDownHandledRef.current) return;
            setBoundaries(generateRandomBoundaries());
            isKeyDownHandledRef.current = true;
        }
    }, []);
    
    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (e.key === " " || e.code === "Space" || e.keyCode === 32) {
            isKeyDownHandledRef.current = false;
        }
    }, []);
    
    // Add keyboard event listeners
    useLayoutEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);
    
    return (
        <>
            <canvas 
                ref={canvasRef}
                id="canvas" 
                width={window.innerWidth} 
                height={window.innerHeight} 
                onMouseMove={handleMouseMove} 
                onMouseDown={handleMouseDown} 
                onMouseUp={handleMouseUp}
            />
            <div className="infoBox">
                <h1>2D Ray Casting <span>- by <a href="https://github.com/AtakanYigit/TypescriptRayCasting">Atakan Yiğit Çengeloğlu</a></span></h1>
                <div className="infos">
                    <p>Hold Mouse Button to Increase Density</p>
                    <p>Press Space to Generate Random Map</p>
                </div>
            </div>
        </>
    );
}

export default App;