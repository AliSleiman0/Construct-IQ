export interface Point { x: number; y: number; }
export interface Viewport { x: number; y: number; scale: number; }

export type ToolType =
  | 'select' | 'line' | 'polyline' | 'arc3pt' | 'circle' | 'rectangle'
  | 'ellipse' | 'spline' | 'xline' | 'wall' | 'door' | 'window' | 'stairs'
  | 'text' | 'mtext' | 'hatch' | 'move' | 'copy' | 'rotate' | 'scale'
  | 'mirror' | 'offset' | 'trim' | 'extend' | 'fillet' | 'erase' | 'array'
  | 'dimlinear' | 'dimaligned' | 'dimradius' | 'dimangular' | 'dist' | 'area'
  | 'break' | 'chamfer' | 'join' | 'stretch' | 'lengthen' | 'leader';

export type LineType = 'continuous' | 'dashed' | 'dotted' | 'dashdot' | 'hidden' | 'center';

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  frozen: boolean;
  locked: boolean;
  lineType: LineType;
  lineWeight: number;
}

interface Base {
  id: string;
  layer: string;
  color: string;
  lineWeight: number;
  lineType: LineType;
  selected: boolean;
}

export interface LineObj extends Base { type: 'line'; start: Point; end: Point; }
export interface PolylineObj extends Base { type: 'polyline'; points: Point[]; closed: boolean; }
export interface CircleObj extends Base { type: 'circle'; center: Point; radius: number; }
export interface ArcObj extends Base { type: 'arc'; center: Point; radius: number; startAngle: number; endAngle: number; }
export interface RectObj extends Base { type: 'rect'; p1: Point; p2: Point; }
export interface EllipseObj extends Base { type: 'ellipse'; center: Point; rx: number; ry: number; rotation: number; }
export interface WallObj extends Base { type: 'wall'; start: Point; end: Point; thickness: number; }
export interface TextObj extends Base { type: 'text'; pos: Point; content: string; height: number; rotation: number; }
export interface MTextObj extends Base { type: 'mtext'; pos: Point; content: string; height: number; width: number; rotation: number; }
export interface HatchObj extends Base { type: 'hatch'; points: Point[]; pattern: string; scale: number; angle: number; }
export interface DimObj extends Base {
  type: 'dim';
  dimType: 'linear' | 'aligned' | 'radius' | 'angular';
  p1: Point; p2: Point; dimPt: Point;
}
export interface BlockObj extends Base {
  type: 'block';
  blockType: 'door' | 'window' | 'stairs' | 'column';
  pos: Point; rotation: number; scale: number;
}

export type CADObj = LineObj | PolylineObj | CircleObj | ArcObj | RectObj |
  EllipseObj | WallObj | TextObj | MTextObj | HatchObj | DimObj | BlockObj;

export interface SnapResult {
  type: 'endpoint' | 'midpoint' | 'center' | 'intersection' | 'perpendicular' |
        'tangent' | 'nearest' | 'quadrant' | 'grid' | 'none';
  point: Point;
  objectId?: string;
}

export interface SnapSettings {
  endpoint: boolean;
  midpoint: boolean;
  center: boolean;
  intersection: boolean;
  perpendicular: boolean;
  tangent: boolean;
  nearest: boolean;
  quadrant: boolean;
}

export interface DrawingState {
  objects: CADObj[];
  layers: Layer[];
  currentLayer: string;
}
