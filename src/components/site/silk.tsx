"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

// Flowing "silk" folds (domain-warped fbm) in graphite/silver with an ember glow that follows the cursor.
const FRAG = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform vec2 c;
uniform vec3 base;uniform vec3 silk;uniform vec3 ember;uniform float amt;uniform float heat;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float k=r.x/r.y;
  vec2 p=vec2(uv.x*k,uv.y);vec2 mm=vec2(m.x*k,m.y);vec2 cc=vec2(c.x*k,c.y);
  float tt=t*.035;
  vec2 q=vec2(fbm(p*1.3+vec2(tt,-tt)),fbm(p*1.3+vec2(-tt*.8,tt)+4.3));
  vec2 w=p+q*1.35+(mm-p)*.08;
  float f=fbm(w*1.6+vec2(tt*1.6,-tt));
  float folds=sin((w.x*.9+w.y*1.6+f*3.4)*3.)*.5+.5;
  float sheen=smoothstep(.45,.95,folds)*(.55+.45*f);
  float d=distance(p,mm);float glow=exp(-d*d*3.2);
  float e=smoothstep(.5,.95,f)*.6+glow*.55;
  vec3 col=mix(base,silk,sheen*amt);
  col=mix(col,ember,clamp(e*heat,0.,1.));
  float mask=smoothstep(1.05,.05,distance(p,cc)*1.05);
  col=mix(base,col,mask);
  gl_FragColor=vec4(col,1.);
}`;

const rgb = (el: Element, name: string, fb: number[]) => {
  const v = getComputedStyle(el).getPropertyValue(name).trim().split(/\s+/).map(Number);
  return (v.length === 3 && v.every((x) => !Number.isNaN(x)) ? v : fb).map((x) => x / 255);
};

/**
 * Soft WebGL silk glow. `focus` is the bright centre in 0..1 page coords (x right, y up).
 * Colours come from theme tokens and update when the theme changes. Pauses off-screen,
 * renders one still frame for reduced motion, and falls back to a CSS glow without WebGL.
 */
export function Silk({ className, focus = [0.7, 0.5], heat = 0.32, amount = 0.55 }: { className?: string; focus?: [number, number]; heat?: number; amount?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      cv.style.display = "none";
      if (fallback.current) fallback.current.style.display = "block";
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      cv.style.display = "none";
      if (fallback.current) fallback.current.style.display = "block";
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uR = u("r"),
      uT = u("t"),
      uM = u("m"),
      uC = u("c"),
      uBase = u("base"),
      uSilk = u("silk"),
      uEmber = u("ember"),
      uAmt = u("amt"),
      uHeat = u("heat");

    const colours = () => {
      const dark = !!cv.closest(".dark, .band-dark");
      gl.uniform3fv(uBase, rgb(cv, "--canvas", [253, 251, 212]));
      gl.uniform3fv(uSilk, dark ? [0.42, 0.29, 0.15] : [0.93, 0.86, 0.64]);
      gl.uniform3fv(uEmber, rgb(cv, "--p-500", [192, 88, 0]));
      gl.uniform1f(uAmt, amount);
      gl.uniform1f(uHeat, dark ? heat : heat * 0.7);
    };
    colours();
    gl.uniform2f(uC, focus[0], focus[1]);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0,
      h = 0,
      raf = 0,
      visible = true,
      mx = focus[0],
      my = focus[1],
      tx = mx,
      ty = my;
    const start = performance.now() - 20000;
    const size = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5; // silk is soft — half resolution is plenty
      w = Math.max(1, Math.round(cv.clientWidth * scale));
      h = Math.max(1, Math.round(cv.clientHeight * scale));
      cv.width = w;
      cv.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uR, w, h);
    };
    const frame = (now: number) => {
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      gl.uniform1f(uT, (now - start) / 1000);
      gl.uniform2f(uM, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = visible && !reduce ? requestAnimationFrame(frame) : 0;
    };
    size();
    frame(performance.now());

    const ro = new ResizeObserver(() => {
      size();
      if (!raf) frame(performance.now());
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !reduce) raf = requestAnimationFrame(frame);
    });
    io.observe(cv);
    const mo = new MutationObserver(() => {
      colours();
      if (!raf) frame(performance.now());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      tx = (e.clientX - r.left) / r.width;
      ty = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", move);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [focus[0], focus[1], heat, amount]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <canvas ref={ref} className="h-full w-full" />
      <div ref={fallback} className="absolute inset-0 hidden bg-[radial-gradient(60%_70%_at_70%_50%,rgb(var(--p-500)/0.16),transparent_70%)]" />
    </div>
  );
}
