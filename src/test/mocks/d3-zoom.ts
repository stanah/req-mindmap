// Mock for d3-zoom module for testing
export const zoom = () => ({
  scaleExtent: () => ({}),
  on: () => ({}),
  transform: () => ({}),
});

export const zoomIdentity = {
  x: 0,
  y: 0,
  k: 1,
  translate: (x: number, y: number) => ({
    x: x,
    y: y, 
    k: 1,
    scale: (k: number) => ({ x: x, y: y, k: k }),
  }),
  scale: (k: number) => ({
    x: 0,
    y: 0,
    k: k,
    translate: (x: number, y: number) => ({ x: x, y: y, k: k }),
  }),
};

export const zoomTransform = (node: any) => zoomIdentity;