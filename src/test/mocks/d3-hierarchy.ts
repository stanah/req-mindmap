// Mock for d3-hierarchy module for testing
export const tree = () => ({
  size: () => ({}),
  separation: () => ({}),
});

export const cluster = () => ({
  size: () => ({}),
  separation: () => ({}),
});

export const hierarchy = (data: any) => ({
  descendants: () => [
    {
      id: 'root',
      data: data,
      x: 400,
      y: 100,
      depth: 0,
      children: [],
    }
  ],
  links: () => [],
});

export interface HierarchyNode<T> {
  data: T;
  depth: number;
  height: number;
  parent: HierarchyNode<T> | null;
  children?: HierarchyNode<T>[];
  x?: number;
  y?: number;
}