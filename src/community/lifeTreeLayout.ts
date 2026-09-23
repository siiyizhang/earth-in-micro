import { isFamily } from "./lifeTree";
import type { LifeTreeNode } from "./lifeTree";

// The two Life Tree layouts, ported from the iOS whole_life_tree.dart. Shared
// by the interactive tree and the post-publish reveal animation.

export type LifeTreeStyle = "lifemap" | "radial";
export type Point = { x: number; y: number };
export type Layout = {
  style: LifeTreeStyle;
  width: number;
  height: number;
  origin: Point;
  positions: Map<string, Point>;
  depths: Map<string, number>;
  maxDepth: number;
  signature: string;
  revealLevels: Map<string, number>;
  sectorRadii: Map<string, number>;
  sectorDirections: Map<string, number>;
};


function childMap(nodes: LifeTreeNode[]) {
  const children = new Map<string | null, LifeTreeNode[]>();
  for (const n of nodes) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  for (const list of children.values()) list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return children;
}

export function lifemapLayout(nodes: LifeTreeNode[]): Layout {
  const origin = { x: 3200, y: 3920 }, rootRadius = 3000;
  const children = childMap(nodes);
  const positions = new Map<string, Point>(), depths = new Map<string, number>();
  const radii = new Map<string, number>(), directions = new Map<string, number>(), raw = new Map<string, number>();
  let maxDepth = 1;
  const place = (child: LifeTreeNode, parent: Point, direction: number, distance: number, radius: number, depth: number) => {
    const position = { x: parent.x + Math.cos(direction) * distance, y: parent.y + Math.sin(direction) * distance };
    positions.set(child.id, position);
    depths.set(child.id, depth);
    radii.set(child.id, radius);
    directions.set(child.id, direction);
    raw.set(child.id, Math.log2(rootRadius / radius));
    maxDepth = Math.max(maxDepth, depth);
    placeChildren(child.id, position, direction, radius, depth + 1);
  };
  function placeChildren(parentId: string | null, parent: Point, parentDirection: number, parentRadius: number, depth: number) {
    const list = children.get(parentId) ?? [];
    if (!list.length) return;
    if (list.length === 1) {
      const child = list[0];
      const radius = parentRadius * ((children.get(child.id) ?? []).length ? 0.8 : 0.5);
      place(child, parent, parentDirection, parentRadius - radius, radius, depth);
      return;
    }
    const weights = list.map((n) => Math.sqrt(Math.max(1, n.familyCount)));
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = parentDirection - Math.PI / 2;
    list.forEach((child, i) => {
      const half = (Math.PI / 2) * weights[i] / total;
      const direction = cursor + half;
      cursor += half * 2;
      const tangent = Math.abs(Math.tan(half));
      const radius = Math.max(parentRadius * 0.006, parentRadius * tangent / (1 + tangent));
      place(child, parent, direction, parentRadius - radius, radius, depth);
    });
  }
  placeChildren(null, origin, -Math.PI / 2, rootRadius, 1);
  const nonRoot = nodes.filter((n) => n.parentId !== null).map((n) => raw.get(n.id) ?? 0);
  const min = nonRoot.length ? Math.min(...nonRoot) : 0, max = nonRoot.length ? Math.max(...nonRoot) : 1;
  const range = Math.max(0.0001, max - min);
  const revealLevels = new Map<string, number>();
  for (const n of nodes) {
    if (n.parentId === null) { revealLevels.set(n.id, 0); continue; }
    const normalized = Math.min(1, Math.max(0, ((raw.get(n.id) ?? min) - min) / range));
    revealLevels.set(n.id, 0.72 + Math.pow(normalized, 0.82) * 5.05);
  }
  return { style: "lifemap", width: 6400, height: 4200, origin, positions, depths, maxDepth, signature: `lifemap:${nodes.length}:${maxDepth}`, revealLevels, sectorRadii: radii, sectorDirections: directions };
}

export const ringRadius = (depth: number, maxDepth: number) => 150 + Math.pow(depth / Math.max(1, maxDepth), 0.82) * (1900 - 230);

export function radialLayout(nodes: LifeTreeNode[]): Layout {
  const extent = 4200, outer = 1900, center = { x: extent / 2, y: extent / 2 };
  const children = childMap(nodes);
  const depths = new Map<string, number>();
  let maxDepth = 1;
  const recordDepth = (n: LifeTreeNode, depth: number) => {
    depths.set(n.id, depth);
    maxDepth = Math.max(maxDepth, depth);
    for (const c of children.get(n.id) ?? []) recordDepth(c, depth + 1);
  };
  for (const root of children.get(null) ?? []) recordDepth(root, 1);
  const leaves = nodes.filter((n) => !(children.get(n.id) ?? []).length).length;
  let cursor = 0;
  const angles = new Map<string, number>();
  const assign = (n: LifeTreeNode): number => {
    const list = children.get(n.id) ?? [];
    let angle;
    if (!list.length) angle = -Math.PI / 2 + Math.PI * 2 * (cursor++ + 0.5) / Math.max(1, leaves);
    else { const a = list.map(assign); angle = (a[0] + a[a.length - 1]) / 2; }
    angles.set(n.id, angle);
    return angle;
  };
  for (const root of children.get(null) ?? []) assign(root);
  const positions = new Map<string, Point>();
  for (const n of nodes) {
    const radius = isFamily(n) ? outer : ringRadius(depths.get(n.id) ?? 1, maxDepth);
    const angle = angles.get(n.id) ?? 0;
    positions.set(n.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
  }
  return { style: "radial", width: extent, height: extent, origin: center, positions, depths, maxDepth, signature: `radial:${nodes.length}:${maxDepth}`, revealLevels: new Map(), sectorRadii: new Map(), sectorDirections: new Map() };
}


/** The curve a radial edge follows (iOS _radialEdgePath): a cubic whose
 * control points sit on the ring halfway between the two ends. */
export function radialEdge(origin: Point, from: Point, to: Point): [Point, Point, Point, Point] {
  const fv = { x: from.x - origin.x, y: from.y - origin.y }, tv = { x: to.x - origin.x, y: to.y - origin.y };
  const fd = Math.hypot(fv.x, fv.y), td = Math.hypot(tv.x, tv.y), mid = (fd + td) / 2;
  const at = (v: Point, d: number) => (d === 0 ? origin : { x: origin.x + v.x / d * mid, y: origin.y + v.y / d * mid });
  return [from, at(fv, fd), at(tv, td), to];
}
