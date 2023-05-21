import {useLayoutEffect, useRef} from "react";
import "./App.css";

//Wikipedia Resource:
//https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection

const App = () => {
    type point = {
        x: number,
        y: number
    }

    //-----------------------CLASSES-----------------------//
    class boundary{
        startingPoint: point
        endingPoint: point
        thickness:number

        constructor(x1:number, y1:number, x2:number, y2:number, thickness:number = 12){
            this.startingPoint = {x: x1, y: y1};
            this.endingPoint   = {x: x2, y: y2};
            this.thickness     = thickness;
        }
    
        draw(){
            if(!ctx.current) return;
            ctx.current.beginPath();
            ctx.current.strokeStyle = "#FFF"
            ctx.current.moveTo(this.startingPoint.x, this.startingPoint.y);
            ctx.current.lineTo(this.endingPoint.x, this.endingPoint.y);
            ctx.current.lineWidth = this.thickness;
            ctx.current.stroke();
        }
    }
    
    class ray{
        startingPoint: point
        endingPoint: point
        angle: number
        length: number
        thickness: number
        isReflectingRay: boolean
        closestIntersection: {x:number, y:number, distance:number, wall:boundary} | null

        constructor(x: number, y: number, angle: number, thickness: number = 1, isReflectingRay: boolean = false){
            //To Prevent Ray From Starting Inside A Wall            
            const deltaX = 6 * Math.cos(angle * (Math.PI / 180));
            const deltaY = 6 * Math.sin(angle * (Math.PI / 180));
            this.length              = 2 * (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight);
            this.startingPoint       = {x: x + deltaX, y: y + deltaY};
            this.angle               = angle;
            this.endingPoint         = {x: 0, y: 0};
            this.endingPoint.x       = this.startingPoint.x + Math.cos(this.angle * Math.PI / 180)*this.length;
            this.endingPoint.y       = this.startingPoint.y - Math.sin(this.angle * Math.PI / 180)*this.length;
            this.thickness           = thickness;
            this.isReflectingRay     = isReflectingRay;
            this.closestIntersection = null;
        }

        draw(){
            if(!ctx.current) return;
            ctx.current.beginPath();
            ctx.current.moveTo(this.startingPoint.x, this.startingPoint.y);
            ctx.current.lineTo(this.endingPoint.x, this.endingPoint.y);
            ctx.current.lineWidth = this.thickness;
            ctx.current.stroke();
        }
    
        drawIntersect(IntersectX:number, IntersectY:number){
            if(!ctx.current) return;
            this.endingPoint.x = IntersectX;
            this.endingPoint.y = IntersectY;
            ctx.current.beginPath();
            ctx.current.moveTo(this.startingPoint.x, this.startingPoint.y);
            ctx.current.lineTo(this.endingPoint.x, this.endingPoint.y);
            ctx.current.lineWidth = this.thickness;
            ctx.current.stroke();
        }
        
        update(mouseXPos:number, mouseYPos:number){
            if(!this.isReflectingRay){
                this.startingPoint.x = mouseXPos;
                this.startingPoint.y = mouseYPos;
                this.endingPoint.x = this.endingPoint.x + Math.cos(this.angle * Math.PI / 180)*this.length;
                this.endingPoint.y = this.endingPoint.y - Math.sin(this.angle * Math.PI / 180)*this.length;
            }
        }
    }

    //-----------------------SETTINGS-----------------------//
    let defaultDensity = 90;
    let lightDensity   = 90;
    let maxDensity     = 0.15;
    // let defaultDensity = 1.5;
    // let lightDensity   = 1.5;
    // let maxDensity     = 0.2;

    //-----------------------VARIABLES-----------------------//
    let mouseX = 0
    let mouseY = 0
    let rays:ray[]             = [];
    let reflectingRays: ray[]  = [];
    let boundaries: boundary[] = [];
    
    //-----------------------CANVAS SETUP-----------------------//
    const ctx = useRef<CanvasRenderingContext2D | null>(null);

    useLayoutEffect(() => {    
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        ctx.current = canvas.getContext('2d');
      
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      
        if(!ctx.current) return;
        
        ctx.current.fillStyle = "#161616";
        ctx.current.fillRect(0, 0, canvas.width, canvas.height);
        
        boundaries = [];
                    
        //Creating Boundaries       (x1,    y1,     x2,     y2)
        // boundaries.push(new boundary(700,   200,    700,    800));
        // boundaries.push(new boundary(1200,  200,    1200,   800));

        //Test Boundaries
        boundaries.push(new boundary(0,  1100, 1900,   1100));
        // boundaries.push(new boundary(100,  0, 100,   1400));

        refresh();
        const resizeHandler = () => {
            if(!canvas || !ctx?.current) return;
            canvas.width    = window.innerWidth;
            canvas.height   = window.innerHeight;
            ctx.current.fillStyle   = "#161616";
            ctx.current.fillRect(0, 0, canvas.width, canvas.height);
        };

        const contextPrevent = (e:MouseEvent) => {
            e.preventDefault();
        };

        window.addEventListener("keydown",     spaceBarDown);
        window.addEventListener("keyup",       spaceBarUp);
        window.addEventListener("resize",      resizeHandler);
        window.addEventListener("contextmenu", contextPrevent);
        return () => {
            window.removeEventListener("keydown",     spaceBarDown);
            window.removeEventListener("keyup",       spaceBarUp);
            window.removeEventListener("resize",      resizeHandler);
            window.removeEventListener("contextmenu", contextPrevent);
        }
    }, []);
        
    //-----------------------CLEAR SCREEN-----------------------//
    const clearScreen = () =>{
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if(!canvas || !ctx?.current) return;
        
        ctx.current.beginPath();
        ctx.current.fillRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.current.clearRect(0, 0, canvas.width, canvas.height);

        ctx.current.beginPath();
        ctx.current.fillStyle   = "#161616";
        ctx.current.fillRect(0, 0, canvas.width, canvas.height);
        
        rays = [];
        reflectingRays = [];
    }

    //-----------------------CALCULATE INTERSECTIONS-----------------------//
    const getIntersectionPoint = (line1StartingPoint:point, line1EndingPoint:point, line2StartingPoint:point, line2EndingPoint:point) =>{
        let x1 = line1StartingPoint.x;
        let y1 = line1StartingPoint.y;
        let x2 = line1EndingPoint.x;
        let y2 = line1EndingPoint.y;
        let x3 = line2StartingPoint.x;
        let y3 = line2StartingPoint.y;
        let x4 = line2EndingPoint.x;
        let y4 = line2EndingPoint.y;
        
        let denom = (x1-x2) * (y3-y4) - (y1-y2) * (x3-x4);

        if(Math.abs(denom) < 1e-6) return null;  //If denom is very close to 0 then ray and wall are parallel.

        let t  = ((x1-x3) * (y3-y4) - (y1-y3) * (x3-x4)) / denom;
        let u  = ((x1-x3) * (y1-y2) - (y1-y3) * (x1-x2)) / denom;
        let Px = x1 + t * (x2-x1);
        let Py = y1 + t * (y2-y1);

        if(t > 0 && t < 1 && u > 0 && u < 1){
            return {x: Px, y: Py};
        }

        return null;
    }

    type quadrant = 1|2|3|4;
    
    const getReflectAngle = (light:ray, wall:boundary) => {
        let x1 = light.startingPoint.x;
        let y1 = light.startingPoint.y;
        let x2 = light.endingPoint.x;
        let y2 = light.endingPoint.y;
        let x3 = wall.startingPoint.x;
        let y3 = wall.startingPoint.y;
        let x4 = wall.endingPoint.x;
        let y4 = wall.endingPoint.y;

        const incidentAngle           = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        const wallAngle               = Math.atan2(y4 - y3, x4 - x3) * (180 / Math.PI);
        const normalizedIncidentAngle = (incidentAngle + 360) % 360;
        const normalizedWallAngle     = (wallAngle + 360) % 360;
    
        const quadrant:quadrant = getQuadrant(x1, y1, x2, y2);
        const angleDiff  = normalizedWallAngle - normalizedIncidentAngle;
        let reflectAngle = normalizedWallAngle + (180) - angleDiff;
        reflectAngle     = (reflectAngle + 360) % 360;

        if(quadrant == 1){
            console.log(1);
        }else if(quadrant == 2){
            console.log(2);
            if(reflectAngle < 180){
                reflectAngle = 360 - reflectAngle;
            }
        }else if(quadrant == 3){
            console.log(3);
        }else if(quadrant == 4){
            console.log(4);
            if(reflectAngle > 180){
                reflectAngle = 360 - reflectAngle;
            }
        }
    
        return reflectAngle;
    }

    const getQuadrant = (x1:number, y1:number, x2:number, y2:number) => {
        //Light Relative To Wall
        if(x1 > x2 && y1 < y2){         //Right Top
            return 1;
        }else if(x1 < x2 && y1 < y2){   //Left Top
            return 2;
        }else if(x1 < x2 && y1 > y2){   //Left Bottom
            return 3;
        }else if(x1 > x2 && y1 > y2){   //Right Bottom
            return 4;
        }else{
            console.log("Error: getQuadrant()");
            return 1;
        }
    }

    //-----------------------EVERY RENDER-----------------------//
    const refresh = () => {
        clearScreen();
            
        for(let wall of boundaries){
            wall.draw();
        }
        
        //CREATING RAYS
        let j = 0;

        for(let i = 0; i < 360; i += lightDensity){     
            rays.push(new ray(0, 0, i));
            rays[j].update(mouseX, mouseY);
            
            for(let wall of boundaries){
                const intersectionPoints = getIntersectionPoint(rays[j].startingPoint, rays[j].endingPoint, wall.startingPoint, wall.endingPoint);
                if(intersectionPoints){
                    const distanceToIntersection = getDistanceBetweenPoints(rays[j].startingPoint.x, rays[j].startingPoint.y, intersectionPoints.x, intersectionPoints.y);
                    if(!rays[j].closestIntersection || rays[j].closestIntersection.distance > distanceToIntersection){
                        rays[j].closestIntersection = {x: intersectionPoints.x, y: intersectionPoints.y, distance: distanceToIntersection, wall: wall};
                    }
                }
            }
            
            if(rays[j].closestIntersection){
                const light = rays[j];
                light.drawIntersect(light.closestIntersection.x, light.closestIntersection.y);
                let reflectedLineThickness = light.thickness * .7;
                reflectedLineThickness = Number(reflectedLineThickness.toFixed(2));

                if(reflectedLineThickness > .05){
                    reflectingRays.push(new ray(light.closestIntersection.x, light.closestIntersection.y, getReflectAngle(light, light.closestIntersection.wall), reflectedLineThickness, true));
                }
            }else{
                rays[j].draw();
            }
            
            j++;
        }

        //CREATING REFLECTING RAYS
        for(let i = 0; i < reflectingRays.length; i++){
            reflectingRays[i].update(mouseX, mouseY);
            for(let wall of boundaries){
                const intersectionPoints = getIntersectionPoint(reflectingRays[i].startingPoint, reflectingRays[i].endingPoint, wall.startingPoint, wall.endingPoint);
                if(intersectionPoints){
                    const distanceToIntersection = getDistanceBetweenPoints(reflectingRays[i].startingPoint.x, reflectingRays[i].startingPoint.y, intersectionPoints.x, intersectionPoints.y);
                    if(!reflectingRays[i].closestIntersection || reflectingRays[i].closestIntersection.distance > distanceToIntersection){
                        reflectingRays[i].closestIntersection = {x: intersectionPoints.x, y: intersectionPoints.y, distance: distanceToIntersection, wall: wall};
                    }
                }
            }
                        
            if(reflectingRays[i].closestIntersection){
                const light = reflectingRays[i];
                light.drawIntersect(light.closestIntersection.x, light.closestIntersection.y);
                let reflectedLineThickness = light.thickness * .7;
                reflectedLineThickness = Number(reflectedLineThickness.toFixed(2));

                //To Prevent Infinite Reflections
                let xDislocation = 0;
                let yDislocation = 0;

                if(light.startingPoint.x < light.closestIntersection.x){
                    xDislocation = -6;
                }else{
                    xDislocation = 6;
                }

                if(light.startingPoint.y < light.closestIntersection.y){
                    yDislocation = -2;
                }else{
                    yDislocation = 2;
                }

                if(reflectedLineThickness > .05){
                    reflectingRays.push(new ray(light.closestIntersection.x + xDislocation, light.closestIntersection.y + yDislocation, getReflectAngle(light, light.closestIntersection.wall), reflectedLineThickness, true));
                }
            }else{
                reflectingRays[i].draw();
            }
        }
    }

    //-----------------------GET DISTANCE BETWEEN POINTS-----------------------//
    const getDistanceBetweenPoints = (x1:number, y1:number, x2:number, y2:number) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    //-----------------------SET MOUSE POSITION-----------------------//
    const setMousePosition = (e:React.MouseEvent<HTMLCanvasElement>) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        refresh();
    }

    //-----------------------MOUSE (DENSITY) EVENTS-----------------------//
    let densityInterval: any;

    const mouseDown = () => {
        clearInterval(densityInterval);
        densityInterval = setInterval(() => {
            if(lightDensity >= maxDensity){
                lightDensity -= 0.1;
                refresh();
            }else{
                clearInterval(densityInterval);
            }
        }, 20);
    }

    const mouseUp = () => {
        clearInterval(densityInterval);
        densityInterval = setInterval(() => {
            if(lightDensity <= defaultDensity){
                lightDensity += 0.1;
                refresh();
            }else{
                clearInterval(densityInterval);
            }
        }, 20);
    }
    
    //--------------KEYBOARD (RANDOM WALL GENERATION) EVENTS--------------//
    let isKeyDownHandled = false;
    const spaceBarDown = (e:KeyboardEvent) => {
        if (e.key == " " || e.code == "Space" || e.keyCode == 32){
            if(isKeyDownHandled) return;
            clearScreen();
            boundaries = [];

            for(let i = 0; i < 2 ; i++){
                boundaries.push(new boundary(Math.random() * window.innerWidth, Math.random() * window.innerHeight, Math.random() * window.innerWidth, Math.random() * window.innerHeight));
            }

            refresh();
            isKeyDownHandled = true;
        }
    }

    const spaceBarUp = (e:KeyboardEvent) => {
        if (e.key == " " || e.code == "Space" || e.keyCode == 32){
            isKeyDownHandled = false;
        }
    }

    return (
        <>
            <canvas id = "canvas" width = {window.innerWidth} height = {window.innerHeight} onMouseMove = {setMousePosition} onMouseDown = {mouseDown} onMouseUp = {mouseUp}></canvas>
            <div className = "infoBox">
                <h1>2D Ray Casting <span>- by <a href = "">Atakan Yiğit Çengeloğlu</a></span></h1>
                <div className = "infos">
                    <p>Hold Mouse Button to Increase Density</p>
                    <p>Press Space to Generate Random Map</p>
                </div>
            </div>
        </>
    );
}

export default App;